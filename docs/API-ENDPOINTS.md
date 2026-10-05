# API Endpoints

Alle endpoints draaien als Vercel Serverless Functions via Astro (`export const prerender = false`).

## Authenticatie

| Methode | Gebruikt door | Header |
|---------|---------------|--------|
| BOOTLEG_API_KEY | iOS Shortcut, handmatig triggeren | `x-api-key: {key}` |
| CRON_SECRET | Vercel cron, manage endpoint | `Authorization: Bearer {key}` of `x-api-key: {key}` |
| Geen auth | Publieke endpoints (signup, guestbook, photo, rate) | — |
| Persoonlijke HMAC-link (CRON_SECRET) | bootleg-download (`s` + `t`), moderate (`t`) | in de URL |

Alle sleutels worden in constante tijd vergeleken (`geheimKlopt` in `src/lib/show-veiligheid.ts`);
staat het geheim niet in env, dan is het antwoord altijd 401.

**Sanity lezen**: `sanityClient` gebruikt server-side `SANITY_READ_TOKEN` als die gezet is (nodig zodra
de dataset privé is), met `perspective: 'published'`. Geen enkele browsercode praat rechtstreeks met de
Sanity-API; alleen afbeeldingen komen van `cdn.sanity.io` (assets blijven publiek op URL).

---

## POST /api/show/signup

**Doel**: Gast meldt zich aan voor een show (email-gate op showpagina).

**Body (JSON)**:
```json
{
  "showId": "Sanity _id",
  "firstName": "Naam",
  "email": "email@example.com",
  "message": "Optioneel gastenboekbericht (max 280 tekens)",
  "website": "", // honeypot, moet leeg zijn
  "t": 1760000000000 // laadtoken: moment waarop de pagina laadde (botfilter)
}
```

**Wat het doet** (beveiligd tegen misbruik als mailrelay, audit okt 2026):
1. Valideert input + botfilter (`src/lib/botfilter.ts`: honeypot, laadtoken, wegwerpdomein). Bot = stil 200.
2. Alleen voor een bestaande show met `status != "archived"`, en alleen van een kwartier voor de aanvang
   tot 24,5 uur erna (zelfde venster als het formulier op de pagina). Anders 404/403.
3. Eén aanmelding per show en e-mailadres (kleine letters). Bestaat hij al: geen nieuw document, geen
   Listmonk, geen mail.
4. Maakt `emailSignup` document in Sanity (source `email-gate`)
5. Als er een `message` is: gastenboek-entry (zonder mailadres) + moderatiemail naar Ed
6. Synct email naar Listmonk (HK lijst, fire-and-forget)
7. **Als show.reminderSent = true én de aanvang > 12 uur geleden**: claimt de aanmelding
   (`reminderSentAt`) en stuurt direct de herinneringsmail (late signup)
8. Returned `{ success: true, download }`: `download` is de persoonlijke bootleg-downloadlink die de
   pagina in localStorage bewaart

**Bestand**: `src/pages/api/show/signup.ts`

---

## POST /api/show/bootleg

**Doel**: Bootleg-opname koppelen aan actieve show.

**Auth**: `x-api-key: BOOTLEG_API_KEY`

**Twee modes**:
- **Mode 1** (FormData): Audio bestand direct meegegeven (kleine bestanden <4.5MB)
- **Mode 2** (JSON): `{ audioUrl: "https://cdn.sanity.io/..." }` — URL van al geupload bestand

**Wat het doet**:
1. Zoekt actieve show (status="live", startDateTime < now)
2. Upload bestand naar Sanity assets (mode 1) of gebruikt meegegeven URL (mode 2)
3. Zet `bootlegUrl` en `bootlegExpiresAt` (+30 dagen) op show document
4. Returned show city + URL

**Bestand**: `src/pages/api/show/bootleg.ts`

---

## POST /api/show/bootleg-confirm

**Doel**: Stuurt bevestigingsmail naar Ed na succesvolle bootleg upload.

**Auth**: `x-api-key: BOOTLEG_API_KEY`

**Body (JSON)**:
```json
{
  "city": "Vlaardingen",
  "fileSize": "365.2 MB",
  "audioUrl": "https://cdn.sanity.io/..."
}
```

**Bestand**: `src/pages/api/show/bootleg-confirm.ts`

---

## GET /api/show/bootleg-download

**Doel**: Download tracker voor bootleg-opnames. Telt downloads en redirect naar CDN.

**Query params**: `?show={showId}&s={emailSignup _id}&t={HMAC}` (persoonlijke link uit de herinneringsmail
of de signup-response). Zonder geldige link, of als de aanmelding is verwijderd: 403-pagina.

