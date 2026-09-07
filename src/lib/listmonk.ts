/**
 * Listmonk via de beheer-API, met een sleutel die alleen mag inschrijven.
 *
 * Tot 7 september 2026 schreven alle formulieren via Listmonks publieke
 * inschrijf-API. Die staat voor iedereen open, en Listmonk publiceert op zijn
 * publieke formulierpagina bovendien alle lijst-UUID's. Bots lazen die pagina
 * en schreven zich rechtstreeks in, buiten onze botfilters om. De publieke
 * ingang gaat daarom dicht, en alles loopt via deze client.
 *
 * Beveiliging in lagen:
 *  - Listmonk-gebruiker `api_website` met rol `website-inschrijven`: alleen
 *    subscribers:get, subscribers:manage en lists:get_all. Lekt de sleutel, dan
 *    kan iemand hoogstens adressen inschrijven; geen campagnes, geen export.
 *  - De beheer-API zit achter Cloudflare Access. Vercel komt erdoor met een
 *    service token (CF-Access-Client-Id/-Secret). Zonder die headers: 302 naar
 *    een loginpagina, wat hieronder als fout wordt herkend.
 *  - Geheimen komen uit Vercel-env en staan nergens in code.
 *
 * Lijsten blijven in de rest van de code op UUID staan (zo staan ze in
 * shows.ts en de funnel-data); deze module vertaalt ze naar de numerieke id's
 * die de beheer-API wil, met een korte cache.
 */

const BASE = (import.meta.env.LISTMONK_API_BASE || "").replace(/\/$/, "");
const USER = import.meta.env.LISTMONK_API_USER || "";
const TOKEN = import.meta.env.LISTMONK_API_TOKEN || "";
const CF_ID = import.meta.env.CF_ACCESS_CLIENT_ID || "";
const CF_SECRET = import.meta.env.CF_ACCESS_CLIENT_SECRET || "";

const TIMEOUT_MS = 8000;
const LIST_CACHE_MS = 10 * 60 * 1000;

export type SubscribeStatus = "created" | "existing" | "blocklisted" | "error";

export interface SubscribeResult {
  ok: boolean;
  status: SubscribeStatus;
  /** Alleen bij fouten: korte reden voor de logs, nooit voor de bezoeker. */
  error?: string;
}

