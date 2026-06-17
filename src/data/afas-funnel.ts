// AFAS Live cadeau — reel-funnel naar GM4 Continuum (server-side helpers).
// Gebruikt door /api/subscribe-afas. De bezoeker laat naam + e-mail + woonplaats
// achter; wij koppelen er server-side een provincie aan (statische map voor de
// grootste plaatsen, PDOK-locatieserver als fallback) en schrijven in bij de
// AFAS-funnel-hoofdlijst + de eigen provincie-lijst in Listmonk.
//
// De GM4-show-logica (dichtstbijzijnde shows + volledige speellijst) hergebruiken
// we uit gm3-funnel.ts, want dat is generieke GM4-data.

import {
  PROVINCIES,
  isProvincie,
  type Provincie,
} from "./gm3-funnel";

export { PROVINCIES, isProvincie, type Provincie };

/** Listmonk public subscription API (geen auth, single opt-in). */
export const LISTMONK_PUBLIC_API =
  "https://newsletter.earswantmusic.nl/api/public/subscription";

/** Unlisted YouTube-link naar het volledige AFAS Live concert (door Ed aangeleverd). */
export const AFAS_KIJK_URL = "https://youtu.be/yD-7deHA9wg";
export const AFAS_VIDEO_ID = "yD-7deHA9wg";

/** Optionele MP3-bonus (zip met de 6 nummers uit de AFAS-set). */
export const AFAS_MP3_URL =
  "https://cdn.earswantmusic.nl/downloads/afas-live-2026-mp3s.zip";

/** Hoofdlijst "AFAS Cadeau (GM4 funnel)" — id 58 in Listmonk. */
export const AFAS_FUNNEL_LIST_UUID = "101520fa-008b-40d2-8da5-8cb788108066";

/** Algemene "Ed Struijlaart Nieuwsbrief" — id 9 (aanmelders gaan hier ook in). */
export const ED_NIEUWSBRIEF_LIST_UUID = "681b5ef7-29cc-4be5-a0c7-6d8453f26cc8";

/** Per provincie een eigen AFAS-funnel-lijst (voor regionale segmentatie). */
export const AFAS_PROVINCIE_LIST_UUID: Record<Provincie, string> = {
  Groningen: "d0d4fb56-af54-45f1-8b7e-67f0b763645f",
  Friesland: "3f83bbac-4645-4029-9b84-2485e9b18d88",
  Drenthe: "3bddf774-6ed7-4ae8-840a-0887cd570916",
  Overijssel: "297b8069-8cd6-4161-bb6d-62570a7bb06f",
  Flevoland: "bf578d37-0d2e-4c64-b99a-3373ccd0bd5b",
  Gelderland: "3b6f553f-3a46-4c30-a9c4-09a11634df32",
  Utrecht: "c3fbe3d9-dec3-4722-812a-d552e2100208",
  "Noord-Holland": "50afce2c-8eb2-41c9-aad7-190f8f4a3513",
  "Zuid-Holland": "80977ad1-f550-4238-bd6e-62fb493bd9c0",
  Zeeland: "ef0a0406-c7ff-4b42-9451-cb6d4c34f883",
  "Noord-Brabant": "79b6504a-0703-4aa3-9a02-287ddb66563f",
  Limburg: "73a541dd-ee60-4fdb-b82d-40f03998c218",
};

/** Listmonk-lijst-UUIDs voor een aanmelding: funnel-hoofdlijst + algemene
 *  nieuwsbrief + (indien bekend) de eigen provincie-lijst. */
export function afasListUuids(provincie: Provincie | null): string[] {
  const uuids = [AFAS_FUNNEL_LIST_UUID, ED_NIEUWSBRIEF_LIST_UUID];
  if (provincie) uuids.push(AFAS_PROVINCIE_LIST_UUID[provincie]);
  return uuids;
}

// ─────────────────────────────────────────────────────────────────────────────
// Woonplaats -> provincie
// ─────────────────────────────────────────────────────────────────────────────

function normaliseer(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacrieten weg (Fryslân -> fryslan)
    .replace(/\s+/g, " ")
    .replace(/\bsint\b/g, "st")
    .trim();
}

/** Statische map van de grootste/meest voorkomende plaatsen -> provincie.
 *  Dekt het leeuwendeel van de aanmeldingen instant en zonder externe call.
 *  De lange staart wordt door PDOK afgehandeld. */
const STATISCHE_MAP: Record<string, Provincie> = {};
function vul(provincie: Provincie, plaatsen: string[]) {
  for (const p of plaatsen) STATISCHE_MAP[normaliseer(p)] = provincie;
}

