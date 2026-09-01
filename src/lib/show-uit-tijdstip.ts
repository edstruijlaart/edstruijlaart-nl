import { shows, type Show } from "../data/shows";

/**
 * Welke show was iemand die zich nú aanmeldt via de theater-QR?
 *
 * De QR hangt in de zaal en komt aan het begin en het eind in beeld. Wie hem
 * scant is dus op dat moment in dat theater, en de speellijst staat vast. Zo
 * hoeft niemand zelf in te vullen waar hij was: één veld minder op het
 * formulier is meetbaar meer aanmeldingen.
 *
 * Bewust streng. Een verkeerd label is erger dan geen label: dan mailt Ed
 * volgend seizoen iemand over "toen je me in Wassenaar zag" terwijl die
 * persoon in Deventer zat. Vandaar:
 *  - alleen als de aanmelding aantoonbaar uit het theater komt (bron=theater),
 *  - alleen binnen een venster rond de voorstelling,
 *  - bij twijfel niets.
 *
 * Het venster loopt van drie uur voor aanvang (zaal open, mensen zitten al aan
 * de bar) tot zes uur 's ochtends erna (de scan op de bank na afloop). Shows
 * liggen dagen uit elkaar, dus overlap kan alleen bij twee voorstellingen op
 * één avond — Emmen, 17 oktober. Daar splitst het op het tijdstip zelf.
 */

const UUR = 60 * 60 * 1000;
const VOOR_AANVANG = 3 * UUR;
const NA_AANVANG = 9.5 * UUR; // 20:30 + 9,5u = 06:00 de volgende ochtend

/** Aanvangstijd van een show als echt tijdstip, in Nederlandse tijd. */
function aanvang(show: Show): Date | null {
  if (!show.time) return null;
  // De site draait op Vercel in UTC. Nederland is +2 in de zomertijd en +1 in
  // de wintertijd; de tour loopt over de omschakeling van 25 oktober heen, dus
  // dat moet per show berekend worden en niet één keer hardgecodeerd.
  const [uur, minuut] = show.time.split(":").map(Number);
  const lokaal = new Date(`${show.date}T${show.time}:00Z`);
  const offset = nederlandseOffsetUren(lokaal);
  return new Date(Date.UTC(
    lokaal.getUTCFullYear(), lokaal.getUTCMonth(), lokaal.getUTCDate(),
    uur - offset, minuut, 0));
}

/** +2 in de zomertijd, +1 in de wintertijd. Leest de echte zone-offset. */
function nederlandseOffsetUren(moment: Date): number {
  const deel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Amsterdam", timeZoneName: "shortOffset",
  }).formatToParts(moment).find((p) => p.type === "timeZoneName");
  const treffer = deel?.value.match(/GMT([+-]\d{1,2})/);
  return treffer ? Number(treffer[1]) : 1;
}

export interface ShowTreffer {
  show: Show;
  listmonkUuid: string;
}

/**
 * Zoek de show die bij dit moment hoort. Geeft null als er geen is, of als er
 * geen twijfelvrije keuze te maken valt.
 */
export function showOpMoment(moment: Date = new Date()): ShowTreffer | null {
  const t = moment.getTime();
  const kandidaten = shows
    .filter((s) => s.listmonkUuid && s.time)
    .map((s) => ({ show: s, start: aanvang(s) }))
    .filter((k): k is { show: Show; start: Date } => k.start !== null)
    .filter((k) => {
      const start = k.start.getTime();
      return t >= start - VOOR_AANVANG && t <= start + NA_AANVANG;
    });

  if (kandidaten.length === 0) return null;
  if (kandidaten.length === 1) {
    return { show: kandidaten[0].show,
             listmonkUuid: kandidaten[0].show.listmonkUuid! };
  }

  // Twee voorstellingen op één avond (Emmen 17 okt, 19:00 en 21:15): kies de
  // laatste die al begonnen is. Wie tijdens de vroege show scant krijgt die,
  // wie na aanvang van de late show scant krijgt de late.
  const begonnen = kandidaten
    .filter((k) => t >= k.start.getTime())
    .sort((a, b) => b.start.getTime() - a.start.getTime());
  const keuze = begonnen[0] ?? kandidaten
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  return { show: keuze.show, listmonkUuid: keuze.show.listmonkUuid! };
}
