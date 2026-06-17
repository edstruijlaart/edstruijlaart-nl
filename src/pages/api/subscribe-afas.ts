export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";
import {
  LISTMONK_PUBLIC_API,
  afasListUuids,
  resolveProvincie,
} from "../../data/afas-funnel";
import { dichtstbijzijndeShows, alleGM4Shows } from "../../data/gm3-funnel";
import { buildAfasWelcomeEmail } from "../../lib/afas-welcome-email";

// AFAS Live cadeau-funnel (reel -> landingspagina edstruijlaart.nl/afas).
// Doet: 1) woonplaats -> provincie, 2) inschrijven in Listmonk (funnel-lijst +
// provincie-lijst), 3) bedankmail met het concert + de GM4-speellijst via Resend.

export const POST: APIRoute = async ({ request }) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  let body: { email?: string; name?: string; woonplaats?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ongeldige aanvraag" }, 400);
  }

  const email = (body.email || "").trim().toLowerCase();
  const name = (body.name || "").trim();
  const woonplaats = (body.woonplaats || "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Vul een geldig e-mailadres in." }, 400);
  }

  // Woonplaats -> provincie (statische map, anders PDOK, anders null).
  const provincie = await resolveProvincie(woonplaats);
  const listUuids = afasListUuids(provincie);

  // 1) Inschrijven in Listmonk (public API, single opt-in, geen auth).
  try {
    const res = await fetch(LISTMONK_PUBLIC_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, list_uuids: listUuids }),
    });
    // 200 = nieuw, 409 = al ingeschreven. Beide is voor de bezoeker een succes.
    if (!res.ok && res.status !== 409) {
      const detail = await res.text().catch(() => "");
      console.error("Listmonk subscribe faalde", res.status, detail);
    }
  } catch (e) {
    console.error("Listmonk onbereikbaar", e);
    // Doorgaan: de bedankmail met de kijklink is de belangrijkste levering.
  }

  // 2) Bedankmail met het concert + de GM4-speellijst (dichtstbij bovenaan).
  const { subject, html, text } = buildAfasWelcomeEmail({
    name,
    provincie,
    dichtstbijShows: provincie ? dichtstbijzijndeShows(provincie) : [],
    alleShows: alleGM4Shows(),
  });

  const resendKey = import.meta.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const sent = await resend.emails.send({
        from: "Ed Struijlaart <ed@edstruijlaart.nl>",
        to: email,
        replyTo: "ed@edstruijlaart.nl",
        subject,
        html,
        text,
      });
      if ((sent as any)?.error) {
        console.error("Resend bedankmail fout", (sent as any).error);
      }
    } catch (e) {
      console.error("Resend onbereikbaar", e);
      // Niet fataal: de video staat al op de pagina, subscriber blijft staan.
    }
  } else {
    console.error("RESEND_API_KEY ontbreekt");
  }

  return json({ success: true, provincie });
};
