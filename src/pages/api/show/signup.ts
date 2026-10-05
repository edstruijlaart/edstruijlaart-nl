export const prerender = false;

import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';
import { subscribe } from '../../../lib/listmonk';
import { beoordeel } from '../../../lib/botfilter';
import {
  binnenAanmeldvenster,
  bootlegDownloadPad,
  isActieveShow,
  isGeldigDocId,
  magLateHerinneringSturen,
  normaliseerEmail,
} from '../../../lib/show-veiligheid';
import {
  HERINNERING_SHOW_VELDEN,
  bouwHerinnering,
  claimHerinnering,
  geefClaimTerug,
  type HerinneringShow,
} from '../../../lib/show-herinnering';
import { nieuweItemKey, stuurModeratieMelding, voorafModereren } from '../../../lib/show-moderatie';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * E-mail-gate op de showpagina. Beveiligd tegen misbruik als mailrelay (audit #9):
 *  - alleen voor een bestaande, niet-gearchiveerde show, binnen het venster waarin het formulier
 *    op de pagina staat (aanvang tot 24 uur erna);
 *  - botfilter (honeypot `website` + laadtoken `t`, zoals /api/newsletter);
 *  - per show en e-mailadres één aanmelding: een tweede keer maakt geen document aan en stuurt
 *    geen mail;
 *  - alle invoer wordt ge-escaped in de mail (email-templates.ts).
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { showId, firstName, email, message } = body || {};
    // Oude pagina's stuurden de honeypot als `honeypot`; de huidige als `website`.
    const website = body?.website ?? body?.honeypot ?? '';

    // Validatie
    if (typeof firstName !== 'string' || typeof email !== 'string' || !firstName.trim() || !email.trim()
        || !isGeldigDocId(showId)) {
      return json({ error: 'Vul alle velden in' }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return json({ error: 'Ongeldig emailadres' }, 400);
    }

    // Botfilter: bij een bot doen we alsof het gelukt is zonder iets op te slaan.
    const oordeel = beoordeel({ website, t: body?.t, email });
    if (oordeel.bot) {
      console.warn('show/signup: bot geweigerd', oordeel.reden);
      return json({ success: true });
    }

    // Sanitize input
    const cleanFirstName = firstName.trim().slice(0, 100);
    const cleanEmail = normaliseerEmail(email).slice(0, 254);
    const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 280) : '';

    // Show vers ophalen (geen CDN): status en reminderSent moeten kloppen.
    const show: HerinneringShow | null = await sanityWriteClient.fetch(
      `*[_type == "show" && _id == $id][0]{ ${HERINNERING_SHOW_VELDEN} }`,
      { id: showId }
    );

    if (!isActieveShow(show)) {
      return json({ error: 'Show niet gevonden' }, 404);
    }
    if (!binnenAanmeldvenster(show!.startDateTime)) {
      return json({ error: 'Aanmelden kan alleen op de avond zelf en de dag erna.' }, 403);
    }

    // Eén aanmelding per show en adres (vers gelezen, zonder CDN).
    const bestaand: { _id: string } | null = await sanityWriteClient.fetch(
      `*[_type == "emailSignup" && show._ref == $showId && lower(email) == $email][0]{ _id }`,
      { showId, email: cleanEmail }
    );

    let signupId: string;
    let signupRev = '';
    const nieuw = !bestaand;
    if (bestaand) {
      signupId = bestaand._id;
    } else {
      // ID met een punt: alleen leesbaar met een token, ook in deze publieke dataset (audit #4).
      const signup = await sanityWriteClient.create({
        _id: `prive.${randomUUID()}`,
        _type: 'emailSignup',
        firstName: cleanFirstName,
        email: cleanEmail,
        show: { _type: 'reference', _ref: showId },
        signedUpAt: new Date().toISOString(),
        syncedToListmonk: false,
        source: 'email-gate',
      });
      signupId = signup._id;
      signupRev = signup._rev;
    }

    // Gastenboek entry toevoegen (als er een bericht is). Zonder mailadres: het gastenboek
    // staat op de pagina en het adres staat al in de aanmelding (audit #4).
    if (cleanMessage.length > 0) {
      const key = nieuweItemKey();
      const zichtbaar = !voorafModereren();
      await sanityWriteClient
        .patch(showId)
        .setIfMissing({ guestbookEntries: [] })
        .append('guestbookEntries', [{
          _key: key,
          name: cleanFirstName,
          message: cleanMessage,
          approved: zichtbaar,
          submittedAt: new Date().toISOString(),
        }])
        .commit();
      stuurModeratieMelding({
        showId, city: show!.city, slug: show!.slug?.current, type: 'guestbook', key,
        naam: cleanFirstName, bericht: cleanMessage, zichtbaar,
      }).catch(console.error);
    }

    if (nieuw) {
      // Listmonk sync (fire and forget: mag de aanmelding nooit laten mislukken).
      // Faalt hij, dan blijft syncedToListmonk op false staan en pikt de
      // inhaalronde in /api/show/send-reminder hem de volgende ochtend op.
      syncToListmonk(cleanFirstName, cleanEmail, signupId).catch(console.error);

      // Late signup: de herinneringsronde voor deze show is al geweest, dus direct een mail.
      if (magLateHerinneringSturen(show!)) {
        sendLateSignupReminder({ _id: signupId, _rev: signupRev, firstName: cleanFirstName, email: cleanEmail }, show!)
          .catch(console.error);
      }
    }

    // Persoonlijke downloadlink voor de bootleg (ook als die pas later wordt geüpload): de pagina
    // bewaart hem bij de gate-gegevens.
    const cronSecret = import.meta.env.CRON_SECRET;
    const download = cronSecret ? bootlegDownloadPad(showId, signupId, cronSecret) : undefined;

    return json({ success: true, download });
  } catch (error) {
    console.error('Signup error:', error);
    return json({ error: 'Er ging iets mis' }, 500);
  }
};

