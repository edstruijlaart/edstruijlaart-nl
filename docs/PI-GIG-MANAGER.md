# Raspberry Pi — Gig Manager

## Verbinding

```
SSH:  pi@192.168.68.141
Web:  http://192.168.68.141:5000
```

De Pi staat op Ed's thuisnetwerk. Bereikbaar via lokaal WiFi.

## Gig Manager App

**Pad**: `~/huiskamerconcerten-app/`

**Bestanden**:
```
huiskamerconcerten-app/
├── app.py                  # Flask web app (port 5000)
├── sanity_sync.py          # Sanity ↔ SQLite synchronisatie
├── huiskamerconcerten.db   # SQLite database
├── templates/
│   └── index.html          # Dashboard (single-page, alles in 1 bestand)
├── .env                    # Lokale environment variabelen
└── venv/                   # Python virtual environment
```

**Starten**:
```bash
cd ~/huiskamerconcerten-app
source venv/bin/activate
python app.py
```

De app draait als systemd service (`huiskamerconcerten.service`), start automatisch bij boot.

## Database Schema (SQLite)

### Tabel: bookings
```sql
bookings (
  id INTEGER PRIMARY KEY,
  reference TEXT UNIQUE,        -- "HK-XXXXXX"
  status TEXT,                  -- "nieuw", "bevestigd", "betaald", "afgerond"
  name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  preferred_date TEXT,          -- "2026-04-18"
  guest_count INTEGER,
  message TEXT,
  invoice_sent BOOLEAN DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  sanity_show_id TEXT,          -- Gekoppeld Sanity show document _id
  -- Sanity sync velden:
  bootleg_downloads INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  reminder_sent BOOLEAN DEFAULT 0
)
```

### Tabel: timeline_events
```sql
timeline_events (
  id INTEGER PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  event_type TEXT,              -- "created", "status_change", "note", "email_sent"
  description TEXT,
  created_at DATETIME
)
```

## Sanity Sync

**Bestand**: `sanity_sync.py`

De sync haalt data uit Sanity en slaat het op in de lokale SQLite database.

**GROQ query haalt op**:
```
*[_type == "show"] {
  _id, city, slug, startDateTime, status,
  bootlegUrl, bootlegExpiresAt, bootlegDownloads,
  reminderSent, emailsSent,
  "heroImageUrl": heroImage.asset->url
}
```

Wordt getriggerd vanuit de gig-manager web UI.

## Dashboard Features

Het dashboard (`templates/index.html`) toont:

- **Actieve boekingen** met status-badges
- **Tijdlijn per boeking** met events (aangemaakt, statuswijzigingen, notities)
- **Afgeronde boekingen** met:
  - Optreden datum (uit `preferred_date`)
  - Bootleg download counter
  - Email verzonden indicator (aantal + paars icoon)
  - "Optreden succesvol afgerond" met ster-icoon
- **Factuur checkbox** per boeking
- **Sanity sync knop**

## Cron Jobs op Pi

```cron
# Dagelijkse database backup om 03:00
0 3 * * * /home/pi/backup-db.sh >> /home/pi/backups/backup.log 2>&1
```

### backup-db.sh
```bash
#!/bin/bash
BACKUP_DIR="/home/pi/backups"
DB_PATH="/home/pi/huiskamerconcerten-app/huiskamerconcerten.db"
DATE=$(date +%Y%m%d)
BACKUP_FILE="${BACKUP_DIR}/huiskamerconcerten-${DATE}.db"

# SQLite safe backup (werkt ook tijdens writes)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Verwijder backups ouder dan 30 dagen
find "$BACKUP_DIR" -name 'huiskamerconcerten-*.db' -mtime +30 -delete
```

## Docker Services op Pi

### Listmonk (Newsletter)

```
Container: listmonk_app (port 9000)
Database:  listmonk_db (PostgreSQL)
```

**Toegang**:
- Extern via Cloudflare tunnel: `newsletter.earswantmusic.nl`
- Intern: `localhost:9000`
- Admin: `admin` / `[wachtwoord in 1Password/lokaal — NOOIT in git]`

**Belangrijk**: Cloudflare Access blokkeert de admin API van buitenaf. Voor directe database queries:
```bash
docker exec -it listmonk_db psql -U listmonk -d listmonk -c "SELECT ..."
```

### Lijsten

| Lijst | list_id | UUID | Doel |
|-------|---------|------|------|
| Huiskamer op locatie | 12 | `ebeb2dbf-bec2-4256-9952-329bb030d734` | Gasten van huiskamerconcerten |
| Ed Struijlaart Nieuwsbrief | ? | `681b5ef7-29cc-4be5-a0c7-6d8453f26cc8` | Algemene nieuwsbrief |

### Publieke subscription API
```
POST https://newsletter.earswantmusic.nl/api/public/subscription
Content-Type: application/json

{
  "email": "...",
  "name": "...",
  "list_uuids": ["ebeb2dbf-bec2-4256-9952-329bb030d734"]
}
```

## Bekende Aandachtspunten

- Pi is alleen bereikbaar op lokaal netwerk (geen remote access)
- Listmonk admin API geblokkeerd door Cloudflare Access → gebruik Docker exec of publieke API
- SQLite database heeft geen concurrent write support → altijd 1 process tegelijk
- Sanity sync is one-way: Sanity → SQLite (write naar Sanity gaat via website API's)
