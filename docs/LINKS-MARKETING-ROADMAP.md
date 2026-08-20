# /links als marketingmachine — build-roadmap voor Ed

> Resultaat van een multi-agent onderzoek (4 specialisten + synthese), 17 jun 2026.
> Vraag: welke killer-features verkopen Linktree/Beacons/etc. tegen betaling die we
> zelf kunnen inbouwen, en hoe zetten we edstruijlaart.nl/links meer in als marketingtool.

## STATUS — GEBOUWD & LIVE (17 jun 2026, commit 3e6f22a)

- [x] **Per-link UTM-tagging** (quick win 2) — elke knop `?utm_source=links&utm_medium=bio&utm_campaign=<naam>`.
- [x] **Meta custom events per klik** (quick win 3) — `ClickTickets` / `LinkClick` bovenop de Umami-events.
- [x] **Inline e-mailcapture** (quick win 1) — "Niks missen?"-blok onder de knoppen -> `/api/subscribe-afas` (AFAS-funnel + nieuwsbrief + bedankmail). Bewust onder de knoppen zodat de ticketknop de held blijft.
- [x] **Geo-gepersonaliseerde ticketknop** (grotere bet A) — `/api/geo-show` leest Vercel geo-headers -> provincie -> dichtstbijzijnde GM4-show; client-side update van de featured knop. Live geverifieerd (ZH -> Hendrik-Ido-Ambacht).
- [x] **Spotlight-animatie** (quick win 5) — pulserende gloed op de ticketknop, respecteert prefers-reduced-motion.

NOG OPEN (bewust uitgesteld): admin-dashboard /admin/links-stats (de funnel-dagmail dekt de /links-stats al), link-scheduling + A/B-test (vereist dynamische pagina + genoeg verkeer voor conclusies), tour-datum-widget + city-notify (geo-knop dekt de kern), per-knop thumbnails (clutter-risico op het strakke design), Mollie-betalingen/Spotify pre-save (kopen/skippen).

## 1. Kerninzicht

Jouw /links is geen linklijstje, het is de goedkoopste conversiemachine die je hebt: alle bezoekers komen er langs voordat ze ergens heen klikken, en je bezit de hele stack al. De drie dingen waar Linktree Pro 15 dollar/maand voor vraagt (data-eigenaarschap, lead-capture met segmentatie, geo-personalisatie) draaien bij jou al in productie via Umami, Listmonk en je PDOK-routing. Je grootste onbenutte kans is niet meer knoppen, maar het koppelen van die bouwstenen op de pagina zelf: toon elke bezoeker de dichtstbijzijnde GM4-show als hero en vang iedereen die nu wegklikt met een inline e-mailcapture. Dat raakt je twee hoofddoelen tegelijk: zwakke zalen vullen én de lijst laten groeien.

## 2. Quick wins (top 5)

**1. Inline lead-capture direct op /links** — S
- Wat: compacte balk "Pak gratis mijn AFAS Live concert + tour-updates", alleen e-mail (provincie leid je af uit de geo-header), post naar Listmonk + Resend-bedankmail.
- Waarom: elke doorklik naar /afas is verlies. Je vangt de afhakers recht op de pagina.
- Hoe: hergebruik letterlijk de helpers uit gm3-funnel.ts, plak het formulier als component op /links.

**2. Per-link UTM-tagging + attributie naar Tour Insights** — S
- Wat: elke knop-href krijgt automatisch `?utm_source=links&utm_campaign=<event>&utm_content=<positie>` via één helper in de buttons.map.
- Waarom: nu zie je wel WIE klikt (Umami) maar verlies je het spoor zodra iemand doorklikt. Met UTM's zie je in Tour Insights per show hoeveel ticket-intentie via /links binnenkwam. Onmisbaar zodra je betaald gaat adverteren naar de zwakke zalen.
- Hoe: helper-functie in links.astro; UTM wegschrijven in het Listmonk `attribs`-veld bij de subscribe-call.

