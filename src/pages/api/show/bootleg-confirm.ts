export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';

/**
 * Stuurt een bevestigingsmail naar Ed wanneer een bootleg succesvol is geüpload.
 * Wordt aangeroepen door de iOS Shortcut na een geslaagde upload naar Sanity.
 *
 * POST /api/show/bootleg-confirm
 * Headers: x-api-key: BOOTLEG_API_KEY
 * Body: { city: string, fileSize?: string, audioUrl?: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Auth check
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== import.meta.env.BOOTLEG_API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await request.json();
    const { city, fileSize, audioUrl } = body;

    if (!city) {
      return new Response(JSON.stringify({ error: 'City is verplicht' }), { status: 400 });
    }

    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const now = new Date().toLocaleString('nl-NL', {
      timeZone: 'Europe/Amsterdam',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await resend.emails.send({
      from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
      to: 'edstruijlaart@gmail.com',
      subject: `✅ Bootleg geüpload — ${city}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #B8860B; margin-bottom: 8px;">Bootleg ontvangen!</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.5;">
            De bootleg-opname van het huiskamerconcert in <strong>${city}</strong> is succesvol geüpload naar Sanity.
          </p>
          <table style="margin: 20px 0; font-size: 14px; color: #555;">
            <tr>
              <td style="padding: 4px 12px 4px 0; font-weight: 600;">Stad:</td>
              <td>${city}</td>
            </tr>
            ${fileSize ? `<tr><td style="padding: 4px 12px 4px 0; font-weight: 600;">Bestandsgrootte:</td><td>${fileSize}</td></tr>` : ''}
            <tr>
              <td style="padding: 4px 12px 4px 0; font-weight: 600;">Geüpload op:</td>
              <td>${now}</td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; font-weight: 600;">Verloopt over:</td>
              <td>30 dagen</td>
            </tr>
          </table>
          ${audioUrl ? `<p style="font-size: 13px; color: #888;"><a href="${audioUrl}" style="color: #B8860B;">Direct link naar bestand</a></p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 13px; color: #999;">
            De herinneringsmail met deze bootleg wordt morgenochtend automatisch verstuurd naar alle gasten.
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Bootleg confirm mail error:', error);
    return new Response(JSON.stringify({ error: 'Bevestigingsmail mislukt' }), { status: 500 });
  }
};
