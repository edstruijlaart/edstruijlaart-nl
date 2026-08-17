export const prerender = false;

import type { APIRoute } from "astro";
import { sanityWriteClient } from "../../lib/sanity";

// Publieke teller voor Continuum Day. Bestaat omdat de aanmeld-documenten ID's
// met een punt-prefix hebben (continuumDayAanmelding.<mail>) en Sanity zulke
// "path-documenten" verbergt voor ongeauthenticeerde queries — de publieke
// query-API telt daardoor altijd 0. Hier tellen we server-side (token) en geven
// alleen het getal terug; geen persoonsgegevens. De Pi-cron haalt dit elke
// 15 min op en zet het als continuum-day-count.json op gitaarmannen.nl.
export const GET: APIRoute = async () => {
  try {
    const aangemeld = await sanityWriteClient.fetch<number>(
      `count(*[_type == "continuumDayAanmelding" && wachtlijst != true])`
    );
    return new Response(JSON.stringify({ aangemeld }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("continuum-day-count faalde", e);
    return new Response(JSON.stringify({ error: "count niet beschikbaar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
