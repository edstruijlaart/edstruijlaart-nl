export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient, sanityClient } from '../../../lib/sanity';

// OPTIONS handler voor CORS preflight (iOS Shortcuts, externe clients)
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
};

export const POST: APIRoute = async ({ request }) => {
  // CORS headers voor response (iOS Shortcuts stuurt geen Origin)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // Auth check — API key zodat niet iedereen kan uploaden
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== import.meta.env.BOOTLEG_API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const formData = await request.formData();
    const audio = formData.get('audio') as File;

    if (!audio) {
      return new Response(JSON.stringify({ error: 'Geen audiobestand ontvangen' }), { status: 400, headers: corsHeaders });
    }

    // Vind de actieve show (starttijd < nu, status = live)
    const now = new Date().toISOString();
    const show = await sanityClient.fetch(`
      *[_type == "show" && status == "live" && startDateTime < $now]
      | order(startDateTime desc) [0] {
        _id, city, startDateTime, slug
      }
    `, { now });

    if (!show) {
      return new Response(JSON.stringify({ error: 'Geen actieve show gevonden' }), { status: 404, headers: corsHeaders });
    }

    // Upload audio naar Sanity assets (als file)
    const buffer = Buffer.from(await audio.arrayBuffer());
    const asset = await sanityWriteClient.assets.upload('file', buffer, {
      filename: `bootleg-${show.slug?.current || show.city}-${new Date(show.startDateTime).toISOString().split('T')[0]}.m4a`,
      contentType: audio.type || 'audio/mp4',
    });

    // Update show in Sanity met bootleg URL
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await sanityWriteClient
      .patch(show._id)
      .set({
        bootlegUrl: asset.url,
        bootlegExpiresAt: expiresAt.toISOString(),
        bootlegFileSize: `${(audio.size / 1024 / 1024).toFixed(1)} MB`,
      })
      .commit();

    return new Response(JSON.stringify({
      success: true,
      show: show.city,
      url: asset.url,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Bootleg upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload mislukt' }), { status: 500, headers: corsHeaders });
  }
};
