export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Eenmalige bulkmail naar alle huidige Continuum Day-deelnemers (wachtlijst != true):
 * update dat de 250 plekken vol zijn + de Beeld & Geluid-kortingscode (BeeldgeluidJM).
 *
 * Geen cron, handmatig getriggerd door Ed met x-api-key header (BOOTLEG_API_KEY).
 * Patroon geleend van send-reminder.ts: retry + delay tegen Resend rate limits,
 * samenvatting achteraf naar Ed zelf.
 *
 * Query-param ?dryrun=1 stuurt alleen naar Ed zelf ter controle, verstuurt niets naar deelnemers.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const apiKey = request.headers.get('x-api-key');
  const bootlegApiKey = import.meta.env.BOOTLEG_API_KEY;

  if (!bootlegApiKey || apiKey !== bootlegApiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const dryrun = url.searchParams.get('dryrun') === '1';

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const deelnemers = await sanityWriteClient.fetch<{ naam: string; email: string }[]>(`
      *[_type == "continuumDayAanmelding" && wachtlijst != true] {
        naam,
        email
      } | order(naam asc)
    `);

    const target = dryrun
      ? [{ naam: 'Ed (dryrun)', email: 'edstruijlaart@gmail.com' }]
      : deelnemers;

    if (!target || target.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Geen deelnemers gevonden', sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;
    let errorCount = 0;
    let delayMs = 1000;
    const failed: Array<{ naam: string; email: string }> = [];

    for (const persoon of target) {
      if (sentCount > 0 || errorCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const { subject, html, text } = buildUpdateEmail(persoon.naam);

      let sent = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await resend.emails.send({
            from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
            to: persoon.email,
            subject,
            html,
            text,
          });

          if (result?.data?.id) {
            sentCount++;
            sent = true;
            break;
          } else {
            console.error(`Geen ID voor ${persoon.email} (poging ${attempt}):`, JSON.stringify(result));
            delayMs = Math.min(delayMs * 2, 5000);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        } catch (err: any) {
          const isRateLimit = err?.statusCode === 429 || err?.message?.includes('rate');
          console.error(`Mislukt voor ${persoon.email} (poging ${attempt}):`, err?.message || err);
          if (isRateLimit) {
            delayMs = Math.min(delayMs * 2, 5000);
          }
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      if (!sent) {
        errorCount++;
        failed.push(persoon);
      }
    }

    // Samenvatting naar Ed, alleen bij een echte (niet-dryrun) run
    if (!dryrun) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const failedSection =
          failed.length > 0
            ? `<h3 style="color:#cc0000;">⚠️ Niet bezorgd:</h3><ul>${failed
                .map((f) => `<li>${f.naam} (${f.email})</li>`)
                .join('')}</ul>`
            : '';
        await resend.emails.send({
          from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
          to: 'edstruijlaart@gmail.com',
          subject: `${errorCount > 0 ? '⚠️' : '✅'} Continuum Day update-mail: ${sentCount} verstuurd${errorCount > 0 ? `, ${errorCount} mislukt` : ''}`,
          html: `<p>Update-mail (250 vol + Beeld & Geluid-code) verstuurd naar ${sentCount} van ${target.length} deelnemers.</p>${failedSection}`,
        });
      } catch (summaryErr) {
        console.error('Samenvattingsmail mislukt:', summaryErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, dryrun, total: target.length, sent: sentCount, errors: errorCount, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('send-continuum-day-update error:', error);
    return new Response(JSON.stringify({ error: 'Er ging iets mis' }), { status: 500 });
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
