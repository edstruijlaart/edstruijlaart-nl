export const prerender = false;

import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { sanityWriteClient } from "../../lib/sanity";
import { beoordeel } from "../../lib/botfilter";
import { resolveProvincie } from "../../data/afas-funnel";
import {
  GM2_DOWNLOAD_URL, GITAAR, GEZIEN, ZIN, BRON, UUID_RE,
  MAX_NAAM, MAX_VRIJ, MAX_WOONPLAATS, schoon, eenVan, deelVan,
} from "../../data/fan-vragen";

/**
 * Fanvragen (/clapton). Twee ingangen:
 *  - vanuit de nieuwsbrief: persoonlijke link met ?u=<subscriber-uuid>, geen e-mail nodig;
 *  - vanuit social: voornaam + e-mail.
 *
 * Bewust klein aanvalsoppervlak:
 *  - Dit endpoint praat NIET met Listmonk. Het schrijft alleen een privé
 *    Sanity-document (punt in het _id = alleen met token leesbaar). De Pi
 *    verwerkt dat elk kwartier en wist het daarna (zie fan-export.ts).
 *  - Het verstuurt geen mail, dus het kan niet gebruikt worden om iemands inbox
 *    te bestoken.
 *  - Alleen waarden uit fan-vragen.ts worden geaccepteerd; vrije tekst wordt
 *    platte tekst en ingekort.
 *  - Botfilter (honeypot, minimale invultijd, wegwerpdomeinen) + rate-limit per IP.
 *  - Elk antwoord is hetzelfde, of iemand al op de lijst staat of niet: niemand
 *    kan via dit formulier uitzoeken of een adres bij Ed ingeschreven is.
 */

const hits = new Map<string, number[]>();
function teVaak(ip: string): boolean {
  const nu = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => nu - t < 60_000);
  recent.push(nu);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 6;
}

const ORIGINS = new Set(["https://www.edstruijlaart.nl", "https://edstruijlaart.nl"]);

export const POST: APIRoute = async ({ request }) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  // Alleen vanaf de eigen site (formulieren elders kunnen hier niet op posten).
  const origin = request.headers.get("origin");
  if (origin && !ORIGINS.has(origin) && !origin.startsWith("http://localhost")) {
    return json({ error: "Niet toegestaan." }, 403);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  if (teVaak(ip)) return json({ error: "Even rustig aan. Probeer het over een minuut nog eens." }, 429);

  let b: Record<string, unknown>;
  try {
    const tekst = await request.text();
    if (tekst.length > 8000) return json({ error: "Ongeldige aanvraag." }, 400);
    b = JSON.parse(tekst);
  } catch {
    return json({ error: "Ongeldige aanvraag." }, 400);
  }

  const uuid = String(b.u ?? "").trim();
  const viaMail = UUID_RE.test(uuid);
  const email = viaMail ? "" : String(b.email ?? "").trim().toLowerCase().slice(0, 200);
  const naam = viaMail ? "" : schoon(b.naam, MAX_NAAM);

  // Bot? Dan doen we alsof het gelukt is, zonder iets op te slaan en zonder download.
  const oordeel = beoordeel({ website: b.website as string, t: b.t as string, email });
  if (oordeel.bot) {
    console.warn("fan: bot geweigerd", oordeel.reden);
    return json({ ok: true });
  }

  if (!viaMail) {
    if (naam.length < 2) return json({ error: "Vul je voornaam in." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "Vul een geldig e-mailadres in." }, 400);
  }

  const woonplaats = schoon(b.woonplaats, MAX_WOONPLAATS);
  if (woonplaats.length < 2) return json({ error: "Vul je woonplaats in." }, 400);

  const gitaar = eenVan(b.gitaar, GITAAR);
  if (!gitaar) return json({ error: "Laat weten of je zelf gitaar speelt." }, 400);

  const gezien = deelVan(b.gezien, GEZIEN);
  const zin = deelVan(b.zin, ZIN);
  const bron = eenVan(b.bron, BRON);
  const vrij = schoon(b.vrij, MAX_VRIJ);
  const regio = b.regio === true;

  let provincie: string | null = null;
  try {
    provincie = await resolveProvincie(woonplaats);
  } catch {
    provincie = null; // dan zoekt de Pi het later nog een keer op
  }

  // Eén document per persoon: opnieuw invullen overschrijft het vorige antwoord.
  const sleutel = viaMail ? `u:${uuid.toLowerCase()}` : `e:${email}`;
  const hash = createHash("sha256").update(sleutel).digest("hex").slice(0, 32);

  try {
    await sanityWriteClient.createOrReplace({
      _id: `prive.fanantwoord-${hash}`,
      _type: "fanAntwoord",
      ...(viaMail ? { uuid: uuid.toLowerCase() } : { email, naam }),
      woonplaats,
      provincie,
      gitaar,
      gezien,
      zin,
      bron,
      vrij,
      regio,
      ingevuld: new Date().toISOString(),
    });
  } catch (e) {
    console.error("fan: opslaan mislukt", e);
    return json({ error: "Er ging iets mis bij het opslaan. Probeer het zo nog eens." }, 502);
  }

  return json({ ok: true, download: GM2_DOWNLOAD_URL });
};