**3. Custom Meta + Umami events per klik (intentie-segmenten)** — S
- Wat: bij elke klik óók een Meta custom event (`fbq('trackCustom','ClickTickets')`) plus `data-umami-event-positie`/`-variant`.
- Waarom: tilt je retargeting van bot ("zag /links") naar scherp ("klikte tickets, kocht niet") — de warmste doelgroep voor een ticket-ad met urgentie. Veel hogere ROAS op je beperkte budget.
- Hoe: fbq-events zitten al in je pixel via AdPixels.astro; Umami via data-attribuut. Nul nieuwe infra.

**4. Eigen analytics-dashboard (/admin/links-stats)** — S
- Wat: privé-pagina die per knop kliks, CTR en (gekruist met Listmonk) hoeveel klikkers ook aanmeldden toont, uitgesplitst per provincie.
- Waarom: je ziet welke knop tickets/aanmeldingen oplevert vs. dood gewicht, en welke provincie achterblijft op de zwakke zalen. Beslissingsondersteuning zonder SaaS.
- Hoe: Astro API-route bevraagt de Umami REST API (server-side token uit Vercel env, nooit client-side) en rendert achter je bestaande admin-conventie.

**5. Spotlight/animatie + thumbnails op de featured knop** — S
- Wat: GM4-ticketknop laten pulseren als featured-card bovenaan, plus thumbnails (showposter, AFAS-still, podcast-art) per knop.
- Waarom: directe conversiewinst op de belangrijkste CTA, en herkenbare knoppen klikken beter.
- Hoe: pure CSS-animatie + featured-class + img per knop in Astro. Een uur werk.

## 3. Grotere bets

**A. Geo-gepersonaliseerde dichtstbijzijnde-show als hero** — M — *hoogste hefboom op doel 1*
- Waarde: bezoeker uit Noord-Holland ziet meteen "Tickets Den Helder 16 okt" i.p.v. een generieke tour-knop. Dit is je geheime wapen voor de zwakke zalen, en Linktree kan het niet eens goed. Je hergebruikt letterlijk de `dichtstbijzijndeShows(provincie)`-logica die je al voor de e-mailfunnel schreef.
- Bouwplan: client-side fetch naar een nieuw `/api/geo-show` endpoint (prerender=false) dat de Vercel IP-headers (`x-vercel-ip-country-region`, `-city`) leest, naar provincie mapt en de hero-knop teruggeeft. Client-side fetch zodat je statische pagina cachebaar/snel blijft. Val bij onbekende geo terug op de generieke Continuum-knop. Verwerk het IP in-memory, sla niets op (AVG).

**B. Tour-datum-widget (shows.ts) met per-stad status** — M
- Waarde: compacte lijst komende GM4-shows op de pagina (stad + datum + "Tickets" / "Bijna uitverkocht" / "Notify me"), gepind onder de geo-hero. Verkort de funnel met een paginalading en maakt de zwakke zalen prominent i.p.v. verstopt.
- Bouwplan: leest shows.ts als single source of truth. Eén widget, geen 27 losse knoppen (let op de >7-8-links-CTR-regel). Shows zonder kaartlink krijgen automatisch de city-notify-knop (zie bet C).

**C. "Laat me weten als ik in jouw stad speel" (city-notify capture)** — M
- Waarde: vangt exact de bezoeker die nu wegklikt omdat er "niks in de buurt" is, en zet die om in een gesegmenteerde lead met bewezen intentie. Voedt doel 1 én 2.
- Bouwplan: nieuw formulier-endpoint + Listmonk-lijst "live-notify", verder hergebruik van je AFAS/GM3-funnel-architectuur (Listmonk + Resend + PDOK).

**D. Link-scheduling + A/B-test (samen op één architectuurkeuze)** — M
- Waarde: scheduling laat een "Laatste kaarten Den Helder — morgen"-knop automatisch verschijnen op showdagen zonder handwerk; A/B test of de gratis-AFAS-knop bovenaan méér e-mails oplevert dan tickets bovenaan. Datagedreven i.p.v. onderbuik.
- Bouwplan: beide vragen om de pagina van prerender=true naar prerender=false te zetten (lichte pagina, kan prima). Scheduling = optioneel `{from, until}`-veld per button, filteren op `now` in Europe/Amsterdam. A/B = twee button-arrays, deterministische 50/50-split, variant meesturen in het Umami-event. Eén A/B-test tegelijk, pas concluderen bij genoeg klikken.

