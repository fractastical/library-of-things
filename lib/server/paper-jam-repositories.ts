import "server-only"

import type {
  Paper,
  PaperJamParticipant,
  PaperJamSession,
  ReadingQueueItem,
  ReadingQueueStatus,
} from "@/lib/types"
import { normalizeDoi } from "@/lib/doi-utils"
import { resilientConnect, resilientQuery } from "@/lib/server/db"

type DbPaper = Omit<Paper, "created_at"> & { created_at: string | Date }
type DbQueue = Omit<ReadingQueueItem, "created_at" | "paper"> & {
  created_at: string | Date
}
type DbSession = Omit<
  PaperJamSession,
  "created_at" | "scheduled_at" | "papers" | "participant_count" | "participants"
> & {
  created_at: string | Date
  scheduled_at?: string | Date | null
}

function asIso(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined
  return new Date(value).toISOString()
}

function mapPaper(row: DbPaper): Paper {
  return {
    ...row,
    doi: row.doi ?? undefined,
    external_id: row.external_id ?? undefined,
    authors: row.authors ?? undefined,
    abstract: row.abstract ?? undefined,
    url: row.url ?? undefined,
    added_by_user_id: row.added_by_user_id ?? undefined,
    added_by_display_name: row.added_by_display_name ?? undefined,
    created_at: asIso(row.created_at)!,
  }
}

function mapSession(row: DbSession): PaperJamSession {
  return {
    ...row,
    description: row.description ?? undefined,
    host_display_name: row.host_display_name ?? undefined,
    scheduled_at: asIso(row.scheduled_at),
    location_text: row.location_text ?? undefined,
    meeting_url: row.meeting_url ?? undefined,
    created_at: asIso(row.created_at)!,
  }
}

async function attachPapersToSessions(sessions: PaperJamSession[]): Promise<PaperJamSession[]> {
  if (sessions.length === 0) return sessions
  const ids = sessions.map((s) => s.id)
  const { rows } = await resilientQuery<{ session_id: string } & DbPaper>(
    `select sp.session_id, p.*
     from paper_jam_session_papers sp
     join papers p on p.id = sp.paper_id
     where sp.session_id = any($1::text[])
     order by p.title asc`,
    [ids]
  )
  const bySession = new Map<string, Paper[]>()
  for (const row of rows) {
    const { session_id, ...paperRow } = row
    const list = bySession.get(session_id) ?? []
    list.push(mapPaper(paperRow as DbPaper))
    bySession.set(session_id, list)
  }
  return sessions.map((s) => ({ ...s, papers: bySession.get(s.id) ?? [] }))
}

async function attachParticipantCounts(sessions: PaperJamSession[]): Promise<PaperJamSession[]> {
  if (sessions.length === 0) return sessions
  const ids = sessions.map((s) => s.id)
  const { rows } = await resilientQuery<{ session_id: string; count: string }>(
    `select session_id, count(*)::text as count
     from paper_jam_participants
     where session_id = any($1::text[])
     group by session_id`,
    [ids]
  )
  const counts = new Map(rows.map((r) => [r.session_id, Number(r.count)]))
  return sessions.map((s) => ({ ...s, participant_count: counts.get(s.id) ?? 0 }))
}

export async function listPaperJamSessions(options?: {
  status?: PaperJamSession["status"][]
  limit?: number
}): Promise<PaperJamSession[]> {
  const statuses = options?.status ?? ["open", "scheduled"]
  const limit = options?.limit ?? 50
  const { rows } = await resilientQuery<DbSession>(
    `select * from paper_jam_sessions
     where status = any($1::text[])
     order by scheduled_at asc nulls last, created_at desc
     limit $2`,
    [statuses, limit]
  )
  let sessions = rows.map(mapSession)
  sessions = await attachParticipantCounts(sessions)
  sessions = await attachPapersToSessions(sessions)
  return sessions
}

