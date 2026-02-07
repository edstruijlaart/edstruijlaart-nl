export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient } from '../lib/sanity';

export const GET: APIRoute = async () => {
  const now = new Date().toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Actieve show (gestart, maar minder dan 24u geleden)
  const activeShow = await sanityClient.fetch(`
    *[_type == "show" && status == "live" && startDateTime > $oneDayAgo && startDateTime < $now]
    | order(startDateTime desc) [0] { "slug": slug.current }
  `, { now, oneDayAgo });

  if (activeShow?.slug) {
    return Response.redirect(new URL(`/shows/${activeShow.slug}`, 'https://edstruijlaart.nl'), 302);
  }

  // 2. Eerstvolgende toekomstige show
  const nextShow = await sanityClient.fetch(`
    *[_type == "show" && status == "live" && startDateTime > $now]
    | order(startDateTime asc) [0] { "slug": slug.current }
  `, { now });

  if (nextShow?.slug) {
    return Response.redirect(new URL(`/shows/${nextShow.slug}`, 'https://edstruijlaart.nl'), 302);
  }

  // 3. Fallback naar tour/agenda pagina
  return Response.redirect(new URL('/tour/', 'https://edstruijlaart.nl'), 302);
};
