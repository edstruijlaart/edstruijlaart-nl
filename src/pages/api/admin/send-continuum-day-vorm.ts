export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Korte mail op de ochtend van Continuum Day (za 12 sep 2026) aan alle deelnemers (wachtlijst != true):
 * nieuwe backing track (brug eruit, solo erin) + de definitieve vorm op één A4.
 *
 * Handmatig getriggerd door Ed met x-api-key (BOOTLEG_API_KEY). In batches (Vercel 60s), per
 * persoon gemarkeerd met `vormMailOp`, dus veilig herhaalbaar.
 *
 *   ?dryrun=1   alleen naar Ed
 *   ?limit=N    batchgrootte (default 25)
 */

const VORM_PDF_URL = 'https://cdn.earswantmusic.nl/cdayvorm7a1c/continuum-day-vorm.pdf';
const BACKING_MP3_URL = 'https://cdn.earswantmusic.nl/cdayvorm7a1c/continuum-day-backing-waiting-C.mp3';

export const GET: APIRoute = async ({ request, url }) => {
  const apiKey = request.headers.get('x-api-key');
  const bootlegApiKey = import.meta.env.BOOTLEG_API_KEY;
  if (!bootlegApiKey || apiKey !== bootlegApiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const dryrun = url.searchParams.get('dryrun') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 25, 60);

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const openstaand = await sanityWriteClient.fetch<{ _id: string; naam: string; email: string }[]>(`
      *[_type == "continuumDayAanmelding" && wachtlijst != true && !defined(vormMailOp)] {
        _id, naam, email
      } | order(naam asc)
    `);

    const batch = dryrun
      ? [{ _id: 'dryrun', naam: 'Ed (dryrun)', email: 'edstruijlaart@gmail.com' }]
      : openstaand.slice(0, limit);

    if (batch.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Iedereen heeft de mail al gehad', sent: 0, resterend: 0 }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const vandaag = new Date().toISOString().split('T')[0];
    let sentCount = 0;
    let errorCount = 0;
    const failed: Array<{ naam: string; email: string; reden: string }> = [];

    for (const [i, persoon] of batch.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 700));
      const { subject, html, text } = bouwMail(persoon.naam);
      try {
        const result = await resend.emails.send({
          from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
          to: persoon.email,
          subject, html, text,
        });
        if (!result?.data?.id) throw new Error(result?.error?.message || 'Geen message-id terug van Resend');
        sentCount++;
        if (!dryrun) await sanityWriteClient.patch(persoon._id).set({ vormMailOp: vandaag }).commit();
      } catch (err: any) {
        errorCount++;
        const reden = err?.message || String(err);
        console.error(`Mislukt voor ${persoon.email}:`, reden);
        failed.push({ naam: persoon.naam, email: persoon.email, reden });
      }
    }

    const resterend = dryrun ? openstaand.length : Math.max(openstaand.length - sentCount, 0);
    return new Response(JSON.stringify({ success: true, dryrun, batch: batch.length, sent: sentCount, errors: errorCount, resterend, failed }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('send-continuum-day-vorm error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};

function bouwMail(naam: string) {
  const ruw = naam.trim().split(/\s+/)[0] || '';
  const voornaam = ruw ? ruw.charAt(0).toUpperCase() + ruw.slice(1) : 'daar';
  const subject = 'Vandaag 12:00: nieuwe backing track en de vorm op één A4';

  const html = `
<p>Hey ${voornaam},</p>
<p>Nog &eacute;&eacute;n ding voor vanmiddag. Ik heb de backing track opnieuw gemaakt: de brug, dat onbestemde F/C-stukje voor de solo, is eruit, en de solo zit er nu in. De vorm is verder precies wat je al had, met die solo erbij. En de solo is gewoon twee keer een extra rondje van het couplet-schema, dus jij blijft de akkoorden spelen.</p>
<ul>
<li><a href="${VORM_PDF_URL}">De vorm op &eacute;&eacute;n A4 (pdf)</a>, met de grepen erbij, voor in de auto of op het plein.</li>
<li><a href="${BACKING_MP3_URL}">De nieuwe backing track (mp3)</a>, in C, 88 BPM, drums, bas en toetsen.</li>
</ul>
<p>Zo loopt het: acht maten alleen ritme, dan intro &middot; couplet &middot; refrein &middot; couplet &middot; refrein &middot; solo &middot; refrein &middot; slot. Kijk naar mij voor de inzet en voor het slotakkoord. Om 11:30 studeren we het samen in.</p>
<p>11 uur verzamelen, tot zo!<br />Ed</p>
`;

  const text = `Hey ${voornaam},

Nog één ding voor vanmiddag. Ik heb de backing track opnieuw gemaakt: de brug, dat onbestemde F/C-stukje voor de solo, is eruit, en de solo zit er nu in. De vorm is verder precies wat je al had, met die solo erbij. En de solo is gewoon twee keer een extra rondje van het couplet-schema, dus jij blijft de akkoorden spelen.

- De vorm op één A4 (pdf), met de grepen erbij: ${VORM_PDF_URL}
- De nieuwe backing track (mp3), in C, 88 BPM, drums, bas en toetsen: ${BACKING_MP3_URL}

Zo loopt het: acht maten alleen ritme, dan intro · couplet · refrein · couplet · refrein · solo · refrein · slot. Kijk naar mij voor de inzet en voor het slotakkoord. Om 11:30 studeren we het samen in.

11 uur verzamelen, tot zo!
Ed`;

  return { subject, html, text };
}