**Logica**:
0. Controleert `t` = HMAC(CRON_SECRET, `bootleg:{show}:{s}`) en of de aanmelding nog bestaat
1. Haalt show op uit Sanity
2. Check of bootleg bestaat en niet verlopen is
3. Increment `bootlegDownloads` counter (fire-and-forget)
4. **iOS** (iPhone/iPad/iPod): redirect naar CDN URL zonder `?dl=` → Safari toont luister/download keuze
5. **Android + Desktop**: redirect met `?dl=filename` → forceert download
6. **Verlopen**: toont branded HTML pagina (410 status) met expiry datum en contact-info
7. **Geen bootleg**: toont "niet beschikbaar" pagina (404 status)

**Bestand**: `src/pages/api/show/bootleg-download.ts`

---

## GET /api/show/send-reminder

**Doel**: Vercel Cron endpoint — stuurt herinneringsmails na shows.

**Auth**: `Authorization: Bearer CRON_SECRET` of `x-api-key: BOOTLEG_API_KEY`

**Cron**: Elke dag 09:00 UTC (`vercel.json`)

**Logica**:
1. Zoekt shows met `status != "archived"`, `reminderSent != true` EN `startDateTime` 12-96 uur geleden
   (vers via de write-client, geen CDN)
2. Haalt emailSignups op per show
3. Ontdubbelt op e-mailadres (ook tegen eerdere rondes); dubbele aanmeldingen krijgen
   `reminderSentAt` + `reminderDubbel: true` en geen mail
4. Claimt elke aanmelding vóór het versturen (`reminderSentAt`, met ifRevisionID). Is hij al geclaimd
   (dubbele cron, gelijktijdige late signup), dan wordt hij overgeslagen. Mislukt het versturen, dan
   gaat de claim terug.
5. Stuurt per subscriber een herinneringsmail via Resend
   - Met retry (3 pogingen); de wachttijd gaat alleen omhoog bij een echte 429
   - Rating HMAC token en persoonlijke bootleg-link per subscriber
6. Zet show op `reminderSent: true`, `status: "past"`, incrementeert `emailsSent` via `.inc()`
7. Stuurt samenvattingsmail naar Ed met resultaten (namen en adressen ge-escaped)

**Listmonk-inhaalronde**: alleen `source == "email-gate"`. Ticket Tailor-kopers krijgen wel de
herinneringsmail, maar komen niet op de nieuwsbrief.

**Email bevat** (via `buildReminderEmail()`):
- Bootleg download link (als beschikbaar)
- Spotify playlist link
- YouTube video (configureerbaar per show, default: luchtballon video)
- Gastenboek/showpagina link
- Rating emoji's (1-5 schaal)
- CTA: Boek een huiskamerconcert

**Bestand**: `src/pages/api/show/send-reminder.ts`

---

## GET /api/show/rate

**Doel**: Post-show rating via link in herinneringsmail.

**Query params**: `?show={slug}&r={1-5}&t={token}`

**Token**: Optioneel HMAC token voor deduplicatie. Gegenereerd per subscriber in herinneringsmail (`generateRatingToken(slug, email, CRON_SECRET)`).

**Logica**:
1. Valideert slug en rating (1-5)
2. Zoekt show op slug
3. **Met token**: checkt of rating met dit token al bestaat → skip (dedup). Slaat op met `verified: true`.
4. **Zonder token**: altijd opslaan met `verified: false` (backwards-compatibel met oude emails)
5. Toont branded bedankpagina met emoji (altijd, ook bij dedup)

**Emoji mapping**: 1=😐, 2=🙂, 3=😊, 4=😍, 5=🤩

**Bestand**: `src/pages/api/show/rate.ts`

---

## POST /api/show/guestbook

**Doel**: Gastenboek-bericht toevoegen (na email-gate).

**Body (JSON)**:
```json
{
  "showId": "Sanity _id",
  "name": "Naam",
  "message": "Bericht (max 280 tekens)",
  "honeypot": "" // moet leeg zijn, anti-spam
}
```

**Logica**:
1. Honeypot check (gevuld = silent 200, geen data)
2. Valideert showId: bestaande show, niet gearchiveerd, aanvang geweest
3. Append gastenboek-entry aan show (`approved` = true, of false met `SHOW_MODERATIE=vooraf`)
4. Moderatiemail naar Ed met knop "Verbergen"/"Tonen" (zie `/api/show/moderate`)
5. Returned `{ success: true, zichtbaar }`

**Bestand**: `src/pages/api/show/guestbook.ts`

---

## POST /api/show/photo

**Doel**: Gastenfoto uploaden naar show.

