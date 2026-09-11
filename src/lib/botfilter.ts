/**
 * Botfilter voor inschrijfformulieren, gedeeld door /api/newsletter en /api/subscribe.
 *
 * Laag 1 (28 aug 2026): honeypot `website` moet leeg zijn, token `t` moet er zijn.
 * Dat stopte de bots die rechtstreeks JSON posten. Op 10/11 sep kwamen er weer
 * sigismail-adressen binnen via het nieuwsbriefformulier zelf: die bots draaien
 * een echte browser en vullen het formulier in, honeypot en token incluis.
 *
 * Laag 2 (11 sep 2026):
 *  - `t` is nu het moment waarop de pagina laadde (niet het moment van
 *    verzenden). Een mens heeft een paar seconden nodig om een adres in te
 *    typen; een bot vult en verzendt binnen een seconde. Te snel = bot.
 *    Te oud (uren) = herafspeelde inzending.
 *  - Wegwerpdomeinen die alleen bots gebruiken.
 *
 * Alles hier geeft alleen een oordeel; de aanroeper doet bij `bot` alsof het
 * gelukt is zonder iets op te slaan, zodat de bot niets leert.
 */

/** Minimale tijd tussen pagina laden en verzenden. */
const MIN_DWELL_MS = 4000;
/** Maximale leeftijd van het token: een tabblad dat een dag openstaat is nog
 *  best mogelijk, maar een token van dagen oud is een herafspeling. */
const MAX_AGE_MS = 36 * 60 * 60 * 1000;

const WEGWERP_DOMEINEN = new Set([
  "sigismail.com", "emalupe.com", "kliedu.us", "cecb.us",
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "yopmail.com", "trashmail.com", "sharklasers.com", "dispostable.com",
]);

export interface BotOordeel {
  bot: boolean;
  reden?: string;
}

export function beoordeel(input: {
  website: string | null | undefined;
  t: string | number | null | undefined;
  email: string;
}): BotOordeel {
  if (input.website !== "") return { bot: true, reden: "honeypot" };
  if (input.t === null || input.t === undefined || input.t === "") return { bot: true, reden: "geen token" };

  const t = Number(input.t);
  if (!Number.isFinite(t)) return { bot: true, reden: "token geen getal" };
  const leeftijd = Date.now() - t;
  if (leeftijd < MIN_DWELL_MS) return { bot: true, reden: `te snel (${Math.round(leeftijd)} ms)` };
  if (leeftijd > MAX_AGE_MS) return { bot: true, reden: "token te oud" };

  const domein = input.email.trim().toLowerCase().split("@")[1] || "";
  if (WEGWERP_DOMEINEN.has(domein)) return { bot: true, reden: `wegwerpdomein ${domein}` };

  return { bot: false };
}
