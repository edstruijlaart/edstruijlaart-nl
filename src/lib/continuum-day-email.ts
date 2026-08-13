// Bevestigingsmail voor Continuum Day-aanmeldingen (12 sep 2026, plein voor Beeld & Geluid, Media Park Hilversum).
// PRS bevestigd (29 jul, Piers/PRS Europe): SE Silver Sky Rosewood Gold Spark ltd — verloting staat AAN.
// Locatie sinds 13 aug: Beeld & Geluid (Stadsplein Capelle verviel door een braderie). Trekking direct na het spelen.

export const VERLOTING_IN_MAIL = true;

const VOORWAARDEN_URL = "https://www.gitaarmannen.nl/continuum-day#voorwaarden";
const CONTINUUM_URL =
  "https://www.gitaarmannen.nl/continuum?utm_source=continuum-day&utm_medium=email&utm_campaign=bevestiging";

export function buildContinuumDayEmail({ name }: { name: string }) {
  const voornaam = name.split(" ")[0] || "daar";

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
<p>Het hele programma is buiten, en een Hollandse bui wachten we gewoon even af. Alleen bij echt onwerkbaar weer passen we het plan aan: dat besluiten we uiterlijk vrijdag en dan krijg je een mail. Het gaat dus altijd door.</p>
<p><strong>Wat neem je mee?</strong> Je eigen gitaar. Akoestisch is het makkelijkst; elektrisch mag ook, maar dan wel met een versterkertje op batterijen (stroom is er buiten niet). Verder niks: deelname is gratis. En neem gerust iemand mee die alleen komt meezingen of kijken; aanmelden hoeft alleen voor wie meespeelt.</p>
${verlotingHtml}
<p>Kun je toch niet komen? Stuur me even een berichtje via deze mail, dan maken we je plek vrij voor iemand anders.</p>
<p><strong>En kom daarna naar de voorstelling!</strong> Continuum Day is namelijk de aftrap van mijn nieuwe theatervoorstelling <strong>Gitaarmannen 4: Continuum</strong>, over twintig jaar Continuum. Vanaf 24 september sta ik ermee in 27 theaters door heel Nederland, met op vrijdag 2 oktober de premi&egrave;re in het Isala Theater in Capelle aan den IJssel. Is Continuum Day iets voor jou, dan is die avond dat helemaal. <a href="${CONTINUUM_URL}"><strong>Bekijk alle speeldata en bestel je kaarten</strong></a>.</p>
<p>Tot de twaalfde!<br />Ed</p>
<p style="font-size: 0.8em; color: #999999;">Op je deelname zijn de <a href="${VOORWAARDEN_URL}">deelnamevoorwaarden</a> van toepassing. Tijdens het evenement worden foto- en video-opnamen gemaakt voor pers en promotie.</p>
`;

  const text = `Hey ${voornaam},

Je staat op de lijst. Op zaterdag 12 september is Continuum exact twintig jaar oud, en dat vieren we samen: om 12:00 spelen we met z'n allen Waiting on the World to Change, op het plein voor Beeld & Geluid op het Media Park in Hilversum (Media Parkboulevard 1; station Hilversum Media Park ligt ernaast).

Zo ziet de dag eruit:
- 11:00 verzamelen op het plein voor Beeld & Geluid, Media Park Hilversum
- 11:30 welkom door spreekstalmeester Michiel Veenstra, het verhaal van de plaat, en samen het nummer instuderen (vijf akkoorden, iedereen kan mee)
- 12:00 we spelen, allemaal tegelijk${trekkingLiText}
- 12:45 einde (napraten op het plein mag altijd)

Het hele programma is buiten, en een Hollandse bui wachten we gewoon even af. Alleen bij echt onwerkbaar weer passen we het plan aan: dat besluiten we uiterlijk vrijdag en dan krijg je een mail. Het gaat dus altijd door.

Wat neem je mee? Je eigen gitaar. Akoestisch is het makkelijkst; elektrisch mag ook, maar dan met een versterkertje op batterijen. Verder niks: deelname is gratis. En neem gerust iemand mee die alleen komt meezingen of kijken; aanmelden hoeft alleen voor wie meespeelt.

${verlotingText}Kun je toch niet komen? Stuur me even een berichtje via deze mail, dan maken we je plek vrij voor iemand anders.

En kom daarna naar de voorstelling! Continuum Day is namelijk de aftrap van mijn nieuwe theatervoorstelling Gitaarmannen 4: Continuum, over twintig jaar Continuum. Vanaf 24 september sta ik ermee in 27 theaters door heel Nederland, met op vrijdag 2 oktober de premiere in het Isala Theater in Capelle aan den IJssel. Is Continuum Day iets voor jou, dan is die avond dat helemaal. Alle speeldata en kaarten: ${CONTINUUM_URL}

Tot de twaalfde!
Ed

Op je deelname zijn de deelnamevoorwaarden van toepassing (${VOORWAARDEN_URL}). Tijdens het evenement worden foto- en video-opnamen gemaakt voor pers en promotie.`;

  return { subject, html, text };
}
