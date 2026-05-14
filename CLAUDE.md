# edstruijlaart.nl — Website

> ⚠️ Deze repo is PUBLIC op GitHub (Vercel free tier). Geen credentials in dit bestand!
> Volledige context met credentials staat in `CLAUDE-local.md` (zelfde map, in .gitignore).

## Wat is dit?

Persoonlijke website van Ed Struijlaart — singer-songwriter, theatermaker en podcastmaker.
Bevat: shows, muziek, podcasts, blog, huiskamerconcerten boekingssysteem, bootleg downloads.

## Tech Stack

| Component | Technologie |
|-----------|-------------|
| Framework | Astro |
| Styling | Tailwind CSS |
| CMS | Sanity (headless) |
| Hosting | Vercel (auto-deploy bij git push) |
| Email | Resend |
| Newsletter | Listmonk (op Raspberry Pi) |
| Fonts | DM Serif Display + DM Sans (self-hosted) |

## Projectstructuur

```
edstruijlaart-nl/
├── src/
│   ├── pages/           # Alle pagina's + API endpoints
│   │   ├── api/show/    # Huiskamerconcerten API's
│   │   ├── news/[slug]  # Blog posts (SEO: NOOIT breken!)
│   │   ├── blog.astro   # Blog listing met featured images
│   │   └── ...
│   ├── content/
│   │   └── news/        # 71 markdown blog posts (content collection)
│   ├── components/      # Astro + React componenten
│   ├── layouts/         # BaseLayout (GSC, Person schema, OG)
│   ├── lib/             # Sanity client, email templates, utils
│   └── styles/          # Tailwind + custom CSS
├── public/
│   └── images/news/     # 67 featured images (max 1200px, ~36MB)
├── docs/                # Verdiepingsdocumentatie
│   ├── API-ENDPOINTS.md
│   ├── PI-GIG-MANAGER.md
│   ├── EMAIL-FLOWS.md
│   ├── DECISIONS.md
│   └── BRAND.md
└── vercel.json          # Redirects + cron config
```

## Starten

```bash
npm install
npm run dev    # localhost:4321
```

Environment variables nodig in `.env` (zie Vercel dashboard voor waarden).

## Deployment

```
git push origin main → GitHub → Vercel auto-build → edstruijlaart.nl
```

Preview URLs beschikbaar bij Pull Requests.

## Brand

- **Kleuren**: Donker thema (#0F0F0F) met goud accent (#B8860B)
- **Fonts**: DM Serif Display (headings), DM Sans (body)
- **Vibe**: Warm, persoonlijk, premium muzikant-gevoel

## SEO & Structured Data (feb 2026)

Na WordPress → Astro migratie is de SEO volledig opgezet:

**Redirects:**
- `vercel.json` + `astro.config.mjs`: `/huiskamerconcert` → `/huiskamerconcerten/`, `/news` → `/blog`, `/photo` → `/about`

**Google Search Console:** Geverifieerd via meta tag in `BaseLayout.astro`

**JSON-LD Structured Data:**
- `BaseLayout.astro`: Person schema + BreadcrumbList (alle pagina's)
- `huiskamerconcerten.astro`: Service + FAQPage (5 vragen)
- `news/[slug].astro`: BlogPosting (per post, met image + excerpt)

**Blog (71 posts):**
- Content collection in `src/content/news/*.md`
- Schema: title, slug, date, featuredImage, excerpt, originalUrl (`src/content.config.ts`)
- Featured images in `public/images/news/` (67 bestanden, max 1200px)
- Blog listing (`/blog`): featured cards met afbeeldingen
- Blog post (`/news/[slug]`): featured image + OG tags + BlogPosting JSON-LD
- Alle content hersteld uit WordPress DB (One.com export)

**Sitemap:** Met lastmod via serialize function

## Belangrijke Regels

1. **NOOIT** `/news/[slug]/` URLs breken — SEO geindexeerd
2. **NOOIT** redirects in `vercel.json` verwijderen — Google indexeert oude URLs
3. **Nederlands** voor alle UI-tekst
4. **Mobile-first** altijd
5. **`src/data/shows.ts`** is single source of truth voor de agenda (theatershows). Bandsintown/Songkick zijn syndicatie-kanalen, geen bron.
6. **Geen credentials** in code of CLAUDE.md (repo is public!)
7. Alle env vars via Vercel dashboard

## Relatie met Andere Projecten

- **Sanity CMS**: Deelt content met Gig Manager op Pi
- **Listmonk**: Newsletter integratie (Pi Docker)
- **Resend**: Transactionele emails
- **Gig Manager (Pi)**: Beheert shows, synct naar Sanity

## Verdieping

Zie `docs/` map voor gedetailleerde documentatie per onderdeel.