export async function getPaperJamSession(id: string): Promise<PaperJamSession | null> {
  const { rows } = await resilientQuery<DbSession>(
    "select * from paper_jam_sessions where id = $1",
    [id]
  )
  if (!rows[0]) return null
  let [session] = await attachParticipantCounts([mapSession(rows[0])])
  ;[session] = await attachPapersToSessions([session])

  const { rows: participants } = await resilientQuery<
    Omit<PaperJamParticipant, "joined_at"> & { joined_at: string | Date }
  >(
    `select session_id, user_id, user_display_name, role, joined_at
     from paper_jam_participants
     where session_id = $1
     order by joined_at asc`,
    [id]
  )
  session.participants = participants.map((p) => ({
    ...p,
    user_display_name: p.user_display_name ?? undefined,
    joined_at: asIso(p.joined_at)!,
  }))
  return session
}

export async function findOrCreatePaper(input: {
  title: string
  doi?: string | null
  external_id?: string | null
  authors?: string | null
  abstract?: string | null
  url?: string | null
  added_by_user_id?: string | null
  added_by_display_name?: string | null
}): Promise<Paper> {
  const doi = input.doi ? normalizeDoi(input.doi) : null
  if (doi) {
    const existing = await resilientQuery<DbPaper>("select * from papers where doi = $1", [doi])
    if (existing.rows[0]) return mapPaper(existing.rows[0])
  }
  if (input.external_id) {
    const existing = await resilientQuery<DbPaper>(
      "select * from papers where external_id = $1",
      [input.external_id]
    )
    if (existing.rows[0]) return mapPaper(existing.rows[0])
  }

  const id = crypto.randomUUID()
  const client = await resilientConnect()
  try {
    await client.query("begin")
    const { rows } = await client.query<DbPaper>(
      `insert into papers (id, doi, external_id, title, authors, abstract, url, added_by_user_id, added_by_display_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning *`,
      [
        id,
        doi,
        input.external_id?.trim() || null,
        input.title.trim(),
        input.authors?.trim() || null,
        input.abstract?.trim() || null,
        input.url?.trim() || null,
        input.added_by_user_id ?? null,
        input.added_by_display_name ?? null,
      ]
    )
    await client.query("commit")
    return mapPaper(rows[0])
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

export async function addToReadingQueue(input: {
  user_id: string
  paper_id: string
  status?: ReadingQueueStatus
  notes?: string | null
}): Promise<ReadingQueueItem> {
  const id = crypto.randomUUID()
  const status = input.status ?? "planned"
  const client = await resilientConnect()
  try {
    await client.query("begin")
    const { rows } = await client.query<DbQueue>(
      `insert into reading_queue (id, user_id, paper_id, status, notes)
       values ($1, $2, $3, $4, $5)
       on conflict (user_id, paper_id) do update
         set status = excluded.status,
             notes = coalesce(excluded.notes, reading_queue.notes)
       returning *`,
      [id, input.user_id, input.paper_id, status, input.notes?.trim() || null]
    )
    await client.query("commit")
    const item = rows[0]
    const paperRows = await resilientQuery<DbPaper>("select * from papers where id = $1", [
      input.paper_id,
    ])
    return {
      id: item.id,
      user_id: item.user_id,
      paper_id: item.paper_id,
      status: item.status as ReadingQueueStatus,
      notes: item.notes ?? undefined,
      created_at: asIso(item.created_at)!,
      paper: paperRows.rows[0] ? mapPaper(paperRows.rows[0]) : undefined,
    }
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

export async function listReadingQueue(userId: string): Promise<ReadingQueueItem[]> {
  const { rows: queueRows } = await resilientQuery<DbQueue>(
    `select * from reading_queue
     where user_id = $1
     order by created_at desc`,
    [userId]
  )
  if (queueRows.length === 0) return []

  const paperIds = queueRows.map((r) => r.paper_id)
  const { rows: paperRows } = await resilientQuery<DbPaper>(
    "select * from papers where id = any($1::text[])",
    [paperIds]
  )
  const papersById = new Map(paperRows.map((p) => [p.id, mapPaper(p)]))

  return queueRows.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    paper_id: item.paper_id,
    status: item.status as ReadingQueueStatus,
    notes: item.notes ?? undefined,
    created_at: asIso(item.created_at)!,
    paper: papersById.get(item.paper_id),
  }))
}

export async function updateReadingQueueStatus(input: {
  queue_id: string
  user_id: string
  status: ReadingQueueStatus
}): Promise<ReadingQueueItem | null> {
  const { rows } = await resilientQuery<DbQueue>(
    `update reading_queue
     set status = $3
     where id = $1 and user_id = $2
     returning *`,
    [input.queue_id, input.user_id, input.status]
  )
  if (!rows[0]) return null
  const item = rows[0]
  const paperRows = await resilientQuery<DbPaper>("select * from papers where id = $1", [
    item.paper_id,
  ])
  return {
    id: item.id,
    user_id: item.user_id,
    paper_id: item.paper_id,
    status: item.status as ReadingQueueStatus,
    notes: item.notes ?? undefined,
    created_at: asIso(item.created_at)!,
    paper: paperRows.rows[0] ? mapPaper(paperRows.rows[0]) : undefined,
  }
}

export async function listPopularReadingPapers(limit = 10): Promise<
  Array<Paper & { queue_count: number }>
> {
  const { rows } = await resilientQuery<DbPaper & { queue_count: string }>(
    `select p.*, count(rq.id)::text as queue_count
     from papers p
     join reading_queue rq on rq.paper_id = p.id and rq.status in ('planned','reading')
     group by p.id
     order by count(rq.id) desc, p.created_at desc
     limit $1`,
    [limit]
  )
  return rows.map((row) => ({
    ...mapPaper(row),
    queue_count: Number(row.queue_count),
  }))
}

export async function getPaperById(id: string): Promise<Paper | null> {
  const { rows } = await resilientQuery<DbPaper>("select * from papers where id = $1", [id])
  return rows[0] ? mapPaper(rows[0]) : null
}

export async function getPaperReaders(paperId: string) {
  const { rows } = await resilientQuery<{
    user_id: string
    display_name: string
    status: string
    profile_public: boolean
  }>(
    `select u.id as user_id,
            case when u.profile_public then u.display_name else 'Anonymous' end as display_name,
            rq.status,
            u.profile_public
     from reading_queue rq
     join users u on u.id = rq.user_id
     where rq.paper_id = $1
     order by case rq.status when 'reading' then 0 when 'planned' then 1 when 'completed' then 2 end,
              rq.created_at desc`,
    [paperId]
  )
  return rows.map((r) => ({
    user_id: r.user_id,
    display_name: r.display_name,
    status: r.status as ReadingQueueStatus,
    profile_public: r.profile_public,
  }))
}

export async function getPaperQueueCount(paperId: string): Promise<number> {
  const { rows } = await resilientQuery<{ count: string }>(
    `select count(*)::text as count from reading_queue
     where paper_id = $1 and status in ('planned', 'reading')`,
    [paperId]
  )
  return Number(rows[0]?.count ?? 0)
}

export async function getPaperFinishedCount(paperId: string): Promise<number> {
  const { rows } = await resilientQuery<{ count: string }>(
    `select count(*)::text as count from reading_queue
     where paper_id = $1 and status = 'completed'`,
    [paperId]
  )
  return Number(rows[0]?.count ?? 0)
}

export async function listSessionsForPaper(paperId: string): Promise<PaperJamSession[]> {
  const { rows } = await resilientQuery<{ session_id: string }>(
    `select session_id from paper_jam_session_papers where paper_id = $1`,
    [paperId]
  )
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.session_id)
  const { rows: sessions } = await resilientQuery<DbSession>(
    `select * from paper_jam_sessions
     where id = any($1::text[]) and status in ('open', 'scheduled')
     order by scheduled_at asc nulls last`,
    [ids]
  )
  let result = sessions.map(mapSession)
  result = await attachParticipantCounts(result)
  result = await attachPapersToSessions(result)
  return result
}

