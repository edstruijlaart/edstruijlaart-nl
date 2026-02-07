import { sanityClient } from './sanity';
import type { Show } from '../data/shows';

export async function fetchHuiskamerconcerten(): Promise<Show[]> {
  try {
    const now = new Date().toISOString();
    const results = await sanityClient.fetch(`
      *[_type == "show" && status == "live" && startDateTime > $now]
      | order(startDateTime asc) {
        startDateTime,
        city,
        ticketUrl,
        "slug": slug.current
      }
    `, { now });

    return (results || []).map((show: any) => ({
      date: show.startDateTime?.split('T')[0] || '',
      venue: `Huiskamerconcert ${show.city || ''}`,
      city: show.city || '',
      ticketUrl: show.ticketUrl || undefined,
      production: 'Huiskamerconcert',
      isHuiskamerconcert: true,
      showPageUrl: `/shows/${show.slug}`,
    }));
  } catch (error) {
    console.warn('Failed to fetch huiskamerconcerten:', error);
    return [];
  }
}
