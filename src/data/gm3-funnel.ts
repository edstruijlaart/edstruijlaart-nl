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

/** Per provincie een eigen GM3-funnel-lijst (voor segmentatie), naast de hoofdlijst. */
export const PROVINCIE_LIST_UUID: Record<Provincie, string> = {
  "Groningen": "dc115f1a-7d3d-4406-8a08-5df45d5e4ffc",
  "Friesland": "406da8d0-f7a9-4b65-9297-3b3105fb6a61",
  "Drenthe": "42094d54-f311-4830-b7e5-d6715d30bad2",
  "Overijssel": "c0797578-af22-47e6-b768-d3d641a413c5",
  "Flevoland": "9921033f-3251-4010-b521-45b88c79b9ea",
  "Gelderland": "197753fa-804b-4136-a976-4acff9a39aab",
  "Utrecht": "762f6a8d-9724-483c-bde9-cf8595a8bdbe",
  "Noord-Holland": "3a357dde-c21b-4cad-9a07-2ade73e649fd",
  "Zuid-Holland": "b03b211f-4303-4134-9275-b2e5627f836e",
  "Zeeland": "4c445b9e-564c-43f0-a976-89794b0313ea",
  "Noord-Brabant": "14bc58fb-47a5-4305-8a3e-d193cc410dd8",
  "Limburg": "0b5207c2-edaa-43d0-9280-ffb3a40babfc",
};

/** Listmonk-lijst-UUIDs voor een aanmelding: funnel-hoofdlijst + de eigen provincie-lijst. */
export function listUuidsVoorProvincie(provincie: Provincie): string[] {
  return [FUNNEL_LIST_UUID, PROVINCIE_LIST_UUID[provincie]];
}

/** Alle GM4-shows op datum (voor de volledige speellijst in de mail). */
export function alleGM4Shows(): Show[] {
  return shows.filter(isGM4).sort((a, b) => a.date.localeCompare(b.date));
}
