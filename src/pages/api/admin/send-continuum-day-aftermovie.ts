export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Mail na Continuum Day (ma 14 sep 2026) aan alle deelnemers (wachtlijst != true):
 * de officiële aftermovie (IG + YouTube, graag delen met @johnmayer) + 50% korting op de
 * première van Gitaarmannen 4 in het Isala Theater (code CONTINUUM, geldig tot de première).
 * Tekst = Eds eigen bewerking in Apple Notes.
 *
 * Handmatig getriggerd door Ed met x-api-key (BOOTLEG_API_KEY). In batches (Vercel 60s), per
 * persoon gemarkeerd met `aftermovieMailOp`, dus veilig herhaalbaar.
 *
 *   ?dryrun=1   alleen naar Ed
 *   ?limit=N    batchgrootte (default 25)
 */

const IG_URL = 'https://www.instagram.com/reel/DdRF3T6iXei/';
const YT_URL = 'https://www.youtube.com/shorts/VNrTKUVGtl0';
const ISALA_URL = 'https://www.isalatheater.nl/agenda/ed-struijlaart-ryf3';
const TOUR_URL = 'https://edstruijlaart.nl/tour';

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
      *[_type == "continuumDayAanmelding" && wachtlijst != true && !defined(aftermovieMailOp)] {
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
        if (!dryrun) await sanityWriteClient.patch(persoon._id).set({ aftermovieMailOp: vandaag }).commit();
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
    console.error('send-continuum-day-aftermovie error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};

function bouwMail(naam: string) {
  const ruw = naam.trim().split(/\s+/)[0] || '';
  const voornaam = ruw ? ruw.charAt(0).toUpperCase() + ruw.slice(1) : 'daar';

  const subject = 'De aftermovie is er, en 50% korting op de première';

  const html = `
<p>Hey ${voornaam},</p>
<p>Wat was dat VET afgelopen zaterdag. Zo'n 300 gitaristen op &eacute;&eacute;n plein, samen hebben we echt iets moois neergezet. Ik loop nog steeds op een wolk die eruitziet als een gitaar. Dank je wel dat je erbij was.</p>
<p>De offici&euml;le aftermovie staat nu online:</p>
<ul>
<li><a href="${IG_URL}">Bekijk hem op Instagram</a></li>
<li><a href="${YT_URL}">Of op YouTube</a></li>
</ul>
<p>Ik zou het, natuurlijk, heel mooi vinden als John Mayer dit ziet. Help je mee? Deel de aftermovie in je Instagram-story en tag @johnmayer en jezelf erin. Laat onder de video ook even weten waar je vandaan kwam. Hoe meer mensen dat doen, hoe groter de kans dat het bij hem terechtkomt en dat zou voor ons allemaal de &lsquo;icing on the cake&rsquo; zijn.</p>
<p><strong>En dan nog iets leuks. Het Isala Theater geeft alle deelnemers van Continuum Day 50% korting op de premi&egrave;re van Gitaarmannen 4: Continuum</strong>, vrijdag 2 oktober om 20:15 in Capelle aan den IJssel. Daar vertel ik met band het hele verhaal achter deze plaat en is er natuurlijk ook aandacht voor Continuum Day.</p>
<ul>
<li>Bestel je kaarten via <a href="${ISALA_URL}">isalatheater.nl</a></li>
<li>Gebruik de actiecode <strong>CONTINUUM</strong></li>
<li>Je betaalt &euro;14,25 per kaart in plaats van &euro;28,50, inclusief een consumptie</li>
<li>De code is geldig tot aan de premi&egrave;re</li>
</ul>
<p>Kun je op 2 oktober niet? De andere speeldata staan op <a href="${TOUR_URL}">edstruijlaart.nl/tour</a>.</p>
<p>Tot in het theater,<br />Ed</p>
`;

  const text = `Hey ${voornaam},

Wat was dat VET afgelopen zaterdag. Zo'n 300 gitaristen op één plein, samen hebben we echt iets moois neergezet. Ik loop nog steeds op een wolk die eruitziet als een gitaar. Dank je wel dat je erbij was.

De officiële aftermovie staat nu online:
- Bekijk hem op Instagram: ${IG_URL}
- Of op YouTube: ${YT_URL}

Ik zou het, natuurlijk, heel mooi vinden als John Mayer dit ziet. Help je mee? Deel de aftermovie in je Instagram-story en tag @johnmayer en jezelf erin. Laat onder de video ook even weten waar je vandaan kwam. Hoe meer mensen dat doen, hoe groter de kans dat het bij hem terechtkomt en dat zou voor ons allemaal de 'icing on the cake' zijn.

En dan nog iets leuks. Het Isala Theater geeft alle deelnemers van Continuum Day 50% korting op de première van Gitaarmannen 4: Continuum, vrijdag 2 oktober om 20:15 in Capelle aan den IJssel. Daar vertel ik met band het hele verhaal achter deze plaat en is er natuurlijk ook aandacht voor Continuum Day.

- Bestel je kaarten via ${ISALA_URL}
- Gebruik de actiecode CONTINUUM
- Je betaalt €14,25 per kaart in plaats van €28,50, inclusief een consumptie
- De code is geldig tot aan de première

Kun je op 2 oktober niet? De andere speeldata staan op ${TOUR_URL}

Tot in het theater,
Ed`;

  return { subject, html, text };
}
