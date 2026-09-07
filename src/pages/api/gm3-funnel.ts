export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import {
  listUuidsVoorProvincie,
  dichtstbijzijndeShows,
  alleGM4Shows,
  isProvincie,
} from "../../data/gm3-funnel";
import { buildWelcomeEmail } from "../../lib/gm3-welcome-email";
import { showOpMoment } from "../../lib/show-uit-tijdstip";
import { subscribe } from "../../lib/listmonk";

// Aanmelding voor de gratis GM3-registratie (funnel naar GM4 Continuum).
// Aangeroepen vanaf gitaarmannen.nl/john-mayer (cross-origin, vandaar CORS).
// Doet: 1) inschrijven in Listmonk (funnel-lijst + per-theater lijsten in de buurt),
//       2) welkomstmail met de hele GM4-speellijst + ticketlinks via Resend,
//       3) notificatie naar Ed met de provincie.

const ALLOWED_ORIGINS = [
  "https://www.gitaarmannen.nl",
  "https://gitaarmannen.nl",
];

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

  let body: { email?: string; name?: string; provincie?: string; bron?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ongeldige aanvraag" }, 400);
  }

  const email = (body.email || "").trim();
  const name = (body.name || "").trim();
  const provincie = (body.provincie || "").trim();
  const bron = (body.bron || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Vul een geldig e-mailadres in." }, 400);
  }
  if (!isProvincie(provincie)) {
    return json({ error: "Kies je provincie." }, 400);
  }

  const listUuids = listUuidsVoorProvincie(provincie);

  // Kwam deze aanmelding uit de zaal (QR-code op het scherm, of de flyer)?
  // Dan weten we uit de speellijst welke show het was, en hoeft de bezoeker dat
  // niet zelf in te vullen. Alleen bij bron=theater, want een online-aanmelding
  // die toevallig tijdens een voorstelling binnenkomt is géén bezoeker.
  const treffer = bron === "theater" ? showOpMoment() : null;
  if (treffer && !listUuids.includes(treffer.listmonkUuid)) {
    listUuids.push(treffer.listmonkUuid);
  }

  // 1) Inschrijven in Listmonk via de beheer-API (single opt-in). Bestaat het
  //    adres al, dan komen alleen de lijsten erbij; dat is voor de bezoeker ook
  //    een succes. Faalt het, dan gaan we door: de welkomstmail met de
  //    kijk-link is de belangrijkste levering.
  const inschrijving = await subscribe({ email, name, listUuids });
  if (!inschrijving.ok && inschrijving.status === "error") {
    console.error("Listmonk subscribe faalde (gm3-funnel)", inschrijving.error);
  }

  // 2) Welkomstmail met cadeau + volledige speellijst + ticketlinks
  const { subject, html, text } = buildWelcomeEmail({
    name,
    provincie,
    dichtstbijShows: dichtstbijzijndeShows(provincie as any),
    alleShows: alleGM4Shows(),
  });

  const resendKey = import.meta.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY ontbreekt");
    return json({ error: "Mailserver niet geconfigureerd." }, 500);
  }

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
      const err = (sent as any).error;
      console.error("Resend welkomstmail fout", err);
      return json({ error: "Versturen mislukte, probeer het zo nog eens.", detail: err?.message || String(err) }, 502);
    }

    // Geen per-aanmelding notificatie meer naar Ed (was overkill bij volume).
    // Overzicht loopt via een dagelijkse samenvatting + Listmonk + Umami.
  } catch (e) {
    console.error("Resend onbereikbaar", e);
    return json({ error: "Versturen mislukte, probeer het zo nog eens." }, 502);
  }

  return json({ success: true });
};
