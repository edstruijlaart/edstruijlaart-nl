export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";

const SUBSCRIBERS_URL =
  "https://boeken.edstruijlaart.nl/api/list-subscribers/43?token=afas-followup-2026-X9k2";

const YOUTUBE_URL = "https://youtu.be/yD-7deHA9wg";
const MP3_URL =
  "https://cdn.earswantmusic.nl/downloads/afas-live-2026-mp3s.zip";

const FROM = "Ed Struijlaart <ed@edstruijlaart.nl>";
const REPLY_TO = "ed@edstruijlaart.nl";
const SUBJECT =
  "Cadeau van de AFAS Live: complete concertvideo + alle nummers als MP3";

const TEST_EMAIL = "edstruijlaart@gmail.com";

const ADMIN_TOKEN = "afas-followup-2026-X9k2";

function html(voornaam: string) {
  const groet = voornaam ? `Hoi ${voornaam},` : "Hoi,";
  return `<!doctype html>
<html lang="nl"><body style="margin:0;padding:0;background:#f5f5f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f3;padding:32px 16px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;padding:40px 32px;"><tr><td>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">${groet}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Wat fijn dat je vorige week zaterdag in de AFAS Live was bij de Gipsy Kings, en bedankt nog dat je toen mijn QR scande. Hier is je cadeau, in twee smaken:</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
  <tr><td style="padding:0 0 14px;">
    <a href="${YOUTUBE_URL}" style="display:block;background:#0e0e0d;color:#ffffff;text-decoration:none;padding:18px 22px;border-radius:6px;font-weight:600;font-size:16px;text-align:center;">
      🎬 Bekijk het hele concert op YouTube
    </a>
  </td></tr>
  <tr><td>
    <a href="${MP3_URL}" style="display:block;background:#00aacc;color:#ffffff;text-decoration:none;padding:18px 22px;border-radius:6px;font-weight:600;font-size:16px;text-align:center;">
      🎧 Download alle 6 nummers als MP3
    </a>
  </td></tr>
</table>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#666;">De video staat ongelijst (alleen via deze link te vinden), dus voel je vrij om hem te delen met wie er ook bij was. De MP3-zip pakt na downloaden alle 6 nummers uit: van Aint No Sunshine tot Gravity.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Najaar 2026 ga ik op tour met <strong>Gitaarmannen 4: Continuum</strong>, een avond rond John Mayer's gelijknamige album. Slow Dancing en Gravity zitten beide op die avond. <a href="https://gitaarmannen.nl/continuum" style="color:#00aacc;text-decoration:none;">Bekijk of ik bij jou in de buurt speel</a>.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">Nog een keer dank voor je aandacht in de zaal. Tot snel.</p>
<p style="margin:0;font-size:16px;line-height:1.6;">Ed</p>
</td></tr></table>
<p style="margin:24px 0 0;font-size:12px;color:#999;">Je krijgt deze mail omdat je je op 23 mei 2026 hebt aangemeld via edstruijlaart.nl/afas.</p>
</td></tr></table>
</body></html>`;
}

function text(voornaam: string) {
  const groet = voornaam ? `Hoi ${voornaam},` : "Hoi,";
  return `${groet}

Wat fijn dat je vorige week zaterdag in de AFAS Live was bij de Gipsy Kings, en bedankt nog dat je toen mijn QR scande. Hier is je cadeau, in twee smaken:

Bekijk het hele concert op YouTube:
${YOUTUBE_URL}

Download alle 6 nummers als MP3:
${MP3_URL}

De video staat ongelijst (alleen via deze link te vinden), dus voel je vrij om hem te delen met wie er ook bij was. De MP3-zip pakt na downloaden alle 6 nummers uit: van Aint No Sunshine tot Gravity.

Najaar 2026 ga ik op tour met Gitaarmannen 4: Continuum, een avond rond John Mayer's gelijknamige album. Slow Dancing en Gravity zitten beide op die avond. Bekijk of ik bij jou in de buurt speel:
https://gitaarmannen.nl/continuum

Nog een keer dank voor je aandacht in de zaal. Tot snel.

Ed`;
}

function firstName(name: string): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
}

async function sendOne(
  resend: Resend,
  email: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const fn = firstName(name);
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      replyTo: REPLY_TO,
      subject: SUBJECT,
      html: html(fn),
      text: text(fn),
    });
    if (error) return { ok: false, error: JSON.stringify(error) };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}

export const POST: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token !== ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const mode = url.searchParams.get("mode") || "test";
  const resend = new Resend(import.meta.env.RESEND_API_KEY);

  if (mode === "test") {
    const result = await sendOne(resend, TEST_EMAIL, "Ed (test)");
    return new Response(
      JSON.stringify({ mode: "test", to: TEST_EMAIL, ...result }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (mode === "live") {
    const confirm = url.searchParams.get("confirm");
    if (confirm !== "yes") {
      return new Response(
        JSON.stringify(
          { mode: "live", error: "ontbreekt &confirm=yes" },
          null,
          2
        ),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const subsRes = await fetch(SUBSCRIBERS_URL);
    if (!subsRes.ok) {
      return new Response(
        `Kon subscribers niet ophalen: ${subsRes.status}`,
        { status: 502 }
      );
    }
    const subsJson: any = await subsRes.json();
    const subs: Array<{ email: string; name: string }> = subsJson.subscribers || [];

    // Resend batch endpoint: tot 100 mails per call → 3 batches voor 297
    const BATCH_SIZE = 100;
    const batches: Array<Array<{ email: string; name: string }>> = [];
    for (let i = 0; i < subs.length; i += BATCH_SIZE) {
      batches.push(subs.slice(i, i + BATCH_SIZE));
    }

    const results: Array<{ batch: number; sent: number; failed: number; errors: string[] }> = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      const payload = batch.map((s) => {
        const fn = firstName(s.name);
        return {
          from: FROM,
          to: [s.email],
          replyTo: REPLY_TO,
          subject: SUBJECT,
          html: html(fn),
          text: text(fn),
        };
      });
      try {
        const r = await resend.batch.send(payload as any);
        const data: any = r as any;
        const errors: string[] = [];
        let sent = 0;
        let failed = 0;
        if (data?.data?.data && Array.isArray(data.data.data)) {
          // succesvolle response
          sent = data.data.data.length;
        } else if (data?.error) {
          failed = batch.length;
          errors.push(JSON.stringify(data.error));
        } else {
          sent = batch.length;
        }
        results.push({ batch: bi + 1, sent, failed, errors });
        totalSent += sent;
        totalFailed += failed;
      } catch (e: any) {
        results.push({
          batch: bi + 1,
          sent: 0,
          failed: batch.length,
          errors: [String(e?.message || e)],
        });
        totalFailed += batch.length;
      }
    }

    return new Response(
      JSON.stringify(
        {
          mode: "live",
          total: subs.length,
          sent: totalSent,
          failed: totalFailed,
          batches: results,
        },
        null,
        2
      ),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response("unknown mode", { status: 400 });
};
