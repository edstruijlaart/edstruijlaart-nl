// Bedankmail voor de AFAS Live cadeau-funnel.
// Wordt direct na aanmelding verstuurd via Resend (zie /api/subscribe-afas).
// Werkt voor zowel reel-kijkers als mensen die er waren: neutrale opener,
// het hele concert als cadeau (video + MP3), en daarna de brug naar GM4 Continuum
// met de shows in de buurt bovenaan. In Ed's stem, geen em-dashes.

import type { Show } from "../data/shows";
import { AFAS_KIJK_URL, AFAS_MP3_URL } from "../data/afas-funnel";

const MAANDEN = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const DAGEN = ["zo","ma","di","wo","do","vr","za"];

function nlDatum(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DAGEN[dt.getUTCDay()]} ${d} ${MAANDEN[m - 1]} ${y}`;
}

function showRow(s: Show, opts: { highlight?: boolean } = {}): string {
  const datum = nlDatum(s.date);
  const tijd = s.time ? ` &middot; ${s.time}` : "";
  const plaats = `${s.venue}, ${s.city}`;
  const ticket = s.ticketUrl
    ? `<a href="${s.ticketUrl}" style="color:#00aacc;font-weight:600;text-decoration:none;white-space:nowrap;">Tickets &rsaquo;</a>`
    : `<span style="color:#9b9b9b;white-space:nowrap;">Binnenkort</span>`;
  const bg = opts.highlight ? "background:#eafafd;" : "";
  return `
  <tr>
    <td style="padding:10px 12px;border-bottom:1px solid #ececec;${bg}">
      <span style="color:#1a1a1a;font-weight:600;">${datum}${tijd}</span><br>
      <span style="color:#5a5a55;font-size:14px;">${plaats}</span>
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid #ececec;text-align:right;${bg}">${ticket}</td>
  </tr>`;
}

const SOCIALS = [
  { name: "Instagram", url: "https://instagram.com/edstruijlaart", handle: "@edstruijlaart" },
  { name: "YouTube", url: "https://youtube.com/@edstruijlaart", handle: "@edstruijlaart" },
  { name: "Spotify", url: "https://open.spotify.com/artist/08cpwYrPWo8Xkxl9qdiDP2", handle: "Ed Struijlaart" },
];

export interface AfasEmailInput {
  name?: string;
  provincie: string | null;
  dichtstbijShows: Show[];
  alleShows: Show[];
}

export function buildAfasWelcomeEmail(input: AfasEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const naam = (input.name || "").trim().split(" ")[0] || "";
  const hi = naam ? `Hey ${naam},` : "Hey,";

  const dichtbij = input.dichtstbijShows.slice(0, 3);
  const dichtbijBlok =
    input.provincie && dichtbij.length
      ? `
    <p style="margin:24px 0 8px;color:#1a1a1a;font-size:16px;line-height:1.6;">
      Dit staat het dichtst bij ${input.provincie}:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      ${dichtbij.map((s) => showRow(s, { highlight: true })).join("")}
    </table>`
      : "";

  const alleRijen = input.alleShows.map((s) => showRow(s)).join("");

  const socialRows = SOCIALS.map(
    (s) => `
            <tr><td style="padding:5px 0;font-size:15px;">
              <a href="${s.url}" style="color:#1a1a1a;text-decoration:none;">${s.name}: <span style="color:#00aacc;">${s.handle}</span></a>
            </td></tr>`,
  ).join("");

  const PREHEADER = "Het hele concert dat ik speelde in de AFAS Live staat voor je klaar.";

  const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f2ee;">
<div style="display:none;font-size:1px;color:#f4f2ee;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${PREHEADER}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <tr><td style="background:#0f0f0f;padding:22px 28px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.04em;">ED STRUIJLAART &middot; AFAS LIVE</span>
  </td></tr>

  <tr><td style="padding:28px;">
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;line-height:1.6;">${hi}</p>
    <p style="margin:0 0 16px;color:#1a1a1a;font-size:16px;line-height:1.6;">
      Mooi dat je je hebt aangemeld. Hier is wat ik beloofde: het hele concert dat ik speelde in de AFAS Live, in het voorprogramma van de Gipsy Kings. Van Ain't No Sunshine tot Gravity.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:8px 0 14px;">
      <tr><td style="border-radius:6px;background:#00aacc;">
        <a href="${AFAS_KIJK_URL}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Bekijk het hele concert &rsaquo;</a>
      </td></tr>
    </table>
    <p style="margin:0 0 4px;color:#5a5a55;font-size:14px;line-height:1.6;">
      Liever luisteren onderweg? <a href="${AFAS_MP3_URL}" style="color:#00aacc;text-decoration:none;">Download alle nummers als mp3</a>. De video staat onzichtbaar, dus deel hem gerust met wie er ook bij wilde zijn.
    </p>

    <p style="margin:24px 0 16px;color:#1a1a1a;font-size:16px;line-height:1.6;">
      Je zag me akoestisch. Twee van die nummers, Slow Dancing in a Burning Room en Gravity, komen van Continuum, het meesterwerk van John Mayer uit 2006. Dit najaar speel ik dat hele album live met band: <strong>Gitaarmannen 4: Continuum</strong>, een theater-muziekavond door het hele land.
    </p>

    ${dichtbijBlok}

    <p style="margin:24px 0 8px;color:#1a1a1a;font-size:16px;line-height:1.6;">
      Alle speeldata:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ececec;border-radius:8px;overflow:hidden;">
      ${alleRijen}
    </table>
    <p style="margin:12px 0 0;color:#5a5a55;font-size:14px;line-height:1.6;">
      Alle data en tickets staan ook op <a href="https://gitaarmannen.nl/continuum" style="color:#00aacc;">gitaarmannen.nl/continuum</a>.
    </p>

    <p style="margin:24px 0 12px;color:#1a1a1a;font-size:16px;line-height:1.6;">
      Volg me ook hier:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      ${socialRows}
    </table>

    <p style="margin:24px 0 0;color:#1a1a1a;font-size:16px;">Tot snel, Ed</p>

    <p style="margin:24px 0 0;color:#5a5a55;font-size:14px;line-height:1.6;border-top:1px solid #ececec;padding-top:16px;">
      PS: ik kom ook bij mensen thuis spelen. Een huiskamerconcert organiseren? Kijk op <a href="https://edstruijlaart.nl/huiskamerconcert" style="color:#00aacc;">edstruijlaart.nl/huiskamerconcert</a>.
    </p>
  </td></tr>

  <tr><td style="background:#faf9f7;padding:18px 28px;border-top:1px solid #ececec;">
    <p style="margin:0;color:#9b9b9b;font-size:12px;line-height:1.5;">
      Je krijgt deze mail omdat je je hebt aangemeld via edstruijlaart.nl/afas. Ed Struijlaart &middot; Ears Want Music.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  const dichtbijText =
    input.provincie && dichtbij.length
      ? `\n\nHet dichtst bij ${input.provincie}:\n${dichtbij.map((s) => `- ${nlDatum(s.date)} ${s.venue}, ${s.city}${s.ticketUrl ? ` ${s.ticketUrl}` : ""}`).join("\n")}`
      : "";

  const text = `${hi}

