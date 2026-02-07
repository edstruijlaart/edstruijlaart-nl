export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityClient, sanityWriteClient } from '../../../lib/sanity';
import { buildReminderEmail } from '../../../lib/email-templates';

/**
 * Vercel Cron endpoint: verstuurt herinneringsmails voor shows
 * die 12-48 uur geleden zijn begonnen en nog geen mail hebben gekregen.
 *
 * Wordt elke ochtend om 10:00 getriggerd door Vercel Cron.
 * Kan ook handmatig getriggerd worden met de juiste auth header.
 */
export const GET: APIRoute = async ({ request }) => {
  // Auth: Vercel Cron stuurt een CRON_SECRET header, of handmatig met API key
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    // Zoek shows die 12-48u geleden begonnen EN nog geen reminder hebben gestuurd
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    const shows = await sanityClient.fetch(`
      *[_type == "show"
        && reminderSent != true
        && startDateTime < $twelveHoursAgo
        && startDateTime > $fortyEightHoursAgo
      ] {
        _id,
        title,
        city,
        hostName,
        startDateTime,
        slug,
        bootlegUrl,
        bootlegExpiresAt,
        youtubeVideos[0] { url },
        "heroImageUrl": heroImage.asset->url
      }
    `, { twelveHoursAgo, fortyEightHoursAgo });

    if (!shows || shows.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Geen shows gevonden die een reminder nodig hebben',
        showsProcessed: 0,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const results = [];

    for (const show of shows) {
      // Haal subscribers op voor deze show
      const signups = await sanityClient.fetch(`
        *[_type == "emailSignup" && show._ref == $showId] {
          firstName,
          email
        }
      `, { showId: show._id });

      if (!signups || signups.length === 0) {
        results.push({ show: show.city, emails: 0, status: 'no_signups' });
        // Markeer toch als verstuurd zodat we het niet opnieuw proberen
        await sanityWriteClient.patch(show._id).set({ reminderSent: true }).commit();
        continue;
      }

      // YouTube video ID extracten
      let youtubeVideoId: string | undefined;
      if (show.youtubeVideos?.[0]?.url) {
        const match = show.youtubeVideos[0].url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
        );
        youtubeVideoId = match?.[1];
      }

      // Slug extracten
      const showSlug = show.slug?.current || '';

      let sentCount = 0;
      let errorCount = 0;

      // Verstuur mail per subscriber
      for (const signup of signups) {
        // Hero image URL met resize parameters
        const heroImageUrl = show.heroImageUrl
          ? `${show.heroImageUrl}?w=600&q=80`
          : undefined;

        const { subject, html } = buildReminderEmail({
          firstName: signup.firstName,
          city: show.city,
          hostName: show.hostName,
          bootlegUrl: show.bootlegUrl,
          bootlegExpiresAt: show.bootlegExpiresAt,
          showSlug,
          youtubeVideoId,
          heroImageUrl,
        });

        try {
          await resend.emails.send({
            from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
            to: signup.email,
            bcc: 'edstruijlaart@gmail.com',
            subject,
            html,
          });
          sentCount++;
        } catch (emailErr) {
          console.error(`Failed to send to ${signup.email}:`, emailErr);
          errorCount++;
        }
      }

      // Markeer show als verstuurd
      await sanityWriteClient.patch(show._id).set({ reminderSent: true }).commit();

      results.push({
        show: show.city,
        emails: sentCount,
        errors: errorCount,
        status: 'sent',
      });
    }

    return new Response(JSON.stringify({
      success: true,
      showsProcessed: shows.length,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    return new Response(JSON.stringify({ error: 'Er ging iets mis' }), { status: 500 });
  }
};