**Body (FormData)**:
- `showId` — Sanity show _id
- `uploadedBy` — Naam (default: "Anoniem")
- `message` — Optioneel bericht (max 280 tekens)
- `photo` — Afbeelding (max 10MB, alleen image/*)

**Wat het doet**:
1. Honeypot check (gevuld = silent 200, geen data)
2. Valideert showId: bestaande show, niet gearchiveerd, aanvang geweest
3. Valideert bestandsgrootte en type
4. Upload naar Sanity assets
5. Voegt toe aan `show.guestPhotos[]` (`approved` zoals bij guestbook)
6. Stuurt notificatie-email naar Ed (fire-and-forget) met foto preview, ge-escaped, met verbergknop

**Bestand**: `src/pages/api/show/photo.ts`

---

## DELETE /api/show/manage

**Doel**: Beheer gastenboek-berichten en foto's (verwijderen).

**Auth**: `x-api-key: CRON_SECRET`

**Body (JSON)**:
```json
{
  "showId": "Sanity _id",
  "type": "guestbook | photo",
  "key": "_key van het item (alfanumeriek, max 10 chars)"
}
```

**Validatie**: `key` moet matchen `/^[a-z0-9]{1,10}$/`, `showId` moet matchen `/^[a-zA-Z0-9._-]+$/` (voorkomt GROQ injection).

**Bestand**: `src/pages/api/show/manage.ts`

---

## GET/POST /api/show/moderate

**Doel**: Eén gastenboekbericht of foto verbergen of tonen, via de knop in Eds notificatiemail.

**Auth**: `t` = HMAC(CRON_SECRET, `moderatie:{show}:{type}:{key}`), geldt alleen voor dat ene item.

- **GET** `?show=&type=guestbook|photo&key=&t=` → bevestigingspagina, wijzigt niets (linkscanners in de
  mailbox kunnen er veilig op klikken)
- **POST** dezelfde velden + `actie=verbergen|tonen` → zet `approved` op false/true (terug te draaien)

Moderatie-instelling: standaard achteraf (meteen zichtbaar, Ed kan verbergen). `SHOW_MODERATIE=vooraf`
in Vercel: alles komt binnen als `approved: false` en Ed zet het online via dezelfde knop.

**Bestand**: `src/pages/api/show/moderate.ts` (+ `src/lib/show-moderatie.ts`)

---

## GET /api/health

**Doel**: Health check voor monitoring (bijv. UptimeRobot). Geen auth nodig.

**Checkt**:
1. Sanity CMS bereikbaar (tel shows)
2. Resend API key aanwezig
3. CRON_SECRET aanwezig

**Response**: `200` (alles ok) of `503` (iets mis)
```json
{
  "status": "healthy",
  "timestamp": "2026-03-13T10:00:00.000Z",
  "checks": {
    "sanity": { "ok": true, "message": "12 shows" },
    "resend": { "ok": true, "message": "Key present" },
    "cronSecret": { "ok": true, "message": "Key present" }
  }
}
```

**Bestand**: `src/pages/api/health.ts`

---

## POST /api/newsletter

**Doel**: Nieuwsbrief-inschrijving via website footer/formulier.

**Body (JSON)**:
```json
{
  "email": "email@example.com",
  "name": "Optioneel"
}
```

**Synct naar**: Listmonk "Ed Struijlaart Nieuwsbrief" lijst (UUID `681b5ef7-...6cc8`)

**Bestand**: `src/pages/api/newsletter.ts`

---

## Sanity Show Document Schema

Relevante velden op het `show` document type:

```
show {
  _id, _type: "show"
  title, city, hostName, hostEmail
  bookingReference?: string   // gezet door de Gig Manager; koppeling aan precies één boeking
  slug: { current: string }
  startDateTime: datetime
  status: "draft" | "live" | "past" | "archived"   // archived = 404, cron slaat over
  ticketUrl?: string
  // privateAddress: vervallen (okt 2026), wordt niet meer geschreven en is leeggemaakt

  // Bootleg
  bootlegUrl?: string
  bootlegExpiresAt?: datetime
  bootlegFileSize?: string
  bootlegDownloads?: number

  // Email
  reminderSent?: boolean
  emailsSent?: number

  // Media
  heroImage?: image
  youtubeVideos?: [{ url: string }]

  // Gasten
  guestbookEntries?: [{ _key, name, message, approved, submittedAt }]   // geen mailadres meer
  guestPhotos?: [{ _key, image, uploadedBy, message, approved, uploadedAt }]
  ratings?: [{ _key, rating: 1-5, ratedAt, token?: string, verified: boolean }]
}
```

## Sanity EmailSignup Document

```
emailSignup {
  _id, _type: "emailSignup"
  firstName, email
  show: reference → show
  signedUpAt: datetime
  syncedToListmonk: boolean
  source: "email-gate" | "ticket-tailor"   // alleen email-gate gaat naar de nieuwsbrief
  reminderSentAt?: datetime                // herinneringsmail geclaimd/verstuurd (per gast)
  reminderDubbel?: boolean                 // zelfde adres al eerder aangemeld voor deze show
}
```
