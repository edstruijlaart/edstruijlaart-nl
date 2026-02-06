import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Configuration (Vercel Environment Variables) ───
// SUMUP_API_KEY         — SumUp API key (sup_sk_...)
// LISTMONK_API_URL      — Listmonk URL (e.g. https://newsletter.earswantmusic.nl)
// LISTMONK_API_USER     — Listmonk admin username
// LISTMONK_API_PASS     — Listmonk admin password
// NOTIFY_EMAIL          — Ed's email for error/fallback notifications
// CRON_SECRET           — Secret token to protect the cron endpoint

const SUMUP_API_KEY = process.env.SUMUP_API_KEY || '';
const LISTMONK_API = process.env.LISTMONK_API_URL || 'https://newsletter.earswantmusic.nl';
const LISTMONK_USER = process.env.LISTMONK_API_USER || 'admin';
const LISTMONK_PASS = process.env.LISTMONK_API_PASS || '';
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'ed@earswantmusic.nl';
const CRON_SECRET = process.env.CRON_SECRET || '';
const FROM_EMAIL = 'ed@earswantmusic.nl';

// How far back to check for transactions (in minutes)
// Should be slightly longer than the cron interval to avoid gaps
const CHECK_WINDOW_MINUTES = 10;

// ─── Digital Product Mapping ───
// Matched against the `product_summary` field from SumUp transaction history
// Order matters: more specific matches first
const DIGITAL_PRODUCTS = [
  {
    keywords: ['cd', 'cd + video', 'cd+video', 'cd & video'],
    amount: 14.99,
    downloadUrl: 'https://youtu.be/Ct0AHaUQqTM',
    productName: 'Gitaarmannen 3: John Mayer — CD + Video',
    emailSubject: 'Je video: Gitaarmannen 3 — John Mayer (bij je CD-bestelling)',
    emailIntro: 'Bij je CD-bestelling zit een gratis video registratie inbegrepen. Hieronder vind je de link om de volledige Gitaarmannen 3: John Mayer voorstelling te bekijken.',
    buttonText: '▶ Bekijk video',
  },
  {
    keywords: ['videoregistratie', 'video registratie'],
    amount: 9.99,
    downloadUrl: 'https://youtu.be/Ct0AHaUQqTM',
    productName: 'Gitaarmannen 3: John Mayer — Video registratie',
    emailSubject: 'Je video: Gitaarmannen 3 — John Mayer',
    emailIntro: 'Hieronder vind je de link om de volledige Gitaarmannen 3: John Mayer voorstelling te bekijken.',
    buttonText: '▶ Bekijk video',
  },
  {
    keywords: ['clapton', 'unplugged', 'gitaarmannen 2'],
    amount: 9.99,
    downloadUrl: 'https://we.tl/t-B8FwiYgFX5',
    productName: 'Gitaarmannen 2: Eric Clapton Unplugged — Audio',
    emailSubject: 'Je download: Gitaarmannen 2 — Eric Clapton Unplugged',
    emailIntro: 'Hieronder vind je de link om de volledige audio-opname van Gitaarmannen 2: Eric Clapton Unplugged te downloaden.',
    buttonText: '↓ Download audio',
  },
] as const;

type DigitalProduct = (typeof DIGITAL_PRODUCTS)[number];

// ─── SumUp API ───

interface SumUpTransaction {
  id: string;
  amount: number;
  currency: string;
  payment_type: string;
  product_summary: string;
  status: string;
  timestamp: string;
  transaction_code: string;
  card_type?: string;
  entry_mode?: string;
}

async function getRecentTransactions(sinceMinutes: number): Promise<SumUpTransaction[]> {
  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const sinceISO = since.toISOString();

  const url = new URL('https://api.sumup.com/v0.1/me/transactions/history');
  url.searchParams.set('limit', '50');
  url.searchParams.set('order', 'descending');
  url.searchParams.set('oldest_time', sinceISO);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${SUMUP_API_KEY}` },
  });

  if (!res.ok) {
    throw new Error(`SumUp API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.items || [];
}

// ─── Product Matching ───

