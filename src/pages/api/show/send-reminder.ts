export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';
import { subscribe } from '../../../lib/listmonk';
import { escapeHtml, geheimKlopt, planHerinneringen } from '../../../lib/show-veiligheid';
import {
  HERINNERING_SHOW_VELDEN,
  bouwHerinnering,
  claimHerinnering,
  geefClaimTerug,
  type HerinneringShow,
} from '../../../lib/show-herinnering';

/**
 * Vercel Cron endpoint: verstuurt herinneringsmails voor shows
 * die 12-96 uur geleden zijn begonnen en nog geen mail hebben gekregen.
 *
 * Wordt elke ochtend om 10:00 getriggerd door Vercel Cron.
 * Kan ook handmatig getriggerd worden met de juiste auth header.
 *
 * Idempotent (audit #23): elke aanmelding wordt vóór het versturen geclaimd met
 * reminderSentAt (ifRevisionID), en per show krijgt elk e-mailadres één mail. Een dubbel
 * afgeleverde cron, een afgebroken run of een gast die zich op twee apparaten aanmeldde,
 * levert dus geen tweede mail op. Gearchiveerde shows worden overgeslagen (audit #22).
 * Alles wordt vers gelezen via de write-client (geen CDN).
 */
/**
 * Inhaalronde: aanmeldingen die wél in Sanity staan maar niet op de mailinglijst
 * belandden (Listmonk onbereikbaar op dat moment). Draait mee met de dagelijkse
 * cron, zodat één hik geen adres kost.
 *
 * Alleen source == "email-gate": daar staat de toestemmingstekst bij. Ticket Tailor-kopers
 * (gesynct door de Gig Manager) krijgen wel de herinneringsmail, maar komen niet op de
 * nieuwsbrief (audit #21).
 */
async function haalAchterstalligeSyncsIn(): Promise<{ gedaan: number; mislukt: number }> {
  const HK_LIST_UUID = '772c8bce-57f6-4537-ada4-2408b6a839da'; // Huiskamerconcerten

  const open = await sanityWriteClient.fetch(
    `*[_type == "emailSignup" && source == "email-gate" && syncedToListmonk != true][0...200]{_id, email, firstName}`
  );
  let gedaan = 0, mislukt = 0;
  for (const rij of open || []) {
    try {
      const r = await subscribe({ email: rij.email, name: rij.firstName, listUuids: [HK_LIST_UUID] });
      if (!r.ok && r.status === 'error') throw new Error(`Listmonk: ${r.error}`);
      await sanityWriteClient.patch(rij._id).set({ syncedToListmonk: true }).commit();
      gedaan++;
    } catch (e) {
      console.error('Inhaalsync mislukt voor', rij.email, e);
      mislukt++;
    }
  }
  return { gedaan, mislukt };
}

interface SignupRij {
  _id: string;
  _rev: string;
  firstName: string;
  email: string;
  reminderSentAt?: string | null;
}

