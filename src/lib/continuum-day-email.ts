// Bevestigingsmail voor Continuum Day-aanmeldingen (12 sep 2026, plein voor Beeld & Geluid, Media Park Hilversum).
// PRS bevestigd (29 jul, Piers/PRS Europe): SE Silver Sky Rosewood Gold Spark ltd — verloting staat AAN.
// Locatie sinds 13 aug: Beeld & Geluid (Stadsplein Capelle verviel door een braderie). Trekking direct na het spelen.
// Boven de 250 spelende plekken gaat de wachtlijst-variant de deur uit (voorwaarden beloven een wachtlijst).
// Kortingscode van Beeld & Geluid (mail Kaija, 1 sep): tweede museumticket gratis met BeeldgeluidJM.

export const VERLOTING_IN_MAIL = true;

const VOORWAARDEN_URL = "https://www.gitaarmannen.nl/continuum-day#voorwaarden";
const CHORDSHEET_URL = "https://www.gitaarmannen.nl/files/continuum-day-akkoorden.pdf";
const CONTINUUM_URL =
  "https://www.gitaarmannen.nl/continuum?utm_source=continuum-day&utm_medium=email&utm_campaign=bevestiging";
const TRAILER_URL = "https://www.youtube.com/watch?v=wrsepG3uNg8";

