/**
 * Fanvragen (okt 2026): zes korte vragen, met Gitaarmannen 2 (Clapton Unplugged)
 * als cadeau. Doel: van de nieuwsbrief weten waar mensen wonen (regiomails per zaal),
 * wie gitaar speelt of lesgeeft, en hoe ze Ed hebben leren kennen.
 *
 * Eén bron voor pagina (/clapton) en endpoint (/api/fan): de server accepteert alleen
 * waarden die hier staan. Alles daarbuiten wordt weggegooid.
 *
 * Verwerking: het endpoint schrijft alleen een privé Sanity-document. Een script op
 * de Pi (/home/pi/listmonk/fan_sync.py) haalt die op via /api/fan-export, zet de
 * antwoorden in de Listmonk-attributen en wist het document daarna weer.
 */

/** Zip met de 16 nummers op de eigen CDN (geen WeTransfer: verloopt niet). Repo is openbaar, dus dit is
 *  geen geheim; het is een cadeau, wie de link vindt mag hem hebben. */
export const GM2_DOWNLOAD_URL =
  "https://cdn.earswantmusic.nl/downloads/gitaarmannen-2-clapton-unplugged-live-234d6d00.zip";

export const GITAAR = {
  nee: "Nee, ik luister alleen",
  beginner: "Ja, ik ben beginner",
  gevorderd: "Ja, al jaren",
  leraar: "Ik geef gitaarles",
} as const;

export const GEZIEN = {
  gm1: "Gitaarmannen: van Clapton tot Sheeran",
  gm2: "Gitaarmannen 2: Eric Clapton Unplugged",
  gm3: "Gitaarmannen 3: John Mayer",
  gm4: "Gitaarmannen 4: Continuum",
  geen: "Nog geen een",
} as const;

export const ZIN = {
  theater: "Een avond in het theater bij mij in de buurt",
  huiskamer: "Een huiskamerconcert bij mij thuis",
  workshop: "Een gitaarworkshop",
  podcast: "Gitaarmannen, de podcast",
} as const;

export const BRON = {
  radio: "Radio",
  podcast: "De podcast Gitaarmannen",
  theater: "In het theater",
  social: "Social media",
  vrienden: "Via vrienden of familie",
  anders: "Anders",
} as const;

export type GitaarKey = keyof typeof GITAAR;
export type GezienKey = keyof typeof GEZIEN;
export type ZinKey = keyof typeof ZIN;
export type BronKey = keyof typeof BRON;

export const MAX_WOONPLAATS = 60;
export const MAX_NAAM = 60;
export const MAX_VRIJ = 500;

/** Listmonk subscriber-UUID (v4) zoals Listmonk die in {{ .Subscriber.UUID }} zet. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Platte tekst: geen HTML, geen stuurtekens, witruimte samengevouwen, ingekort. */
export function schoon(v: unknown, max: number): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function eenVan<T extends string>(v: unknown, toegestaan: Record<T, string>): T | null {
  const s = String(v ?? "");
  return Object.prototype.hasOwnProperty.call(toegestaan, s) ? (s as T) : null;
}

export function deelVan<T extends string>(v: unknown, toegestaan: Record<T, string>): T[] {
  const lijst = Array.isArray(v) ? v : [];
  const uit: T[] = [];
  for (const x of lijst.slice(0, 10)) {
    const k = eenVan(x, toegestaan);
    if (k && !uit.includes(k)) uit.push(k);
  }
  return uit;
}
