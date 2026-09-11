export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { subscribe } from '../../lib/listmonk';
import { beoordeel } from '../../lib/botfilter';

// Via de beheer-API met een sleutel die alleen mag inschrijven; de publieke
// Listmonk-ingang is dicht sinds 7 sep 2026 (spam). Zie src/lib/listmonk.ts.
const LIST_UUID = '681b5ef7-29cc-4be5-a0c7-6d8453f26cc8'; // Ed Struijlaart Nieuwsbrief

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { email, name, website, t } = body || {};

  // Botfilter (zie lib/botfilter.ts): honeypot, token-leeftijd, wegwerpdomein.
  // Bij een bot doen we alsof het gelukt is zonder iets op te slaan.
  const oordeel = beoordeel({ website, t, email: String(email || '') });
  if (oordeel.bot) {
    console.warn('newsletter: bot geweigerd', oordeel.reden);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || typeof email !== 'string') {
    return new Response(JSON.stringify({ error: 'Email is verplicht' }), { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Ongeldig emailadres' }), { status: 400 });
  }

  try {
    const result = await subscribe({ email, name: name || '', listUuids: [LIST_UUID] });
    // Al ingeschreven of geblokkeerd telt voor de bezoeker als gelukt; alleen een
    // echte storing melden we.
    const response = { ok: result.ok || result.status !== 'error', status: result.ok ? 200 : 502 };

    if (response.ok) {
      // Notificatie naar Ed (fire-and-forget)
      try {
        const resend = new Resend(import.meta.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
          to: 'ed@earswantmusic.nl',
          subject: `Nieuwsbrief: ${name || 'Iemand'} heeft zich ingeschreven`,
          text: `Nieuwe nieuwsbrief-inschrijving:\n\nNaam: ${name || '(niet ingevuld)'}\nEmail: ${email}\nTijdstip: ${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}`,
        });
      } catch {
        // Notificatie mag falen zonder de inschrijving te blokkeren
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('newsletter: Listmonk-fout', result.error);
    return new Response(JSON.stringify({ error: 'Inschrijving mislukt' }), { status: 502 });
  } catch {
    return new Response(JSON.stringify({ error: 'Kon geen verbinding maken met de nieuwsbriefserver' }), {
      status: 502,
    });
  }
};
