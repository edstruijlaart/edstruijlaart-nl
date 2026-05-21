export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const LISTMONK_URL = 'https://newsletter.earswantmusic.nl/api/public/subscription';
const LIST_AFAS_UUID = 'a7cfd890-5787-41b2-ae0e-5f91a5b94341';
const LIST_NIEUWSBRIEF_UUID = '681b5ef7-29cc-4be5-a0c7-6d8453f26cc8';

const SOCIALS = [
  { name: 'Instagram', handle: '@edstruijlaart', url: 'https://instagram.com/edstruijlaart', icon: 'https://cdn.earswantmusic.nl/icons/instagram.png' },
  { name: 'YouTube', handle: '@edstruijlaart', url: 'https://youtube.com/@edstruijlaart', icon: 'https://cdn.earswantmusic.nl/icons/youtube.png' },
  { name: 'Spotify', handle: 'Ed Struijlaart', url: 'https://open.spotify.com/artist/08cpwYrPWo8Xkxl9qdiDP2', icon: 'https://cdn.earswantmusic.nl/icons/spotify.png' },
];

const SOCIAL_ROWS_HTML = SOCIALS.map(s => `
            <tr>
              <td style="padding:6px 0;vertical-align:middle;">
                <a href="${s.url}" style="display:inline-block;text-decoration:none;color:#1a1a1a;">
                  <img src="${s.icon}" width="22" height="22" alt="${s.name}" style="vertical-align:middle;margin-right:12px;border:0;" />
                  <span style="vertical-align:middle;font-size:15px;color:#1a1a1a;">${s.handle}</span>
                </a>
              </td>
            </tr>`).join('');

const WELKOMSTMAIL_HTML = (voornaam: string) => `<!doctype html>
<html lang="nl">
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Hé${voornaam ? ' ' + voornaam : ''},</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Top dat je vanavond in de AFAS Live was, en bedankt voor het scannen.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Morgen (zondag) stuur ik je de exclusieve download.</p>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">In de tussentijd kan je me alvast volgen op mijn socials:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
${SOCIAL_ROWS_HTML}
          </table>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Heb je vanavond foto's of filmpjes gemaakt? Tag me met <strong>@edstruijlaart</strong> of gebruik <strong>#gitaarmannen</strong> — ik zie ze graag voorbij komen.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Tot morgen!</p>
          <p style="margin:0;font-size:16px;line-height:1.6;">Ed</p>
          <hr style="border:none;border-top:1px solid #e5e5e3;margin:32px 0 24px;" />
          <p style="margin:0;font-size:14px;line-height:1.5;color:#666;">PS — In oktober ga ik op tour met <strong>Gitaarmannen 4: Continuum</strong>, een avond over John Mayer's gelijknamige album. Speelt 'ie ook bij jou in de buurt? <a href="https://gitaarmannen.nl/continuum" style="color:#00aacc;text-decoration:none;">Bekijk de tourdata →</a></p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#999;">Je krijgt deze mail omdat je je hebt aangemeld via edstruijlaart.nl/afas.</p>
    </td></tr>
  </table>
</body>
</html>`;

const WELKOMSTMAIL_TEXT = (voornaam: string) => `Hé${voornaam ? ' ' + voornaam : ''},

Top dat je vanavond in de AFAS Live was, en bedankt voor het scannen.

Morgen (zondag) stuur ik je de exclusieve download.

In de tussentijd kan je me alvast volgen op mijn socials:
${SOCIALS.map(s => `- ${s.name}: ${s.url}`).join('\n')}

Heb je vanavond foto's of filmpjes gemaakt? Tag me met @edstruijlaart of gebruik #gitaarmannen — ik zie ze graag voorbij komen.

Tot morgen!
Ed

PS — In oktober ga ik op tour met Gitaarmannen 4: Continuum, een avond over John Mayer's gelijknamige album. Speelt 'ie ook bij jou in de buurt? Bekijk de tourdata op https://gitaarmannen.nl/continuum
`;

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldige aanvraag' }), { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Vul een geldig e-mailadres in' }), { status: 400 });
  }

  // 1. Listmonk subscribe (AFAS lijst + algemene nieuwsbrief)
  try {
    const listmonkResponse = await fetch(LISTMONK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        list_uuids: [LIST_AFAS_UUID, LIST_NIEUWSBRIEF_UUID],
      }),
    });
    if (!listmonkResponse.ok && listmonkResponse.status !== 409) {
      const text = await listmonkResponse.text().catch(() => '');
      console.error('Listmonk subscribe failed', listmonkResponse.status, text);
      return new Response(JSON.stringify({ error: 'Aanmelden mislukt, probeer het opnieuw' }), { status: 502 });
    }
  } catch (err) {
    console.error('Listmonk subscribe exception', err);
    return new Response(JSON.stringify({ error: 'Kon geen verbinding maken' }), { status: 502 });
  }

  // 2. Resend welkomstmail (fire-and-forget — als hij faalt, subscriber blijft staan)
  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const voornaam = name.split(' ')[0] || '';
    await resend.emails.send({
      from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
      to: email,
      subject: 'Bedankt — morgen krijg je je cadeau',
      html: WELKOMSTMAIL_HTML(voornaam),
      text: WELKOMSTMAIL_TEXT(voornaam),
      replyTo: 'ed@edstruijlaart.nl',
    });
  } catch (err) {
    console.error('Resend welkomstmail failed', err);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
