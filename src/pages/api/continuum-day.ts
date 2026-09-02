export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { LISTMONK_PUBLIC_API } from "../../data/gm3-funnel";
import { buildContinuumDayEmail } from "../../lib/continuum-day-email";
import { sanityWriteClient } from "../../lib/sanity";
import { INTERN_MAX } from "../../lib/continuum-day-capaciteit";

// Aanmelding voor Continuum Day (za 12 sep 2026, plein voor Beeld & Geluid, Media Park Hilversum).
// Aangeroepen vanaf gitaarmannen.nl/continuum-day (cross-origin, vandaar CORS).
// Doet: 1) aanmelding vastleggen in Sanity (de lotenlijst; naam + leeftijd = lot),
//       2) inschrijven op de Continuum Day-lijst in Listmonk,
//       3) bevestigingsmail (of wachtlijstmail boven INTERN_MAX) via Resend.
//
// Beveiliging (13 aug): honeypot-veld tegen bots, invoer-limieten + HTML-strip,
// best-effort rate-limit per IP, en idempotentie per e-mailadres zodat herhaalde
// POSTs niet telkens opnieuw een mail versturen (mail-bombing via andermans adres).
//
// Geo-filter (13 aug): de verloting is Benelux-only (Gedragscode Promotionele
// Kansspelen; de actie komt in een internationale podcast voorbij). IP's van
// buiten Europa krijgen een vriendelijke Engelse afwijzing richting #ContinuumDay;
// Europese IP's mogen door (vakantiegangers), de Benelux-checkbox is de juridische
// basis. Alleen de landcode wordt opgeslagen, niet het IP.

const CONTINUUM_DAY_LIST_UUID = "a7bbdabd-0da7-48e4-9019-ade58c9fff2e"; // lijst 71

// Ruim Europees: het filter hoeft alleen de overduidelijke gevallen (VS, Azië,
// Zuid-Amerika) te keren. Ontbreekt de header (lokaal draaien), dan laten we door.
const EUROPA = new Set([
  "AD", "AL", "AT", "BA", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES",
  "FI", "FR", "GB", "GG", "GI", "GR", "HR", "HU", "IE", "IM", "IS", "IT", "JE",
  "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT",
  "RO", "RS", "SE", "SI", "SK", "SM", "TR", "UA", "VA", "XK",
]);

const ALLOWED_ORIGINS = [
  "https://www.gitaarmannen.nl",
  "https://gitaarmannen.nl",
];

// Best-effort: per warme serverless-instance; vangt simpele scripts, geen vervanging
// voor echte rate-limiting maar ruim genoeg voor dit aanvalsoppervlak.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export const OPTIONS: APIRoute = ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });

export const POST: APIRoute = async ({ request }) => {
  const cors = corsHeaders(request.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...cors },
    });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  if (rateLimited(ip)) {
    return json({ error: "Te veel pogingen achter elkaar. Probeer het over een minuut nog eens." }, 429);
  }

  // Geo-filter: Vercel zet x-vercel-ip-country op elke request (spoofbare
  // inkomende waarden worden door de edge overschreven). Buiten Europa = nee.
  const land = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
  if (land && !EUROPA.has(land)) {
    return json(
      {
        error:
          "The guitar raffle is open to Benelux residents only, and you have to be in Hilversum (NL) on September 12 to take part. But you can play along wherever you are that day at 12:00 CEST — share it with #ContinuumDay!",
      },
      403
    );
  }

  let body: { email?: string; name?: string; akkoord?: boolean; benelux?: boolean; leeftijd?: number | string; website?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ongeldige aanvraag" }, 400);
  }

  // Honeypot: het verborgen 'website'-veld vult alleen een bot in. Stil ok teruggeven.
  if (body.website) {
    return json({ ok: true });
  }

  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const name = String(body.name || "").trim().replace(/[<>&"'`]/g, "").slice(0, 80);
  const leeftijd = Number(body.leeftijd);

  if (!name || name.length < 2) {
    return json({ error: "Vul je naam in." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Vul een geldig e-mailadres in." }, 400);
  }
  if (!Number.isInteger(leeftijd) || leeftijd < 4 || leeftijd > 109) {
    return json({ error: "Vul je leeftijd in." }, 400);
  }
  if (body.akkoord !== true) {
    return json({ error: "Ga akkoord met de deelnamevoorwaarden." }, 400);
  }
  if (body.benelux !== true) {
    return json({ error: "Bevestig dat je in de Benelux woont en er op 12 september bij bent." }, 400);
  }

  const emailKey = email.replace(/[^a-z0-9._-]/g, "-");
  const docId = `continuumDayAanmelding.${emailKey}`;

  // Idempotent: bestaat deze aanmelding al, dan is de bezoeker klaar en sturen we
  // GEEN nieuwe mail (voorkomt dat herhaalde POSTs iemands inbox volspammen).
  try {
    const existing = await sanityWriteClient.getDocument(docId);
    if (existing) {
      return json({ ok: true });
    }
  } catch {
    // Sanity onbereikbaar: door met de oude flow, liever een dubbele mail dan een verloren aanmelding.
  }

  // Wachtlijst: pas boven INTERN_MAX. Publiek staat de teller al op "vol" bij
  // PUBLIEK_MAX; daartussen laten we bewust door omdat een deel van de aanmelders
  // op de dag zelf niet komt opdagen (zie continuum-day-capaciteit.ts).
  let wachtlijst = false;
  try {
    const count = await sanityWriteClient.fetch<number>(
      `count(*[_type == "continuumDayAanmelding" && wachtlijst != true])`
    );
    wachtlijst = count >= INTERN_MAX;
  } catch (e) {
    console.error("Sanity count faalde (continuum-day)", e);
  }

  // Aanmelding vastleggen in Sanity: dit is de lotenlijst en de bron voor jongste/oudste.
  // createIfNotExists: dubbel aanmelden overschrijft niks. Faalt dit, dan gaat de
  // aanmelding gewoon door (Listmonk heeft naam + mail als vangnet).
  try {
    await sanityWriteClient.createIfNotExists({
      _id: docId,
      _type: "continuumDayAanmelding",
      naam: name,
      email,
      leeftijd,
      wachtlijst,
      land: land || "onbekend",
      aangemeldOp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Sanity aanmelding wegschrijven faalde (continuum-day)", e);
  }

  // Inschrijven in Listmonk (public API, single opt-in)
  try {
    const res = await fetch(LISTMONK_PUBLIC_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, list_uuids: [CONTINUUM_DAY_LIST_UUID] }),
    });
    // 200 = nieuw, 409 = al ingeschreven; beide zijn voor de bezoeker een succes.
    if (!res.ok && res.status !== 409) {
      const detail = await res.text().catch(() => "");
      console.error("Listmonk subscribe faalde (continuum-day)", res.status, detail);
    }
  } catch (e) {
    console.error("Listmonk onbereikbaar (continuum-day)", e);
    // Door: de bevestigingsmail is de belangrijkste levering richting de bezoeker.
  }

  // Bevestigings- of wachtlijstmail
  const resendKey = import.meta.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY ontbreekt (continuum-day)");
    return json({ error: "Mailserver niet geconfigureerd." }, 500);
  }

  const { subject, html, text } = buildContinuumDayEmail({ name, wachtlijst });
  try {
    const resend = new Resend(resendKey);
    const sent = await resend.emails.send({
      from: "Ed Struijlaart <ed@edstruijlaart.nl>",
      to: email,
      replyTo: "ed@earswantmusic.nl",
      subject,
      html,
      text,
    });
    if ((sent as any)?.error) {
      console.error("Resend bevestigingsmail fout (continuum-day)", (sent as any).error);
      return json({ error: "Mail versturen mislukte, probeer het later opnieuw." }, 500);
    }
  } catch (e) {
    console.error("Resend exception (continuum-day)", e);
    return json({ error: "Mail versturen mislukte, probeer het later opnieuw." }, 500);
  }

  return json({ ok: true, wachtlijst });
};
