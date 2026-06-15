// Gitaarmannen 3 Cadeau — GM4 lead funnel (server-side helpers)
// Gebruikt door /api/gm3-funnel: koppelt een provincie aan de funnel-hoofdlijst
// plus de per-theater GM4-lijsten in de buurt, en levert de GM4-shows voor de
// welkomstmail. Provincie-mapping wordt afgeleid uit shows.ts (single source of truth).

import { shows, type Show } from "./shows";

/** Hoofdlijst "Gitaarmannen 3 Cadeau (GM4 funnel)" — id 44 in Listmonk. */
export const FUNNEL_LIST_UUID = "b715ca0d-74ad-4fea-a810-9fb58d08c2b2";

/** Listmonk public subscription API (geen auth, single opt-in). */
export const LISTMONK_PUBLIC_API =
  "https://newsletter.earswantmusic.nl/api/public/subscription";

/** Unlisted YouTube-link naar de volledige GM3-registratie (4K). */
export const GM3_KIJK_URL = "https://youtu.be/Ct0AHaUQqTM";

export type Provincie =
  | "Groningen" | "Friesland" | "Drenthe" | "Overijssel" | "Flevoland"
  | "Gelderland" | "Utrecht" | "Noord-Holland" | "Zuid-Holland"
  | "Zeeland" | "Noord-Brabant" | "Limburg";

export const PROVINCIES: Provincie[] = [
  "Groningen", "Friesland", "Drenthe", "Overijssel", "Flevoland",
  "Gelderland", "Utrecht", "Noord-Holland", "Zuid-Holland",
  "Zeeland", "Noord-Brabant", "Limburg",
];

/** Show-stad -> provincie (alle GM4-steden). */
const CITY_PROVINCIE: Record<string, Provincie> = {
  "Hendrik-Ido-Ambacht": "Zuid-Holland",
  "Spijkenisse": "Zuid-Holland",
  "Capelle aan den IJssel": "Zuid-Holland",
  "Zoetermeer": "Zuid-Holland",
  "Dordrecht": "Zuid-Holland",
  "Wassenaar": "Zuid-Holland",
  "Gouda": "Zuid-Holland",
  "Brielle": "Zuid-Holland",
  "Wageningen": "Gelderland",
  "Tiel": "Gelderland",
  "Wijchen": "Gelderland",
  "'s-Heerenberg": "Gelderland",
  "Den Helder": "Noord-Holland",
  "Beverwijk": "Noord-Holland",
  "Heerhugowaard": "Noord-Holland",
  "Zaandam": "Noord-Holland",
  "Emmen": "Drenthe",
  "Goes": "Zeeland",
  "Oostburg": "Zeeland",
  "Houten": "Utrecht",
  "IJsselstein": "Utrecht",
  "Delfzijl": "Groningen",
  "Veendam": "Groningen",
  "Deventer": "Overijssel",
  "Vroomshoop": "Overijssel",
  "Dronten": "Flevoland",
};

const BUURPROVINCIES: Record<Provincie, Provincie[]> = {
  Groningen: ["Drenthe", "Friesland"],
  Friesland: ["Groningen", "Drenthe", "Flevoland", "Overijssel"],
  Drenthe: ["Groningen", "Overijssel", "Friesland"],
  Overijssel: ["Drenthe", "Flevoland", "Gelderland"],
  Flevoland: ["Overijssel", "Gelderland", "Utrecht", "Noord-Holland"],
  Gelderland: ["Overijssel", "Utrecht", "Flevoland", "Noord-Brabant"],
  Utrecht: ["Gelderland", "Zuid-Holland", "Noord-Holland", "Flevoland"],
  "Noord-Holland": ["Utrecht", "Zuid-Holland", "Flevoland"],
  "Zuid-Holland": ["Utrecht", "Noord-Holland", "Zeeland", "Noord-Brabant"],
  Zeeland: ["Zuid-Holland", "Noord-Brabant"],
  "Noord-Brabant": ["Gelderland", "Zuid-Holland", "Zeeland", "Limburg"],
  Limburg: ["Noord-Brabant", "Gelderland"],
};

const isGM4 = (s: Show) => s.production === "Gitaarmannen 4: Continuum";

export function isProvincie(value: string): value is Provincie {
  return (PROVINCIES as string[]).includes(value);
}

/** Alle GM4-shows in een provincie, op datum gesorteerd. */
export function showsInProvincie(provincie: Provincie): Show[] {
  return shows
    .filter((s) => isGM4(s) && CITY_PROVINCIE[s.city] === provincie)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Dichtstbijzijnde GM4-shows: eigen provincie, of buurprovincies als die leeg is. */
export function dichtstbijzijndeShows(provincie: Provincie): Show[] {
  let eigen = showsInProvincie(provincie);
  if (eigen.length > 0) return eigen;
  const buur: Show[] = [];
  for (const p of BUURPROVINCIES[provincie] ?? []) buur.push(...showsInProvincie(p));
  return buur.sort((a, b) => a.date.localeCompare(b.date));
}

/** Listmonk-lijst-UUIDs voor een aanmelding: funnel-hoofdlijst + shows in de buurt. */
export function listUuidsVoorProvincie(provincie: Provincie): string[] {
  const uuids = new Set<string>([FUNNEL_LIST_UUID]);
  for (const s of dichtstbijzijndeShows(provincie)) {
    if (s.listmonkUuid) uuids.add(s.listmonkUuid);
  }
  return [...uuids];
}

/** Alle GM4-shows op datum (voor de volledige speellijst in de mail). */
export function alleGM4Shows(): Show[] {
  return shows.filter(isGM4).sort((a, b) => a.date.localeCompare(b.date));
}