export function buildContinuumDayEmail({ name, wachtlijst = false }: { name: string; wachtlijst?: boolean }) {
  // Mensen typen hun naam lang niet altijd met een hoofdletter ("rob gijsman"),
  // en "Hey rob," leest slordig. Alleen de eerste letter fatsoeneren, de rest
  // laten staan (anders sneuvelt bijvoorbeeld "McCartney").
  const ruweVoornaam = name.trim().split(/\s+/)[0] || "";
  const voornaam = ruweVoornaam ? ruweVoornaam.charAt(0).toUpperCase() + ruweVoornaam.slice(1) : "daar";

  const tourHtml = `<p><strong>En kom daarna naar de voorstelling!</strong> Continuum Day is namelijk de aftrap van mijn nieuwe theatervoorstelling <strong>Gitaarmannen 4: Continuum</strong>, over twintig jaar Continuum. Vanaf 24 september sta ik ermee in 27 theaters door heel Nederland, met op vrijdag 2 oktober de premi&egrave;re in het Isala Theater in Capelle aan den IJssel. Proef alvast de sfeer met <a href="${TRAILER_URL}">de trailer</a>. Is Continuum Day iets voor jou, dan is die avond dat helemaal. <a href="${CONTINUUM_URL}"><strong>Bekijk alle speeldata en bestel je kaarten</strong></a>.</p>`;
  const tourText = `En kom daarna naar de voorstelling! Continuum Day is namelijk de aftrap van mijn nieuwe theatervoorstelling Gitaarmannen 4: Continuum, over twintig jaar Continuum. Vanaf 24 september sta ik ermee in 27 theaters door heel Nederland, met op vrijdag 2 oktober de premiere in het Isala Theater in Capelle aan den IJssel. Proef alvast de sfeer met de trailer: ${TRAILER_URL}. Is Continuum Day iets voor jou, dan is die avond dat helemaal. Alle speeldata en kaarten: ${CONTINUUM_URL}`;

  const voorwaardenHtml = `<p style="font-size: 0.8em; color: #999999;">Op je deelname zijn de <a href="${VOORWAARDEN_URL}">deelnamevoorwaarden</a> van toepassing. Tijdens het evenement worden foto- en video-opnamen gemaakt voor pers en promotie.</p>`;
  const voorwaardenText = `Op je deelname zijn de deelnamevoorwaarden van toepassing (${VOORWAARDEN_URL}). Tijdens het evenement worden foto- en video-opnamen gemaakt voor pers en promotie.`;

  const bgActieHtml = `<p><strong>Cadeautje van Beeld &amp; Geluid:</strong> zij vinden Continuum Day zo'n leuke actie dat ze alle deelnemers een tweede museumticket gratis geven, met code <strong>BeeldgeluidJM</strong>. Heb je een Vriendenloterij- of Museumkaart? Dan kun je vooraf al gratis een tijdslot reserveren.</p>`;
  const bgActieText = `Cadeautje van Beeld & Geluid: zij vinden Continuum Day zo'n leuke actie dat ze alle deelnemers een tweede museumticket gratis geven, met code BeeldgeluidJM. Heb je een Vriendenloterij- of Museumkaart? Dan kun je vooraf al gratis een tijdslot reserveren.`;

  if (wachtlijst) {
    const subject = "Je staat op de wachtlijst voor Continuum Day (12 september)";

    const html = `
<p>Hey ${voornaam},</p>
<p>Wat gaaf dat je mee wilt spelen op Continuum Day! Eerlijk is eerlijk: de 250 speelplekken zijn inmiddels vergeven, dus je staat op de <strong>wachtlijst</strong>. Komt er een plek vrij (dat gebeurt eigenlijk altijd wel), dan hoor je het meteen van me per mail.</p>
<p>Wat je sowieso kunt doen op zaterdag <strong>12 september</strong>: kom naar het plein voor Beeld &amp; Geluid op het Media Park in Hilversum om mee te zingen en erbij te zijn (publiek is van harte welkom), of speel om 12:00 mee waar je ook bent en deel het met <strong>#ContinuumDay</strong>. De akkoorden staan hier alvast voor je klaar: <a href="${CHORDSHEET_URL}">de chord-sheet (pdf)</a>.</p>
${bgActieHtml}
${tourHtml}
<p>Tot snel!<br />Ed</p>
${voorwaardenHtml}
`;

    const text = `Hey ${voornaam},

Wat gaaf dat je mee wilt spelen op Continuum Day! Eerlijk is eerlijk: de 250 speelplekken zijn inmiddels vergeven, dus je staat op de wachtlijst. Komt er een plek vrij (dat gebeurt eigenlijk altijd wel), dan hoor je het meteen van me per mail.

Wat je sowieso kunt doen op zaterdag 12 september: kom naar het plein voor Beeld & Geluid op het Media Park in Hilversum om mee te zingen en erbij te zijn (publiek is van harte welkom), of speel om 12:00 mee waar je ook bent en deel het met #ContinuumDay. De akkoorden staan hier alvast voor je klaar: ${CHORDSHEET_URL}

${bgActieText}

${tourText}

Tot snel!
Ed

${voorwaardenText}`;

    return { subject, html, text };
  }

  const verlotingHtml = VERLOTING_IN_MAIL
    ? `<p><strong>En dan de verloting:</strong> meteen na het spelen verloten we onder de aanwezige deelnemers een PRS SE Silver Sky (de Rosewood in Gold Spark, een limited uitvoering). Er gaan ook een Dunlop System 65 setup-kit en een 3-pack John Mayer signature-snaren weg, en iedereen krijgt een speciale Continuum Day-plectrum. Je aanmelding is meteen je lot, en je moet er zijn om te winnen.</p>`
    : "";
  const verlotingText = VERLOTING_IN_MAIL
    ? `En dan de verloting: meteen na het spelen verloten we onder de aanwezige deelnemers een PRS SE Silver Sky (de Rosewood in Gold Spark, een limited uitvoering). Er gaan ook een Dunlop System 65 setup-kit en een 3-pack John Mayer signature-snaren weg, en iedereen krijgt een speciale Continuum Day-plectrum. Je aanmelding is meteen je lot, en je moet er zijn om te winnen.\n\n`
    : "";
  const trekkingLiHtml = VERLOTING_IN_MAIL
    ? `\n<li>12:15 &mdash; de trekking van de verloting, direct na het spelen</li>`
    : "";
  const trekkingLiText = VERLOTING_IN_MAIL ? `\n- 12:15 de trekking van de verloting, direct na het spelen` : "";

  const subject = "Je staat op de lijst voor Continuum Day (12 september)";

  const html = `
<p>Hey ${voornaam},</p>
<p>Je staat op de lijst. Op zaterdag <strong>12 september</strong> is Continuum exact twintig jaar oud, en dat vieren we samen: om 12:00 spelen we met z'n allen Waiting on the World to Change, op het plein voor Beeld &amp; Geluid op het Media Park in Hilversum (Media Parkboulevard 1; station Hilversum Media Park ligt ernaast).</p>
<p><strong>Zo ziet de dag eruit:</strong></p>
<ul>
<li>11:00 &mdash; verzamelen op het plein voor Beeld &amp; Geluid, Media Park Hilversum</li>
<li>11:30 &mdash; welkom door spreekstalmeester Michiel Veenstra, het verhaal van de plaat, en samen het nummer instuderen (vijf akkoorden, iedereen kan mee)</li>
<li>12:00 &mdash; we spelen, allemaal tegelijk</li>${trekkingLiHtml}
<li>12:45 &mdash; einde (napraten op het plein mag altijd)</li>
</ul>
<p>De akkoorden staan hier alvast voor je klaar: <a href="${CHORDSHEET_URL}">de chord-sheet (pdf)</a>. Oefenen mag, hoeft niet: we studeren het op het plein samen in.</p>
<p>Het hele programma is buiten, en een Hollandse bui wachten we gewoon even af. Alleen bij echt onwerkbaar weer passen we het plan aan: dat besluiten we uiterlijk vrijdag en dan krijg je een mail.</p>
<p><strong>Wat neem je mee?</strong> Je eigen gitaar. Akoestisch is het makkelijkst; elektrisch mag ook, maar dan wel met een versterkertje op batterijen (stroom is er buiten niet). Verder niks: deelname is gratis. En neem gerust iemand mee die alleen komt meezingen of kijken; aanmelden hoeft alleen voor wie meespeelt.</p>
${verlotingHtml}
${bgActieHtml}
<p>Kun je toch niet komen? Stuur me even een berichtje via deze mail, dan maken we je plek vrij voor iemand anders.</p>
${tourHtml}
<p>Tot de twaalfde!<br />Ed</p>
${voorwaardenHtml}
`;

  const text = `Hey ${voornaam},

Je staat op de lijst. Op zaterdag 12 september is Continuum exact twintig jaar oud, en dat vieren we samen: om 12:00 spelen we met z'n allen Waiting on the World to Change, op het plein voor Beeld & Geluid op het Media Park in Hilversum (Media Parkboulevard 1; station Hilversum Media Park ligt ernaast).

Zo ziet de dag eruit:
- 11:00 verzamelen op het plein voor Beeld & Geluid, Media Park Hilversum
- 11:30 welkom door spreekstalmeester Michiel Veenstra, het verhaal van de plaat, en samen het nummer instuderen (vijf akkoorden, iedereen kan mee)
- 12:00 we spelen, allemaal tegelijk${trekkingLiText}
- 12:45 einde (napraten op het plein mag altijd)

De akkoorden staan hier alvast voor je klaar: ${CHORDSHEET_URL} (oefenen mag, hoeft niet: we studeren het op het plein samen in).

Het hele programma is buiten, en een Hollandse bui wachten we gewoon even af. Alleen bij echt onwerkbaar weer passen we het plan aan: dat besluiten we uiterlijk vrijdag en dan krijg je een mail.

Wat neem je mee? Je eigen gitaar. Akoestisch is het makkelijkst; elektrisch mag ook, maar dan met een versterkertje op batterijen. Verder niks: deelname is gratis. En neem gerust iemand mee die alleen komt meezingen of kijken; aanmelden hoeft alleen voor wie meespeelt.

${verlotingText}${bgActieText}

Kun je toch niet komen? Stuur me even een berichtje via deze mail, dan maken we je plek vrij voor iemand anders.

${tourText}

Tot de twaalfde!
Ed

${voorwaardenText}`;

  return { subject, html, text };
}