export async function createPaperJamSession(input: {
  title: string
  description?: string | null
  host_user_id: string
  host_display_name?: string | null
  scheduled_at?: string | null
  format: PaperJamSession["format"]
  location_text?: string | null
  meeting_url?: string | null
  paper_ids: string[]
}): Promise<PaperJamSession> {
  if (input.paper_ids.length === 0) {
    throw new Error("At least one paper is required for a Paper Jam session")
  }
  const id = crypto.randomUUID()
  const status: PaperJamSession["status"] = input.scheduled_at ? "scheduled" : "open"
  const client = await resilientConnect()
  try {
    await client.query("begin")
    await client.query<DbSession>(
      `insert into paper_jam_sessions
         (id, title, description, host_user_id, host_display_name, scheduled_at, format, location_text, meeting_url, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        input.title.trim(),
        input.description?.trim() || null,
        input.host_user_id,
        input.host_display_name?.trim() || null,
        input.scheduled_at || null,
        input.format,
        input.location_text?.trim() || null,
        input.meeting_url?.trim() || null,
        status,
      ]
    )
    for (const paperId of input.paper_ids) {
      await client.query(
        "insert into paper_jam_session_papers (session_id, paper_id) values ($1, $2)",
        [id, paperId]
      )
    }
    await client.query(
      `insert into paper_jam_participants (session_id, user_id, user_display_name, role)
       values ($1, $2, $3, 'host')`,
      [id, input.host_user_id, input.host_display_name?.trim() || null]
    )
    await client.query("commit")
    const session = await getPaperJamSession(id)
    return session!
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

export async function joinPaperJamSession(input: {
  session_id: string
  user_id: string
  user_display_name?: string | null
}): Promise<PaperJamParticipant> {
  const client = await resilientConnect()
  try {
    await client.query("begin")
    const { rows } = await client.query<
      Omit<PaperJamParticipant, "joined_at"> & { joined_at: string | Date }
    >(
      `insert into paper_jam_participants (session_id, user_id, user_display_name, role)
       values ($1, $2, $3, 'participant')
       on conflict (session_id, user_id) do update
         set user_display_name = coalesce(excluded.user_display_name, paper_jam_participants.user_display_name)
       returning *`,
      [input.session_id, input.user_id, input.user_display_name?.trim() || null]
    )
    await client.query("commit")
    const row = rows[0]
    return {
      session_id: row.session_id,
      user_id: row.user_id,
      user_display_name: row.user_display_name ?? undefined,
      role: row.role,
      joined_at: asIso(row.joined_at)!,
    }
  } catch (err) {
    await client.query("rollback")
    throw err
  } finally {
    client.release()
  }
}

export async function updatePaperJamSession(input: {
  session_id: string
  host_user_id: string
  title?: string
  description?: string | null
  scheduled_at?: string | null
  format?: PaperJamSession["format"]
  location_text?: string | null
  meeting_url?: string | null
  status?: PaperJamSession["status"]
}): Promise<PaperJamSession | null> {
  const existing = await getPaperJamSession(input.session_id)
  if (!existing || existing.host_user_id !== input.host_user_id) return null

  const title = input.title?.trim() ?? existing.title
  const description =
    input.description !== undefined ? input.description?.trim() || null : existing.description ?? null
  const scheduledAt =
    input.scheduled_at !== undefined ? input.scheduled_at || null : existing.scheduled_at ?? null
  const format = input.format ?? existing.format
  const locationText =
    input.location_text !== undefined
      ? input.location_text?.trim() || null
      : existing.location_text ?? null
  const meetingUrl =
    input.meeting_url !== undefined
      ? input.meeting_url?.trim() || null
      : existing.meeting_url ?? null

  let status = input.status ?? existing.status
  if (status === "open" || status === "scheduled") {
    status = scheduledAt ? "scheduled" : "open"
  }

  await resilientQuery(
    `update paper_jam_sessions
     set title = $2, description = $3, scheduled_at = $4, format = $5,
         location_text = $6, meeting_url = $7, status = $8
     where id = $1 and host_user_id = $9`,
    [
      input.session_id,
      title,
      description,
      scheduledAt,
      format,
      locationText,
      meetingUrl,
      status,
      input.host_user_id,
    ]
  )
  return getPaperJamSession(input.session_id)
}

/** Sessions the user has joined that are still open or scheduled. */
export async function listUserActivePaperJamSessions(userId: string): Promise<PaperJamSession[]> {
  const { rows } = await resilientQuery<{ session_id: string }>(
    `select s.id as session_id
     from paper_jam_sessions s
     inner join paper_jam_participants p on p.session_id = s.id and p.user_id = $1
     where s.status in ('open', 'scheduled')
     order by s.scheduled_at asc nulls last`,
    [userId]
  )
  if (rows.length === 0) return []
  const sessions: PaperJamSession[] = []
  for (const row of rows) {
    const session = await getPaperJamSession(row.session_id)
    if (session) sessions.push(session)
  }
  return sessions
}