Mooi dat je je hebt aangemeld. Hier is wat ik beloofde: het hele concert dat ik speelde in de AFAS Live, in het voorprogramma van de Gipsy Kings.

Bekijk het hele concert: ${AFAS_KIJK_URL}
Download alle nummers als mp3: ${AFAS_MP3_URL}

Je zag me akoestisch. Twee van die nummers, Slow Dancing in a Burning Room en Gravity, komen van Continuum van John Mayer. Dit najaar speel ik dat hele album live met band: Gitaarmannen 4: Continuum, door het hele land.${dichtbijText}

Alle speeldata:
${input.alleShows.map((s) => `- ${nlDatum(s.date)} ${s.venue}, ${s.city}${s.ticketUrl ? ` ${s.ticketUrl}` : ""}`).join("\n")}

Alle data en tickets: https://gitaarmannen.nl/continuum

Volg me ook hier:
${SOCIALS.map((s) => `- ${s.name}: ${s.url}`).join("\n")}

Tot snel, Ed

PS: ik kom ook bij mensen thuis spelen. Een huiskamerconcert organiseren? Kijk op https://edstruijlaart.nl/huiskamerconcert`;

  return {
    subject: "Hier is je cadeau: mijn hele AFAS Live concert",
    html,
    text,
  };
}
