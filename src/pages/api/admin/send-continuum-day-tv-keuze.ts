export const prerender = false;
export const config = { maxDuration: 60 };

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { sanityWriteClient } from '../../../lib/sanity';

/**
 * Uitslag Tijd voor Max naar iedereen die het formulier invulde. Drie varianten op
 * basis van tvKandidaat.status: gekozen (met extra alinea voor minderjarigen),
 * reserve, en de rest (krijgt de afwijzing en status "nee").
 *
 * Elke ontvanger krijgt zijn eigen mail met voornaam; geen groepsmail.
 * Handmatig getriggerd met x-api-key (BOOTLEG_API_KEY). Idempotent via tvKeuzeMailOp.
 *
 *   ?dryrun=1   stuurt vier voorbeelden naar Ed (gekozen volwassen, gekozen minderjarig,
 *               reserve, afgewezen), markeert niemand
 *   ?limit=N    aantal per batch (default 25)
 */
const CHORDSHEET_URL = 'https://www.gitaarmannen.nl/files/continuum-day-akkoorden.pdf';

type Kandidaat = { _id: string; naam: string; email: string; leeftijd?: number; status: string; tel?: string };

export const GET: APIRoute = async ({ request, url }) => {
  const apiKey = request.headers.get('x-api-key');
  const secret = import.meta.env.BOOTLEG_API_KEY as string;
  if (!secret || apiKey !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const dryrun = url.searchParams.get('dryrun') === '1';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 25, 60);

  try {
    const resend = new Resend(import.meta.env.RESEND_API_KEY);

    const openstaand = await sanityWriteClient.fetch<Kandidaat[]>(
      `*[_type == "continuumDayAanmelding" && defined(tvKandidaat) && !defined(tvKeuzeMailOp)]
        { _id, naam, email, leeftijd, "status": tvKandidaat.status, "tel": tvKandidaat.telefoon } | order(naam asc)`
    );

    const batch: Kandidaat[] = dryrun
      ? [
          { _id: 'dry1', naam: 'Ed Voorbeeld', email: 'edstruijlaart@gmail.com', leeftijd: 45, status: 'gekozen', tel: '0600000000' },
          { _id: 'dry2', naam: 'Ed Jongste', email: 'edstruijlaart@gmail.com', leeftijd: 16, status: 'gekozen', tel: '' },
          { _id: 'dry3', naam: 'Ed Reserve', email: 'edstruijlaart@gmail.com', leeftijd: 60, status: 'reserve' },
          { _id: 'dry4', naam: 'Ed Afgewezen', email: 'edstruijlaart@gmail.com', leeftijd: 50, status: 'kandidaat' },
        ]
      : openstaand.slice(0, limit);

    if (batch.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Iedereen heeft de uitslag al gehad', sent: 0, resterend: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const vandaag = new Date().toISOString().split('T')[0];
    let sentCount = 0;
    let errorCount = 0;
    const perVariant: Record<string, number> = { gekozen: 0, reserve: 0, nee: 0 };
    const failed: Array<{ naam: string; email: string; reden: string }> = [];

    for (const [i, k] of batch.entries()) {
      if (i > 0) await new Promise((r) => setTimeout(r, 700));
      const variant = k.status === 'gekozen' ? 'gekozen' : k.status === 'reserve' ? 'reserve' : 'nee';
      const { subject, html, text } = bouwMail(variant, k);
      try {
        const result = await resend.emails.send({
          from: 'Ed Struijlaart <ed@edstruijlaart.nl>',
          to: k.email,
          subject: dryrun ? `[${variant}] ${subject}` : subject,
          html,
          text,
        });
        if (!result?.data?.id) throw new Error(result?.error?.message || 'Geen message-id van Resend');
        sentCount++;
        perVariant[variant]++;
        if (!dryrun) {
          const set: Record<string, string> = { tvKeuzeMailOp: vandaag };
          if (variant === 'nee') set['tvKandidaat.status'] = 'nee';
          await sanityWriteClient.patch(k._id).set(set).commit();
        }
      } catch (err: any) {
        errorCount++;
        const reden = err?.message || String(err);
        console.error(`Mislukt voor ${k.email}:`, reden);
        failed.push({ naam: k.naam, email: k.email, reden });
      }
    }

    const resterend = dryrun ? openstaand.length : Math.max(openstaand.length - sentCount, 0);
    return new Response(
      JSON.stringify({ success: true, dryrun, batch: batch.length, sent: sentCount, perVariant, errors: errorCount, resterend, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('send-continuum-day-tv-keuze error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Er ging iets mis' }), { status: 500 });
  }
};

function voornaamVan(naam: string) {
  const ruw = naam.trim().split(/\s+/)[0] || '';
  return ruw ? ruw.charAt(0).toUpperCase() + ruw.slice(1) : 'daar';
}

function bouwMail(variant: 'gekozen' | 'reserve' | 'nee', k: Kandidaat) {
  const voornaam = voornaamVan(k.naam);
  const minderjarig = typeof k.leeftijd === 'number' && k.leeftijd < 18;
  const heeftTel = Boolean(k.tel && k.tel.trim());

  if (variant === 'gekozen') {
    const subject = 'Je gaat mee naar Tijd voor Max';
    const nummerZin = minderjarig
      ? ''
      : heeftTel
        ? 'Je nummer heb ik van je formulier.'
        : 'Mail me even je nummer.';
    const minderjarigHtml = minderjarig
      ? `<p><strong>Nog even dit:</strong> omdat je nog geen 18 bent, moet er een ouder of verzorger mee naar de studio. Mail me even zijn of haar naam en telefoonnummer. Die naam moet ook op de lijst voor de beveiliging, en dat nummer zet ik in de groep.</p>`
      : '';
    const minderjarigText = minderjarig
      ? `Nog even dit: omdat je nog geen 18 bent, moet er een ouder of verzorger mee naar de studio. Mail me even zijn of haar naam en telefoonnummer. Die naam moet ook op de lijst voor de beveiliging, en dat nummer zet ik in de groep.\n\n`
      : '';

    const html = `
<p>Hey ${voornaam},</p>
<p>Goed nieuws: jij gaat donderdag 10 september mee naar Tijd voor Max. Ik had bijna veertig aanmeldingen voor tien plekken, dus wees er gerust een beetje trots op.</p>
<p>Even alles op een rij:</p>
<p><strong>Wanneer en waar.</strong> Donderdag 10 september om 10:45 uur bij de publieksingang van Studio 23 op het Media Park in Hilversum. Om 11:15 begint de soundcheck, dus kom echt op tijd. Rond 14:30 ben je klaar. Lunch is geregeld. Station Hilversum Media Park ligt naast de studio; parkeren is beperkt, dus laat me even weten of je met de auto komt.</p>
<p><strong>Wat neem je mee.</strong> Je akoestische gitaar. Geen versterker, de studio hangt microfoons boven ons.</p>
<p><strong>Wat we spelen.</strong> Een stuk van Waiting on the World to Change, vijf akkoorden. Maandag krijg je van mij een instructiefilmpje waarin ik het vormpje uitleg en voorspeel, dan kun je er thuis rustig op oefenen. De akkoorden staan alvast hier: <a href="${CHORDSHEET_URL}">de chord-sheet (pdf)</a>.</p>
<p><strong>Hoe het item eruitziet</strong> weet ik zelf nog niet precies, dat bespreek ik maandag met de redactie. Reken op een kort optreden van maximaal twee minuten, misschien met een korte teaser aan het begin. Zodra ik meer weet, hoor je het.</p>
<p><strong>Kleding.</strong> Geen fijne streepjes, stipjes of ruitjes, en geen merknamen of logo's. Dat doet het slecht op tv.</p>
<p><strong>Beveiliging.</strong> Je naam gaat vooraf naar de studio, anders kom je het gebouw niet in. Ik heb je als <strong>${k.naam}</strong> staan. Klopt dat niet helemaal met je legitimatie, mail me dan je volledige naam.</p>
${minderjarigHtml}
<p>Om iedereen die dag snel te kunnen bereiken maak ik een WhatsApp-groepje met de tien. ${nummerZin} Wil je liever niet in een groep, zeg het, dan hou ik je apart op de hoogte.</p>
<p>De uitzending is vrijdag 11 september om 17:10 op NPO 1.</p>
<p>Stuur me even een kort antwoord dat je erbij bent, dan weet ik dat ik op je kan rekenen.</p>
<p>Tot donderdag!<br />Ed</p>
`;
    const text = `Hey ${voornaam},

Goed nieuws: jij gaat donderdag 10 september mee naar Tijd voor Max. Ik had bijna veertig aanmeldingen voor tien plekken, dus wees er gerust een beetje trots op.

Even alles op een rij:

Wanneer en waar. Donderdag 10 september om 10:45 uur bij de publieksingang van Studio 23 op het Media Park in Hilversum. Om 11:15 begint de soundcheck, dus kom echt op tijd. Rond 14:30 ben je klaar. Lunch is geregeld. Station Hilversum Media Park ligt naast de studio; parkeren is beperkt, dus laat me even weten of je met de auto komt.

Wat neem je mee. Je akoestische gitaar. Geen versterker, de studio hangt microfoons boven ons.

Wat we spelen. Een stuk van Waiting on the World to Change, vijf akkoorden. Maandag krijg je van mij een instructiefilmpje waarin ik het vormpje uitleg en voorspeel, dan kun je er thuis rustig op oefenen. De akkoorden staan alvast hier: ${CHORDSHEET_URL}

Hoe het item eruitziet weet ik zelf nog niet precies, dat bespreek ik maandag met de redactie. Reken op een kort optreden van maximaal twee minuten, misschien met een korte teaser aan het begin. Zodra ik meer weet, hoor je het.

Kleding. Geen fijne streepjes, stipjes of ruitjes, en geen merknamen of logo's. Dat doet het slecht op tv.

Beveiliging. Je naam gaat vooraf naar de studio, anders kom je het gebouw niet in. Ik heb je als ${k.naam} staan. Klopt dat niet helemaal met je legitimatie, mail me dan je volledige naam.

${minderjarigText}Om iedereen die dag snel te kunnen bereiken maak ik een WhatsApp-groepje met de tien. ${nummerZin} Wil je liever niet in een groep, zeg het, dan hou ik je apart op de hoogte.

De uitzending is vrijdag 11 september om 17:10 op NPO 1.

Stuur me even een kort antwoord dat je erbij bent, dan weet ik dat ik op je kan rekenen.

Tot donderdag!
Ed`;
    return { subject, html, text };
  }

  if (variant === 'reserve') {
    const subject = 'Tijd voor Max: je staat op de reservelijst';
    const html = `
<p>Hey ${voornaam},</p>
<p>Dank voor je aanmelding voor Tijd voor Max. Ik heb tien mensen gekozen, en jij bent een van de drie reserves. Valt er iemand af, dan hoor je het meteen van me. Uiterlijk woensdag 9 september weet je waar je aan toe bent.</p>
<p>De keuze had niks met kwaliteit te maken. Iedereen die zich aanmeldde kon dit gewoon, dus het ging vooral om een mix van leeftijden en verhalen. Dat is bijna willekeur, en zo voelt het voor mij ook.</p>
<p>Hou donderdag 10 september overdag dus nog even vrij als dat lukt. Lukt het niet meer, laat het me weten, dan haal ik je van de reservelijst.</p>
<p>En zaterdag de twaalfde staan we sowieso samen op het plein.</p>
<p>Ed</p>
`;
    const text = `Hey ${voornaam},

Dank voor je aanmelding voor Tijd voor Max. Ik heb tien mensen gekozen, en jij bent een van de drie reserves. Valt er iemand af, dan hoor je het meteen van me. Uiterlijk woensdag 9 september weet je waar je aan toe bent.

De keuze had niks met kwaliteit te maken. Iedereen die zich aanmeldde kon dit gewoon, dus het ging vooral om een mix van leeftijden en verhalen. Dat is bijna willekeur, en zo voelt het voor mij ook.

Hou donderdag 10 september overdag dus nog even vrij als dat lukt. Lukt het niet meer, laat het me weten, dan haal ik je van de reservelijst.

En zaterdag de twaalfde staan we sowieso samen op het plein.

Ed`;
    return { subject, html, text };
  }

  const subject = 'Tijd voor Max: dit keer niet, wel op de twaalfde';
  const html = `
<p>Hey ${voornaam},</p>
<p>Dank dat je mee wilde naar Tijd voor Max. Ik had bijna veertig aanmeldingen voor tien plekken, dus ik moest kiezen, en jij zit er dit keer niet bij.</p>
<p>Eén ding wil ik daar duidelijk over zijn: het ligt niet aan de kwaliteit. Iedereen die zich aanmeldde kon dit gewoon. Ik heb vooral gekeken naar een mix van leeftijden en verhalen, en dan is het bijna willekeur wie erin valt. Dat voelt een beetje oneerlijk, en dat is het eerlijk gezegd ook.</p>
<p>Kijk vrijdag 11 september om 17:10 naar NPO 1, dan zie je wat we ervan maken. En zaterdag de twaalfde staan we met z'n allen op het plein, en daar gaat het echt om.</p>
<p>Tot dan!<br />Ed</p>
`;
  const text = `Hey ${voornaam},

Dank dat je mee wilde naar Tijd voor Max. Ik had bijna veertig aanmeldingen voor tien plekken, dus ik moest kiezen, en jij zit er dit keer niet bij.

Eén ding wil ik daar duidelijk over zijn: het ligt niet aan de kwaliteit. Iedereen die zich aanmeldde kon dit gewoon. Ik heb vooral gekeken naar een mix van leeftijden en verhalen, en dan is het bijna willekeur wie erin valt. Dat voelt een beetje oneerlijk, en dat is het eerlijk gezegd ook.

Kijk vrijdag 11 september om 17:10 naar NPO 1, dan zie je wat we ervan maken. En zaterdag de twaalfde staan we met z'n allen op het plein, en daar gaat het echt om.

Tot dan!
Ed`;
  return { subject, html, text };
}