async function sendLateSignupReminder(
  signup: { _id: string; _rev: string; firstName: string; email: string },
  show: HerinneringShow,
) {
  // Claim eerst, zodat een gelijktijdige cron-run hem niet ook stuurt.
  if (!signup._rev || !(await claimHerinnering(signup._id, signup._rev))) return;

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);
    const { subject, html } = bouwHerinnering(show, signup, import.meta.env.CRON_SECRET);

    const result = await resend.emails.send({
      from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
      to: signup.email,
      bcc: 'edstruijlaart@gmail.com',
      subject,
      html,
    });
    if (!result?.data?.id) throw new Error(`Resend gaf geen id: ${JSON.stringify(result?.error ?? result)}`);

    // Increment emailsSent counter
    await sanityWriteClient
      .patch(show._id)
      .setIfMissing({ emailsSent: 0 })
      .inc({ emailsSent: 1 })
      .commit();

    console.log(`Late signup reminder sent to ${signup.email} for ${show.city}`);
  } catch (err) {
    console.error(`Failed to send late signup reminder to ${signup.email}:`, err);
    await geefClaimTerug(signup._id).catch(console.error);
  }
}

async function syncToListmonk(firstName: string, email: string, signupId: string) {
  // Huiskamerconcerten (lijst 10) — de lijst die Ed ook echt mailt. Ging tot
  // 1 sep 2026 naar "Huikamerlijst op locatie" (12), een doodlopende lijst waar
  // 17 mensen ongebruikt in bleven liggen.
  const HK_LIST_UUID = '772c8bce-57f6-4537-ada4-2408b6a839da';

  const r = await subscribe({ email, name: firstName, listUuids: [HK_LIST_UUID] });
  // Al ingeschreven of geblokkeerd: voor ons afgehandeld. Alleen een echte
  // storing laten we staan, zodat de inhaalronde het later opnieuw probeert.
  if (!r.ok && r.status === 'error') {
    throw new Error(`Listmonk: ${r.error}`);
  }
  // Vlaggetje pas nú omzetten. Zolang dat niet gebeurde stond élke aanmelding
  // op "nog niet gesynct", ook de geslaagde, en was er geen manier om te zien
  // wie er werkelijk was blijven liggen.
  await sanityWriteClient.patch(signupId).set({ syncedToListmonk: true }).commit();
}
