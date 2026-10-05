export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient, sanityClient } from '../../../lib/sanity';
import { isActieveShow, isGeldigDocId, isGestart } from '../../../lib/show-veiligheid';
import { nieuweItemKey, stuurModeratieMelding, voorafModereren } from '../../../lib/show-moderatie';

/**
 * Voegt een gastenboek-bericht toe aan een show.
 * Kan gebruikt worden door gasten die al door de email-gate zijn.
 * Ed krijgt van elk bericht een mail met een verbergknop (audit #42).
 *
 * POST /api/show/guestbook
 * Body: { showId, name, message, honeypot? }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { showId, name, message, honeypot } = body || {};

    // Honeypot check - bots vullen dit in, echte gebruikers niet
    if (honeypot) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (!isGeldigDocId(showId) || typeof name !== 'string' || typeof message !== 'string'
        || !name.trim() || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Naam en bericht zijn verplicht' }), { status: 400 });
    }

    // Valideer dat show bestaat, niet gearchiveerd is en begonnen is
    const show = await sanityClient.fetch(
      `*[_type == "show" && _id == $id][0]{_id, status, startDateTime, city, "slug": slug.current}`,
      { id: showId }
    );
    if (!isActieveShow(show) || !isGestart(show.startDateTime)) {
      return new Response(JSON.stringify({ error: 'Show niet gevonden' }), { status: 404 });
    }

    if (message.length > 280) {
      return new Response(JSON.stringify({ error: 'Bericht mag maximaal 280 tekens zijn' }), { status: 400 });
    }

    const key = nieuweItemKey();
    const zichtbaar = !voorafModereren();
    const cleanName = name.trim().slice(0, 100);
    const cleanMessage = message.trim();

    await sanityWriteClient
      .patch(showId)
      .setIfMissing({ guestbookEntries: [] })
      .append('guestbookEntries', [{
        _key: key,
        name: cleanName,
        message: cleanMessage,
        approved: zichtbaar,
        submittedAt: new Date().toISOString(),
      }])
      .commit();

    stuurModeratieMelding({
      showId, city: show.city, slug: show.slug, type: 'guestbook', key,
      naam: cleanName, bericht: cleanMessage, zichtbaar,
    }).catch((err) => console.error('Failed to send guestbook notification:', err));

    return new Response(JSON.stringify({ success: true, zichtbaar }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Guestbook error:', error);
    return new Response(JSON.stringify({ error: 'Bericht opslaan mislukt' }), { status: 500 });
  }
};
