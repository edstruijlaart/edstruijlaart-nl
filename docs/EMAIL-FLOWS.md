# Email Flows

Alle emails worden verstuurd via **Resend** (API key in Vercel env).
Afzender: `Ed Struijlaart <ed@edstruijlaart.nl>`

## 1. Herinneringsmail (automatisch)

**Trigger**: Vercel Cron, elke dag 09:00 UTC
**Endpoint**: `GET /api/show/send-reminder`
**Bestand**: `src/pages/api/show/send-reminder.ts` + `src/lib/email-templates.ts`

**Voorwaarden**:
- Show `reminderSent != true`
- Show `startDateTime` 12-48 uur geleden
- Minstens 1 emailSignup gekoppeld aan show

**Ontvangers**: Alle emailSignups voor de show
**BCC**: edstruijlaart@gmail.com

**Inhoud** (via `buildReminderEmail()`):
1. Header met "Ed Struijlaart / Huiskamerconcert"
2. Hero image (als beschikbaar, Sanity asset met `?w=600&q=80`)
3. Persoonlijke begroeting: "Hey {firstName}"
4. **Bootleg sectie** (alleen als bootlegUrl bestaat):
   - Download knop → `/api/show/bootleg-download?show={showId}`
   - Verloopdatum
5. **Spotify sectie**: Link naar Ed's playlist
6. **Video sectie**: YouTube thumbnail + link (configureerbaar, default: luchtballon video `GBx2WfYluWE`)
7. **Gastenboek sectie**: Link naar showpagina
8. **Rating sectie**: 5 emoji's (😐🙂😊😍🤩) → elk linkt naar `/api/show/rate?show={slug}&r={1-5}`
9. CTA: "Boek een huiskamerconcert" → boeken.edstruijlaart.nl
10. Footer met uitleg + link naar edstruijlaart.nl

**Na verzending**:
- Show krijgt `reminderSent: true`, `status: "past"`, `emailsSent: {count}`
- Ed ontvangt samenvattingsmail met resultaten per show

**Retry**: 3 pogingen per mail, exponential backoff (1s→2s→4s), rate limit detection

---

## 2. Late Signup Reminder (automatisch)

**Trigger**: Wanneer iemand zich aanmeldt op een show waar `reminderSent = true`
**Endpoint**: `POST /api/show/signup` → `sendLateSignupReminder()`
**Bestand**: `src/pages/api/show/signup.ts`

**Identiek aan** herinneringsmail, maar:
- Alleen verzonden aan de nieuwe aanmelder
- Wordt meteen verstuurd (niet via cron)
- Increment `emailsSent` counter op show

---

## 3. Bootleg Upload Bevestiging (automatisch)

**Trigger**: iOS Shortcut roept endpoint aan na succesvolle upload
**Endpoint**: `POST /api/show/bootleg-confirm`
**Bestand**: `src/pages/api/show/bootleg-confirm.ts`

**Ontvanger**: edstruijlaart@gmail.com
**Inhoud**: Stad, bestandsgrootte, upload tijdstip, directe link, "verloopt over 30 dagen"

---

## 4. Foto Upload Notificatie (automatisch)

**Trigger**: Gast uploadt foto op showpagina
**Endpoint**: `POST /api/show/photo` → `notifyPhotoUpload()`
**Bestand**: `src/pages/api/show/photo.ts`

**Ontvanger**: edstruijlaart@gmail.com
**Inhoud**: Naam uploader, bericht (als gegeven), foto preview (400px breed), link naar showpagina

---

## 5. Cron Samenvatting (automatisch)

**Trigger**: Na afronding van send-reminder cron
**Bestand**: `src/pages/api/show/send-reminder.ts`

**Ontvanger**: edstruijlaart@gmail.com
**Inhoud**: Per show: aantal mails verstuurd, eventuele fouten
**Subject**: "✅ Herinneringsmails: X verstuurd" of "⚠️ ... X mislukt"

---

## Email Template Structuur

De template in `email-templates.ts` gebruikt inline CSS (geen externe stylesheets — email clients ondersteunen dat niet).

**Design tokens in email**:
- Achtergrond: `#0F0F0F`
- Tekst: `#F0EDE8`
- Goud accent: `#B8860B` / `#D4A843`
- Muted tekst: `#9B9B9B`
- Surface: `#1A1A1A`
- Spotify groen: `#1DB954`
- Max breedte: 600px
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Heading font: `Georgia, 'Times New Roman', serif`

**Configureerbare parameters**:
```typescript
interface ReminderMailData {
  firstName: string;
  city: string;
  hostName?: string;
  bootlegUrl?: string;
  bootlegExpiresAt?: string;
  showSlug: string;
  showId?: string;
  youtubeVideoId?: string;    // Default: 'GBx2WfYluWE'
  heroImageUrl?: string;
}
```

**Constanten**:
```typescript
const SITE_URL = 'https://edstruijlaart.nl';
const BOOKING_URL = 'https://boeken.edstruijlaart.nl';
const SPOTIFY_URL = 'https://open.spotify.com/playlist/5ZoRiQK1FP8OXrKRuPp56J';
```
