export const prerender = false;

import type { APIRoute } from "astro";
import { dichtstbijzijndeShows, type Provincie } from "../../data/gm3-funnel";

// Geo-gepersonaliseerde dichtstbijzijnde GM4-show. Leest de Vercel geo-headers
// van de bezoeker (gratis), mapt naar provincie en geeft de eerstvolgende
// Continuum-show in (of bij) die provincie terug. Voor de /links hero.
// AVG: IP wordt alleen in-memory gebruikt voor de regio, niets opgeslagen.

const REGION_PROVINCIE: Record<string, Provincie> = {
  DR: "Drenthe",
  FL: "Flevoland",
  FR: "Friesland",
  GE: "Gelderland",
  GR: "Groningen",
  LI: "Limburg",
  NB: "Noord-Brabant",
  NH: "Noord-Holland",
  OV: "Overijssel",
  UT: "Utrecht",
  ZE: "Zeeland",
  ZH: "Zuid-Holland",
};

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function dateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MAANDEN[m - 1]}`;
}

export const GET: APIRoute = async ({ request }) => {
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const region = (request.headers.get("x-vercel-ip-country-region") || "")
    .toUpperCase()
    .replace(/^NL-/, "");
  const provincie = country === "NL" ? REGION_PROVINCIE[region] : undefined;

  if (!provincie) return json({ provincie: null, show: null });

  const today = new Date().toISOString().slice(0, 10);
  const show = dichtstbijzijndeShows(provincie).find((s) => s.date >= today);

  return json({
    provincie,
    show: show
      ? { city: show.city, venue: show.venue, date: show.date, dateLabel: dateLabel(show.date) }
      : null,
  });
};
