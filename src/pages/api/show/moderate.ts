export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityWriteClient } from '../../../lib/sanity';
import {
  escapeHtml,
  isGeldigDocId,
  isGeldigeItemKey,
  moderatieToken,
  tokenKlopt,
  type ModeratieType,
} from '../../../lib/show-veiligheid';

/**
 * Moderatie van één gastenboekbericht of gastfoto, via de link in Eds notificatiemail
 * (zie src/lib/show-moderatie.ts). Audit #42.
 *
 * GET  ?show=&type=&key=&t=  → bevestigingspagina, wijzigt niets (linkscanners in de mailbox
 *                              mogen er gerust op klikken).
 * POST dezelfde velden + actie=verbergen|tonen → zet approved op false/true.
 *
 * De link is ondertekend met een HMAC op CRON_SECRET over show, type en key; hij werkt dus
 * alleen voor dat ene item.
 */

interface Verzoek {
  show: string;
  type: ModeratieType;
  key: string;
}

function leesVerzoek(get: (naam: string) => string | null): Verzoek | null {
  const show = get('show');
  const type = get('type');
  const key = get('key');
  const t = get('t');
  const secret = import.meta.env.CRON_SECRET;
  if (!secret || !isGeldigDocId(show) || !isGeldigeItemKey(key) || (type !== 'guestbook' && type !== 'photo')) {
    return null;
  }
  if (!tokenKlopt(t, moderatieToken(show, type, key, secret))) return null;
  return { show, type, key };
}

function pagina(titel: string, inhoud: string, status = 200): Response {
  return new Response(`<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(titel)}</title>
</head>
<body style="margin:0;padding:0;background:#0F0F0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F0EDE8;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="padding:40px 24px;max-width:480px;width:100%;">
    <h1 style="font-family:Georgia,serif;font-size:22px;color:#B8860B;margin:0 0 16px;">${escapeHtml(titel)}</h1>
    ${inhoud}
  </div>
</body>
</html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

const ongeldig = () => pagina('Link niet geldig', '<p style="color:#9B9B9B;">Deze moderatielink klopt niet of is onvolledig.</p>', 403);

async function haalItem(v: Verzoek) {
  const veld = v.type === 'photo' ? 'guestPhotos' : 'guestbookEntries';
  return sanityWriteClient.fetch(
    `*[_type == "show" && _id == $show][0]{
      city,
      "slug": slug.current,
      "item": ${veld}[_key == $key][0]{ approved, "naam": coalesce(name, uploadedBy), message, "fotoUrl": image.asset->url }
    }`,
    { show: v.show, key: v.key }
  );
}

function knop(v: Verzoek, t: string, actie: 'verbergen' | 'tonen', tekst: string): string {
  return `<form method="POST" style="display:inline-block;margin:0 8px 8px 0;">
    <input type="hidden" name="show" value="${escapeHtml(v.show)}">
    <input type="hidden" name="type" value="${escapeHtml(v.type)}">
    <input type="hidden" name="key" value="${escapeHtml(v.key)}">
    <input type="hidden" name="t" value="${escapeHtml(t)}">
    <input type="hidden" name="actie" value="${actie}">
    <button type="submit" style="background:#B8860B;color:#fff;border:0;padding:12px 24px;border-radius:9999px;font-weight:600;font-size:15px;cursor:pointer;">${tekst}</button>
  </form>`;
}

export const GET: APIRoute = async ({ url }) => {
  const v = leesVerzoek((n) => url.searchParams.get(n));
  if (!v) return ongeldig();

  const data = await haalItem(v);
  if (!data?.item) {
    return pagina('Niet gevonden', '<p style="color:#9B9B9B;">Dit bericht of deze foto bestaat niet meer (al verwijderd?).</p>', 404);
  }
  const { item } = data;
  const zichtbaar = item.approved !== false;
  const t = url.searchParams.get('t') || '';

  return pagina(
    v.type === 'photo' ? 'Gastfoto' : 'Gastenboekbericht',
    `<p style="margin:0 0 8px;"><strong>${escapeHtml(item.naam || 'Anoniem')}</strong> bij ${escapeHtml(data.city || 'onbekend')}</p>
     ${item.message ? `<p style="color:#9B9B9B;font-style:italic;margin:0 0 16px;">"${escapeHtml(item.message)}"</p>` : ''}
     ${item.fotoUrl ? `<img src="${escapeHtml(item.fotoUrl)}?w=600&q=80" alt="" style="width:100%;border-radius:8px;margin:0 0 16px;">` : ''}
     <p style="color:#9B9B9B;font-size:14px;margin:0 0 20px;">Nu: ${zichtbaar ? 'zichtbaar op de showpagina' : 'verborgen'}.</p>
     ${zichtbaar ? knop(v, t, 'verbergen', 'Verbergen') : knop(v, t, 'tonen', 'Tonen op de showpagina')}`
  );
};

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData().catch(() => null);
  if (!form) return ongeldig();
  const v = leesVerzoek((n) => {
    const waarde = form.get(n);
    return typeof waarde === 'string' ? waarde : null;
  });
  const actie = form.get('actie');
  if (!v || (actie !== 'verbergen' && actie !== 'tonen')) return ongeldig();

  const data = await haalItem(v);
  if (!data?.item) {
    return pagina('Niet gevonden', '<p style="color:#9B9B9B;">Dit bericht of deze foto bestaat niet meer.</p>', 404);
  }

  const veld = v.type === 'photo' ? 'guestPhotos' : 'guestbookEntries';
  await sanityWriteClient
    .patch(v.show)
    .set({ [`${veld}[_key=="${v.key}"].approved`]: actie === 'tonen' })
    .commit();

  const slug = data.slug ? `https://edstruijlaart.nl/shows/${encodeURIComponent(data.slug)}` : 'https://edstruijlaart.nl';
  return pagina(
    actie === 'tonen' ? 'Staat online' : 'Verborgen',
    `<p style="color:#9B9B9B;margin:0 0 20px;">${actie === 'tonen'
      ? 'Het staat nu op de showpagina.'
      : 'Het staat niet meer op de showpagina. Terugzetten kan via dezelfde link in je mail.'}</p>
     <a href="${escapeHtml(slug)}" style="color:#D4A843;text-decoration:none;">Bekijk showpagina →</a>`
  );
};
