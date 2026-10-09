export const prerender = false;

import type { APIRoute } from "astro";
import { createHash, timingSafeEqual } from "node:crypto";
import { sanityWriteClient } from "../../lib/sanity";

/**
 * Alleen voor de Pi (fan_sync.py): openstaande fanantwoorden ophalen (GET) en na
 * verwerking wissen (POST). Beveiligd met een lang geheim in de header
 * x-fan-sync (FAN_SYNC_SECRET in Vercel en in /home/pi/listmonk/fan_sync.env).
 * Zonder of met een fout geheim: 404, alsof het endpoint niet bestaat.
 */

const ID_RE = /^prive\.fanantwoord-[0-9a-f]{32}$/;

// Vergelijk de SHA-256 van beide: altijd 32 bytes, dus timingSafeEqual kan niet gooien
// (bij ongelijke bytelengte, bijvoorbeeld door multibyte-tekens, deed hij dat wel).
const digest = (v: string) => createHash("sha256").update(v).digest();
function toegang(request: Request): boolean {
  const geheim = import.meta.env.FAN_SYNC_SECRET || "";
  const gegeven = request.headers.get("x-fan-sync") || "";
  if (geheim.length < 32 || !gegeven) return false;
  return timingSafeEqual(digest(gegeven), digest(geheim));
}

const niets = () => new Response("Not found", { status: 404 });
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const GET: APIRoute = async ({ request }) => {
  if (!toegang(request)) return niets();
  try {
    const docs = await sanityWriteClient.fetch(
      `*[_type == "fanAntwoord" && _id match "prive.fanantwoord-*"] | order(ingevuld asc) [0...200]{
        _id, uuid, email, naam, via, woonplaats, provincie, gitaar, gezien, zin, bron, vrij, regio, ingevuld
      }`
    );
    return json({ antwoorden: docs });
  } catch (e) {
    console.error("fan-export: ophalen mislukt", e);
    return new Response("Error", { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!toegang(request)) return niets();
  let ids: string[] = [];
  try {
    const b = await request.json();
    ids = (Array.isArray(b.verwerkt) ? b.verwerkt : []).map(String).filter((id: string) => ID_RE.test(id)).slice(0, 200);
  } catch {
    return niets();
  }
  try {
    let tx = sanityWriteClient.transaction();
    for (const id of ids) tx = tx.delete(id);
    if (ids.length) await tx.commit();
    return json({ gewist: ids.length });
  } catch (e) {
    console.error("fan-export: wissen mislukt", e);
    return new Response("Error", { status: 500 });
  }
};
