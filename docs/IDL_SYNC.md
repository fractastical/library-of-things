# Paper Jam → IDL sync

Pull your Paper Jam **reading list** and **active seminar jams** into a **`Paper Jam`** category in [fractastical/idl](https://github.com/fractastical/idl).

## Setup

### 1. Paper Jam app (library-of-things)

```bash
# .env.local
NEXT_PUBLIC_PAPER_JAM_ENABLED=true
PAPER_JAM_IDL_SYNC_SECRET=your-long-random-secret
PAPER_JAM_IDL_SYNC_USER_ID=<your library card user uuid>
```

Find your user id: log in, open `/profile/<id>` or inspect bootstrap after login.

### 2. IDL repo

```bash
# In idl repo root (where todo_list.json lives)
export PAPER_JAM_BASE_URL=https://your-paper-jam-host
export PAPER_JAM_IDL_SYNC_SECRET=your-long-random-secret
export IDL_PAPER_JAM_CATEGORY="Paper Jam"   # optional, default shown

python paper_jam_sync.py
```

Or add to `~/.zshrc` / cron for periodic sync.

## Cron (macOS / Linux)

From the idl repo root, make the helper executable once:

```bash
chmod +x scripts/paper-jam-idl-sync.sh
cp scripts/env.paper-jam.example .env.paper-jam
# edit .env.paper-jam with your URL and secret
```

**Every hour** (logs to `~/Library/Logs/paper-jam-idl.log` on Mac):

```cron
0 * * * * /Users/you/Documents/GitHub/idl/scripts/paper-jam-idl-sync.sh >> ~/Library/Logs/paper-jam-idl.log 2>&1
```

Edit crontab:

```bash
crontab -e
```

**Every 30 minutes** during work hours (example):

```cron
*/30 9-18 * * 1-5 /Users/you/Documents/GitHub/idl/scripts/paper-jam-idl-sync.sh >> ~/Library/Logs/paper-jam-idl.log 2>&1
```

The script loads `.env.paper-jam` from the idl repo root automatically.

## What sync does

| Paper Jam | IDL category task |
|-----------|-------------------|
| Reading list (`planned`) | Open task — `Read: Title — Authors` |
| Reading list (`reading`) | Task **in progress** |
| Reading list (`completed`) | Task marked **completed** |
| Joined jams (open/scheduled) | `Jam: Session title (date)` |

Tasks are matched by stable `paper_jam_ref` (`reading:<queueId>` or `jam:<sessionId>`) so re-running sync updates instead of duplicating.

Removed queue items are marked completed in IDL if they disappear from the export.

## API

**GET `/api/paper-jam/idl/export`**

- Cookie: `lot_session` (browser)
- Or header: `Authorization: Bearer <PAPER_JAM_IDL_SYNC_SECRET>` with `PAPER_JAM_IDL_SYNC_USER_ID` set server-side

Optional query: `?category=Paper Jam`

## IDL todo fields added

```json
{
  "task": "Read: Electrical stimulation…",
  "paper_jam_ref": "reading:abc-123",
  "paper_jam_url": "https://doi.org/…",
  "paper_jam_kind": "reading"
}
```

These extra keys are ignored by the standard idl CLI but used by `paper_jam_sync.py`.
