import type { Show } from '../data/shows';

const APP_ID = 'd72a16ef743c70791b513d9b5428f7a7';
const ARTIST = 'Ed Struijlaart';
const BASE_URL = 'https://rest.bandsintown.com';

interface BandsintownEvent {
  id: string;
  datetime: string;
  title: string;
  description: string;
  venue: {
    name: string;
    city: string;
    country: string;
    location: string;
  };
  offers: Array<{
    status: string;
    type: string;
    url: string;
  }>;
  sold_out: boolean;
}

export async function fetchBandsintownEvents(): Promise<Show[]> {
  try {
    const url = `${BASE_URL}/artists/${encodeURIComponent(ARTIST)}/events?app_id=${APP_ID}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Bandsintown API returned ${response.status}`);
      return [];
    }

    const events: BandsintownEvent[] = await response.json();

    return events.map((event) => {
      const ticketOffer = event.offers?.find((o) => o.type === 'Tickets' && o.status === 'available');

      return {
        date: event.datetime.split('T')[0],
        venue: extractVenueName(event),
        city: event.venue.city,
        ticketUrl: ticketOffer?.url || undefined,
        soldOut: event.sold_out,
        production: event.title || undefined,
      };
    });
  } catch (error) {
    console.warn('Failed to fetch Bandsintown events:', error);
    return [];
  }
}

// Bandsintown sometimes puts the show title in the venue name field
// Try to extract a real venue name, fall back to city
function extractVenueName(event: BandsintownEvent): string {
  const venueName = event.venue.name;
  // If venue name looks like it contains the show title, use the location instead
  if (
    venueName.toLowerCase().includes('gitaarmannen') ||
    venueName.toLowerCase().includes('alles op rood') ||
    venueName === event.title
  ) {
    return event.venue.location?.split(',')[0]?.trim() || event.venue.city;
  }
  return venueName;
}
