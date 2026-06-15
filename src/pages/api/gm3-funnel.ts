export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import {
  LISTMONK_PUBLIC_API,
  listUuidsVoorProvincie,
  dichtstbijzijndeShows,
  alleGM4Shows,
  isProvincie,
} from "../../data/gm3-funnel";
import { buildWelcomeEmail } from "../../lib/gm3-welcome-email";

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

  let body: { email?: string; name?: string; provincie?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ongeldige aanvraag" }, 400);
  }

  const email = (body.email || "").trim();
  const name = (body.name || "").trim();
  const provincie = (body.provincie || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Vul een geldig e-mailadres in." }, 400);
  }
  if (!isProvincie(provincie)) {
    return json({ error: "Kies je provincie." }, 400);
  }

  const listUuids = listUuidsVoorProvincie(provincie);

  // 1) Inschrijven in Listmonk (public API, single opt-in, geen auth nodig)
  try {
    const res = await fetch(LISTMONK_PUBLIC_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, list_uuids: listUuids }),
    });
    // Listmonk geeft 200 bij nieuw, 409 als al ingeschreven. Beide zijn voor de
    // bezoeker een succes (ze krijgen sowieso de mail met de link).
    if (!res.ok && res.status !== 409) {
      const detail = await res.text().catch(() => "");
      console.error("Listmonk subscribe faalde", res.status, detail);
    }
  } catch (e) {
    console.error("Listmonk onbereikbaar", e);
    // We gaan door: de welkomstmail met de kijk-link is de belangrijkste levering.
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

    // 3) Notificatie naar Ed (fire-and-forget, mag falen)
    try {
      await resend.emails.send({
        from: "Ed Struijlaart <ed@edstruijlaart.nl>",
        to: "ed@earswantmusic.nl",
        subject: `GM3-funnel: ${name || "iemand"} uit ${provincie}`,
        text: `Nieuwe aanmelding voor de gratis GM3-registratie:\n\nNaam: ${name || "(niet ingevuld)"}\nEmail: ${email}\nProvincie: ${provincie}\nLijsten: ${listUuids.length}\nTijd: ${new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}`,
      });
    } catch {
      // notificatie mag falen
    }
  } catch (e) {
    console.error("Resend onbereikbaar", e);
    return json({ error: "Versturen mislukte, probeer het zo nog eens." }, 502);
  }

  return json({ success: true });
};
