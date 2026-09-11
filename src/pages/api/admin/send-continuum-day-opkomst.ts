export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Laatste mail vóór Continuum Day (za 12 sep 2026) aan alle deelnemers (wachtlijst != true):
 * programma, locatie/parkeren, wat mee te nemen, toonsoort, backing track, verwachtingsmanagement,
 * verloting, publiek welkom.
 *
 * Handmatig getriggerd door Ed met x-api-key (BOOTLEG_API_KEY). In batches (Vercel 60s), per
 * persoon gemarkeerd met `opkomstMailOp`, dus veilig herhaalbaar.
 *
 *   ?dryrun=1   alleen naar Ed
 *   ?limit=N    batchgrootte (default 25)
 */

const CHORDSHEET_URL = 'https://www.gitaarmannen.nl/files/continuum-day-akkoorden.pdf';
// Backing track (drums, bas, toetsen): WeTransfer-link van Ed, meegeven als ?backing=<url-encoded>. Leeg = alinea weggelaten.
const PODCAST_URL = 'https://open.spotify.com/episode/6YUi52fzqmP0a2EwOXMtXo';

export const GET: APIRoute = async ({ request, url }) => {
  const apiKey = request.headers.get('x-api-key');
  const bootlegApiKey = import.meta.env.BOOTLEG_API_KEY;
  if (!bootlegApiKey || apiKey !== bootlegApiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const dryrun = url.searchParams.get('dryrun') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 25, 60);
  const backingUrl = url.searchParams.get('backing') || '';

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const openstaand = await sanityWriteClient.fetch<{ _id: string; naam: string; email: string }[]>(`
      *[_type == "continuumDayAanmelding" && wachtlijst != true && !defined(opkomstMailOp)] {
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
      const { subject, html, text } = bouwMail(persoon.naam, backingUrl);
      try {
        const result = await resend.emails.send({
          from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
          to: persoon.email,
          subject, html, text,
        });
        if (!result?.data?.id) throw new Error(result?.error?.message || 'Geen message-id terug van Resend');
        sentCount++;
        if (!dryrun) await sanityWriteClient.patch(persoon._id).set({ opkomstMailOp: vandaag }).commit();
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
    console.error('send-continuum-day-opkomst error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};

function bouwMail(naam: string, BACKING_URL: string) {
  const ruw = naam.trim().split(/\s+/)[0] || '';
  const voornaam = ruw ? ruw.charAt(0).toUpperCase() + ruw.slice(1) : 'daar';
  const subject = 'Morgen 12:00: alles voor Continuum Day op een rij';

  const backingHtml = BACKING_URL
    ? `<p><strong>Oefenen vanavond?</strong> Ik heb een backing track gemaakt van de Where the Light Is-versie, een hele toon lager, dus precies onze toonsoort, met alleen drums, bas en toetsen: <a href="${BACKING_URL}">download de backing track</a> (WeTransfer, een week geldig). Speel er een paar keer mee en je bent klaar. Morgen bij het instuderen speel ik 'm ook af.</p>`
    : '';
  const backingText = BACKING_URL
    ? `Oefenen vanavond? Ik heb een backing track gemaakt van de Where the Light Is-versie, een hele toon lager, dus precies onze toonsoort, met alleen drums, bas en toetsen: ${BACKING_URL} (WeTransfer, een week geldig). Speel er een paar keer mee en je bent klaar. Morgen bij het instuderen speel ik 'm ook af.\n\n`
    : '';

  const html = `
<p>Hey ${voornaam},</p>
<p>Morgen is het zover. Hier alles op een rij, dan hoef je nergens meer naar te zoeken.</p>
<p><strong>Het weer:</strong> de verwachting voor Hilversum is bewolkt en droog, een graad of 18 rond twaalf uur, weinig wind.</p>
<p><strong>Zo loopt de ochtend</strong></p>
<ul>
<li>11:00 &mdash; inloop op het plein voor Beeld &amp; Geluid, Media Parkboulevard 1, Hilversum</li>
<li>11:30 &mdash; welkom door Michiel Veenstra en samen het nummer instuderen</li>
<li>12:00 &mdash; we spelen, allemaal tegelijk</li>
<li>12:15 &mdash; direct na het nummer: de verloting, buiten op het plein</li>
<li>12:45 &mdash; einde</li>
</ul>
<p><strong>Parkeren en OV:</strong> de parkeergarage van Beeld &amp; Geluid (Media Parkboulevard 1, 2 euro per uur, maximaal 2 meter hoog) of Parkeerdek A van het Media Park. Station Hilversum Media Park ligt naast het plein.</p>
<p><strong>Wat neem je mee:</strong> je akoestische gitaar, thuis gestemd, en een band, want we spelen staand. Een stemapparaatje is handig. Een plectrum krijg je van mij: iedereen krijgt de Continuum Day-plectrum. Elektrisch mag, maar alleen met een versterkertje op batterijen; stroom is er buiten niet.</p>
<p><strong>Het nummer:</strong> we spelen Waiting on the World to Change een hele toon lager dan de plaat, in C, zonder capo. Vijf akkoorden: C, G, Am, F en Dm. Het vormpje staat op <a href="${CHORDSHEET_URL}">de chord-sheet (pdf)</a>: intro, couplet, refrein, couplet, refrein, refrein, en &eacute;&eacute;n groot slotakkoord. Kijk morgen naar mij voor de start en het einde, de rest gaat vanzelf. De tekst zoek je zo op je telefoon op; meezingen mag, hoeft niet.</p>
${backingHtml}
<p><strong>Even verwachtingsmanagement.</strong> Dit is geen concert. Er is geen podium, geen ledscherm en geen geluidsinstallatie voor 250 gitaren. Het is buiten, op een plein. Ik sta op een verhoging zodat je me kunt zien, Michiel Veenstra praat de boel aan elkaar. Het is een guerrilla-actie met een hoop gitaristen die elkaar niet kennen en samen &eacute;&eacute;n nummer spelen. Lekker low-key, en vooral leuk.</p>
<p><strong>De verloting:</strong> direct na het spelen van het nummer doen we de verloting van de PRS SE Silver Sky, de Dunlop-onderhoudskit en de Ernie Ball John Mayer-snaren. Je aanmelding is je lot. Je maakt alleen kans op de gitaar als je erbij bent; is een getrokken naam er niet, dan trekken we opnieuw.</p>
<p><strong>Neem mensen mee.</strong> Kijken en meezingen mag altijd, daar hoeft niemand zich voor aan te melden. En met code <strong>BeeldgeluidJM</strong> krijgen deelnemers een tweede museumticket gratis, mocht je na afloop het museum in willen.</p>
<p>Er wordt gefilmd en gefotografeerd, er komt pers, en morgenochtend rond 07:55 zit ik live in het NOS Radio 1 Journaal. Vanavond om 17:10 zie je tien deelnemers en mij bij Tijd voor MAX op NPO 1, als voorproefje.</p>
<p><strong>Zeven minuten podcast:</strong> vanmiddag nam ik <a href="${PODCAST_URL}">een korte aflevering</a> op met precies dit verhaal, voor als je liever luistert dan leest.</p>
<p><strong>Kun je toch niet komen?</strong> Laat het me dan even weten, dat is fijn voor de planning. En nog &eacute;&eacute;n keer: je maakt alleen kans op de gitaar als je er morgen bij bent.</p>
<p>Tot morgen, twaalf uur!<br />Ed</p>
`;

  const text = `Hey ${voornaam},

Morgen is het zover. Hier alles op een rij, dan hoef je nergens meer naar te zoeken.

HET WEER: de verwachting voor Hilversum is bewolkt en droog, een graad of 18 rond twaalf uur, weinig wind.

ZO LOOPT DE OCHTEND
- 11:00 inloop op het plein voor Beeld & Geluid, Media Parkboulevard 1, Hilversum
- 11:30 welkom door Michiel Veenstra en samen het nummer instuderen
- 12:00 we spelen, allemaal tegelijk
- 12:15 direct na het nummer: de verloting, buiten op het plein
- 12:45 einde

PARKEREN EN OV: de parkeergarage van Beeld & Geluid (Media Parkboulevard 1, 2 euro per uur, maximaal 2 meter hoog) of Parkeerdek A van het Media Park. Station Hilversum Media Park ligt naast het plein.

WAT NEEM JE MEE: je akoestische gitaar, thuis gestemd, en een band, want we spelen staand. Een stemapparaatje is handig. Een plectrum krijg je van mij: iedereen krijgt de Continuum Day-plectrum. Elektrisch mag, maar alleen met een versterkertje op batterijen; stroom is er buiten niet.

HET NUMMER: we spelen Waiting on the World to Change een hele toon lager dan de plaat, in C, zonder capo. Vijf akkoorden: C, G, Am, F en Dm. Het vormpje staat op de chord-sheet: ${CHORDSHEET_URL} (intro, couplet, refrein, couplet, refrein, refrein, en één groot slotakkoord). Kijk morgen naar mij voor de start en het einde, de rest gaat vanzelf. De tekst zoek je zo op je telefoon op; meezingen mag, hoeft niet.

${backingText}EVEN VERWACHTINGSMANAGEMENT. Dit is geen concert. Er is geen podium, geen ledscherm en geen geluidsinstallatie voor 250 gitaren. Het is buiten, op een plein. Ik sta op een verhoging zodat je me kunt zien, Michiel Veenstra praat de boel aan elkaar. Het is een guerrilla-actie met een hoop gitaristen die elkaar niet kennen en samen één nummer spelen. Lekker low-key, en vooral leuk.

DE VERLOTING: direct na het spelen van het nummer doen we de verloting van de PRS SE Silver Sky, de Dunlop-onderhoudskit en de Ernie Ball John Mayer-snaren. Je aanmelding is je lot. Je maakt alleen kans op de gitaar als je erbij bent; is een getrokken naam er niet, dan trekken we opnieuw.

NEEM MENSEN MEE. Kijken en meezingen mag altijd, daar hoeft niemand zich voor aan te melden. En met code BeeldgeluidJM krijgen deelnemers een tweede museumticket gratis, mocht je na afloop het museum in willen.

Er wordt gefilmd en gefotografeerd, er komt pers, en morgenochtend rond 07:55 zit ik live in het NOS Radio 1 Journaal. Vanavond om 17:10 zie je tien deelnemers en mij bij Tijd voor MAX op NPO 1, als voorproefje.

Zeven minuten podcast: vanmiddag nam ik een korte aflevering op met precies dit verhaal, voor als je liever luistert dan leest: ${PODCAST_URL}

KUN JE TOCH NIET KOMEN? Laat het me dan even weten, dat is fijn voor de planning. En nog één keer: je maakt alleen kans op de gitaar als je er morgen bij bent.

Tot morgen, twaalf uur!
Ed`;

  return { subject, html, text };
}
