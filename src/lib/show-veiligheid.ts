/**
 * Veiligheidslogica voor de huiskamerconcert-flow (showpagina's, aanmelden, herinneringsmail,
 * gastenboek, bootleg). Bewust zonder Astro- of Sanity-imports, zodat
 * `node scripts/toets-show-veiligheid.mjs` hem los kan toetsen.
 *
 * Achtergrond: audit 5 okt 2026, bevindingen #9, #22, #23, #42, #43.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const MINUUT = 60 * 1000;
const UUR = 60 * MINUUT;

/** HTML-escape voor alles wat een bezoeker invult en in een mail of pagina belandt. */
export function escapeHtml(waarde: unknown): string {
  return String(waarde ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normaliseerEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

/** Een show telt mee zolang hij niet gearchiveerd is. NIET filteren op status == 'live':
 *  handmatig aangemaakte pagina's staan op 'draft' en na de herinneringsmail op 'past'. */
export function isActieveShow(show: { status?: string | null } | null | undefined): boolean {
  return !!show && show.status !== 'archived';
}

/**
 * Het aanmeldformulier staat op de pagina vanaf de aanvang tot 24 uur erna. De server houdt
 * hetzelfde venster aan, met een kwartier speling ervoor (klok, herladen op de aanvang) en een
 * half uur erna (pagina net voor het einde geladen).
 */
export const AANMELD_VOOR_MS = 15 * MINUUT;
export const AANMELD_NA_MS = 24 * UUR + 30 * MINUUT;

export function binnenAanmeldvenster(startDateTime: string | null | undefined, nu: Date = new Date()): boolean {
  const start = Date.parse(String(startDateTime || ''));
  if (!Number.isFinite(start)) return false;
  const t = nu.getTime();
  return t >= start - AANMELD_VOOR_MS && t <= start + AANMELD_NA_MS;
}

/** Gastenboek en foto's staan pas op de pagina na de aanvang (en blijven daarna open). */
export function isGestart(startDateTime: string | null | undefined, nu: Date = new Date()): boolean {
  const start = Date.parse(String(startDateTime || ''));
  return Number.isFinite(start) && nu.getTime() >= start - AANMELD_VOOR_MS;
}

/**
 * Directe 'late' herinneringsmail na aanmelden: alleen als de herinneringsronde voor deze show al
 * is geweest én de aanvang meer dan 12 uur geleden is. Zo krijgt niemand midden in een verplaatst
 * concert al 'Bedankt dat je er was'.
 */
export function magLateHerinneringSturen(
  show: { reminderSent?: boolean | null; startDateTime?: string | null },
  nu: Date = new Date(),
): boolean {
  const start = Date.parse(String(show?.startDateTime || ''));
  return !!show?.reminderSent && Number.isFinite(start) && nu.getTime() - start > 12 * UUR;
}

export interface HerinneringsRij {
  _id: string;
  email: string;
  reminderSentAt?: string | null;
}

/**
 * Wie krijgt er in deze ronde een herinneringsmail? Ontdubbelt op e-mailadres (zonder
 * hoofdletters/spaties), ook tegen adressen die in een eerdere ronde al een mail kregen.
 */
export function planHerinneringen<T extends HerinneringsRij>(rijen: T[]): { versturen: T[]; dubbel: T[] } {
  const gehad = new Set(rijen.filter((r) => r.reminderSentAt).map((r) => normaliseerEmail(r.email)));
  const versturen: T[] = [];
  const dubbel: T[] = [];
  for (const rij of rijen) {
    if (rij.reminderSentAt) continue;
    const email = normaliseerEmail(rij.email);
    if (!email) continue;
    if (gehad.has(email)) {
      dubbel.push(rij);
    } else {
      gehad.add(email);
      versturen.push(rij);
    }
  }
  return { versturen, dubbel };
}

/** Vergelijk een meegestuurde sleutel met het geheim uit env, in constante tijd.
 *  Geen geheim ingesteld = altijd nee. */
export function geheimKlopt(gegeven: string | null | undefined, verwacht: string | null | undefined): boolean {
  if (!verwacht || !gegeven) return false;
  const a = new Uint8Array(createHash('sha256').update(String(gegeven)).digest());
  const b = new Uint8Array(createHash('sha256').update(String(verwacht)).digest());
  return timingSafeEqual(a, b);
}

function hmac(doel: string, secret: string): string {
  return createHmac('sha256', secret).update(doel).digest('hex').slice(0, 32);
}

/** Bewijs dat iemand zich voor deze show heeft aangemeld (aanmelding = emailSignup-document). */
export function bootlegToken(showId: string, signupId: string, secret: string): string {
  return hmac(`bootleg:${showId}:${signupId}`, secret);
}

export function bootlegDownloadPad(showId: string, signupId: string, secret: string): string {
  const q = new URLSearchParams({ show: showId, s: signupId, t: bootlegToken(showId, signupId, secret) });
  return `/api/show/bootleg-download?${q.toString()}`;
}

export type ModeratieType = 'guestbook' | 'photo';

export function moderatieToken(showId: string, type: ModeratieType, key: string, secret: string): string {
  return hmac(`moderatie:${showId}:${type}:${key}`, secret);
}

export function tokenKlopt(gegeven: string | null | undefined, verwacht: string): boolean {
  return geheimKlopt(gegeven, verwacht);
}

/** _key van gastenboek- en foto-items: zelf gegenereerd, base36. Strak houden, want hij gaat
 *  in een Sanity-patchpad. */
export function isGeldigeItemKey(key: unknown): key is string {
  return typeof key === 'string' && /^[a-z0-9]{1,12}$/.test(key);
}

/** Sanity document-id's: letters, cijfers, punt, streep, underscore. */
export function isGeldigDocId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9._-]{1,128}$/.test(id);
}

/**
 * Is dit mailadres dat van de gastheer? De dataset is publiek leesbaar (gratis Sanity-plan, geen
 * privé dataset mogelijk), dus het showdocument bevat sinds 5 okt 2026 alleen een SHA-256-hash
 * van het genormaliseerde adres (hostEmailHash, zelfde normalisatie als host_email_hash() in
 * sanity_sync.py van de Gig Manager). Oude documenten hebben nog een leesbaar hostEmail.
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update((email || '').trim().toLowerCase(), 'utf8').digest('hex');
}

export function isGastheer(show: { hostEmail?: string; hostEmailHash?: string }, email: string): boolean {
  if (!email) return false;
  if (show.hostEmailHash) return show.hostEmailHash === hashEmail(email);
  return !!(show.hostEmail && email.trim().toLowerCase() === show.hostEmail.trim().toLowerCase());
}
