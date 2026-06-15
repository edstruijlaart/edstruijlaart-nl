// Welkomstmail voor de Gitaarmannen 3 cadeau-funnel.
// Wordt direct na aanmelding verstuurd via Resend (zie /api/gm3-funnel).
// Bevat: de 4K-kijklink, de show(s) in de provincie van de aanmelder bovenaan,
// en de volledige GM4-speellijst met ticketlinks. In Ed's stem, geen em-dashes.

import type { Show } from "../data/shows";
import { GM3_KIJK_URL } from "../data/gm3-funnel";

const MAANDEN = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const DAGEN = ["zo","ma","di","wo","do","vr","za"];

function nlDatum(iso: string): string {
  // iso = "2026-09-24"
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DAGEN[dt.getUTCDay()]} ${d} ${MAANDEN[m - 1]} ${y}`;
}

function showRow(s: Show, opts: { highlight?: boolean } = {}): string {
  const datum = nlDatum(s.date);
  const tijd = s.time ? ` &middot; ${s.time}` : "";
  const plaats = `${s.venue}, ${s.city}`;
  const ticket = s.ticketUrl
    ? `<a href="${s.ticketUrl}" style="color:#B8860B;font-weight:600;text-decoration:none;white-space:nowrap;">Tickets &rsaquo;</a>`
    : `<span style="color:#9b9b9b;white-space:nowrap;">Binnenkort</span>`;
  const bg = opts.highlight ? "background:#fbf6e9;" : "";
  return `
  <tr>
    <td style="padding:10px 12px;border-bottom:1px solid #ececec;${bg}">
      <span style="color:#1a1a1a;font-weight:600;">${datum}${tijd}</span><br>
      <span style="color:#5a5a55;font-size:14px;">${plaats}</span>
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #ececec;text-align:right;${bg}">${ticket}</td>
  </tr>`;
}

export interface WelcomeEmailInput {
  name?: string;
  provincie: string;
  dichtstbijShows: Show[];
  alleShows: Show[];
}

export function buildWelcomeEmail(input: WelcomeEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const naam = (input.name || "").trim();
  const hi = naam ? `Hey ${naam},` : "Hey,";

  const dichtbij = input.dichtstbijShows.slice(0, 3);
  const dichtbijBlok = dichtbij.length
    ? `
    <p style="margin:24px 0 8px;color:#1a1a1a;font-size:16px;">
      En je vroeg of ik bij jou in de buurt kom. Dit staat het dichtst bij ${input.provincie}:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      ${dichtbij.map((s) => showRow(s, { highlight: true })).join("")}
    </table>`
    : "";

  const alleRijen = input.alleShows.map((s) => showRow(s)).join("");

  const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <tr><td style="background:#0f0f0f;padding:22px 28px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.04em;">GITAARMANNEN 3 &middot; JOHN MAYER</span>
  </td></tr>

  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;line-height:1.6;">${hi}</p>
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;line-height:1.6;">
      Bedankt. Je staat erbij, en je cadeau staat klaar. Hier is de volledige Gitaarmannen 3 theatershow, twee uur John Mayer met band, opgenomen in 4K. Het bluesy John Mayer Trio, Born and Raised, Gravity, Slow Dancing in a Burning Room, Neon, Stop This Train. Het zit er allemaal in.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
      <tr><td style="border-radius:6px;background:#B8860B;">
        <a href="${GM3_KIJK_URL}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Bekijk de hele show &rsaquo;</a>
      </td></tr>
    </table>

    <p style="margin:0 0 4px;color:#5a5a55;font-size:14px;line-height:1.6;">
      Zet hem op de tv, pak je koptelefoon of AirPods erbij als de rest van het huis slaapt, en draai 'm rustig op standje 11. Bewaar deze mail, dan vind je de link altijd terug.
    </p>

    ${dichtbijBlok}

    <p style="margin:28px 0 8px;color:#1a1a1a;font-size:16px;line-height:1.6;">
      Dit najaar speel ik trouwens een hele nieuwe show: Gitaarmannen 4: Continuum, twintig jaar na het meesterwerk van John Mayer. Dit is waar ik kom spelen:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      ${alleRijen}
    </table>

    <p style="margin:20px 0 0;color:#5a5a55;font-size:14px;line-height:1.6;">
      Woon je niet in de buurt van een van deze datums? Ik speel ook huiskamerconcerten door het hele land. Kijk op <a href="https://www.edstruijlaart.nl/huiskamerconcert" style="color:#B8860B;">edstruijlaart.nl/huiskamerconcert</a> voor alle info, of reageer gewoon op deze mail.
    </p>

    <p style="margin:24px 0 0;color:#1a1a1a;font-size:16px;">Groeten, Ed</p>
  </td></tr>

  <tr><td style="background:#faf9f7;padding:18px 28px;border-top:1px solid #ececec;">
    <p style="margin:0;color:#9b9b9b;font-size:12px;line-height:1.5;">
      Je krijgt deze mail omdat je de gratis Gitaarmannen 3 registratie hebt aangevraagd op gitaarmannen.nl. Ed Struijlaart &middot; Gitaarmannen de Podcast.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  const dichtbijText = dichtbij.length
    ? `\n\nHet dichtst bij ${input.provincie}:\n${dichtbij.map((s) => `- ${nlDatum(s.date)} ${s.venue}, ${s.city}${s.ticketUrl ? ` ${s.ticketUrl}` : ""}`).join("\n")}`
    : "";
  const text = `${hi}

Bedankt. Je cadeau staat klaar: de volledige Gitaarmannen 3 theatershow in 4K.
Bekijk de hele show: ${GM3_KIJK_URL}
${dichtbijText}

Dit najaar speel ik Gitaarmannen 4: Continuum door het hele land:
${input.alleShows.map((s) => `- ${nlDatum(s.date)} ${s.venue}, ${s.city}${s.ticketUrl ? ` ${s.ticketUrl}` : ""}`).join("\n")}

Niet in de buurt? Ik speel ook huiskamerconcerten: https://www.edstruijlaart.nl/huiskamerconcert (of reageer op deze mail).

Groeten, Ed`;

  return {
    subject: "Hier is je Gitaarmannen 3, twee uur John Mayer",
    html,
    text,
  };
}
