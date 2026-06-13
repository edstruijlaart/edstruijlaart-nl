# AGENTS.md — edstruijlaart.nl (persoonlijke website)

> **Doel van dit bestand.** Merk-neutraal continuïteitsdossier. Een willekeurige capabele AI of
> ontwikkelaar moet hiermee dit project kunnen begrijpen, lokaal draaien, opnieuw deployen en
> desnoods vanaf nul herbouwen — zónder Claude, zonder het geheugen van een eerdere assistent en
> zonder de privé-documenten van de eigenaar. Lees dit eerst. `CLAUDE.md` (public) en
> `CLAUDE-local.md` (in `.gitignore`, bevat credentials) bevatten dezelfde kennis, dieper en
> Claude-specifiek. De `docs/`-map bevat verdieping per onderdeel.
>
> Eigenaar: Ed Struijlaart (singer-songwriter, theatermaker, podcastmaker). Codebase-taal: Nederlands.
> Versie bij schrijven: `package.json` staat op **0.0.1** (er is geen actief versie-protocol voor deze
> site; de versie is niet betekenisvol). **LET OP: de GitHub-repo is PUBLIC — geen credentials in dit
> bestand of in `CLAUDE.md`.**

## 1. Wat & waarom

Persoonlijke website van Ed Struijlaart: shows/tour, muziek, podcasts, blog, voice-over, shop, en het
boekingssysteem voor **huiskamerconcerten**. De site is meertalig (NL/EN/ES/DE/FR) met automatische
locale-detectie. Het hart van de dynamiek is de huiskamerconcert-flow: gasten melden zich aan via een
e-mail-gate op een showpagina, na het concert krijgen ze automatisch een herinneringsmail met de
bootleg-opname, en ze kunnen foto's uploaden en de avond beoordelen.

**Waarom het bestaat.** Na een migratie van WordPress naar Astro (feb 2026) wilde de eigenaar een snelle,
zelf te onderhouden site met volledige controle over content en de huiskamerconcert-funnel, inclusief
e-mail-automatisering en bootleg-distributie — zonder afhankelijk te zijn van WordPress-plugins.

**Waarom deze keuzes.**
- **Astro met `output: 'static'` + Vercel-adapter**: het overgrote deel is statische HTML (snel, SEO,
  goedkoop), maar de API-routes en een paar dynamische pagina's draaien als serverless functions via
  `export const prerender = false`. Zo betaal je alleen serverless voor wat echt dynamisch moet zijn.
- **Sanity als headless CMS**: single source of truth voor show-data (status, bootleg, ratings, gasten).
  De website leest direct (CDN-cached); de Pi-gig-manager is alleen een admin/sync-tool.
- **Listmonk self-hosted op een Raspberry Pi** (via Docker): gratis, geen vendor lock-in, eigen controle
  over subscriber-data. Conform de "zelf bouwen/hosten"-filosofie van de eigenaar.
- **Resend voor transactionele e-mail**: betrouwbare deliverability vanaf het geverifieerde domein.
- **Fire-and-forget patroon**: notificaties, Listmonk-sync en counters mogen de HTTP-response nooit
  vertragen — ze draaien als `.catch(console.error)` achter een Promise.

## 2. Stack & architectuur

| Component | Technologie |
|-----------|-------------|
| Framework | Astro 5 (`output: 'static'`, `@astrojs/vercel`-adapter), React 19 voor interactieve componenten |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| CMS | Sanity (headless), project `q407odag`, dataset `production`, `@sanity/client` + `@sanity/image-url` |
| E-mail | Resend (`resend` SDK), domein `edstruijlaart.nl` geverifieerd |
| Nieuwsbrief | Listmonk (self-hosted op Pi via Docker), publieke subscription-API via Cloudflare-tunnel |
| Hosting | Vercel, auto-deploy bij git push naar `main` |
| Meertalig | Eigen i18n (`src/i18n/`) + `src/middleware.ts` (locale-detectie, geen Astro-i18n routing) |
| Fonts | DM Serif Display (headings) + DM Sans (body), self-hosted via `@fontsource/*` |
| Iconen | `@lucide/astro` |
| Sitemap | `@astrojs/sitemap` (met i18n + vaste lastmod per build) |

