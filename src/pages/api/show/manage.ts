export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Beheer gastenboek-berichten en foto's.
 * Beveiligd met CRON_SECRET (zelfde key als cron jobs).
 *
 * DELETE /api/show/manage
 * Headers: x-api-key: CRON_SECRET
 * Body: { showId, type: 'guestbook' | 'photo', key: string }
 */
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== import.meta.env.CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { showId, type, key } = body;

    if (!showId || !type || !key) {
      return new Response(JSON.stringify({ error: 'showId, type en key zijn verplicht' }), { status: 400 });
    }

    if (type === 'guestbook') {
      await sanityWriteClient
        .patch(showId)
        .unset([`guestbookEntries[_key == "${key}"]`])
        .commit();
    } else if (type === 'photo') {
      await sanityWriteClient
        .patch(showId)
        .unset([`guestPhotos[_key == "${key}"]`])
        .commit();
    } else {
      return new Response(JSON.stringify({ error: 'Type moet "guestbook" of "photo" zijn' }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Manage error:', error);
    return new Response(JSON.stringify({ error: 'Verwijderen mislukt' }), { status: 500 });
  }
};
