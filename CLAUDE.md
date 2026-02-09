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
│   │   └── ...
│   ├── components/      # Astro + React componenten
│   ├── layouts/         # Base layouts
│   ├── lib/             # Sanity client, email templates, utils
│   └── styles/          # Tailwind + custom CSS
├── public/              # Statische assets
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

## Belangrijke Regels

1. **NOOIT** `/news/[slug]/` URLs breken — SEO geindexeerd
2. **Nederlands** voor alle UI-tekst
3. **Mobile-first** altijd
4. **Sanity** is single source of truth voor show data
5. **Geen credentials** in code of CLAUDE.md (repo is public!)
6. Alle env vars via Vercel dashboard

## Relatie met Andere Projecten

- **Sanity CMS**: Deelt content met Gig Manager op Pi
- **Listmonk**: Newsletter integratie (Pi Docker)
- **Resend**: Transactionele emails
- **Gig Manager (Pi)**: Beheert shows, synct naar Sanity

## Verdieping

Zie `docs/` map voor gedetailleerde documentatie per onderdeel.