function configured(): boolean {
  return Boolean(BASE && USER && TOKEN);
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: "Basic " + Buffer.from(`${USER}:${TOKEN}`).toString("base64"),
    "Content-Type": "application/json",
    // Cloudflare's browser-integriteitscheck weigert sommige standaard-UA's
    // (error 1010); deze is bewezen goed voor deze tunnel.
    "User-Agent": "curl/8.4.0",
  };
  if (CF_ID && CF_SECRET) {
    h["CF-Access-Client-Id"] = CF_ID;
    h["CF-Access-Client-Secret"] = CF_SECRET;
  }
  return h;
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...headers(), ...(init.headers as Record<string, string> | undefined) },
      signal: ctrl.signal,
      redirect: "manual",
    });
    // Een redirect hier is Cloudflare Access die ons naar een loginpagina
    // stuurt: het service token ontbreekt of is verlopen. Dat is een
    // configuratiefout, geen "lijst niet gevonden".
    if (res.status >= 300 && res.status < 400) {
      throw new Error(`Cloudflare Access weigert (HTTP ${res.status}); service token ontbreekt of is verlopen`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---- lijsten: uuid -> id --------------------------------------------------

let listCache: { at: number; byUuid: Map<string, number> } | null = null;

async function listIdsForUuids(uuids: string[]): Promise<{ ids: number[]; unknown: string[] }> {
  if (!listCache || Date.now() - listCache.at > LIST_CACHE_MS) {
    const res = await api("/api/lists?per_page=all&minimal=true");
    if (!res.ok) throw new Error(`lijsten ophalen mislukt: HTTP ${res.status}`);
    const body = await res.json();
    const results: Array<{ id: number; uuid: string }> = body?.data?.results ?? body?.data ?? [];
    listCache = { at: Date.now(), byUuid: new Map(results.map((l) => [l.uuid, l.id])) };
  }
  const ids: number[] = [];
  const unknown: string[] = [];
  for (const u of uuids) {
    const id = listCache.byUuid.get(u);
    if (id === undefined) unknown.push(u);
    else if (!ids.includes(id)) ids.push(id);
  }
  return { ids, unknown };
}

// ---- inschrijven -----------------------------------------------------------

interface SubscribeInput {
  email: string;
  name?: string;
  listUuids: string[];
}

/**
 * Schrijf een adres in op één of meer lijsten. Bestaat het adres al, dan
 * worden alleen de lijsten toegevoegd. Geblokkeerde adressen worden met rust
 * gelaten: wie zich heeft afgemeld of door ons is geblokkeerd, komt via een
 * formulier niet stilletjes terug.
 *
 * Gooit nooit; fouten komen terug in het resultaat zodat de aanroeper zelf
 * kiest wat leidend is (meestal: de bevestigingsmail toch versturen).
 */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  if (!configured()) {
    return { ok: false, status: "error", error: "Listmonk niet geconfigureerd (LISTMONK_API_*)" };
  }
  const email = input.email.trim().toLowerCase();
  // Listmonk eist een naam; het publieke formulier vulde bij een leeg veld het
  // deel vóór de @ in. Zelfde gedrag, dan verandert er niets voor de lijsten.
  const name = (input.name || "").trim() || email.split("@")[0];

  try {
    const { ids, unknown } = await listIdsForUuids(input.listUuids);
    if (unknown.length) console.warn("Listmonk: onbekende lijst-uuid(s) overgeslagen", unknown);
    if (!ids.length) return { ok: false, status: "error", error: "geen geldige lijsten" };

    const create = await api("/api/subscribers", {
      method: "POST",
      body: JSON.stringify({
        email, name, status: "enabled", lists: ids,
        // Single opt-in, zoals de publieke ingang ook deed.
        preconfirm_subscriptions: true,
      }),
    });
    if (create.ok) {
      // Niet blind vertrouwen op 200. Listmonk maakt het adres ook aan als de
      // sleutel geen recht heeft op de gevraagde lijsten, en laat de lijsten dan
      // stil weg. Dat is precies het "gelukt"-zonder-inschrijving dat we niet
      // willen: controleren, anders alsnog koppelen, en anders eerlijk falen.
      const aangemaakt = (await create.json().catch(() => null))?.data;
      const gekoppeld = new Set<number>((aangemaakt?.lists ?? []).map((l: { id: number }) => l.id));
      const ontbreekt = ids.filter((id) => !gekoppeld.has(id));
      if (!ontbreekt.length) return { ok: true, status: "created" };
      if (aangemaakt?.id) {
        const koppel = await api("/api/subscribers/lists", {
          method: "PUT",
          body: JSON.stringify({ ids: [aangemaakt.id], action: "add", target_list_ids: ontbreekt, status: "confirmed" }),
        });
        if (koppel.ok) return { ok: true, status: "created" };
        const kt = await koppel.text().catch(() => "");
        return { ok: false, status: "error", error: `aangemaakt maar lijsten niet gekoppeld: HTTP ${koppel.status} ${kt.slice(0, 160)}` };
      }
      return { ok: false, status: "error", error: "aangemaakt maar lijsten ontbreken en geen id in antwoord" };
    }

    const tekst = await create.text().catch(() => "");
    const bestaatAl = create.status === 409 || /already exists|bestaat al/i.test(tekst);
    if (!bestaatAl) {
      return { ok: false, status: "error", error: `aanmaken: HTTP ${create.status} ${tekst.slice(0, 160)}` };
    }

    // Bestaand adres: opzoeken en de lijsten erbij zetten.
    const q = encodeURIComponent(`subscribers.email = '${email.replace(/'/g, "''")}'`);
    const zoek = await api(`/api/subscribers?query=${q}&per_page=1`);
    if (!zoek.ok) {
      const zt = await zoek.text().catch(() => "");
      return { ok: false, status: "error", error: `opzoeken: HTTP ${zoek.status} ${zt.slice(0, 160)}` };
    }
    const gevonden = (await zoek.json())?.data?.results?.[0];
    if (!gevonden) return { ok: false, status: "error", error: "bestaat volgens 409 maar niet gevonden" };
    if (gevonden.status === "blocklisted") return { ok: false, status: "blocklisted" };

    const koppel = await api("/api/subscribers/lists", {
      method: "PUT",
      body: JSON.stringify({
        ids: [gevonden.id], action: "add", target_list_ids: ids, status: "confirmed",
      }),
    });
    if (!koppel.ok) {
      const kt = await koppel.text().catch(() => "");
      return { ok: false, status: "error", error: `lijsten koppelen: HTTP ${koppel.status} ${kt.slice(0, 160)}` };
    }
    return { ok: true, status: "existing" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: "error", error: msg };
  }
}
