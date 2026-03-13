export const prerender = false;

import type { APIRoute } from 'astro';
import { sanityClient } from '../../lib/sanity';

/**
 * Health check endpoint voor monitoring (bijv. UptimeRobot).
 * Geen auth nodig — checkt alleen of services bereikbaar zijn.
 *
 * GET /api/health → 200 (alles ok) of 503 (iets mis)
 */
export const GET: APIRoute = async () => {
  const checks: Record<string, { ok: boolean; message?: string }> = {};

  // 1. Sanity CMS bereikbaar?
  try {
    const result = await sanityClient.fetch(`count(*[_type == "show"])`);
    checks.sanity = { ok: typeof result === 'number', message: `${result} shows` };
  } catch (err: any) {
    checks.sanity = { ok: false, message: err?.message || 'Sanity unreachable' };
  }

  // 2. Resend API key aanwezig?
  const hasResendKey = !!import.meta.env.RESEND_API_KEY;
  checks.resend = { ok: hasResendKey, message: hasResendKey ? 'Key present' : 'Key missing' };

  // 3. CRON_SECRET aanwezig?
  const hasCronSecret = !!import.meta.env.CRON_SECRET;
  checks.cronSecret = { ok: hasCronSecret, message: hasCronSecret ? 'Key present' : 'Key missing' };

  const allOk = Object.values(checks).every(c => c.ok);

  return new Response(JSON.stringify({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  }), {
    status: allOk ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
};
