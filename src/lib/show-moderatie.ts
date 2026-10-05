/**
 * Lichte moderatie voor gastenboek en gastfoto's (audit 5 okt 2026, #42).
 *
 * Standaard (achteraf modereren): een bericht of foto staat meteen op de showpagina, zoals
 * gasten gewend zijn, en Ed krijgt bij elk bericht en elke foto een mail met een knop
 * "Verbergen". Die knop opent een bevestigingspagina (/api/show/moderate); pas de knop dáár
 * wijzigt iets, zodat een linkscanner in de mailbox niets kan verbergen. Verbergen zet
 * approved op false en is terug te draaien; verwijderen blijft via de Gig Manager.
 *
 * Vooraf modereren: zet SHOW_MODERATIE=vooraf in Vercel. Dan komt alles binnen met
 * approved=false en zet Ed het zelf online via dezelfde mail ("Tonen").
 */
import { Resend } from 'resend';
import { escapeHtml, moderatieToken, type ModeratieType } from './show-veiligheid.ts';

const SITE_URL = 'https://edstruijlaart.nl';

export function voorafModereren(): boolean {
  return import.meta.env.SHOW_MODERATIE === 'vooraf';
}

/** _key voor een nieuw gastenboek- of foto-item (base36, past bij isGeldigeItemKey). */
export function nieuweItemKey(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

export function moderatieLink(showId: string, type: ModeratieType, key: string): string | null {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret) return null;
  const q = new URLSearchParams({ show: showId, type, key, t: moderatieToken(showId, type, key, secret) });
  return `${SITE_URL}/api/show/moderate?${q.toString()}`;
}

export async function stuurModeratieMelding(m: {
  showId: string;
  city?: string;
  slug?: string;
  type: ModeratieType;
  key: string;
  naam: string;
  bericht?: string;
  fotoUrl?: string;
  zichtbaar: boolean;
}): Promise<void> {
  const resend = new Resend(import.meta.env.RESEND_API_KEY);
  const link = moderatieLink(m.showId, m.type, m.key);
  const showPageUrl = `${SITE_URL}/shows/${encodeURIComponent(m.slug || '')}`;
  const wat = m.type === 'photo' ? 'foto' : 'gastenboekbericht';
  const plat = (s: string) => s.replace(/[\r\n]+/g, ' ').slice(0, 60);

  const knopTekst = m.zichtbaar ? 'Verbergen' : 'Bekijken en tonen';
  const status = m.zichtbaar
    ? 'Staat al op de showpagina.'
    : 'Staat nog NIET op de showpagina: wacht op jouw goedkeuring.';

  await resend.emails.send({
    from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
    to: 'edstruijlaart@gmail.com',
    subject: `${m.type === 'photo' ? '📸 Nieuwe foto' : '💬 Nieuw gastenboekbericht'} van ${plat(m.naam)}, ${plat(m.city || 'onbekend')}`,
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;background:#0F0F0F;color:#F0EDE8;padding:32px;border-radius:12px;">
        <p style="color:#D4A843;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px;">Nieuwe ${wat}</p>
        <p style="font-size:16px;margin:0 0 8px;"><strong>${escapeHtml(m.naam)}</strong> plaatste een ${wat} bij ${escapeHtml(m.city || 'onbekend')}.</p>
        ${m.bericht ? `<p style="color:#9B9B9B;font-size:14px;font-style:italic;margin:0 0 16px;">"${escapeHtml(m.bericht)}"</p>` : ''}
        ${m.fotoUrl ? `<img src="${escapeHtml(m.fotoUrl)}" alt="Gastenfoto" style="width:100%;max-width:400px;border-radius:8px;margin:16px 0;" />` : ''}
        <p style="color:#9B9B9B;font-size:13px;margin:0 0 16px;">${status}</p>
        ${link ? `<p style="margin:0 0 16px;"><a href="${escapeHtml(link)}" style="display:inline-block;background:#B8860B;color:#fff;padding:10px 22px;border-radius:9999px;text-decoration:none;font-weight:600;">${knopTekst}</a></p>` : ''}
        <p style="margin:16px 0 0;"><a href="${escapeHtml(showPageUrl)}" style="color:#D4A843;text-decoration:none;">Bekijk showpagina →</a></p>
      </div>
    `,
  });
}
