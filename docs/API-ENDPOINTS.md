# API Endpoints

Alle endpoints draaien als Vercel Serverless Functions via Astro (`export const prerender = false`).

## Authenticatie

| Methode | Gebruikt door | Header |
|---------|---------------|--------|
| BOOTLEG_API_KEY | iOS Shortcut, handmatig triggeren | `x-api-key: {key}` |
| CRON_SECRET | Vercel cron, manage endpoint | `Authorization: Bearer {key}` of `x-api-key: {key}` |
| Geen auth | Publieke endpoints (signup, guestbook, photo, rate) | — |

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
  "honeypot": "" // moet leeg zijn, anti-spam
}
```

**Wat het doet**:
1. Valideert input + honeypot check
2. Maakt `emailSignup` document in Sanity
3. Als er een `message` is: voegt gastenboek-entry toe aan show
4. Synct email naar Listmonk (HK lijst, fire-and-forget)
5. **Als show.reminderSent = true**: stuurt direct volledige herinneringsmail (late signup)
6. Returned `{ success: true }`

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

**Query params**: `?show={showId}`

**Logica**:
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
1. Zoekt shows met `reminderSent != true` EN `startDateTime` 12-48 uur geleden
2. Haalt emailSignups op per show
3. Stuurt per subscriber een herinneringsmail via Resend
   - Met retry (3 pogingen, exponential backoff 1s→2s→4s, max 5s)
   - Rate limit detection
4. Zet show op `reminderSent: true`, `status: "past"`, `emailsSent: {count}`
5. Stuurt samenvattingsmail naar Ed met resultaten

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

**Query params**: `?show={slug}&r={1-5}`

**Logica**:
1. Valideert slug en rating (1-5)
2. Zoekt show op slug
3. Append rating object aan `show.ratings[]` array in Sanity
4. Toont branded bedankpagina met emoji

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
  "message": "Bericht (max 280 tekens)"
}
```

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
1. Valideert bestandsgrootte en type
2. Upload naar Sanity assets
3. Voegt toe aan `show.guestPhotos[]`
4. Stuurt notificatie-email naar Ed (fire-and-forget) met foto preview

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
  "key": "_key van het item"
}
```

**Bestand**: `src/pages/api/show/manage.ts`

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
  title, city, hostName
  slug: { current: string }
  startDateTime: datetime
  status: "draft" | "live" | "past"
  ticketUrl?: string

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
  guestbookEntries?: [{ _key, name, email, message, approved, submittedAt }]
  guestPhotos?: [{ _key, image, uploadedBy, message, approved, uploadedAt }]
  ratings?: [{ _key, rating: 1-5, ratedAt }]
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
  source: "email-gate"
}
```
