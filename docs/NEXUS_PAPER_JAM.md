# Paper Jam — Bioelectricity Nexus integration

Paper Jam is a community reading-list and seminar module built on the Library of Things stack (pseudonymous library cards, Postgres, Next.js). It is designed to integrate with [Bioelectricity Nexus](https://bioelectricitynexus.com).

## Enable locally

```bash
# .env.local
NEXT_PUBLIC_PAPER_JAM_ENABLED=true
NEXT_PUBLIC_NEXUS_SITE_URL=https://bioelectricitynexus.com

pnpm db:ensure-schema
pnpm dev
```

Open `/paper-jam`.

## What it does

| Feature | Description |
|---------|-------------|
| **Reading list** | Members add papers they plan to read (`planned`, `reading`, `completed`). |
| **Paper Jam sessions** | Host a group read or seminar around one or more papers — virtual, in person, or async. |
| **Join & collaborate** | Others join a session; participant list links to profiles. |
| **Popular papers** | Surfaces papers on multiple reading lists (social signal for Nexus). |

## Nexus deep links

From a Nexus paper page, link into this app with query params:

```
https://your-lot-host/paper-jam/new?doi=10.1234/example&title=Paper+Title&authors=Smith+et+al.&url=https://...&nexus_id=nexus-paper-123
```

| Param | Purpose |
|-------|---------|
| `doi` | Dedupes papers; links to doi.org |
| `title` | Required display title |
| `authors` | Optional |
| `url` | Optional landing page (PMC, publisher, etc.) |
| `nexus_id` | Stored as `papers.external_id` for cross-site reference |
| `jam=1` | Opens form in “Start a seminar jam” mode |

Reading-list only (default): omit `jam` or use `jam=0`.

## Public API (embed on Nexus)

**GET `/api/paper-jam`** — upcoming sessions + popular reading-list papers.

**GET `/api/paper-jam/sessions/{id}`** — single session with papers and participants.

CORS is allowed for requests from `NEXT_PUBLIC_NEXUS_SITE_URL` (for browser embeds).

Example embed fetch from Nexus:

```javascript
const res = await fetch("https://your-lot-host/api/paper-jam")
const { sessions, popular_papers } = await res.json()
```

Authenticated actions (library card session cookie):

- `POST /api/paper-jam/queue` — add to reading list
- `POST /api/paper-jam/sessions` — create jam
- `POST /api/paper-jam/sessions/{id}/join` — join jam

## Suggested Nexus UI

Add **Community → Paper Jam** on bioelectricitynexus.com pointing to this app, or embed the public API in a card grid. On each paper detail page:

- **Add to reading list** → deep link above
- **Start a Paper Jam** → same link with `&jam=1`

## Data model

- `papers` — catalog entries (DOI-unique when present)
- `reading_queue` — per-user queue
- `paper_jam_sessions` — seminars
- `paper_jam_session_papers` — papers covered
- `paper_jam_participants` — hosts and joiners

Auth reuses existing `lot_session` library-card cookies; no separate Nexus SSO yet.

## Future integration

- Shared sign-in with Nexus `/auth`
- Pull metadata from Nexus paper API instead of manual fields
- Discussion threads per jam (today: join list + optional meeting URL)
- Calendar export (.ics) for scheduled jams
