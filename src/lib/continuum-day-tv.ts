// Tijd voor Max (NPO 1), donderdag 10 september 2026: Ed neemt ~10 gitaristen mee
// voor een voorproefje van Continuum Day. Iedere deelnemer krijgt in de oproep-mail
// een persoonlijke link naar /continuum-day/tv; de token (HMAC over het e-mailadres)
// zorgt dat het formulier weet wie er invult zonder dat iemand voor een ander kan
// invullen door alleen een e-mailadres te raden.
import { createHmac, timingSafeEqual } from "node:crypto";

export const TV_DATUM_TEKST = "donderdag 10 september";
export const TV_DEADLINE_TEKST = "vrijdag 4 september";
export const TV_TIJD_TEKST = "ongeveer 14:30 tot 18:30";

export function tvToken(email: string, secret: string): string {
  return createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex").slice(0, 20);
}

export function tvTokenGeldig(email: string, token: string | null | undefined, secret: string): boolean {
  if (!token || token.length !== 20 || !secret) return false;
  const a = Buffer.from(tvToken(email, secret));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function tvLink(email: string, secret: string): string {
  const e = email.trim().toLowerCase();
  return `https://edstruijlaart.nl/continuum-day/tv?e=${encodeURIComponent(e)}&t=${tvToken(e, secret)}`;
}

export const TV_STATUSSEN = ["kandidaat", "gekozen", "reserve", "nee"] as const;
export type TvStatus = (typeof TV_STATUSSEN)[number];