**Mappen:** `src/pages/` (pagina's + `api/`-routes; locale-subfolders `de/ en/ es/ fr/`), `src/pages/api/`
(serverless functions: `show/*` voor de huiskamerconcert-flow, `newsletter.ts`, `serenade-register.ts`,
`subscribe-afas.ts`, `admin/*`, `health.ts`), `src/content/news*/` (blog-posts als markdown content
collections, per taal), `src/components/` (Astro + React), `src/layouts/` (BaseLayout met SEO/OG/JSON-LD),
`src/lib/` (`sanity.ts`, `email-templates.ts`, `spotify.ts`, `bandsintown.ts`, `huiskamerconcerten.ts`),
`src/i18n/` (config + translations per taal), `src/data/` (o.a. `shows.ts` = bron voor theateragenda),
`src/styles/`. Verder: `public/` (statische assets, o.a. `images/news/`), `docs/` (verdieping),
`scripts/` (eenmalige WordPress-scrapers + afas-followup), `sanity/` (apart Sanity-studio-project).

> **Astro-detail:** ondanks `output: 'static'` werken de serverless routes doordat elk dynamisch
> bestand `export const prerender = false` zet (23 routes doen dit). `security.checkOrigin = false`
> staat uit zodat externe API-calls (iOS Shortcut bootleg-upload, webhooks) niet door CSRF-bescherming
> worden geblokkeerd.

**Datastromen (samengevat):**
- **Show-data:** beheerd in Sanity → website leest CDN-cached via `sanityClient`; mutaties (gasten,
  bootleg, ratings) via `sanityWriteClient` met write-token.
- **Huiskamerconcert-funnel:** boeking in Pi-gig-manager → synct naar Sanity → showpagina live →
  gast meldt zich aan (`signup.ts`, e-mail-gate) → Sanity + Listmonk → concert → bootleg-upload
  (iOS Shortcut → `bootleg.ts`) → cron `send-reminder.ts` (09:00 UTC) stuurt herinneringsmail →
  gasten uploaden foto's (`photo.ts`) en beoordelen (`rate.ts`).
- **Meertaligheid:** `middleware.ts` detecteert locale (cookie → Vercel geo-header) en redirect; bots
  worden NOOIT geredirect zodat Google alle taalversies kan crawlen.

## 3. Lokaal draaien

Vereisten: Node.js (Astro 5 / Vite 6 vereisen Node 18+, bij voorkeur 20+), npm.

```bash
npm install
npm run dev       # Astro dev server op http://localhost:4321
npm run build     # productie build → dist/
npm run preview   # preview van de build
```

**Valkuilen:**
- Zonder env-vars draait de UI grotendeels, maar functies die Sanity/Resend/Listmonk raken falen:
  showpagina's, blog-images uit Sanity, alle `/api/*`-endpoints en de nieuwsbrief-/aanmeld-flow.
  Zet minimaal de Sanity-vars (zie sectie 4) om iets zinnigs te zien.
- **Env lokaal binnenhalen vanuit Vercel:** `npx vercel env pull .env` (de echte waarden staan in het
  Vercel-dashboard, niet in git). Zie ook `.env.example` (te genereren / bijwerken) voor de namen.
- De `/api/*`-routes draaien in `astro dev` mee als dev-endpoints. Cron-gedrag (`send-reminder`) test je
  door het endpoint handmatig te GETten met de juiste auth-header (zie sectie 4 / `docs/API-ENDPOINTS.md`).
- De **Listmonk-functies** wijzen naar de productie-Pi (`newsletter.earswantmusic.nl`); lokaal aanmelden
  schrijft dus naar de echte lijst. Wees daar voorzichtig mee bij testen.
- Het `sanity/`-submap is een **apart** Sanity-studio-project met een eigen `package.json` en
  `node_modules`. Verwar het niet met de website-build.

## 4. Configuratie & secrets

Env-vars staan in het **Vercel-projectdashboard** (productie) en lokaal in `.env` (in `.gitignore`,
NIET in git). De repo is public — er staan dus geen credentials in `CLAUDE.md` of dit bestand, alleen de
**namen**. Een ingevuld voorbeeld met alle namen en placeholders staat in `.env.example` (in git).
De echte waarden staan in het Vercel-dashboard en in de privé-`CLAUDE-local.md` van de eigenaar.

| Variabele | Verplicht? | Gebruik |
|-----------|-----------|---------|
| `SANITY_PROJECT_ID` / `PUBLIC_SANITY_PROJECT_ID` | VERPLICHT | Sanity project-id (`q407odag`). Code valt terug van de eerste op de tweede. |
| `SANITY_DATASET` | OPTIONEEL | Sanity dataset; default `production` als leeg. |
| `SANITY_WRITE_TOKEN` | VERPLICHT | Write-token voor mutaties (gasten, bootleg, ratings) via `sanityWriteClient`. |
| `RESEND_API_KEY` | VERPLICHT | Verzenden van e-mails (herinnering, bevestiging, notificaties). |
| `CRON_SECRET` | VERPLICHT | Bearer-/`x-api-key`-auth voor `send-reminder` (cron) + `manage`-endpoint; ook HMAC-seed voor rating-tokens. |
| `BOOTLEG_API_KEY` | VERPLICHT | `x-api-key`-auth voor bootleg-upload (iOS Shortcut) en `bootleg-confirm`. |
| `SERENADE_API_URL` | OPTIONEEL | Base-URL van de externe Serenade-API (`/serenade/[editie]` + `serenade-register.ts`). |
| `PUBLIC_GOOGLE_MAPS_API_KEY` | OPTIONEEL | Google Maps-key op de serenade-editiepagina. |
| `LISTMONK_HK_LIST_ID` | OPTIONEEL | Listmonk lijst-id huiskamer (env aanwezig; meeste paden hardcoden de UUID — zie hieronder). |
| `LISTMONK_URL` / `LISTMONK_USER` / `LISTMONK_PASS` | OPTIONEEL | Listmonk admin-toegang (env aanwezig; niet gebruikt door de actieve newsletter/signup-paden). |
| `SITE_URL` | OPTIONEEL | Basis-URL van de site (lokaal/build-context). |
| `NOTIFY_EMAIL` | OPTIONEEL | Ontvanger van notificatie-mails (staat in Vercel-env). |
| `SUMUP_API_KEY` | OPTIONEEL | SumUp-betaalkoppeling (staat in Vercel-env; TODO: verifieer of nog actief gebruikt). |

> **Belangrijk over Listmonk:** de actieve nieuwsbrief- en aanmeld-endpoints (`newsletter.ts`,
> `subscribe-afas.ts`, `show/signup.ts`, `ShowList.astro`) **hardcoden** de publieke Listmonk-URL
> `https://newsletter.earswantmusic.nl/api/public/subscription` en de lijst-UUID's in de broncode —
> ze lezen die NIET uit env. De `LISTMONK_*`-env-vars bestaan wel maar zijn voor admin-/sync-gebruik.
> Pas je de Listmonk-host of lijst aan, dan moet je dat in de broncode doen, niet alleen in env.
>
> **Naamgevingsdiscrepantie:** in `.env.vercel` staan zowel `LISTMONK_URL/USER/PASS` als
> `LISTMONK_API_URL/API_USER/API_PASS` en `LISTMONK_LIST_UUID`. TODO: verifieer welke set canoniek is —
> de website-broncode gebruikt geen van beide (hardcoded), dus dit zijn waarschijnlijk resten/voor de Pi.

## 5. Deploy & infra

- **Hosting:** Vercel-project gekoppeld aan GitHub-repo `edstruijlaart/edstruijlaart-nl` (public).
  Auto-deploy bij push naar `main`. Geen eigen server voor de website.
- **URL:** https://edstruijlaart.nl (+ `www`-redirect).
- **Branch:** `main` (productie). Preview-URL's verschijnen automatisch bij Pull Requests.
- **Deploy:** `git push origin main` → GitHub → Vercel build (`npm run build` → `dist/`) → live (~paar min).
  Er is **geen** deploy-script (`deploy.sh`) voor de website; deploy gaat puur via git push.
- **Cron:** `vercel.json` registreert één cron: `GET /api/show/send-reminder`, schema `0 9 * * *`
  (09:00 UTC, dagelijks). `CRON_SECRET` moet gezet zijn.
- **Redirects (in `vercel.json`, permanent — NIET verwijderen, SEO):** `/photo→/about`, `/news→/blog`,
  `/huiskamerconcert→/huiskamerconcerten/` (telkens met en zonder trailing slash). `astro.config.mjs`
  dekt soortgelijke gevallen.
- **Security headers:** `vercel.json` zet `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`, plus lange cache op `/fonts/*` en `/_astro/*`.
- **Rollback:** Vercel-dashboard → Deployments → een eerdere goede deploy → "Promote to Production"
  (of `git revert` + push). Geen DB-migraties aan de websitekant, dus rollback is veilig.
- **Env-vars:** alleen via het Vercel-dashboard wijzigen, NOOIT via CLI/code.

**Cold start — vers Vercel-account inrichten (als alles weg is):** (1) repo importeren in Vercel,
framework = Astro. (2) Alle env-vars uit sectie 4 zetten. (3) Sanity-project moet bestaan (`q407odag`,
dataset `production`) met een write-token. (4) Custom domein `edstruijlaart.nl` (+ `www`) koppelen.
(5) De cron uit `vercel.json` wordt automatisch geregistreerd; `CRON_SECRET` moet gezet zijn.
(6) Voor de nieuwsbrief/boekingen moet de Pi (Listmonk + gig-manager) draaien, zie de tweede infra-helft.

**Tweede infra-helft — de Raspberry Pi (gig-manager + Listmonk):**
- **Host:** Raspberry Pi op het thuisnetwerk, `192.168.68.141` (SSH `pi@192.168.68.141`).
- **Gig-manager:** Flask-app in `~/huiskamerconcerten-app/`, draait op poort **5000** als systemd-service
  `huiskamerconcerten.service` (start bij boot). Publiek bereikbaar via Cloudflare-tunnel op
  `boeken.edstruijlaart.nl`. Deploy: `ssh` → `cd ~/huiskamerconcerten-app` → `git pull origin main` →
  `sudo systemctl restart huiskamerconcerten` → `systemctl status huiskamerconcerten` checken.
  Starten met de hand: `source venv/bin/activate && python app.py`.
- **Listmonk:** Docker-containers `listmonk_app` (poort **9000**) + `listmonk_db` (PostgreSQL). Extern via
  Cloudflare-tunnel op `newsletter.earswantmusic.nl`; intern `localhost:9000`. Cloudflare Access blokkeert
  de admin-API van buitenaf → directe queries via `docker exec -it listmonk_db psql -U listmonk -d listmonk`.
  De publieke subscription-API (`/api/public/subscription`) werkt wel altijd via de tunnel.
- **⚠️ De Pi moet AAN staan** voor boekingen en nieuwsbrief-inschrijvingen. De statische website blijft
  altijd online (Vercel), maar de funnel hangt aan de Pi.

> **TODO: verifieer** of de website-repo (`edstruijlaart-nl`) en de gig-manager-repo
> (`~/huiskamerconcerten-app`) dezelfde GitHub-repo delen of twee aparte zijn — de docs verwijzen naar
> `git pull origin main` op de Pi maar noemen geen aparte repo-naam voor de gig-manager.

## 6. Data

Twee databronnen — Sanity (canoniek voor show/content) en de SQLite-DB op de Pi (admin/cache).

- **Sanity (`q407odag` / `production`):** documenttypes `show` (titel, stad, slug, `startDateTime`,
  `status` draft|live|past, bootleg-velden, `reminderSent`/`emailsSent`, `heroImage`, `youtubeVideos`,
  geneste arrays `guestbookEntries[]`, `guestPhotos[]`, `ratings[]`) en `emailSignup` (firstName, email,
  reference naar show, `syncedToListmonk`, `source`). Volledig veldoverzicht: `docs/API-ENDPOINTS.md`.
  Het Sanity-schema zelf staat in het aparte `sanity/`-studio-project (`sanity/schemas/`).
- **Blog:** géén database — markdown content collections in `src/content/news/` (NL) en
  `news-en/ news-es/ news-de/ news-fr/`. Schema in `src/content.config.ts` (title, slug, date,
  featuredImage, excerpt, originalUrl, youtubeId). Featured images in `public/images/news/`. Alle content
  is hersteld uit de oude WordPress-DB (One.com export). De gezaghebbende bron is de codebase zelf.
- **Theateragenda:** `src/data/shows.ts` is de single source of truth voor theatershows. Bandsintown/
  Songkick zijn syndicatie-kanalen, geen bron.
- **Pi SQLite (`~/huiskamerconcerten-app/huiskamerconcerten.db`):** tabellen `bookings` (boekingen met
  status, contactgegevens, `sanity_show_id`, sync-velden) en `timeline_events`. Volledig schema:
  `docs/PI-GIG-MANAGER.md`. Sync is **eenrichting**: Sanity → SQLite. Schrijven naar Sanity gaat via de
  website-API's, nooit direct in SQLite.

**Backup:**
- **Sanity** is gehost bij Sanity (zij beheren de opslag). Geen eigen dump-script in deze repo.
- **Pi SQLite:** cron `0 3 * * *` draait `~/backup-db.sh` (`sqlite3 .backup`, bewaart 30 dagen) naar
  `~/backups/`. Zie `docs/PI-GIG-MANAGER.md` voor het volledige script.

## 7. Huidige staat & bekende problemen

- **Actief in productie** op edstruijlaart.nl. De website-versie (`package.json` 0.0.1) is niet
  betekenisvol; er is geen versie-bump-protocol zoals bij sommige andere projecten van de eigenaar.
- Migratie van WordPress → Astro afgerond (feb 2026), inclusief volledige SEO-opzet: redirects,
  Google Search Console-verificatie (meta tag in `BaseLayout.astro`), JSON-LD (Person + BreadcrumbList
  overal, Service + FAQPage op huiskamerconcerten, BlogPosting per post), sitemap met lastmod.
- Meertaligheid (NL/EN/ES/DE/FR) via eigen middleware + translation files; locale-pagina's in
  `src/pages/{en,es,de,fr}/`. Bots worden niet geredirect (SEO-veilig).
- **Bekende valkuilen / harde regels:**
  - **NOOIT** `/news/[slug]/`-URL's breken — die zijn SEO-geïndexeerd.
  - **NOOIT** de redirects in `vercel.json` verwijderen — Google indexeert de oude WordPress-URL's nog.
  - **NOOIT** credentials in code of `CLAUDE.md` zetten — de repo is public.
  - Bootleg-download: iOS krijgt inline (Safari-keuzemenu), Android+Desktop krijgt `?dl=` (forced
    download). User-Agent regex op `/iPhone|iPad|iPod/i`; een bredere `isMobile`-regex brak Android.
  - Listmonk-host en lijst-UUID's zijn hardcoded in de broncode (zie sectie 4).
  - De Pi moet aan staan voor de boekings-/nieuwsbrieffunnel (sectie 5).
- **TODO: verifieer** de actuele set actieve shows (stond als voorbeeld in `CLAUDE-local.md`: Vlaardingen
  `completed`, Nijkerk/Joel Floor `live`) — die lijst veroudert; Sanity is de bron.
- **TODO: verifieer** of `SUMUP_API_KEY` nog actief gebruikt wordt (staat in Vercel-env, geen referentie
  in de website-broncode gevonden).

## 8. Herbouwen vanaf nul

> **De lat.** Dit dossier maakt het project niet herbouwbaar uit een enkele markdown — de exacte
> pagina-opbouw, e-mail-templates, het wisselende blog-corpus en de Sanity-schema's leven in de code en
> in Sanity, en worden hier bewust niet in proza gedupliceerd (dat zou uit sync lopen). De canonieke bron
> blijft de **GitHub-repo `edstruijlaart/edstruijlaart-nl`** (plus het Sanity-project en de Pi-repo).
> Volledige continuïteit = **git-repo + dit dossier + de env-vars uit het Vercel-dashboard + het
> Sanity-project + de Pi-data**. Dit dossier levert de kennis die niet in de code staat: het waarom, de
> cold-start, de tweedelige infra (Vercel + Pi) en de valkuilen.

1. **Belangrijkste assets = de code (GitHub) + de Sanity-content.** De statische site en alle logica
   staan in de repo; de show-/gasten-/bootleg-data staat in Sanity (door Sanity gehost). Blog-content
   staat als markdown in de repo. Code- of Sanity-verlies is het echte risico.
2. **Reconstrueer de website als Astro 5 (`output: 'static'`) + Vercel-adapter**, met React voor
   interactieve componenten en Tailwind 4 voor styling. Dynamische routes krijgen `export const
   prerender = false`. Meertaligheid via eigen middleware (locale-detectie, bots niet redirecten) — geen
   Astro-i18n routing, want dat genereert ongewenste redirects.
3. **CMS-laag = Sanity.** Lees show-/content-data CDN-cached via een read-client; muteer via een
   write-client met token. Het Sanity-schema staat in het aparte `sanity/`-studio-project.
4. **Serverless-laag = de `api/show/*`-flow** (signup → bootleg → reminder-cron → photo → rate),
   plus `newsletter`, `serenade-register`, `subscribe-afas`, `admin/*` en `health`. Bescherm
   schrijf-/cron-endpoints met `BOOTLEG_API_KEY` / `CRON_SECRET` (zie `docs/API-ENDPOINTS.md`). Houd het
   fire-and-forget-patroon aan zodat notificaties/counters de response niet vertragen.
5. **E-mail = Resend** met retry (3 pogingen, exponential backoff) en de template-bron in
   `src/lib/email-templates.ts`. **Nieuwsbrief = Listmonk** (self-hosted op de Pi); de publieke
   subscription-API is hardcoded in de broncode.
6. **Deploy = Vercel** (push naar `main`). De huiskamerconcert-funnel hangt daarnaast aan de Pi
   (gig-manager Flask :5000 + Listmonk Docker :9000), bereikbaar via Cloudflare-tunnels. Zie
   `docs/PI-GIG-MANAGER.md` voor de volledige Pi-reconstructie (systemd-service, SQLite-schema,
   backup-script, Listmonk-lijsten).

**Verdieping (in `docs/`):** `API-ENDPOINTS.md` (alle endpoints, auth, schema's), `PI-GIG-MANAGER.md`
(Pi-setup, DB-schema, cron, Listmonk), `EMAIL-FLOWS.md` (e-mail-templates en triggers), `DECISIONS.md`
(ontwerpbeslissingen + waarom), `BRAND.md` (kleuren, fonts, design tokens).