vul("Noord-Holland", [
  "Amsterdam", "Haarlem", "Zaandam", "Zaanstad", "Hoofddorp", "Haarlemmermeer",
  "Alkmaar", "Hilversum", "Amstelveen", "Purmerend", "Hoorn", "Den Helder",
  "Heerhugowaard", "Velsen", "IJmuiden", "Beverwijk", "Castricum", "Heemskerk",
  "Bussum", "Huizen", "Weesp", "Diemen", "Volendam", "Edam", "Schagen",
  "Enkhuizen", "Bergen", "Heiloo", "Naarden", "Laren", "Blaricum", "Aalsmeer",
  "Uithoorn", "Landsmeer", "Den Burg", "Texel", "Wormerveer", "Krommenie",
  "Heemstede", "Zandvoort", "Hoofddorp", "Anna Paulowna", "Medemblik",
]);
vul("Zuid-Holland", [
  "Rotterdam", "Den Haag", "'s-Gravenhage", "s-Gravenhage", "Gravenhage",
  "Leiden", "Dordrecht", "Zoetermeer", "Delft", "Naaldwijk", "Westland",
  "Gouda", "Spijkenisse", "Nissewaard", "Capelle aan den IJssel", "Schiedam",
  "Vlaardingen", "Alphen aan den Rijn", "Katwijk", "Rijswijk", "Leidschendam",
  "Voorburg", "Hellevoetsluis", "Ridderkerk", "Barendrecht",
  "Krimpen aan den IJssel", "Krimpen aan de Lek", "Gorinchem", "Sliedrecht",
  "Papendrecht", "Hendrik-Ido-Ambacht", "Zwijndrecht", "Brielle", "Wassenaar",
  "Voorschoten", "Pijnacker", "Berkel en Rodenrijs", "Maassluis", "Bleiswijk",
  "Boskoop", "Waddinxveen", "Bodegraven", "Oegstgeest", "Leiderdorp",
  "Noordwijk", "Lisse", "Hillegom", "Middelharnis", "Oud-Beijerland",
  "Numansdorp", "Nieuwerkerk aan den IJssel", "Bergschenhoek", "Honselersdijk",
  "'s-Gravenzande", "Monster", "Wateringen", "Poeldijk",
]);
vul("Utrecht", [
  "Utrecht", "Amersfoort", "Nieuwegein", "Veenendaal", "Zeist", "Houten",
  "IJsselstein", "Woerden", "Soest", "De Bilt", "Bilthoven", "Bunnik",
  "Bunschoten", "Spakenburg", "Vianen", "Maarssen", "Baarn", "Leusden",
  "Wijk bij Duurstede", "Rhenen", "Doorn", "Driebergen", "Mijdrecht", "Lopik",
  "Montfoort", "Maarn", "Eemnes", "Breukelen", "Zeist", "Amerongen",
]);
vul("Gelderland", [
  "Nijmegen", "Apeldoorn", "Arnhem", "Ede", "Doetinchem", "Zutphen",
  "Harderwijk", "Tiel", "Wageningen", "Wijchen", "Culemborg", "Barneveld",
  "Nunspeet", "Ermelo", "Putten", "Elburg", "Epe", "Zevenaar", "'s-Heerenberg",
  "s-Heerenberg", "Winterswijk", "Aalten", "Lochem", "Dieren", "Velp",
  "Duiven", "Beuningen", "Druten", "Geldermalsen", "Zaltbommel", "Bemmel",
  "Huissen", "Westervoort", "Oosterbeek", "Renkum", "Vaassen", "Hattem",
  "Brummen", "Didam", "Ulft", "Groesbeek", "Wezep", "Scherpenzeel",
  "Lunteren", "Bennekom", "Terborg", "Lingewaard",
]);
vul("Overijssel", [
  "Enschede", "Zwolle", "Deventer", "Hengelo", "Almelo", "Oldenzaal", "Kampen",
  "Hardenberg", "Steenwijk", "Raalte", "Rijssen", "Nijverdal", "Wierden",
  "Borne", "Losser", "Dalfsen", "Ommen", "Vroomshoop", "Tubbergen", "Goor",
  "Hellendoorn", "Staphorst", "Genemuiden", "Hasselt", "Wijhe", "Olst",
  "Vriezenveen", "Den Ham", "Haaksbergen",
]);
vul("Drenthe", [
  "Assen", "Emmen", "Hoogeveen", "Meppel", "Coevorden", "Roden", "Beilen",
  "Klazienaveen", "Borger", "Diever", "Dwingeloo", "Westerbork", "Gieten",
  "Norg", "Eelde", "Paterswolde", "Zuidlaren", "Nieuw-Amsterdam",
]);
vul("Friesland", [
  "Leeuwarden", "Drachten", "Sneek", "Heerenveen", "Harlingen", "Franeker",
  "Dokkum", "Bolsward", "Joure", "Wolvega", "Lemmer", "Burgum", "Buitenpost",
  "Gorredijk", "Workum", "Makkum", "Grou", "Surhuisterveen", "Kollum",
  "Sint Annaparochie", "Damwoude", "Beetsterzwaag", "Oosterwolde", "Balk",
]);
vul("Groningen", [
  "Groningen", "Hoogezand", "Veendam", "Stadskanaal", "Winschoten", "Delfzijl",
  "Appingedam", "Leek", "Zuidhorn", "Haren", "Bedum", "Uithuizen", "Pekela",
  "Musselkanaal", "Grootegast", "Marum", "Sappemeer", "Wildervank", "Ten Boer",
  "Roden", "Hoogkerk", "Eelde",
]);
vul("Flevoland", [
  "Almere", "Lelystad", "Emmeloord", "Dronten", "Zeewolde", "Urk",
  "Biddinghuizen", "Swifterbant", "Nagele", "Espel",
]);
vul("Noord-Brabant", [
  "Eindhoven", "Tilburg", "Breda", "'s-Hertogenbosch", "s-Hertogenbosch",
  "Den Bosch", "Helmond", "Oss", "Roosendaal", "Bergen op Zoom", "Veldhoven",
  "Oosterhout", "Waalwijk", "Uden", "Veghel", "Etten-Leur", "Best", "Boxtel",
  "Geldrop", "Valkenswaard", "Dongen", "Goirle", "Gilze", "Rijen", "Drunen",
  "Kaatsheuvel", "Schijndel", "Vught", "Rosmalen", "Cuijk", "Boxmeer",
  "Gemert", "Deurne", "Asten", "Someren", "Nuenen", "Son en Breugel", "Bladel",
  "Reusel", "Eersel", "Zundert", "Rucphen", "Steenbergen", "Halsteren",
  "Werkendam", "Raamsdonksveer", "Geertruidenberg", "Made", "Zevenbergen",
  "Moerdijk", "Heesch", "Bergeijk", "Grave", "Wijk en Aalburg", "Oisterwijk",
  "Berlicum", "Sint-Oedenrode", "Sint Michielsgestel", "Klundert",
]);
vul("Limburg", [
  "Maastricht", "Venlo", "Heerlen", "Sittard", "Geleen", "Sittard-Geleen",
  "Roermond", "Weert", "Kerkrade", "Brunssum", "Landgraaf", "Venray", "Stein",
  "Beek", "Echt", "Susteren", "Nuth", "Voerendaal", "Valkenburg", "Meerssen",
  "Gennep", "Panningen", "Horst", "Tegelen", "Blerick", "Gulpen", "Vaals",
  "Simpelveld", "Bocholtz", "Nederweert", "Maasbree", "Reuver", "Belfeld",
  "Mook", "Kessel", "Roggel", "Heythuysen", "Tienray",
]);

