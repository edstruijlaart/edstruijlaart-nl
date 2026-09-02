export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';
import { tvLink, TV_DATUM_TEKST, TV_DEADLINE_TEKST, TV_TIJD_TEKST, TV_UITZENDING_TEKST } from '../../../lib/continuum-day-tv';

/**
 * Oproep aan alle Continuum Day-deelnemers: wie wil mee naar Tijd voor Max (do 10 sep)?
 * Iedereen krijgt een persoonlijke link naar /continuum-day/tv (HMAC-token), zodat het
 * formulier al weet wie er invult.
 *
 * Handmatig getriggerd met x-api-key (BOOTLEG_API_KEY). Idempotent via `tvOproepMailOp`.
 *
 * Query-params:
 *   ?dryrun=1            alleen naar Ed zelf, markeert niemand
 *   ?linkvoor=<e-mail>   (bij dryrun) voor welk adres de link in de testmail gemaakt wordt
 *   ?limit=N             aantal per batch (default 25)
 */
export const GET: APIRoute = async ({ request, url }) => {
  const apiKey = request.headers.get('x-api-key');
  const secret = import.meta.env.BOOTLEG_API_KEY as string;
  if (!secret || apiKey !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const dryrun = url.searchParams.get('dryrun') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 25, 60);

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const openstaand = await sanityWriteClient.fetch<{ _id: string; naam: string; email: string }[]>(
      `*[_type == "continuumDayAanmelding" && wachtlijst != true && !defined(tvOproepMailOp)]
        { _id, naam, email } | order(naam asc)`
    );

    const linkvoor = url.searchParams.get('linkvoor') || 'edstruijlaart@gmail.com';
    const batch = dryrun
      ? [{ _id: 'dryrun', naam: 'Ed (dryrun)', email: 'edstruijlaart@gmail.com', linkEmail: linkvoor }]
      : openstaand.slice(0, limit).map((p) => ({ ...p, linkEmail: p.email }));

    if (batch.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Iedereen heeft de oproep al gehad', sent: 0, resterend: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const vandaag = new Date().toISOString().split('T')[0];
    let sentCount = 0;
    let errorCount = 0;
    const failed: Array<{ naam: string; email: string; reden: string }> = [];

    for (const [i, persoon] of batch.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 700));
      const { subject, html, text } = buildOproep(persoon.naam, tvLink(persoon.linkEmail, secret));
      try {
        const result = await resend.emails.send({
          from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
          to: persoon.email,
          subject,
          html,
          text,
        });
        if (!result?.data?.id) throw new Error(result?.error?.message || 'Geen message-id van Resend');
        sentCount++;
        if (!dryrun) {
          await sanityWriteClient.patch(persoon._id).set({ tvOproepMailOp: vandaag }).commit();
        }
      } catch (err: any) {
        errorCount++;
        const reden = err?.message || String(err);
        console.error(`Mislukt voor ${persoon.email}:`, reden);
        failed.push({ naam: persoon.naam, email: persoon.email, reden });
      }
    }

    const resterend = dryrun ? openstaand.length : Math.max(openstaand.length - sentCount, 0);
    return new Response(
      JSON.stringify({ success: true, dryrun, batch: batch.length, sent: sentCount, errors: errorCount, resterend, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('send-continuum-day-tv-oproep error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};

function buildOproep(naam: string, link: string) {
  const ruw = naam.trim().split(/\s+/)[0] || '';
  const voornaam = ruw ? ruw.charAt(0).toUpperCase() + ruw.slice(1) : 'daar';
  const subject = 'Mee naar Tijd voor Max op 10 september?';

  const html = `
<p>Hey ${voornaam},</p>
<p>Even een leuke vraag. Op ${TV_DATUM_TEKST} zit ik bij Tijd voor Max (NPO 1) voor een voorproefje van Continuum Day, en ik mag een groepje gitaristen meenemen. Samen een stuk van Waiting on the World to Change spelen, akoestisch, in de studio op het Media Park in Hilversum. Met je gitaar op nationale tv, en het zijn maar vijf akkoorden. Wie wil dat nou niet?</p>
<p>We nemen het die donderdag op; de uitzending is ${TV_UITZENDING_TEKST}, de dag voor het echte werk. Wie meegaat krijgt van mij vooraf een filmpje waarin ik het vormpje dat we spelen uitleg en voorspeel, zodat je er thuis rustig op kunt oefenen. Wie meegaat krijgt van mij vooraf een filmpje waarin ik het vormpje dat we spelen uitleg en voorspeel, zodat je er thuis rustig op kunt oefenen.</p>
<p>Ik heb plek voor ongeveer tien mensen. Dat is dus een kans en geen garantie: ik kies op een goede mix en op wie die dag echt kan. Wil je dit? Klik dan hieronder en beantwoord vijf korte vragen, dat duurt een minuut.</p>
<p style="margin: 1.6em 0;"><a href="${link}" style="display:inline-block; background:#00AACC; color:#ffffff; text-decoration:none; font-weight:600; padding:14px 22px; border-radius:8px;">Ja, ik wil mee naar Tijd voor Max</a></p>
<p>Reken op ${TV_DATUM_TEKST} ${TV_TIJD_TEKST} in Hilversum, lunch is geregeld. Eén ding wel: reageer alleen als je die dag zeker kunt, want ik moet op je kunnen rekenen. Je naam moet vooraf bij de beveiliging van de studio worden aangemeld, dus op het laatst afzeggen kan niet. Reageer graag uiterlijk ${TV_DEADLINE_TEKST}. Iedereen die reageert hoort van me, ook als het niet lukt. En op de twaalfde staan we sowieso allemaal samen op het plein.</p>
<p>Ed</p>
<p style="font-size:0.8em; color:#999999;">Werkt de knop niet? Kopieer deze link: ${link}</p>
`;

  const text = `Hey ${voornaam},

Even een leuke vraag. Op ${TV_DATUM_TEKST} zit ik bij Tijd voor Max (NPO 1) voor een voorproefje van Continuum Day, en ik mag een groepje gitaristen meenemen. Samen een stuk van Waiting on the World to Change spelen, akoestisch, in de studio op het Media Park in Hilversum. Met je gitaar op nationale tv, en het zijn maar vijf akkoorden. Wie wil dat nou niet?

We nemen het die donderdag op; de uitzending is ${TV_UITZENDING_TEKST}, de dag voor het echte werk. Wie meegaat krijgt van mij vooraf een filmpje waarin ik het vormpje dat we spelen uitleg en voorspeel, zodat je er thuis rustig op kunt oefenen.

Ik heb plek voor ongeveer tien mensen. Dat is dus een kans en geen garantie: ik kies op een goede mix en op wie die dag echt kan. Wil je dit? Open dan deze link en beantwoord vijf korte vragen, dat duurt een minuut:

${link}

Reken op ${TV_DATUM_TEKST} ${TV_TIJD_TEKST} in Hilversum, lunch is geregeld. Eén ding wel: reageer alleen als je die dag zeker kunt, want ik moet op je kunnen rekenen. Je naam moet vooraf bij de beveiliging van de studio worden aangemeld, dus op het laatst afzeggen kan niet. Reageer graag uiterlijk ${TV_DEADLINE_TEKST}. Iedereen die reageert hoort van me, ook als het niet lukt. En op de twaalfde staan we sowieso allemaal samen op het plein.

Ed`;

  return { subject, html, text };
}
