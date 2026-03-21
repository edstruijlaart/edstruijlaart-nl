export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient, sanityClient } from '../../../lib/sanity';

/**
 * Voegt een gastenboek-bericht toe aan een show.
 * Kan gebruikt worden door gasten die al door de email-gate zijn.
 *
 * POST /api/show/guestbook
 * Body: { showId, name, message, honeypot? }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { showId, name, message, honeypot } = body;

    // Honeypot check - bots vullen dit in, echte gebruikers niet
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!showId || !name || !message) {
      return new Response(JSON.stringify({ error: 'Naam en bericht zijn verplicht' }), { status: 400 });
    }

    // Valideer dat show bestaat
    const show = await sanityClient.fetch(
      `*[_type == "show" && _id == $id][0]{_id}`,
      { id: showId }
    );
    if (!show) {
      return new Response(JSON.stringify({ error: 'Show niet gevonden' }), { status: 404 });
    }

    if (message.length > 280) {
      return new Response(JSON.stringify({ error: 'Bericht mag maximaal 280 tekens zijn' }), { status: 400 });
    }

    const key = Math.random().toString(36).slice(2, 10);

    await sanityWriteClient
      .patch(showId)
      .setIfMissing({ guestbookEntries: [] })
      .append('guestbookEntries', [{
        _key: key,
        name: name.trim().slice(0, 100),
        email: '',
        message: message.trim(),
        approved: true,
        submittedAt: new Date().toISOString(),
      }])
      .commit();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Guestbook error:', error);
    return new Response(JSON.stringify({ error: 'Bericht opslaan mislukt' }), { status: 500 });
  }
};
