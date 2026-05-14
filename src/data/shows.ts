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

// Fallback shows: deze worden getoond wanneer Bandsintown nog geen events heeft.
// Zodra de Bandsintown events live zijn (vrijdag 16 mei 09:00), nemen die het over.
export const shows: Show[] = [
  { date: "2026-09-24", venue: "Cascade", city: "Hendrik-Ido-Ambacht", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-09-25", venue: "Theater de Stoep", city: "Spijkenisse", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-10-02", venue: "Isala theater", city: "Capelle aan den IJssel", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-10-09", venue: "Junushoff", city: "Wageningen", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-10-16", venue: "Theater de Kampanje", city: "Den Helder", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-10-17", venue: "RensenTheater (19:00)", city: "Emmen", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-10-17", venue: "RensenTheater (21:15)", city: "Emmen", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-10-29", venue: "Schouwburg Agnietenhof", city: "Tiel", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-10-31", venue: "Theater de Mythe", city: "Goes", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-11-13", venue: "Aan de Slinger", city: "Houten", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-11-14", venue: "Kennemer Theater", city: "Beverwijk", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-11-27", venue: "Stadstheater", city: "Zoetermeer", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-11-28", venue: "Machine 3, Energiehuis", city: "Dordrecht", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-12-02", venue: "Theater Warenar", city: "Wassenaar", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-12-04", venue: "De Molenberg", city: "Delfzijl", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-12-08", venue: "De Goudse Schouwburg", city: "Gouda", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-12-16", venue: "Cool kunst en cultuur", city: "Heerhugowaard", production: "Gitaarmannen 4: Continuum" },
  { date: "2026-12-18", venue: "Deventer Schouwburg", city: "Deventer", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-01-07", venue: "Fulcotheater", city: "IJsselstein", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-01-08", venue: "Het Barghse Huus", city: "'s-Heerenberg", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-01-09", venue: "'t Mozaïek", city: "Wijchen", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-01-15", venue: "Ledeltheater", city: "Oostburg", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-01-16", venue: "BREStheater", city: "Brielle", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-01-23", venue: "Theater de Meerpaal", city: "Dronten", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-01-29", venue: "Cultuurcentrum van Beresteyn", city: "Veendam", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-02-05", venue: "Cultureel Centrum Bullekerk", city: "Zaandam", production: "Gitaarmannen 4: Continuum" },
  { date: "2027-03-12", venue: "Activiteitencentrum Het Punt", city: "Vroomshoop", production: "Gitaarmannen 4: Continuum" },
];
