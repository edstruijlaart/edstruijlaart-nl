#!/usr/bin/env tsx
/**
 * AFAS Live 2026 follow-up mail — verstuurt YouTube link + MP3 download
 * via Resend (vanaf ed@edstruijlaart.nl).
 *
 * Modes:
 *   MODE=test  → stuurt 1 mail naar edstruijlaart@gmail.com
 *   MODE=live  → vraagt expliciete bevestiging, dan paced verzending naar alle 286
 *
 * Run:
 *   MODE=test npx tsx scripts/mail-afas-followup.ts
 *   MODE=live npx tsx scripts/mail-afas-followup.ts
 *
 * Veiligheid:
 * - In test mode wordt de lijst NIET geraadpleegd
 * - In live mode print-script eerst de lijst + telling, vraagt CONFIRM=yes
 * - Pacing: 1 mail per 2.5 seconden → ~12 minuten voor 286 mails
 * - Bij elke mail wordt status gelogd
 */

import { Resend } from "resend";
import { readFileSync, writeFileSync, existsSync } from "fs";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("FOUT: RESEND_API_KEY ontbreekt in env");
  process.exit(1);
}

const MODE = (process.env.MODE || "test").toLowerCase();
const CONFIRM = process.env.CONFIRM === "yes";
const TEST_EMAIL = "edstruijlaart@gmail.com";

const LISTMONK_URL = "http://192.168.68.141:9000";
const LISTMONK_USER = "api_huiskamer";
const LISTMONK_TOKEN = "18ba65bbcc66110941d166670352f951";
const LIST_ID = 43;

const YOUTUBE_URL = "https://youtu.be/yD-7deHA9wg";
const MP3_URL =
  "https://cdn.earswantmusic.nl/downloads/afas-live-2026-mp3s.zip";

const FROM = "Ed Struijlaart <ed@edstruijlaart.nl>";
const REPLY_TO = "ed@edstruijlaart.nl";

const SUBJECT =
  "Cadeau van de AFAS Live: complete concertvideo + alle nummers als MP3";

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

Ed
`;
}

interface Subscriber {
  id: number;
  email: string;
  name: string;
}

async function getSubscribers(): Promise<Subscriber[]> {
  const auth = Buffer.from(`${LISTMONK_USER}:${LISTMONK_TOKEN}`).toString(
    "base64"
  );
  const out: Subscriber[] = [];
  let page = 1;
  while (true) {
    const url = `${LISTMONK_URL}/api/subscribers?list_id=${LIST_ID}&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const json: any = await res.json();
    const results = json.data?.results || [];
    if (results.length === 0) break;
    for (const r of results) {
      out.push({ id: r.id, email: r.email, name: r.name || "" });
    }
    if (out.length >= json.data.total) break;
    page++;
  }
  return out;
}

function firstName(name: string): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0];
}

async function send(resend: Resend, sub: Subscriber): Promise<boolean> {
  const fn = firstName(sub.name);
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: sub.email,
      replyTo: REPLY_TO,
      subject: SUBJECT,
      html: html(fn),
      text: text(fn),
    });
    if (error) {
      console.error(`  ✗ ${sub.email}: ${JSON.stringify(error)}`);
      return false;
    }
    console.log(`  ✓ ${sub.email} (${fn || "geen naam"})`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${sub.email}: ${e}`);
    return false;
  }
}

async function main() {
  const resend = new Resend(RESEND_API_KEY);

  if (MODE === "test") {
    console.log("=== MODE: TEST ===");
    console.log(`Stuur 1 testmail naar: ${TEST_EMAIL}`);
    const ok = await send(resend, {
      id: 0,
      email: TEST_EMAIL,
      name: "Ed (test)",
    });
    console.log(ok ? "Klaar." : "Mislukt.");
    return;
  }

  if (MODE === "live") {
    console.log("=== MODE: LIVE ===");
    const subs = await getSubscribers();
    console.log(`Subscribers in lijst ${LIST_ID}: ${subs.length}`);
    console.log("Eerste 5:");
    for (const s of subs.slice(0, 5)) {
      console.log(`  - ${s.email} (${s.name})`);
    }
    if (!CONFIRM) {
      console.log("");
      console.log(
        "Dry run gestopt. Om echt te versturen: zet CONFIRM=yes in env."
      );
      console.log(
        `Geschat: ${subs.length} mails × 2.5s = ${Math.round(
          (subs.length * 2.5) / 60
        )} min`
      );
      return;
    }
    console.log("");
    console.log(`Verzending naar ${subs.length} ontvangers begint…`);
    const logPath = `/tmp/afas-mail-log-${Date.now()}.txt`;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      const ok = await send(resend, sub);
      if (ok) sent++;
      else failed++;
      writeFileSync(
        logPath,
        `${i + 1}/${subs.length} ${ok ? "OK" : "FAIL"} ${sub.email}\n`,
        { flag: "a" }
      );
      if (i < subs.length - 1) {
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
    console.log("");
    console.log(`✓ Klaar: ${sent} verstuurd, ${failed} gefaald`);
    console.log(`Log: ${logPath}`);
    return;
  }

  console.error(`Onbekende MODE: ${MODE}. Gebruik 'test' of 'live'.`);
}

main();
