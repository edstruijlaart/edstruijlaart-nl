export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const LISTMONK_URL = 'https://newsletter.earswantmusic.nl/api/public/subscription';
const LIST_AFAS_UUID = 'a7cfd890-5787-41b2-ae0e-5f91a5b94341';
const LIST_NIEUWSBRIEF_UUID = '681b5ef7-29cc-4be5-a0c7-6d8453f26cc8';

const WELKOMSTMAIL_HTML = (voornaam: string) => `<!doctype html>
<html lang="nl">
<body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Hé${voornaam ? ' ' + voornaam : ''},</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Top dat je vanavond in de AFAS Live was, en bedankt voor het scannen.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Morgen (zondag) stuur ik je de link naar mijn complete theatershow <strong>Gitaarmannen 2: Eric Clapton Unplugged</strong>. Anderhalf uur Eric Clapton's Unplugged-album in mijn versie, live opgenomen in het theater.</p>
          <p style="margin:0 0 32px;font-size:16px;line-height:1.6;">Tot dan!</p>
          <p style="margin:0 0 32px;font-size:16px;line-height:1.6;">Ed</p>
          <hr style="border:none;border-top:1px solid #e5e5e3;margin:24px 0;" />
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

Morgen (zondag) stuur ik je de link naar mijn complete theatershow Gitaarmannen 2: Eric Clapton Unplugged. Anderhalf uur Eric Clapton's Unplugged-album in mijn versie, live opgenomen in het theater.

Tot dan!

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
      from: 'Ed Struijlaart <ed@earswantmusic.nl>',
      to: email,
      subject: 'Bedankt — morgen krijg je je cadeau',
      html: WELKOMSTMAIL_HTML(voornaam),
      text: WELKOMSTMAIL_TEXT(voornaam),
      replyTo: 'ed@earswantmusic.nl',
    });
  } catch (err) {
    console.error('Resend welkomstmail failed', err);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