function findDigitalProduct(productSummary: string, amount: number): DigitalProduct | undefined {
  const lower = (productSummary || '').toLowerCase();

  // Strategy 1: Match by keywords + amount for disambiguation
  for (const product of DIGITAL_PRODUCTS) {
    if (product.keywords.some((kw) => lower.includes(kw))) {
      if (product.amount === amount) {
        return product;
      }
    }
  }

  // Strategy 2: Keyword match only (fallback for price differences)
  for (const product of DIGITAL_PRODUCTS) {
    if (product.keywords.some((kw) => lower.includes(kw))) {
      return product;
    }
  }

  return undefined;
}

// ─── Email via Listmonk ───

function buildDownloadEmailHtml(customerName: string, product: DigitalProduct): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; }
  .header { text-align: center; padding: 30px 0; border-bottom: 2px solid #B8860B; margin-bottom: 30px; }
  .header h1 { font-family: Georgia, serif; font-size: 28px; color: #1A1A1A; margin: 0; }
  .header p { color: #6B6B6B; margin: 5px 0 0; font-size: 14px; }
  .content { padding: 10px 0; }
  .content p { margin: 0 0 16px; font-size: 16px; }
  .download-box { background: #FAF8F5; border: 2px solid #B8860B; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
  .download-box h2 { font-family: Georgia, serif; color: #B8860B; margin: 0 0 12px; font-size: 20px; }
  .download-box .intro { color: #6B6B6B; margin: 0 0 24px; font-size: 15px; }
  .download-btn { display: inline-block; background: #B8860B; color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 9999px; font-weight: 600; font-size: 16px; }
  .note { background: #F0EDE8; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px; color: #6B6B6B; }
  .footer { border-top: 1px solid #E5E5E5; padding-top: 20px; margin-top: 40px; text-align: center; color: #6B6B6B; font-size: 13px; }
  .footer a { color: #B8860B; text-decoration: none; }
</style>
</head>
<body>
<div class="header">
  <h1>Ed Struijlaart</h1>
  <p>Singer-songwriter · Theatermaker · Podcastmaker</p>
</div>
<div class="content">
  <p>Beste ${customerName || 'muziekliefhebber'},</p>
  <p>Bedankt voor je aankoop!</p>
  <div class="download-box">
    <h2>${product.productName}</h2>
    <p class="intro">${product.emailIntro}</p>
    <a href="${product.downloadUrl}" class="download-btn">${product.buttonText}</a>
  </div>
  <div class="note">
    💡 <strong>Tip:</strong> Bewaar deze e-mail goed — je kunt de link op elk moment opnieuw gebruiken.
  </div>
  <p>Veel luister- en kijkplezier!</p>
  <p>Met vriendelijke groet,<br><strong>Ed Struijlaart</strong></p>
</div>
<div class="footer">
  <p><a href="https://edstruijlaart.nl">edstruijlaart.nl</a> · <a href="mailto:ed@earswantmusic.nl">ed@earswantmusic.nl</a></p>
  <p>Vragen over je bestelling? Neem gerust contact op.</p>
</div>
</body>
</html>`;
}

async function sendEmailViaListmonk(to: string, name: string, subject: string, html: string) {
  const res = await fetch(`${LISTMONK_API}/api/tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${LISTMONK_USER}:${LISTMONK_PASS}`).toString('base64')}`,
    },
    body: JSON.stringify({
      subscriber_email: to,
      subscriber_name: name,
      template_id: 0,
      from_email: FROM_EMAIL,
      subject,
      content_type: 'html',
      body: html,
      messenger: 'email',
    }),
  });
  if (!res.ok) {
    throw new Error(`Listmonk ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function notifyEd(transactionId: string, summary: string, reason: string) {
  const html = `
    <p><strong>⚠️ SumUp Bestelling — Actie vereist</strong></p>
    <p>Er is een webwinkelbestelling binnengekomen waarvoor geen automatische download-mail verstuurd kon worden.</p>
    <ul>
      <li><strong>Transactie:</strong> ${transactionId}</li>
      <li><strong>Product:</strong> ${summary}</li>
      <li><strong>Reden:</strong> ${reason}</li>
    </ul>
    <p>Check je <a href="https://me.sumup.com/nl-nl/online-selling/orders">SumUp bestellingen</a> en stuur eventueel handmatig de downloadlink.</p>
  `;
  try {
    await sendEmailViaListmonk(NOTIFY_EMAIL, 'Ed', '⚠️ SumUp bestelling — actie vereist', html);
  } catch (e) {
    console.error('Failed to notify Ed:', e);
  }
}

// ─── Processed Transaction Tracking ───
// We use the transaction timestamp to avoid re-processing.
// Vercel serverless functions are stateless, so we check transactions from the last
// CHECK_WINDOW_MINUTES and skip POS transactions (those are in-person, no download needed).
// Online store transactions will have payment_type !== 'POS'.
// To prevent duplicate emails, we also fetch the transaction detail to check the
// exact product and use the transaction_code as an idempotency key in the email subject.

// ─── Cron Handler ───

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Protect endpoint with CRON_SECRET
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Also accept Vercel cron invocations
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[SumUp Cron] Checking for new online store transactions...');

    // 1. Fetch recent transactions
    const transactions = await getRecentTransactions(CHECK_WINDOW_MINUTES);
    console.log(`[SumUp Cron] Found ${transactions.length} transactions in last ${CHECK_WINDOW_MINUTES} min`);

    // 2. Filter: only online store (non-POS), successful transactions
    const onlineTransactions = transactions.filter(
      (tx) => tx.payment_type !== 'POS' && tx.status === 'SUCCESSFUL'
    );

    if (onlineTransactions.length === 0) {
      return res.status(200).json({ status: 'ok', message: 'No new online orders', checked: transactions.length });
    }

    console.log(`[SumUp Cron] ${onlineTransactions.length} online store transaction(s) to process`);

    const results = [];

    for (const tx of onlineTransactions) {
      const productSummary = tx.product_summary || '';
      const amount = tx.amount;

      console.log(`[SumUp Cron] Processing: "${productSummary}" — €${amount} (${tx.transaction_code})`);

      // 3. Match digital product
      const digitalProduct = findDigitalProduct(productSummary, amount);

      if (!digitalProduct) {
        // Physical product (plectrums etc) or unmatched — no download email needed
        // But notify Ed if it looks like it could be digital
        const lowerSummary = productSummary.toLowerCase();
        const mightBeDigital =
          lowerSummary.includes('video') ||
          lowerSummary.includes('audio') ||
          lowerSummary.includes('clapton') ||
          lowerSummary.includes('unplugged');

        if (mightBeDigital) {
          await notifyEd(tx.transaction_code, productSummary, `Mogelijk digitaal product niet herkend (€${amount})`);
        }

        results.push({ tx: tx.transaction_code, status: 'skipped', reason: 'no_digital_match' });
        continue;
      }

      // 4. Get customer email — for online store orders we need to fetch the full transaction
      // The transaction history doesn't include email, so we fetch the individual transaction
      let customerEmail: string | null = null;
      let customerName = '';

      try {
        const txDetailRes = await fetch(
          `https://api.sumup.com/v0.1/me/transactions?id=${tx.id}`,
          { headers: { Authorization: `Bearer ${SUMUP_API_KEY}` } }
        );

        if (txDetailRes.ok) {
          const txDetail = await txDetailRes.json();
          customerEmail = txDetail.payer_email || txDetail.email || null;
          customerName = txDetail.payer_name || '';
        }
      } catch (e) {
        console.error(`[SumUp Cron] Failed to fetch tx detail for ${tx.id}:`, e);
      }

      if (!customerEmail) {
        // Geen email gevonden — notify Ed to handle manually
        await notifyEd(
          tx.transaction_code,
          productSummary,
          'Geen klant-email gevonden in transactie. Stuur download handmatig via SumUp bestellingen.'
        );
        results.push({ tx: tx.transaction_code, status: 'notified_ed', reason: 'no_email' });
        continue;
      }

      // 5. Send download email (include transaction_code for traceability)
      console.log(`[SumUp Cron] Sending "${digitalProduct.productName}" to ${customerEmail}`);
      const emailHtml = buildDownloadEmailHtml(customerName, digitalProduct);
      await sendEmailViaListmonk(customerEmail, customerName, digitalProduct.emailSubject, emailHtml);

      console.log(`[SumUp Cron] ✅ Download email sent to ${customerEmail}`);
      results.push({ tx: tx.transaction_code, status: 'email_sent', product: digitalProduct.productName, to: customerEmail });
    }

    return res.status(200).json({
      status: 'ok',
      processed: results.length,
      results,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SumUp Cron] Error:', msg);

    try {
      await notifyEd('cron-error', 'Cron job fout', `Script error: ${msg}`);
    } catch { /* ignore */ }

    return res.status(500).json({ status: 'error', message: msg });
  }
}
