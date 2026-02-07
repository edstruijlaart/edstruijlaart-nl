export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient, sanityClient } from '../../../lib/sanity';

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

    // Check of show bestaat
    const show = await sanityClient.fetch(
      `*[_type == "show" && _id == $id][0]{ _id, startDateTime, status, slug }`,
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

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({ error: 'Er ging iets mis' }), { status: 500 });
  }
};

async function syncToListmonk(firstName: string, email: string, show: any) {
  const LISTMONK_PUBLIC_URL = 'https://newsletter.earswantmusic.nl/api/public/subscription';
  const HK_LIST_UUID = '772c8bce-57f6-4537-ada4-2408b6a839da';

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
