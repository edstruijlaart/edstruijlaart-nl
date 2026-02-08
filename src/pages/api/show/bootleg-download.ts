export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient, sanityWriteClient } from '../../../lib/sanity';

/**
 * Bootleg download tracker.
 *
 * Telt het aantal downloads en redirect naar de echte Sanity CDN URL.
 * Wordt gebruikt in herinneringsmails en op de showpagina.
 *
 * GET /api/show/bootleg-download?show={showId}
 *
 * Flow:
 * 1. Haal show op uit Sanity
 * 2. Check of bootlegUrl bestaat en niet verlopen is
 * 3. Increment bootlegDownloads counter
 * 4. Redirect (302) naar de CDN URL
 */
export const GET: APIRoute = async ({ url, request }) => {
  try {
    const showId = url.searchParams.get('show');

    if (!showId) {
      return new Response(JSON.stringify({ error: 'Missing show parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Haal show op met bootleg info
    const show = await sanityClient.fetch(
      `*[_type == "show" && _id == $showId][0] {
        _id,
        city,
        slug,
        bootlegUrl,
        bootlegExpiresAt,
        bootlegDownloads
      }`,
      { showId }
    );

    if (!show) {
      return new Response(JSON.stringify({ error: 'Show niet gevonden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!show.bootlegUrl) {
      return new Response(`<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Geen opname beschikbaar</title></head>
<body style="margin:0;padding:0;background:#0F0F0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F0EDE8;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;padding:40px 24px;max-width:480px;">
    <p style="font-size:48px;margin:0 0 16px;">🎵</p>
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#B8860B;margin:0 0 16px;">Geen opname beschikbaar</h1>
    <p style="font-size:16px;line-height:1.6;color:#9B9B9B;margin:0 0 32px;">
      Er is (nog) geen opname beschikbaar voor dit huiskamerconcert.
    </p>
    <a href="https://edstruijlaart.nl" style="display:inline-block;background:#B8860B;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;">Naar edstruijlaart.nl</a>
  </div>
</body>
</html>`, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Check of bootleg niet verlopen is → toon nette verlopen-pagina
    if (show.bootlegExpiresAt && new Date(show.bootlegExpiresAt) < new Date()) {
      const expiredDate = new Date(show.bootlegExpiresAt).toLocaleDateString('nl-NL', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      return new Response(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Opname niet meer beschikbaar</title>
</head>
<body style="margin:0;padding:0;background:#0F0F0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F0EDE8;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;padding:40px 24px;max-width:480px;">
    <p style="font-size:48px;margin:0 0 16px;">🎵</p>
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#B8860B;margin:0 0 16px;">Opname niet meer beschikbaar</h1>
    <p style="font-size:16px;line-height:1.6;color:#9B9B9B;margin:0 0 24px;">
      De opname van het huiskamerconcert in <strong style="color:#F0EDE8;">${show.city || 'onbekend'}</strong> was beschikbaar tot ${expiredDate}. Helaas is de downloadlink verlopen.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#6B6B6B;margin:0 0 32px;">
      Heb je de opname gemist? Neem contact op met Ed via <a href="mailto:ed@earswantmusic.nl" style="color:#B8860B;text-decoration:none;">ed@earswantmusic.nl</a>
    </p>
    <a href="https://edstruijlaart.nl" style="display:inline-block;background:#B8860B;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;">Naar edstruijlaart.nl</a>
  </div>
</body>
</html>`, {
        status: 410,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Increment download counter (fire and forget — redirect niet vertragen)
    sanityWriteClient
      .patch(show._id)
      .setIfMissing({ bootlegDownloads: 0 })
      .inc({ bootlegDownloads: 1 })
      .commit()
      .catch((err) => {
        console.error('Failed to increment bootleg download counter:', err);
      });

    // Detect iOS vs rest via User-Agent
    // iOS (iPhone/iPad/iPod): redirect zonder ?dl= → Safari toont luister/download keuzemenu
    // Android + Desktop: redirect met ?dl= → forceer download
    //   Android Chrome streamt anders 365MB inline (content-disposition: inline faalt)
    //   Desktop browsers proberen ook te streamen zonder ?dl=
    const userAgent = request.headers.get('user-agent') || '';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    const slug = show.slug?.current || show.city?.toLowerCase().replace(/\s+/g, '-') || 'opname';
    const downloadFilename = `bootleg-${slug}.m4a`;

    let downloadUrl: string;
    if (isIOS) {
      // iOS: geen ?dl= → content-disposition: inline → Safari toont luister/download keuze
      downloadUrl = show.bootlegUrl;
    } else {
      // Android + Desktop: ?dl= → content-disposition: attachment → direct downloaden
      const separator = show.bootlegUrl.includes('?') ? '&' : '?';
      downloadUrl = `${show.bootlegUrl}${separator}dl=${encodeURIComponent(downloadFilename)}`;
    }

    // Redirect naar de CDN URL
    return new Response(null, {
      status: 302,
      headers: {
        Location: downloadUrl,
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch (error) {
    console.error('Bootleg download error:', error);
    return new Response(JSON.stringify({ error: 'Er ging iets mis' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
