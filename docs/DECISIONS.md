# Ontwerpbeslissingen

Chronologisch log van belangrijke technische keuzes en waarom.

---

## 2026-02 — Bootleg download: iOS inline vs Android/Desktop forced download

**Probleem**: Sanity CDN stuurt `content-disposition: inline` voor m4a bestanden. Dit werkt prima op iOS (Safari toont luister/download keuzemenu), maar Samsung Android Chrome probeert 365MB inline te streamen en faalt.

**Beslissing**: User-Agent detection op `/iPhone|iPad|iPod/i`:
- **iOS**: Redirect naar CDN URL zonder `?dl=` → Safari keuzemenu
- **Android + Desktop**: Redirect met `?dl=filename` → Sanity forceert `content-disposition: attachment`

**Eerder geprobeerd**: `isMobile` regex die ook Android matchte → dan kreeg Android ook inline, wat niet werkte.

**Bestand**: `bootleg-download.ts`

---

## 2026-02 — Download tracker: 302 redirect ipv bevestigingspagina

**Probleem**: Moeten we na klik op "Download" eerst een pagina tonen, of direct redirecten?

**Beslissing**: Direct 302 redirect naar CDN. Geen tussenpagina.

**Reden**: Een tussenpagina zou de huidige werkende flow kunnen breken. iOS en Android gedragen zich anders bij downloads; de 302 redirect is bewezen werkend. Een extra pagina introduceert complexiteit zonder duidelijk voordeel.

---

## 2026-02 — Late signup: direct mail sturen

**Probleem**: Wanneer iemand zich aanmeldt nadat de cron al heeft gedraaid, krijgt die persoon geen herinneringsmail.

**Beslissing**: In `signup.ts` checken of `show.reminderSent === true`. Zo ja: meteen `sendLateSignupReminder()` aanroepen met dezelfde `buildReminderEmail()` template.

**Alternatief overwogen**: Aparte cron die late signups checkt → te complex, onnodige vertraging.

---

## 2026-02 — Rating via links ipv formulier

**Probleem**: Post-show feedback verzamelen van gasten.

**Beslissing**: 5 emoji-links in de email, elk met `?r=1` t/m `?r=5`. Klik opent GET endpoint die rating opslaat en bedankpagina toont.

**Reden**: Geen JavaScript nodig, werkt in elke email client, zero friction voor de gast. Rating wordt opgeslagen als array in het Sanity show document.

---

## 2026-02 — Fire-and-forget patroon

**Probleem**: Notificatie-emails en counter-updates mogen de response niet vertragen.

**Beslissing**: Alle niet-kritieke operaties als `.catch(console.error)` achter een Promise:
```typescript
notifyPhotoUpload(showId, uploadedBy, message, asset).catch(console.error);
```

**Toegepast bij**: Photo notificatie, Listmonk sync, bootleg download counter, late signup reminder emailsSent increment.

---

## 2026-02 — Gastenboek entries auto-approved

**Beslissing**: `approved: true` bij aanmaak. Geen moderatie-queue.

**Reden**: MVP. Huiskamerconcerten zijn intieme events met bekende gasten. Spam-risico is minimaal. Kan later aangepast worden als nodig.

---

## 2026-02 — Sanity als single source of truth

**Beslissing**: Alle show-data (status, bootleg, ratings, gasten) zit in Sanity. Pi database is een sync/cache.

**Reden**: Website leest direct uit Sanity (CDN-cached). Pi gig-manager is een admin tool voor Ed. Eenrichtings-sync: Sanity → SQLite.

---

## 2026-02 — Listmonk op Pi via Docker

**Beslissing**: Listmonk draait lokaal op de Pi, exposed via Cloudflare tunnel.

**Reden**: Gratis, geen vendor lock-in, Ed heeft controle over subscriber data. Cloudflare Access beschermt de admin interface.

**Nadeel**: Pi moet aan staan voor newsletter-functionaliteit. Publieke subscription API werkt wel altijd (Cloudflare tunnel).