const slaap = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const GET: APIRoute = async ({ request }) => {
  // Auth: Vercel Cron stuurt Authorization: Bearer CRON_SECRET
  // Handmatig triggeren kan ook met x-api-key header (BOOTLEG_API_KEY)
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = import.meta.env.CRON_SECRET;
  const apiKey = request.headers.get('x-api-key');
  const bootlegApiKey = import.meta.env.BOOTLEG_API_KEY;

  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  const isAuthorized = geheimKlopt(bearer, cronSecret) || geheimKlopt(apiKey, bootlegApiKey);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    // Zoek shows die 12-96u geleden begonnen EN nog geen reminder hebben gestuurd
    // Window van 96u (4 dagen) geeft voldoende marge voor Vercel free tier (cron 1x/dag)
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const ninetySixHoursAgo = new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString();

    const shows: HerinneringShow[] = await sanityWriteClient.fetch(`
      *[_type == "show"
        && !(_id in path("drafts.**"))
        && status != "archived"
        && reminderSent != true
        && startDateTime < $twelveHoursAgo
        && startDateTime > $ninetySixHoursAgo
      ] { ${HERINNERING_SHOW_VELDEN} }
    `, { twelveHoursAgo, ninetySixHoursAgo });

    const inhaal = await haalAchterstalligeSyncsIn();

    if (!shows || shows.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Geen shows gevonden die een reminder nodig hebben',
        showsProcessed: 0,
        listmonkInhaal: inhaal,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const results = [];

    for (const show of shows) {
      // Haal subscribers op voor deze show (vers, met _rev voor de claim)
      const signups: SignupRij[] = await sanityWriteClient.fetch(`
        *[_type == "emailSignup" && show._ref == $showId] | order(signedUpAt asc) {
          _id,
          _rev,
          firstName,
          email,
          reminderSentAt
        }
      `, { showId: show._id });

      if (!signups || signups.length === 0) {
        results.push({ show: show.city, emails: 0, status: 'no_signups' });
        // Markeer toch als verstuurd en zet op "past"
        await sanityWriteClient.patch(show._id).set({ reminderSent: true, status: 'past' }).commit();
        continue;
      }

      const { versturen, dubbel } = planHerinneringen(signups);

      // Tweede aanmelding met hetzelfde adres: markeren, geen tweede mail.
      for (const rij of dubbel) {
        try {
          await sanityWriteClient
            .patch(rij._id)
            .ifRevisionId(rij._rev)
            .set({ reminderSentAt: new Date().toISOString(), reminderDubbel: true })
            .commit();
        } catch (err) {
          console.error(`Kon dubbele aanmelding ${rij._id} niet markeren:`, err);
        }
      }

      let sentCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      let delayMs = 1000; // Per show opnieuw 1s; alleen omhoog bij een echte 429
      const failedSignups: Array<{ firstName: string; email: string }> = [];

      // Verstuur mail per subscriber met retry-logica
      for (const signup of versturen) {
        // Claim vóór het versturen. Lukt dat niet, dan is hij al (door een andere run) opgepakt.
        let geclaimd = false;
        try {
          geclaimd = await claimHerinnering(signup._id, signup._rev);
        } catch (err) {
          console.error(`Claim mislukt voor ${signup.email}:`, err);
        }
        if (!geclaimd) {
          skippedCount++;
          continue;
        }

        // Wacht tussen mails (respecteert Resend rate limit)
        if (sentCount > 0 || errorCount > 0) {
          await slaap(delayMs);
        }

        const { subject, html } = bouwHerinnering(show, signup, cronSecret);

        // Retry logica: max 3 pogingen per mail
        let sent = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await resend.emails.send({
              from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
              to: signup.email,
              bcc: 'edstruijlaart@gmail.com',
              subject,
              html,
            });

            // Check of Resend een ID teruggeeft (= geaccepteerd)
            if (result?.data?.id) {
              sentCount++;
              sent = true;
              break;
            }
            const isRateLimit = (result as any)?.error?.statusCode === 429 || (result as any)?.error?.name === 'rate_limit_exceeded';
            if (isRateLimit) delayMs = Math.min(delayMs * 2, 5000);
            console.error(`No ID returned for ${signup.email} (attempt ${attempt}):`, JSON.stringify(result));
          } catch (emailErr: any) {
            const isRateLimit = emailErr?.statusCode === 429;
            console.error(`Failed to send to ${signup.email} (attempt ${attempt}):`, emailErr?.message || emailErr);
            if (isRateLimit) {
              delayMs = Math.min(delayMs * 2, 5000);
              console.log(`Rate limit detected, increasing delay to ${delayMs}ms`);
            }
          }
          if (attempt < 3) {
            await slaap(delayMs);
          }
        }

        if (!sent) {
          errorCount++;
          failedSignups.push({ firstName: signup.firstName, email: signup.email });
          try {
            await geefClaimTerug(signup._id);
          } catch (err) {
            console.error(`Kon claim van ${signup._id} niet terugdraaien:`, err);
          }
        }
      }

      // Markeer show als verstuurd, zet status op "past", en tel emailsSent op
      // Gebruikt .inc() i.p.v. .set() om race condition met late-signup emails te voorkomen
      await sanityWriteClient
        .patch(show._id)
        .set({ reminderSent: true, status: 'past' })
        .setIfMissing({ emailsSent: 0 })
        .inc({ emailsSent: sentCount })
        .commit();

      results.push({
        show: show.city,
        emails: sentCount,
        errors: errorCount,
        duplicates: dubbel.length,
        skipped: skippedCount,
        failedSignups,
        status: 'sent',
      });
    }

    // Stuur samenvattingsmail naar Ed
    const totalSent = results.reduce((sum, r) => sum + (r.emails || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);
    // Namen en adressen zijn door gasten ingevuld: escapen.
    const allFailed = results.flatMap(r => (r.failedSignups || []).map((s: any) => `${escapeHtml(s.firstName)} (${escapeHtml(s.email)})`));

    const summaryLines = results.map(r =>
      `• ${escapeHtml(r.show)}: ${r.emails} mails verstuurd${r.errors ? `, ${r.errors} mislukt` : ' ✅'}${r.duplicates ? `, ${r.duplicates} dubbele aanmelding(en) overgeslagen` : ''}`
    );

    const failedSection = allFailed.length > 0
      ? `<h3 style="color: #cc0000;">⚠️ Niet bezorgd (na 3 pogingen):</h3><ul>${allFailed.map(f => `<li>${f}</li>`).join('')}</ul>`
      : '';

    const statusEmoji = totalErrors > 0 ? '⚠️' : '✅';

    try {
      await slaap(1000); // delay voor rate limit
      await resend.emails.send({
        from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
        to: 'edstruijlaart@gmail.com',
        subject: `${statusEmoji} Herinneringsmails: ${totalSent} verstuurd${totalErrors > 0 ? `, ${totalErrors} mislukt` : ''}`,
        html: `
          <h2>Herinneringsmails verstuurd</h2>
          <p>De volgende shows zijn verwerkt:</p>
          <ul>${summaryLines.map(l => `<li>${l}</li>`).join('')}</ul>
          ${failedSection}
          <p><small>Automatisch verstuurd door edstruijlaart.nl</small></p>
        `,
      });
    } catch (summaryErr) {
      console.error('Failed to send summary email:', summaryErr);
    }

    return new Response(JSON.stringify({
      success: true,
      showsProcessed: shows.length,
      listmonkInhaal: inhaal,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    return new Response(JSON.stringify({ error: 'Er ging iets mis' }), { status: 500 });
  }
};
