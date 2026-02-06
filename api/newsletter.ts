import type { VercelRequest, VercelResponse } from '@vercel/node';

// Listmonk configuration
const LISTMONK_URL = process.env.LISTMONK_URL || 'https://newsletter.earswantmusic.nl/api/public/subscription';
const LIST_UUID = process.env.LISTMONK_LIST_UUID || '681b5ef7-29cc-4be5-a0c7-6d8453f26cc8';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://edstruijlaart.nl');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email, name } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is verplicht' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Ongeldig emailadres' });
  }

  try {
    const response = await fetch(LISTMONK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: name || '',
        list_uuids: [LIST_UUID],
      }),
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    }

    const errorData = await response.json().catch(() => ({}));
    return res.status(response.status).json({
      error: (errorData as Record<string, string>).message || 'Inschrijving mislukt',
    });
  } catch {
    return res.status(502).json({ error: 'Kon geen verbinding maken met de nieuwsbriefserver' });
  }
}
