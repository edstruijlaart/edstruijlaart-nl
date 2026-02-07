export const prerender = false;

import type { APIRoute } from 'astro';

// Listmonk configuration
const LISTMONK_URL = import.meta.env.LISTMONK_URL
  ? `${import.meta.env.LISTMONK_URL}/api/public/subscription`
  : 'https://newsletter.earswantmusic.nl/api/public/subscription';
const LIST_UUID = import.meta.env.LISTMONK_LIST_UUID || '681b5ef7-29cc-4be5-a0c7-6d8453f26cc8';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { email, name } = body || {};

  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email is verplicht' }), { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Ongeldig emailadres' }), { status: 400 });
  }

  try {
    const response = await fetch(LISTMONK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: name || '',
        list_uuids: [LIST_UUID],
      }),
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const errorData: Record<string, string> = await response.json().catch(() => ({}));
    return new Response(JSON.stringify({
      error: errorData.message || 'Inschrijving mislukt',
    }), { status: response.status });
  } catch {
    return new Response(JSON.stringify({ error: 'Kon geen verbinding maken met de nieuwsbriefserver' }), {
      status: 502,
    });
  }
};