## 4. Zelf bouwen vs. kopen

| Feature | Verdict |
|---|---|
| Custom domein + watermerk weg | Al klaar (gratis, jouw #1 reden tegen Linktree) |
| Klik-analytics + dashboard | Zelf — Umami API |
| Lead-capture + provincie-segmentatie | Zelf — draait al |
| Mailinglijst-integratie | Zelf — Listmonk is je Mailchimp, superieur |
| Meta/Google pixels + retargeting | Zelf — staat al op /links |
| Geo-personalisatie dichtstbijzijnde show | Zelf — Vercel geo-headers gratis, niemand doet dit beter |
| UTM + custom events | Zelf — triviaal |
| Link-scheduling, A/B-test, spotlight/thumbnails | Zelf — config + paar regels logica |
| QR-codes (per kanaal, eigen UTM) | Zelf — Python qrcode op de Pi, géén QR-SaaS |
| SEO/OG-tags | Zelf — Astro `<head>` |
| **Betalingen / tip huiskamerconcert** | **Kopen: Mollie** (jouw filosofie). Alleen transactiekosten, GEEN 9-12% platform-fee zoals de concurrenten |
| **Spotify pre-save** | **Kopen of skippen: Feature.fm/Hypeddit gratis tier.** OAuth-token-onderhoud per fan + Spotify app-review is te veel werk voor een paar singles. Smart-link *routing* (zonder pre-save) bouw je wél zelf |

Rode draad: alles wat je eigen Umami/Listmonk-data leest of statische config rendert is gratis op je stack. Alleen een lopende OAuth-relatie met een derde platform (muziek) of betalingen koop je — precies je bestaande uitzonderingen.

## 5. Niet doen

- **Embedded YouTube/Spotify feeds** — zware iframes vertragen de mobiele pagina, leiden af van de #1-actie (tickets), én zetten third-party cookies (AVG-spanning zonder consent-banner). Een statische "laatste aflevering"-knop is beter.
- **Exit-intent pop-up** — werkt niet op mobiel en botst met je niet-pathetisch-stijl. De inline capture levert hetzelfde zonder de irritatie.
- **Deep-linking SDK** — een echte SDK (Branch/AppsFlyer) is overkill en lock-in. Eventueel later een simpele user-agent-sniff voor de Instagram-webview, lage prioriteit.
- **Auto-sorterende knopvolgorde** — bij 6-7 knoppen levert dit ruis op en kan een toevallig populaire gratis-knop je ticketknop wegduwen. Pin tickets handmatig, gebruik A/B i.p.v. auto-sort.
- **PWA / save-to-homescreen** — nice-to-have, lage adoptie, niet waar de winst zit.
- **Gated betaalde content** — toekomstmuziek, nu lager dan de gratis-funnels. Zelfde mechaniek (capture + Mollie), pak op als er concreet materiaal is.

## 6. Aanbevolen eerste stap

**Begin met de inline lead-capture op /links (quick win 1).**

Het is een S-klus omdat de hele backend (Listmonk + Resend + PDOK-provincie-routing) al in productie draait — je verplaatst alleen het formulier naar voren. Het raakt direct twee van je drie hoofddoelen (lijstgroei + funnels voeden) en stopt het verlies van iedereen die nu afhaakt op de doorklik naar /afas. Het levert bovendien meteen de e-mailadressen op die elke volgende stap (geo-targeting, city-notify, retargeting) waardevoller maken. Combineer het in dezelfde sessie met UTM-tagging (quick win 2) zodat je vanaf dag één kunt meten welke knop en welke provincie converteert.

**AVG-punt om meteen goed te zetten:** je capturet nu zonder consent-banner (verdedigbaar grijs gebied voor PageView-pixels). Zorg dat het inline formulier een duidelijke opt-in-tekst heeft en de bedankmail/Listmonk een werkende uitschrijflink. Pas écht op zodra je e-mailadressen gehasht naar Meta CAPI (Advanced Matching) zou sturen: dan wordt het een hard PII-risico en heb je consent nodig.
