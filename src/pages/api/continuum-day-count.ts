export const prerender = false;

import type { APIRoute } from "astro";
import { sanityWriteClient } from "../../lib/sanity";
import { PUBLIEK_MAX } from "../../lib/continuum-day-capaciteit";

// Publieke teller voor Continuum Day. Bestaat omdat de aanmeld-documenten ID's
// met een punt-prefix hebben (continuumDayAanmelding.<mail>) en Sanity zulke
// "path-documenten" verbergt voor ongeauthenticeerde queries — de publieke
// query-API telt daardoor altijd 0. Hier tellen we server-side (token) en geven
// alleen het getal terug; geen persoonsgegevens. De Pi-cron haalt dit elke
// 15 min op en zet het als continuum-day-count.json op gitaarmannen.nl.
//
// Het getal wordt afgetopt op PUBLIEK_MAX. Intern laten we bewust meer mensen toe
// dan dat (no-shows), maar naar buiten blijft de stand op "vol" staan. Zo staat er
// ook in de netwerk-tab van een browser nooit een hoger getal dan we communiceren.
export const GET: APIRoute = async () => {
  try {
    const werkelijk = await sanityWriteClient.fetch<number>(
      `count(*[_type == "continuumDayAanmelding" && wachtlijst != true])`
    );
    const aangemeld = Math.min(werkelijk, PUBLIEK_MAX);
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
