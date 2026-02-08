export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient, sanityClient } from '../../../lib/sanity';
import { buildReminderEmail } from '../../../lib/email-templates';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { showId, firstName, email, message, honeypot } = body;

    // Honeypot check — bots vullen dit in, echte gebruikers niet
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Validatie
    if (!showId || !firstName || !email) {
      return new Response(JSON.stringify({ error: 'Vul alle velden in' }), { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Ongeldig emailadres' }), { status: 400 });
    }

    // Sanitize input
    const cleanFirstName = firstName.trim().slice(0, 100);
    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    const cleanMessage = message?.trim().slice(0, 280);

    // Check of show bestaat (haal extra velden op voor eventuele late-signup mail)
    const show = await sanityClient.fetch(
      `*[_type == "show" && _id == $id][0]{
        _id, startDateTime, status, slug, city, hostName,
        bootlegUrl, bootlegExpiresAt, reminderSent,
        youtubeVideos[0] { url },
        "heroImageUrl": heroImage.asset->url
      }`,
      { id: showId }
    );

    if (!show) {
      return new Response(JSON.stringify({ error: 'Show niet gevonden' }), { status: 404 });
    }

    // EmailSignup opslaan in Sanity
    await sanityWriteClient.create({
      _type: 'emailSignup',
      firstName: cleanFirstName,
      email: cleanEmail,
      show: { _type: 'reference', _ref: showId },
      signedUpAt: new Date().toISOString(),
      syncedToListmonk: false,
      source: 'email-gate',
    });

    // Gastenboek entry toevoegen (als er een bericht is)
    if (cleanMessage && cleanMessage.length > 0) {
      const key = Math.random().toString(36).slice(2, 10);
      await sanityWriteClient
        .patch(showId)
        .setIfMissing({ guestbookEntries: [] })
        .append('guestbookEntries', [{
          _key: key,
          name: cleanFirstName,
          email: cleanEmail,
          message: cleanMessage,
          approved: true, // MVP: direct zichtbaar
          submittedAt: new Date().toISOString(),
        }])
        .commit();
    }

    // Listmonk sync (fire and forget)
    syncToListmonk(cleanFirstName, cleanEmail, show).catch(console.error);

    // Late signup: als de herinneringsmail al is verstuurd, stuur direct een mail naar deze persoon
    if (show.reminderSent) {
      sendLateSignupReminder(cleanFirstName, cleanEmail, show).catch(console.error);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({ error: 'Er ging iets mis' }), { status: 500 });
  }
};

async function sendLateSignupReminder(firstName: string, email: string, show: any) {
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    // YouTube video ID extracten
    let youtubeVideoId: string | undefined;
    if (show.youtubeVideos?.[0]?.url) {
      const match = show.youtubeVideos[0].url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
      );
      youtubeVideoId = match?.[1];
    }

    const showSlug = show.slug?.current || '';
    const heroImageUrl = show.heroImageUrl
      ? `${show.heroImageUrl}?w=600&q=80`
      : undefined;

    const { subject, html } = buildReminderEmail({
      firstName,
      city: show.city,
      hostName: show.hostName,
      bootlegUrl: show.bootlegUrl,
      bootlegExpiresAt: show.bootlegExpiresAt,
      showSlug,
      showId: show._id,
      youtubeVideoId,
      heroImageUrl,
    });

    await resend.emails.send({
      from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
      to: email,
      bcc: 'edstruijlaart@gmail.com',
      subject,
      html,
    });

    // Increment emailsSent counter
    await sanityWriteClient
      .patch(show._id)
      .setIfMissing({ emailsSent: 0 })
      .inc({ emailsSent: 1 })
      .commit();

    console.log(`Late signup reminder sent to ${email} for ${show.city}`);
  } catch (err) {
    console.error(`Failed to send late signup reminder to ${email}:`, err);
  }
}

async function syncToListmonk(firstName: string, email: string, show: any) {
  const LISTMONK_PUBLIC_URL = 'https://newsletter.earswantmusic.nl/api/public/subscription';
  const HK_LIST_UUID = 'ebeb2dbf-bec2-4256-9952-329bb030d734'; // Huiskamerlijst op locatie

  await fetch(LISTMONK_PUBLIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      name: firstName,
      list_uuids: [HK_LIST_UUID],
    }),
  });
}
