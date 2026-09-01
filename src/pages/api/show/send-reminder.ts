export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityClient, sanityWriteClient } from '../../../lib/sanity';
import { buildReminderEmail } from '../../../lib/email-templates';

/**
 * Vercel Cron endpoint: verstuurt herinneringsmails voor shows
 * die 12-96 uur geleden zijn begonnen en nog geen mail hebben gekregen.
 *
 * Wordt elke ochtend om 10:00 getriggerd door Vercel Cron.
 * Kan ook handmatig getriggerd worden met de juiste auth header.
 */
/**
 * Inhaalronde: aanmeldingen die wél in Sanity staan maar niet op de mailinglijst
 * belandden (Listmonk onbereikbaar op dat moment). Draait mee met de dagelijkse
 * cron, zodat één hik geen adres kost.
 */
async function haalAchterstalligeSyncsIn(): Promise<{ gedaan: number; mislukt: number }> {
  const LISTMONK_PUBLIC_URL = 'https://newsletter.earswantmusic.nl/api/public/subscription';
  const HK_LIST_UUID = '772c8bce-57f6-4537-ada4-2408b6a839da'; // Huiskamerconcerten

  const open = await sanityClient.fetch(
    `*[_type == "emailSignup" && syncedToListmonk != true][0...200]{_id, email, firstName}`
  );
  let gedaan = 0, mislukt = 0;
  for (const rij of open || []) {
    try {
      const res = await fetch(LISTMONK_PUBLIC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: rij.email, name: rij.firstName, list_uuids: [HK_LIST_UUID],
        }),
      });
      if (!res.ok && res.status !== 409) throw new Error(`Listmonk ${res.status}`);
      await sanityWriteClient.patch(rij._id).set({ syncedToListmonk: true }).commit();
      gedaan++;
    } catch (e) {
      console.error('Inhaalsync mislukt voor', rij.email, e);
      mislukt++;
    }
  }
  return { gedaan, mislukt };
}