/** Probeer de provincie uit de statische map (instant, geen externe call). */
export function provincieUitMap(woonplaats: string): Provincie | null {
  if (!woonplaats) return null;
  return STATISCHE_MAP[normaliseer(woonplaats)] ?? null;
}

/** PDOK-locatieserver: provincie van de woonplaats (Fryslân -> Friesland). */
const PDOK_NAAR_PROVINCIE: Record<string, Provincie> = {
  Groningen: "Groningen",
  Fryslan: "Friesland",
  Friesland: "Friesland",
  Drenthe: "Drenthe",
  Overijssel: "Overijssel",
  Flevoland: "Flevoland",
  Gelderland: "Gelderland",
  Utrecht: "Utrecht",
  "Noord-Holland": "Noord-Holland",
  "Zuid-Holland": "Zuid-Holland",
  Zeeland: "Zeeland",
  "Noord-Brabant": "Noord-Brabant",
  Limburg: "Limburg",
};

export async function provincieViaPDOK(
  woonplaats: string,
): Promise<Provincie | null> {
  if (!woonplaats) return null;
  const url =
    "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free" +
    `?q=${encodeURIComponent(woonplaats)}` +
    "&fq=type:woonplaats&fl=woonplaatsnaam,provincienaam&rows=1";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data: any = await res.json();
    const doc = data?.response?.docs?.[0];
    const naam = (doc?.provincienaam || "").replace(/â/g, "a"); // veiligheidsnet
    const key = (doc?.provincienaam || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, ""); // Fryslân -> Fryslan
    return PDOK_NAAR_PROVINCIE[key] ?? PDOK_NAAR_PROVINCIE[naam] ?? null;
  } catch {
    return null; // time-out of netwerkfout: geen provincie, aanmelding gaat door
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve woonplaats -> provincie: eerst statische map, dan PDOK, anders null. */
export async function resolveProvincie(
  woonplaats: string,
): Promise<Provincie | null> {
  return provincieUitMap(woonplaats) ?? (await provincieViaPDOK(woonplaats));
}
