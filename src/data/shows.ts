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

export const shows: Show[] = [];