export const GET: APIRoute = async ({ request }) => {
  // Auth: Vercel Cron stuurt Authorization: Bearer CRON_SECRET
  // Handmatig triggeren kan ook met x-api-key header (BOOTLEG_API_KEY)
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;
  const apiKey = request.headers.get('x-api-key');
  const bootlegApiKey = import.meta.env.BOOTLEG_API_KEY;

  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (bootlegApiKey && apiKey === bootlegApiKey);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    // Zoek shows die 12-96u geleden begonnen EN nog geen reminder hebben gestuurd
    // Window van 96u (4 dagen) geeft voldoende marge voor Vercel free tier (cron 1x/dag)
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const ninetySixHoursAgo = new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString();

    const shows = await sanityClient.fetch(`
      *[_type == "show"
        && reminderSent != true
        && startDateTime < $twelveHoursAgo
        && startDateTime > $ninetySixHoursAgo
      ] {
        _id,
        title,
        city,
        hostName,
        hostEmail,
        startDateTime,
        slug,
        bootlegUrl,
        bootlegExpiresAt,
        youtubeVideos[0] { url },
        "heroImageUrl": heroImage.asset->url
      }
    `, { twelveHoursAgo, ninetySixHoursAgo });

    const inhaal = await haalAchterstalligeSyncsIn();

    if (!shows || shows.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Geen shows gevonden die een reminder nodig hebben',
        showsProcessed: 0,
        listmonkInhaal: inhaal,
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
        // Markeer toch als verstuurd en zet op "past"
        await sanityWriteClient.patch(show._id).set({ reminderSent: true, status: 'past' }).commit();
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
      let delayMs = 1000; // Start met 1s delay, verhoogt bij rate limit
      const failedSignups: Array<{ firstName: string; email: string }> = [];

      // Verstuur mail per subscriber met retry-logica
      for (const signup of signups) {
        // Wacht tussen mails (respecteert Resend rate limit)
        if (sentCount > 0 || errorCount > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        const heroImageUrl = show.heroImageUrl
          ? `${show.heroImageUrl}?w=600&q=80`
          : undefined;

        // Detecteer of deze subscriber de host is
        const isHost = !!(show.hostEmail && signup.email.toLowerCase() === show.hostEmail.toLowerCase());

        const { subject, html } = buildReminderEmail({
          firstName: signup.firstName,
          city: show.city,
          hostName: show.hostName,
          bootlegUrl: show.bootlegUrl,
          bootlegExpiresAt: show.bootlegExpiresAt,
          showSlug,
          showId: show._id,
          youtubeVideoId,
          heroImageUrl,
          email: signup.email,
          cronSecret,
          isHost,
        });

        // Retry logica: max 3 pogingen per mail
        let sent = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await resend.emails.send({
              from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
              to: signup.email,
              bcc: 'edstruijlaart@gmail.com',
              subject,
              html,
            });

            // Check of Resend een ID teruggeeft (= geaccepteerd)
            if (result?.data?.id) {
              sentCount++;
              sent = true;
              break;
            } else {
              console.error(`No ID returned for ${signup.email} (attempt ${attempt}):`, JSON.stringify(result));
              delayMs = Math.min(delayMs * 2, 5000);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          } catch (emailErr: any) {
            const isRateLimit = emailErr?.statusCode === 429 || emailErr?.message?.includes('rate');
            console.error(`Failed to send to ${signup.email} (attempt ${attempt}):`, emailErr?.message || emailErr);

            if (isRateLimit) {
              delayMs = Math.min(delayMs * 2, 5000);
              console.log(`Rate limit detected, increasing delay to ${delayMs}ms`);
            }

            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }

        if (!sent) {
          errorCount++;
          failedSignups.push({ firstName: signup.firstName, email: signup.email });
        }
      }

      // Markeer show als verstuurd, zet status op "past", en tel emailsSent op
      // Gebruikt .inc() i.p.v. .set() om race condition met late-signup emails te voorkomen
      await sanityWriteClient
        .patch(show._id)
        .set({ reminderSent: true, status: 'past' })
        .setIfMissing({ emailsSent: 0 })
        .inc({ emailsSent: sentCount })
        .commit();

      results.push({
        show: show.city,
        emails: sentCount,
        errors: errorCount,
        failedSignups,
        status: 'sent',
      });
    }

    // Stuur samenvattingsmail naar Ed
    const totalSent = results.reduce((sum, r) => sum + (r.emails || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);
    const allFailed = results.flatMap(r => (r.failedSignups || []).map((s: any) => `${s.firstName} (${s.email})`));

    const summaryLines = results.map(r =>
      `• ${r.show}: ${r.emails} mails verstuurd${r.errors ? `, ${r.errors} mislukt` : ' ✅'}`
    );

    const failedSection = allFailed.length > 0
      ? `<h3 style="color: #cc0000;">⚠️ Niet bezorgd (na 3 pogingen):</h3><ul>${allFailed.map(f => `<li>${f}</li>`).join('')}</ul>`
      : '';

    const statusEmoji = totalErrors > 0 ? '⚠️' : '✅';

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // delay voor rate limit
      await resend.emails.send({
        from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
        to: 'edstruijlaart@gmail.com',
        subject: `${statusEmoji} Herinneringsmails: ${totalSent} verstuurd${totalErrors > 0 ? `, ${totalErrors} mislukt` : ''}`,
        html: `
          <h2>Herinneringsmails verstuurd</h2>
          <p>De volgende shows zijn verwerkt:</p>
          <ul>${summaryLines.map(l => `<li>${l}</li>`).join('')}</ul>
          ${failedSection}
          <p><small>Automatisch verstuurd door edstruijlaart.nl</small></p>
        `,
      });
    } catch (summaryErr) {
      console.error('Failed to send summary email:', summaryErr);
    }

    return new Response(JSON.stringify({
      success: true,
      showsProcessed: shows.length,
      listmonkInhaal: inhaal,
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
