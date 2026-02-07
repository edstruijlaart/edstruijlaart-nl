export interface Show {
  date: string;
  venue: string;
  city: string;
  ticketUrl?: string;
  soldOut?: boolean;
  production?: string;
  isHuiskamerconcert?: boolean;
  showPageUrl?: string;
}

export const shows: Show[] = [
  {
    date: '2026-02-19',
    venue: 'Schouwburg Ogterop',
    city: 'Meppel',
    production: 'Gitaarmannen 3: John Mayer',
    ticketUrl: '#',
  },
  {
    date: '2026-02-21',
    venue: 'Stadsschouwburg',
    city: 'Groningen',
    production: 'Gitaarmannen 3: John Mayer',
    ticketUrl: '#',
  },
  {
    date: '2026-03-07',
    venue: 'Theater de Maagd',
    city: 'Bergen op Zoom',
    production: 'Gitaarmannen 3: John Mayer',
    ticketUrl: '#',
  },
  {
    date: '2026-03-14',
    venue: 'Schouwburg Amphion',
    city: 'Doetinchem',
    production: 'Gitaarmannen 3: John Mayer',
    ticketUrl: '#',
  },
  {
    date: '2026-03-21',
    venue: 'De Flint',
    city: 'Amersfoort',
    production: 'Gitaarmannen 3: John Mayer',
    ticketUrl: '#',
  },
  {
    date: '2026-04-18',
    venue: 'Stadsgehoorzaal',
    city: 'Leiden',
    production: 'Gitaarmannen 3: John Mayer',
    ticketUrl: '#',
  },
];
