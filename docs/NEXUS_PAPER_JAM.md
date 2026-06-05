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
| **Paper detail** | `/paper-jam/paper/[id]` — reader count, who’s reading (with profile links), jams on this paper. |
| **Reading status** | My queue: toggle Planned → Reading → Done (`PATCH /api/paper-jam/queue/[id]`). |
| **Calendar export** | Download `.ics` from session page (`GET /api/paper-jam/sessions/[id]/calendar`). |
| **Host controls** | Edit session details; mark complete or cancel (`PATCH /api/paper-jam/sessions/[id]`, host only). |

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

## Nexus feed picker (in-app)

Paper Jam proxies the Bioelectricity Nexus papers API so members can search and pick without leaving the app:

**GET `/api/paper-jam/nexus/papers`** — server proxy to `{NEXUS_SITE_URL}/api/papers`

| Param | Maps to Nexus |
|-------|----------------|
| `q` | Full-text search |
| `source` | `arxiv`, `pubmed`, `levin-blog` |
| `member` | Filter by network member name |
| `id` | Single paper by Nexus UUID |
| `limit`, `offset` | Pagination (max 50) |

The **Add paper** flow (`/paper-jam/new`) embeds a searchable picker; selecting a row fills title, authors, DOI, URL, abstract, and stores Nexus `id` as `external_id`.

Deep link with only Nexus id (Nexus site can link with):

```
/paper-jam/new?nexus_id=f0d722de-...&jam=1
```

The form fetches metadata via `GET /api/paper-jam/nexus/papers?id=...`.

## IDL sync (fractastical/idl)

Reading list + active jams export as a **`Paper Jam`** subcategory in [idl](https://github.com/fractastical/idl). See **`docs/IDL_SYNC.md`**.

**GET `/api/paper-jam/idl/export`** — IDL-shaped payload; auth via session cookie or `Authorization: Bearer` + `PAPER_JAM_IDL_SYNC_SECRET`.

## Public API (embed on Nexus)

**GET `/api/paper-jam`** — upcoming sessions + popular reading-list papers.

**GET `/api/paper-jam/sessions/{id}`** — single session with papers and participants.

**GET `/api/paper-jam/papers/{id}`** — paper + readers + queue count + related jams.

**GET `/api/paper-jam/sessions/{id}/calendar`** — `.ics` download for the session.

**PATCH `/api/paper-jam/queue/{id}`** — update reading status (auth, own queue only).

**PATCH `/api/paper-jam/sessions/{id}`** — host edit or cancel/complete (auth).

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
