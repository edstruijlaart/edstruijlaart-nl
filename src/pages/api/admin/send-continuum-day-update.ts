export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Eenmalige bulkmail naar alle Continuum Day-deelnemers (wachtlijst != true):
 * update dat de 250 plekken vol zijn + de Beeld & Geluid-kortingscode (BeeldgeluidJM).
 *
 * Handmatig getriggerd door Ed met x-api-key (BOOTLEG_API_KEY), geen cron.
 *
 * In batches, want een Vercel-functie mag maar 60s draaien en 250 mails met
 * rate-limit-pauze past daar niet in. Elke geslaagde verzending zet
 * `updateMailBgActieOp` op het Sanity-document; de query slaat iedereen met dat
 * veld over. Daardoor is het endpoint veilig herhaalbaar: niemand krijgt de mail
 * twee keer, ook niet als een batch halverwege afbreekt.
 *
 * Query-params:
 *   ?dryrun=1   stuurt alleen naar Ed zelf, markeert niemand
 *   ?limit=N    aantal per batch (default 25)
 */
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
      *[_type == "continuumDayAanmelding" && wachtlijst != true && !defined(updateMailBgActieOp)] {
        _id,
        naam,
        email
      } | order(naam asc)
    `);

    const batch = dryrun
      ? [{ _id: 'dryrun', naam: 'Ed (dryrun)', email: 'edstruijlaart@gmail.com' }]
      : openstaand.slice(0, limit);

    if (batch.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Iedereen heeft de mail al gehad', sent: 0, resterend: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const vandaag = new Date().toISOString().split('T')[0];
    let sentCount = 0;
    let errorCount = 0;
    const failed: Array<{ naam: string; email: string; reden: string }> = [];

    for (const [i, persoon] of batch.entries()) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 700));
      }

      const { subject, html, text } = buildUpdateEmail(persoon.naam);

      try {
        const result = await resend.emails.send({
          from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
          to: persoon.email,
          subject,
          html,
          text,
        });

        if (!result?.data?.id) {
          throw new Error(result?.error?.message || 'Geen message-id terug van Resend');
        }

        sentCount++;

        // Direct markeren: als de functie hierna alsnog omvalt, krijgt deze
        // persoon bij de volgende batch geen tweede mail.
        if (!dryrun) {
          await sanityWriteClient.patch(persoon._id).set({ updateMailBgActieOp: vandaag }).commit();
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
    console.error('send-continuum-day-update error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};

function buildUpdateEmail(naam: string) {
  const voornaam = naam.split(' ')[0] || 'daar';
  const subject = 'Cadeautje van Beeld & Geluid voor Continuum Day';

  const html = `
<p>Hey ${voornaam},</p>
<p>Een snelle update van mijn kant! We zitten inmiddels op 250 gitaristen voor Continuum Day. Vol, en dan ook echt vol. Ken je nog iemand die mee wil? Aanmelden kan nog steeds, diegene komt dan op de wachtlijst en schuift door zodra er een plek vrijkomt (dat gebeurt eigenlijk altijd wel).</p>
<p>Nog even op een rijtje wat je moet weten:</p>
<ul>
<li>Gitaar mee: akoestisch is het makkelijkst. Elektrisch mag ook, maar dan wel met een versterkertje op batterijen. Stroom is er buiten niet.</li>
<li>We spelen staand. Neem dat mee in je verwachtingen.</li>
<li>Michiel Veenstra praat de boel aan elkaar, dus je weet altijd waar je aan toe bent die ochtend.</li>
</ul>
<p>En dan het leukste nieuws: Beeld &amp; Geluid trakteert. Zij vinden het zo'n leuke actie dat ze alle deelnemers een cadeautje geven: met code <strong>BeeldgeluidJM</strong> krijg je een tweede museumticket gratis. Kom je met iemand mee, dan hoeft die dus maar &eacute;&eacute;n kaartje te kopen. Heb je een Vriendenloterij- of Museumkaart? Dan kun je vooraf al gratis een tijdslot reserveren.</p>
<p>Heel sympathiek van ze, en precies het soort extra dat deze dag nog leuker maakt.</p>
<p>Tot de twaalfde!<br />Ed</p>
`;

  const text = `Hey ${voornaam},

Een snelle update van mijn kant! We zitten inmiddels op 250 gitaristen voor Continuum Day. Vol, en dan ook echt vol. Ken je nog iemand die mee wil? Aanmelden kan nog steeds, diegene komt dan op de wachtlijst en schuift door zodra er een plek vrijkomt (dat gebeurt eigenlijk altijd wel).

Nog even op een rijtje wat je moet weten:
- Gitaar mee: akoestisch is het makkelijkst. Elektrisch mag ook, maar dan wel met een versterkertje op batterijen. Stroom is er buiten niet.
- We spelen staand. Neem dat mee in je verwachtingen.
- Michiel Veenstra praat de boel aan elkaar, dus je weet altijd waar je aan toe bent die ochtend.

En dan het leukste nieuws: Beeld & Geluid trakteert. Zij vinden het zo'n leuke actie dat ze alle deelnemers een cadeautje geven: met code BeeldgeluidJM krijg je een tweede museumticket gratis. Kom je met iemand mee, dan hoeft die dus maar een kaartje te kopen. Heb je een Vriendenloterij- of Museumkaart? Dan kun je vooraf al gratis een tijdslot reserveren.

Heel sympathiek van ze, en precies het soort extra dat deze dag nog leuker maakt.

Tot de twaalfde!
Ed`;

  return { subject, html, text };
}
