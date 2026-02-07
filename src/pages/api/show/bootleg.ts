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
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // Auth check
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== import.meta.env.BOOTLEG_API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
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

    let audioUrl: string;
    let fileSize = '';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Mode 2: Audio URL of heel Sanity asset response meegegeven
      const body = await request.json();

      // Accepteer directe audioUrl OF hele Sanity asset response (document.url)
      audioUrl = body.audioUrl || body.document?.url || body.url || '';

      if (!audioUrl || !audioUrl.includes('sanity.io')) {
        return new Response(JSON.stringify({ error: 'Ongeldige audioUrl', received: body }), { status: 400, headers: corsHeaders });
      }

      const sizeBytes = body.document?.size;
      fileSize = body.fileSize || (sizeBytes ? `${(sizeBytes / 1024 / 1024).toFixed(1)} MB` : '');
    } else {
      // Mode 1: Audio bestand meegegeven (kleine bestanden, <4.5MB)
      const formData = await request.formData();
      const audio = formData.get('audio') as File;

      if (!audio) {
        return new Response(JSON.stringify({ error: 'Geen audiobestand ontvangen' }), { status: 400, headers: corsHeaders });
      }

      const buffer = Buffer.from(await audio.arrayBuffer());
      const asset = await sanityWriteClient.assets.upload('file', buffer, {
        filename: `bootleg-${show.slug?.current || show.city}-${new Date(show.startDateTime).toISOString().split('T')[0]}.m4a`,
        contentType: audio.type || 'audio/mp4',
      });

      audioUrl = asset.url;
      fileSize = `${(audio.size / 1024 / 1024).toFixed(1)} MB`;
    }

    // Update show in Sanity met bootleg URL
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await sanityWriteClient
      .patch(show._id)
      .set({
        bootlegUrl: audioUrl,
        bootlegExpiresAt: expiresAt.toISOString(),
        ...(fileSize ? { bootlegFileSize: fileSize } : {}),
      })
      .commit();

    return new Response(JSON.stringify({
      success: true,
      show: show.city,
      url: audioUrl,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Bootleg upload error:', error);
    return new Response(JSON.stringify({ error: 'Upload mislukt' }), { status: 500, headers: corsHeaders });
  }
};
