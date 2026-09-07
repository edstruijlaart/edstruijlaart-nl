export const prerender = false;

import type { APIRoute } from "astro";
import { subscribe } from "../../lib/listmonk";
import { shows } from "../../data/shows";

/**
 * Tussenstation voor formulieren die vanuit de browser inschrijven.
 *
 * Drie formulieren postten rechtstreeks naar Listmonks publieke formulier: de
 * footer en de show-popup op gitaarmannen.nl, en de show-lijst hier op
 * edstruijlaart.nl. Een statische site kan geen sleutel dragen, dus die drie
 * komen nu hierlangs. Sinds de publieke ingang van Listmonk dicht is, is dit
 * de enige weg vanuit een browser.
 *
 * Wat hier tegen bots zit:
 *  - honeypot `website` moet leeg meekomen en `t` moet aanwezig zijn, precies
 *    zoals /api/newsletter; een echte browser met ons formulier stuurt beide;
 *  - alleen lijsten uit de vaste toegestane set; een bot die een UUID uit een
 *    oude bron heeft, komt daarmee nergens;
 *  - foute inzendingen krijgen "gelukt" terug zonder dat er iets gebeurt, zodat
 *    een bot niet leert wat wel en niet doorkomt.
 *
 * Accepteert JSON én formulier-data (de bestaande formulieren sturen FormData
 * met herhaalbare `l`-velden). Een gewone formulier-POST zonder JavaScript
 * krijgt een redirect terug naar de pagina; een fetch krijgt JSON.
 */

const NIEUWSBRIEF_ED = "681b5ef7-29cc-4be5-a0c7-6d8453f26cc8"; // lijst 9
const NIEUWSBRIEF_GITAARMANNEN = "b9ae2524-c971-45ff-89dc-389742255b53"; // lijst 3, footer gitaarmannen.nl
const GM4_PRESALE = "0f54a4de-c07f-4650-af6b-f044db73d784"; // lijst 15, presale-formulier /continuum

const TOEGESTAAN = new Set<string>([
  NIEUWSBRIEF_ED,
  NIEUWSBRIEF_GITAARMANNEN,
  GM4_PRESALE,
  ...shows.map((s) => s.listmonkUuid).filter((u): u is string => Boolean(u)),
]);

const ORIGINS = new Set([
  "https://www.gitaarmannen.nl",
  "https://gitaarmannen.nl",
  "https://www.edstruijlaart.nl",
  "https://edstruijlaart.nl",
]);

function cors(origin: string | null): Record<string, string> {
  const allow = origin && ORIGINS.has(origin) ? origin : "https://www.gitaarmannen.nl";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export const OPTIONS: APIRoute = ({ request }) =>
  new Response(null, { status: 204, headers: cors(request.headers.get("origin")) });

interface Inzending {
  email: string;
  name: string;
  lists: string[];
  website: string | null;
  t: string | null;
}

async function lees(request: Request): Promise<Inzending | null> {
  const type = request.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) {
      const b = await request.json();
      const lists = Array.isArray(b.list_uuids) ? b.list_uuids
        : Array.isArray(b.l) ? b.l : b.l ? [b.l] : [];
      return {
        email: String(b.email || ""), name: String(b.name || ""),
        lists: lists.map(String),
        website: b.website === undefined ? null : String(b.website),
        t: b.t === undefined || b.t === null ? null : String(b.t),
      };
    }
    const fd = await request.formData();
    return {
      email: String(fd.get("email") || ""), name: String(fd.get("name") || ""),
      lists: fd.getAll("l").map(String),
      website: fd.has("website") ? String(fd.get("website")) : null,
      t: fd.has("t") ? String(fd.get("t")) : null,
    };
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get("origin");
  const isNavigatie = request.headers.get("sec-fetch-mode") === "navigate";

  // Antwoord dat voor de bezoeker altijd "gelukt" is, ook als we stil niets doen.
  const klaar = () => {
    if (isNavigatie) {
      // Formulier zonder JavaScript: terug naar waar de bezoeker vandaan kwam.
      const terug = request.headers.get("referer");
      let doel = "https://www.gitaarmannen.nl/";
      try {
        if (terug && ORIGINS.has(new URL(terug).origin)) {
          const u = new URL(terug);
          u.searchParams.set("ingeschreven", "1");
          doel = u.toString();
        }
      } catch { /* houd het standaarddoel */ }
      return new Response(null, { status: 303, headers: { Location: doel, ...cors(origin) } });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...cors(origin) },
    });
  };

  const inz = await lees(request);
  if (!inz) return klaar();

  // Botfilter: zelfde regels als /api/newsletter.
  if (inz.website !== "" || !inz.t) return klaar();

  const email = inz.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Ongeldig e-mailadres" }), {
      status: 400, headers: { "Content-Type": "application/json", ...cors(origin) },
    });
  }

  const lists = inz.lists.filter((u) => TOEGESTAAN.has(u));
  if (!lists.length) return klaar();

  const r = await subscribe({ email, name: inz.name, listUuids: lists });
  if (!r.ok && r.status === "error") {
    console.error("subscribe: Listmonk-fout", r.error);
    // Voor de bezoeker toch een nette melding: dit is onze storing, niet zijn fout.
    if (!isNavigatie) {
      return new Response(JSON.stringify({ error: "Inschrijven lukt even niet, probeer het later opnieuw." }), {
        status: 502, headers: { "Content-Type": "application/json", ...cors(origin) },
      });
    }
  }
  return klaar();
};
