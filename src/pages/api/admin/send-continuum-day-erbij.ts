export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';
import { buildContinuumDayEmail } from '../../../lib/continuum-day-email';

/**
 * Eenmalig: de standaard bevestigingsmail ("je staat op de lijst") sturen naar
 * mensen die van de wachtlijst zijn doorgeschoven maar er nog geen bericht over
 * kregen. Ze krijgen exact dezelfde mail als iedere andere deelnemer, inclusief
 * programma, chord-sheet, verloting en de Beeld & Geluid-code.
 *
 * Handmatig getriggerd met x-api-key (BOOTLEG_API_KEY), geen cron.
 *
 * Idempotent: elke geslaagde verzending zet `erbijMailOp` op het document en de
 * query slaat die mensen over. Veilig te herhalen tot resterend 0 is.
 *
 * Query-params:
 *   ?datum=YYYY-MM-DD  alleen wie op die dag is gepromoveerd (verplicht, zodat
 *                      een misklik nooit de hele deelnemerslijst aanschrijft)
 *   ?dryrun=1          stuurt alleen naar Ed zelf, markeert niemand
 *   ?limit=N           aantal per batch (default 25)
 */
export const GET: APIRoute = async ({ request, url }) => {
  const apiKey = request.headers.get('x-api-key');
  const bootlegApiKey = import.meta.env.BOOTLEG_API_KEY;

  if (!bootlegApiKey || apiKey !== bootlegApiKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const datum = url.searchParams.get('datum');
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return new Response(
      JSON.stringify({ error: 'Geef ?datum=YYYY-MM-DD mee (de promotiedatum)' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const dryrun = url.searchParams.get('dryrun') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 25, 60);

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const openstaand = await sanityWriteClient.fetch<{ _id: string; naam: string; email: string }[]>(
      `*[_type == "continuumDayAanmelding"
          && wachtlijst != true
          && gepromoveerdOp == $datum
          && !defined(erbijMailOp)] { _id, naam, email } | order(naam asc)`,
      { datum }
    );

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
      if (i > 0) await new Promise((r) => setTimeout(r, 700));

      const { subject, html, text } = buildContinuumDayEmail({ name: persoon.naam });

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
          await sanityWriteClient.patch(persoon._id).set({ erbijMailOp: vandaag }).commit();
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
      JSON.stringify({ success: true, dryrun, datum, batch: batch.length, sent: sentCount, errors: errorCount, resterend, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('send-continuum-day-erbij error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};
