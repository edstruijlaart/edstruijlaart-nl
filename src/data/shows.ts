export interface Show {
  date: string;
  time?: string;
  venue: string;
  city: string;
  ticketUrl?: string;
  soldOut?: boolean;
  production?: string;
  isHuiskamerconcert?: boolean;
  showPageUrl?: string;
  /** True = akoestische show (Ed + gitarist). Zonder deze vlag: full band. */
  acoustic?: boolean;
  /** Listmonk list UUID voor "krijg een herinnering / updates voor deze show" */
  listmonkUuid?: string;
}

// Single source of truth voor de agenda op edstruijlaart.nl
// Per show is er een Listmonk lijst (zie listmonkUuid) waar bezoekers zich
// op kunnen abonneren via de modal in ShowList.astro.
export const shows: Show[] = [
  { date: "2026-09-24", time: "20:15", venue: "Cascade", city: "Hendrik-Ido-Ambacht", ticketUrl: "https://www.cascade.nl/agenda/ed-struijlaart-gitaarmannen-4-continuum-20-jaar-john-mayers-meesterwerk-try-out/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "f4caad4a-30e8-424b-9813-d7b1dbecdfca" },
  { date: "2026-09-25", time: "20:30", venue: "Theater de Stoep", city: "Spijkenisse", ticketUrl: "https://theaterdestoep.nl/voorstelling/ed-struijlaart-2627", production: "Gitaarmannen 4: Continuum", listmonkUuid: "9be61522-ff37-4ec3-bff0-4431eac83505" },
  { date: "2026-10-02", time: "20:15", venue: "Isala theater", city: "Capelle aan den IJssel", ticketUrl: "https://www.isalatheater.nl/agenda/ed-struijlaart-ryf3", production: "Gitaarmannen 4: Continuum", listmonkUuid: "62b78b63-1d09-421f-85c5-21cd5dc0b888" },
  { date: "2026-10-09", time: "20:30", venue: "Junushoff", city: "Wageningen", ticketUrl: "https://www.junushoff.nl/programma/ed-struijlaart-7pg4", production: "Gitaarmannen 4: Continuum", listmonkUuid: "c455d506-8cda-4193-892f-ca7975291a41" },
  { date: "2026-10-16", time: "20:30", venue: "Theater de Kampanje", city: "Den Helder", ticketUrl: "https://www.kampanje.nl/voorstellingen/ed-struijlaart-83f9", production: "Gitaarmannen 4: Continuum", listmonkUuid: "2a440730-1b5c-47c1-b467-89cfc73fa6a7" },
  { date: "2026-10-17", time: "19:00", venue: "RensenTheater (19:00)", city: "Emmen", ticketUrl: "https://ticketshop.eventree.nl/shop/4073236b-c9c1-4fb1-9891-31c4e16587e7/event/3775", production: "Gitaarmannen 4: Continuum", listmonkUuid: "b949957f-6d53-4c78-8380-e139b9444c96", acoustic: true },
  { date: "2026-10-17", time: "21:15", venue: "RensenTheater (21:15)", city: "Emmen", ticketUrl: "https://ticketshop.eventree.nl/shop/4073236b-c9c1-4fb1-9891-31c4e16587e7/event/3775", production: "Gitaarmannen 4: Continuum", listmonkUuid: "3c2a0c62-9581-405a-af37-4ed487d3b516", acoustic: true },
  { date: "2026-10-29", time: "20:00", venue: "Schouwburg Agnietenhof", city: "Tiel", ticketUrl: "https://www.agnietenhof.nl/agenda/ed-struijlaart-gitaarmannen-4-continuum-m1hx", production: "Gitaarmannen 4: Continuum", listmonkUuid: "417ca920-10f6-489a-9975-83059c184195" },
  { date: "2026-10-31", time: "20:00", venue: "Theater de Mythe", city: "Goes", ticketUrl: "https://www.zeelandtheaters.nl/programma/ed-struijlaart-gitaarmannen-4-continuum/31-10-2026-20-00", production: "Gitaarmannen 4: Continuum", listmonkUuid: "04c522c8-efd0-4663-afcb-960e60ded899" },
  { date: "2026-11-13", time: "20:00", venue: "Aan de Slinger", city: "Houten", ticketUrl: "https://www.aandeslinger.nl/programma/gitaarmannen-4-continuum-20-jaar-john-mayers-meesterwerk", production: "Gitaarmannen 4: Continuum", listmonkUuid: "fae16187-d868-4071-9963-c0ae0aca986f" },
  { date: "2026-11-14", time: "20:15", venue: "Kennemer Theater", city: "Beverwijk", ticketUrl: "https://www.kennemertheater.nl/programma/ed-struijlaart-8h88", production: "Gitaarmannen 4: Continuum", listmonkUuid: "e8c9b0e8-23b5-43a0-8991-4b4b19039242" },
  { date: "2026-11-27", time: "20:30", venue: "Stadstheater", city: "Zoetermeer", ticketUrl: "https://stadstheater.nl/voorstelling/ed-struijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "0bfd57a0-62f0-482f-9996-ba60bf6ef4c1" },
  { date: "2026-11-28", time: "20:00", venue: "Machine 3, Energiehuis", city: "Dordrecht", ticketUrl: "https://www.kunstmin.nl/voorstellingen/ed-struijlaart-gitaarmannen-4-continuum/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "fd7279ed-f242-43ce-9541-02d26d55057b" },
  { date: "2026-12-02", time: "20:15", venue: "Theater Warenar", city: "Wassenaar", ticketUrl: "https://www.warenar.nl/productie/ed-struijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "1fa664f2-a785-4f1c-852f-164226a5d291" },
  { date: "2026-12-04", time: "20:15", venue: "De Molenberg", city: "Delfzijl", ticketUrl: "https://www.demolenberg.nl/voorstellingen/ed-struijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "8ee6fa00-4342-4c21-8c0d-9448d84efb01", acoustic: true },
  { date: "2026-12-08", time: "20:30", venue: "De Goudse Schouwburg", city: "Gouda", ticketUrl: "https://goudseschouwburg.nl/agenda/ed-struijlaart-gitaarmannen-4-10025204/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "74dee13c-c6d7-43d6-9dbe-aac15ac1daf5" },
  { date: "2026-12-16", time: "20:15", venue: "Cool kunst en cultuur", city: "Heerhugowaard", ticketUrl: "https://www.coolkunstencultuur.nl/theater/agenda/seizoen-2026-2027/ed-struijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "e8a90a06-44b6-4958-a08e-906cedebcbe4" },
  { date: "2026-12-18", time: "20:30", venue: "Deventer Schouwburg", city: "Deventer", ticketUrl: "https://deventerschouwburg.nl/zoeken?q=ed+struijlaart", production: "Gitaarmannen 4: Continuum", listmonkUuid: "7ea699e1-d361-4c42-8e15-aa87eb17abaa" },
  { date: "2027-01-07", time: "20:00", venue: "Fulcotheater", city: "IJsselstein", ticketUrl: "https://www.fulcotheater.nl/ed-struijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "85e2ea3b-07b8-4d34-8d1f-cdd95ee68636" },
  { date: "2027-01-08", time: "20:00", venue: "Het Barghse Huus", city: "'s-Heerenberg", ticketUrl: "https://barghsehuus.nl/struijlaart2/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "34de60cb-75dc-4036-a1a4-3c908946964a", acoustic: true },
  { date: "2027-01-09", time: "20:15", venue: "'t Mozaïek", city: "Wijchen", ticketUrl: "https://www.mozaiekwijchen.nl/voorstelling-seizoen-2627-ed-struijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "0522593c-a327-4429-b7a3-fe41d35a7aa4" },
  { date: "2027-01-15", time: "20:00", venue: "Ledeltheater", city: "Oostburg", production: "Gitaarmannen 4: Continuum", listmonkUuid: "26c6945a-d7e6-409b-8d71-b64585fc54eb" },
  { date: "2027-01-16", time: "20:30", venue: "BREStheater", city: "Brielle", ticketUrl: "https://brestheater.nl/voorstelling/edstruijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "fa0c3fb5-49ee-4e0e-bf02-2366a3852b6a" },
  { date: "2027-01-23", time: "20:30", venue: "Theater de Meerpaal", city: "Dronten", ticketUrl: "https://www.meerpaal.nl/agenda/ed-struijlaart-gitaarmannen-4-continuum-20-jaar-john-mayers-meesterwerk", production: "Gitaarmannen 4: Continuum", listmonkUuid: "cf65097d-2c71-44fe-9120-114dc7ae69dc" },
  { date: "2027-01-29", time: "20:15", venue: "Cultuurcentrum van Beresteyn", city: "Veendam", ticketUrl: "https://www.vanberesteyn.nl/programma/ed-struijlaart/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "1880216e-fcee-43a0-8fcc-f0f5f79bda55" },
  { date: "2027-02-05", time: "20:00", venue: "Cultureel Centrum Bullekerk", city: "Zaandam", ticketUrl: "https://bullekerk.nl/agenda/ed-struijlaart-gitaarmannen-4-continuum/", production: "Gitaarmannen 4: Continuum", listmonkUuid: "b6ac3a7d-9d1d-456e-a3de-ed1a346b236b" },
  { date: "2027-03-12", time: "20:00", venue: "Activiteitencentrum Het Punt", city: "Vroomshoop", production: "Gitaarmannen 4: Continuum", listmonkUuid: "e240cbd8-7d37-4e7b-9794-58ddea3934b3", acoustic: true },
];
