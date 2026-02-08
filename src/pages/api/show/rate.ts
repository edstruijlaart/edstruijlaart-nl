export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient, sanityWriteClient } from '../../../lib/sanity';

/**
 * Post-show rating endpoint.
 * Ontvangt een rating (1-5) via een link in de herinneringsmail.
 *
 * GET /api/show/rate?show={slug}&r={1-5}
 *
 * Slaat de rating op als array in het Sanity show document
 * en toont een bedankpagina.
 */
export const GET: APIRoute = async ({ url }) => {
  const showSlug = url.searchParams.get('show');
  const rating = parseInt(url.searchParams.get('r') || '0', 10);

  if (!showSlug || rating < 1 || rating > 5) {
    return new Response('Ongeldige beoordeling', { status: 400 });
  }

  const ratingEmoji = ['', '😐', '🙂', '😊', '😍', '🤩'][rating];

  try {
    // Zoek show op basis van slug
    const show = await sanityClient.fetch(
      `*[_type == "show" && slug.current == $slug][0]{ _id, city }`,
      { slug: showSlug }
    );

    if (show) {
      // Sla rating op in Sanity (append aan ratings array)
      await sanityWriteClient
        .patch(show._id)
        .setIfMissing({ ratings: [] })
        .append('ratings', [{
          _key: Math.random().toString(36).slice(2, 10),
          rating,
          ratedAt: new Date().toISOString(),
        }])
        .commit();
    }

    // Toon bedankpagina
    return new Response(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bedankt!</title>
</head>
<body style="margin:0;padding:0;background:#0F0F0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F0EDE8;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;padding:40px 24px;max-width:480px;">
    <p style="font-size:64px;margin:0 0 16px;">${ratingEmoji}</p>
    <h1 style="font-family:Georgia,serif;font-size:24px;color:#B8860B;margin:0 0 16px;">Bedankt voor je beoordeling!</h1>
    <p style="font-size:16px;line-height:1.6;color:#9B9B9B;margin:0 0 32px;">
      Fijn dat je even de tijd hebt genomen. Dit helpt mij om de huiskamerconcerten nog leuker te maken.
    </p>
    <a href="https://edstruijlaart.nl" style="display:inline-block;background:#B8860B;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;">Naar edstruijlaart.nl</a>
  </div>
</body>
</html>`, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Rating error:', error);
    return new Response('Er ging iets mis', { status: 500 });
  }
};
