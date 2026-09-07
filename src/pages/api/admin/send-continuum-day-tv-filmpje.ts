export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Instructiefilmpjes naar de tien gekozen Tijd voor Max-gitaristen, plus de
 * laatste praktische info (10:30 aanwezig, Parkeerdek A). Individuele mails.
 * Idempotent via tvFilmpjeMailOp. ?dryrun=1 stuurt één voorbeeld naar Ed.
 */
const FILM_UITLEG = 'https://cdn.earswantmusic.nl/cdaytvm6989c76a/continuum-day-instructie-1.mp4'; // 2:29, arrangement stap voor stap
const FILM_DOORGESPEELD = 'https://cdn.earswantmusic.nl/cdaytvm6989c76a/continuum-day-instructie-2.mp4'; // 3:49, hele arrangement in één keer

export const GET: APIRoute = async ({ request, url }) => {
  const apiKey = request.headers.get('x-api-key');
  const secret = import.meta.env.BOOTLEG_API_KEY as string;
  if (!secret || apiKey !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const dryrun = url.searchParams.get('dryrun') === '1';

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const openstaand = await sanityWriteClient.fetch<{ _id: string; naam: string; email: string }[]>(
      `*[_type == "continuumDayAanmelding" && tvKandidaat.status == "gekozen" && !defined(tvFilmpjeMailOp)]
        { _id, naam, email } | order(naam asc)`
    );
    const batch = dryrun ? [{ _id: 'dry', naam: 'Ed Voorbeeld', email: 'edstruijlaart@gmail.com' }] : openstaand;
    if (batch.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Iedereen heeft de filmpjes al', sent: 0, resterend: 0 }), { headers: { 'Content-Type': 'application/json' } });
    }
    const vandaag = new Date().toISOString().split('T')[0];
    let sent = 0; const failed: Array<{ naam: string; email: string; reden: string }> = [];
    for (const [i, p] of batch.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 700));
      const { subject, html, text } = bouwMail(p.naam);
      try {
        const result = await resend.emails.send({ from: 'Ed Struijlaart <ed@edstruijlaart.nl>', to: p.email, subject, html, text });
        if (!result?.data?.id) throw new Error(result?.error?.message || 'Geen message-id van Resend');
        sent++;
        if (!dryrun) await sanityWriteClient.patch(p._id).set({ tvFilmpjeMailOp: vandaag }).commit();
      } catch (err: any) {
        failed.push({ naam: p.naam, email: p.email, reden: err?.message || String(err) });
      }
    }
    return new Response(JSON.stringify({ success: true, dryrun, batch: batch.length, sent, errors: failed.length, resterend: dryrun ? openstaand.length : openstaand.length - sent, failed }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};

function bouwMail(naam: string) {
  const ruw = naam.trim().split(/\s+/)[0] || '';
  const voornaam = ruw ? ruw.charAt(0).toUpperCase() + ruw.slice(1) : 'daar';
  const subject = 'Tijd voor Max: hier zijn de filmpjes';
  const html = `
<p>Hey ${voornaam},</p>
<p>Zoals beloofd, twee filmpjes voor donderdag. Dezelfde akkoorden als op je chord-sheet, zonder capo, en het vormpje is precies twee minuten.</p>
<p><a href="${FILM_UITLEG}">Filmpje 1: het arrangement stap voor stap uitgelegd</a><br /><a href="${FILM_DOORGESPEELD}">Filmpje 2: het hele arrangement in één keer doorgespeeld, om mee te spelen</a></p>
<p>Kijk eerst filmpje 1, speel daarna een paar keer mee met filmpje 2, dan zit het.</p>
<p><strong>De akkoorden per stuk</strong> (elk akkoord twee tellen, net als op de sheet):</p>
<ul>
<li>Twee maten drumintro: jij doet nog niks.</li>
<li>Intro band, vier maten: C Am F C · G Am F C</li>
<li>Couplet 1: C Am F C · G Am F C, twee keer</li>
<li>Refrein: C Am F C · G Am F C · C Dm Am Dm · G Am F C</li>
<li>Solo: dezelfde rondgang als het couplet, C Am F C · G Am F C, rustig doorspelen</li>
<li>Refrein 2: hetzelfde als het eerste refrein</li>
<li>Slot: G Am F C, twee keer (op "we keep on waiting"), dan drie keer F C (op "waiting on the world to change"), en eindigen op één grote C</li>
</ul>
<p><strong>Nog even de dag.</strong> Donderdag 10 september, Studio 23 op het Media Park in Hilversum, publieksingang. Zet <strong>10:30</strong> in je agenda: het schema bij Max is krap, dus ik wil dat we dan allemaal binnen zijn. Om 11:15 begint de soundcheck. Lunch is geregeld, rond 14:30 ben je klaar.</p>
<p><strong>Parkeren</strong> doe je op Parkeerdek A van het Media Park; de paar plekken bij de studio zelf zijn voor de band met de instrumenten. Kom je met de trein: station Hilversum Media Park ligt naast de studio.</p>
<p>Akoestische gitaar mee, geen versterker. Kleding zonder fijne streepjes, stipjes, ruitjes of logo's. En kijk donderdag naar mij voor de start en het einde, de rest gaat vanzelf.</p>
<p>Tot donderdag!<br />Ed</p>
`;
  const text = `Hey ${voornaam},

Zoals beloofd, twee filmpjes voor donderdag. Dezelfde akkoorden als op je chord-sheet, zonder capo, en het vormpje is precies twee minuten.

Filmpje 1, het arrangement stap voor stap uitgelegd: ${FILM_UITLEG}
Filmpje 2, het hele arrangement in één keer doorgespeeld, om mee te spelen: ${FILM_DOORGESPEELD}

Kijk eerst filmpje 1, speel daarna een paar keer mee met filmpje 2, dan zit het.

De akkoorden per stuk (elk akkoord twee tellen, net als op de sheet):
- Twee maten drumintro: jij doet nog niks.
- Intro band, vier maten: C Am F C · G Am F C
- Couplet 1: C Am F C · G Am F C, twee keer
- Refrein: C Am F C · G Am F C · C Dm Am Dm · G Am F C
- Solo: dezelfde rondgang als het couplet, C Am F C · G Am F C, rustig doorspelen
- Refrein 2: hetzelfde als het eerste refrein
- Slot: G Am F C, twee keer (op "we keep on waiting"), dan drie keer F C (op "waiting on the world to change"), en eindigen op één grote C

Nog even de dag. Donderdag 10 september, Studio 23 op het Media Park in Hilversum, publieksingang. Zet 10:30 in je agenda: het schema bij Max is krap, dus ik wil dat we dan allemaal binnen zijn. Om 11:15 begint de soundcheck. Lunch is geregeld, rond 14:30 ben je klaar.

Parkeren doe je op Parkeerdek A van het Media Park; de paar plekken bij de studio zelf zijn voor de band met de instrumenten. Kom je met de trein: station Hilversum Media Park ligt naast de studio.

Akoestische gitaar mee, geen versterker. Kleding zonder fijne streepjes, stipjes, ruitjes of logo's. En kijk donderdag naar mij voor de start en het einde, de rest gaat vanzelf.

Tot donderdag!
Ed`;
  return { subject, html, text };
}
