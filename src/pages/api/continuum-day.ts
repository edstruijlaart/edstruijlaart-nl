export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import { LISTMONK_PUBLIC_API } from "../../data/gm3-funnel";
import { buildContinuumDayEmail } from "../../lib/continuum-day-email";

// Aanmelding voor Continuum Day (za 12 sep 2026, Isala Theater Capelle a/d IJssel).
// Aangeroepen vanaf gitaarmannen.nl/continuum-day (cross-origin, vandaar CORS).
// Doet: 1) inschrijven op de Continuum Day-lijst in Listmonk,
//       2) bevestigingsmail met programma + praktische info via Resend.

const CONTINUUM_DAY_LIST_UUID = "a7bbdabd-0da7-48e4-9019-ade58c9fff2e"; // lijst 71

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

  let body: { email?: string; name?: string; akkoord?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ongeldige aanvraag" }, 400);
  }

  const email = (body.email || "").trim();
  const name = (body.name || "").trim();

  if (!name || name.length < 2) {
    return json({ error: "Vul je naam in." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Vul een geldig e-mailadres in." }, 400);
  }
  if (body.akkoord !== true) {
    return json({ error: "Ga akkoord met de deelnamevoorwaarden." }, 400);
  }

  // 1) Inschrijven in Listmonk (public API, single opt-in)
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

  // 2) Bevestigingsmail
  const resendKey = import.meta.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY ontbreekt (continuum-day)");
    return json({ error: "Mailserver niet geconfigureerd." }, 500);
  }

  const { subject, html, text } = buildContinuumDayEmail({ name });
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

  return json({ ok: true });
};
