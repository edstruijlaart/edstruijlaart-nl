export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const LISTMONK_URL = 'https://newsletter.earswantmusic.nl/api/public/subscription';
const LIST_AFAS_UUID = 'a7cfd890-5787-41b2-ae0e-5f91a5b94341';
const LIST_NIEUWSBRIEF_UUID = '681b5ef7-29cc-4be5-a0c7-6d8453f26cc8';

const YOUTUBE_URL = 'https://youtu.be/yD-7deHA9wg';
const MP3_URL = 'https://cdn.earswantmusic.nl/downloads/afas-live-2026-mp3s.zip';

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

const PREHEADER = 'Ed Struijlaart hier, het voorprogramma van de avond.';

const WELKOMSTMAIL_HTML = (voornaam: string) => `<!doctype html>
<html lang="nl">
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
<div style="display:none;font-size:1px;color:#f5f5f3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${PREHEADER}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Hoi${voornaam ? ' ' + voornaam : ''},</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Wat fijn dat je je hebt aangemeld na mijn voorprogramma in de AFAS Live afgelopen zaterdag, bij de Gipsy Kings. Hier is je cadeau, in twee smaken:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
            <tr><td style="padding:0 0 14px;">
              <a href="${YOUTUBE_URL}" style="display:block;background:#0e0e0d;color:#ffffff;text-decoration:none;padding:18px 22px;border-radius:6px;font-weight:600;font-size:16px;text-align:center;">
                🎬 Bekijk het hele concert op YouTube
              </a>
            </td></tr>
            <tr><td>
              <a href="${MP3_URL}" style="display:block;background:#00aacc;color:#ffffff;text-decoration:none;padding:18px 22px;border-radius:6px;font-weight:600;font-size:16px;text-align:center;">
                🎧 Download alle 6 nummers als MP3
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#666;">De video staat onzichtbaar (alleen via deze link te vinden), dus voel je vrij om hem te delen met wie er ook bij was. De MP3-zip pakt na downloaden alle 6 nummers uit: van Aint No Sunshine tot Gravity.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Zaterdag speelden we <em>Slow Dancing in a Burning Room</em> en <em>Gravity</em>. Twee nummers van John Mayer's iconische album <em>Continuum</em> uit 2006. Net als <em>Waiting on the World to Change</em> en <em>Stop This Train</em>. Al deze songs en de verhalen erachter komen voorbij tijdens <strong>Gitaarmannen 4: Continuum</strong>, een speciale theater-muziekavond die ik dit najaar door het land breng. <a href="https://gitaarmannen.nl/continuum" style="color:#00aacc;text-decoration:none;">Bekijk of ik bij jou in de buurt speel</a>.</p>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Je zag me zaterdag akoestisch. Elektrisch speel ik net zo graag. Vorige week was ik te gast bij <strong>Jan-Willem Ruimt Op</strong> op NPO 1 om over de beste gitaarsolo's te praten en <em>All Along the Watchtower</em> te spelen met Leif de Leeuw. Kijk maar:</p>
          <a href="https://www.youtube.com/watch?v=ca1mM9eaPEI" style="display:block;text-decoration:none;margin:0 0 28px;">
            <img src="https://i.ytimg.com/vi/ca1mM9eaPEI/maxresdefault.jpg" alt="Jan-Willem Ruimt Op met Ed Struijlaart en Leif de Leeuw" width="496" style="display:block;width:100%;max-width:496px;height:auto;border-radius:8px;border:0;" />
          </a>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.6;">Volg me ook op:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
${SOCIAL_ROWS_HTML}
          </table>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Tot snel.</p>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">Ed</p>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#666;border-top:1px solid #e5e5e3;padding-top:16px;">PS: ik kom ook bij mensen thuis spelen. Een huiskamerconcert organiseren? <a href="https://edstruijlaart.nl/huiskamerconcert" style="color:#00aacc;text-decoration:none;">Kijk op edstruijlaart.nl/huiskamerconcert</a>.</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#999;">Je krijgt deze mail omdat je je hebt aangemeld via edstruijlaart.nl/afas.</p>
    </td></tr>
  </table>
</body>
</html>`;

const WELKOMSTMAIL_TEXT = (voornaam: string) => `Hoi${voornaam ? ' ' + voornaam : ''},

Wat fijn dat je je hebt aangemeld na mijn voorprogramma in de AFAS Live afgelopen zaterdag, bij de Gipsy Kings. Hier is je cadeau, in twee smaken:

Bekijk het hele concert op YouTube:
${YOUTUBE_URL}

Download alle 6 nummers als MP3:
${MP3_URL}

De video staat onzichtbaar (alleen via deze link te vinden), dus voel je vrij om hem te delen met wie er ook bij was. De MP3-zip pakt na downloaden alle 6 nummers uit: van Aint No Sunshine tot Gravity.

Zaterdag speelden we Slow Dancing in a Burning Room en Gravity. Twee nummers van John Mayer's iconische album Continuum uit 2006. Net als Waiting on the World to Change en Stop This Train. Al deze songs en de verhalen erachter komen voorbij tijdens Gitaarmannen 4: Continuum, een speciale theater-muziekavond die ik dit najaar door het land breng. Bekijk of ik bij jou in de buurt speel:
https://gitaarmannen.nl/continuum

Je zag me zaterdag akoestisch. Elektrisch speel ik net zo graag. Vorige week was ik te gast bij Jan-Willem Ruimt Op op NPO 1 om over de beste gitaarsolo's te praten en All Along the Watchtower te spelen met Leif de Leeuw. Kijk maar:
https://www.youtube.com/watch?v=ca1mM9eaPEI

Volg me ook op:
${SOCIALS.map(s => `- ${s.name}: ${s.url}`).join('\n')}

Tot snel.
Ed

PS: ik kom ook bij mensen thuis spelen. Een huiskamerconcert organiseren? Kijk op edstruijlaart.nl/huiskamerconcert`;

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
      subject: 'Ook zo genoten van de Gipsy Kings? Hier is je cadeautje',
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
