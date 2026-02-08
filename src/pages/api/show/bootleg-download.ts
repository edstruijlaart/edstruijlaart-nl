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
      return new Response(JSON.stringify({ error: 'Geen bootleg beschikbaar voor deze show' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check of bootleg niet verlopen is
    if (show.bootlegExpiresAt && new Date(show.bootlegExpiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: 'Deze bootleg is verlopen' }), {
        status: 410, // Gone
        headers: { 'Content-Type': 'application/json' },
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
