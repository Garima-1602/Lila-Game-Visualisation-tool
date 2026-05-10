import type { EventKind, GameEvent, RawGameRow } from '../types'
import { MOVEMENT_EVENTS } from '../types'

const KNOWN_EVENTS = new Set<string>([
  'Position',
  'BotPosition',
  'Kill',
  'Killed',
  'BotKill',
  'BotKilled',
  'KilledByStorm',
  'Loot',
])

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** README: numeric user_id = bot; UUID = human */
export function isBotUserId(userId: string): boolean {
  if (/^\d+$/.test(userId)) return true
  if (UUID_RE.test(userId)) return false
  // Fallback: treat non-UUID as bot-ish (AI id strings)
  return !UUID_RE.test(userId)
}

export function decodeEventField(ev: unknown): EventKind | null {
  if (ev == null) return null
  if (typeof ev === 'string') return ev as EventKind
  if (ev instanceof Uint8Array) {
    return new TextDecoder('utf-8').decode(ev) as EventKind
  }
  if (ArrayBuffer.isView(ev)) {
    return new TextDecoder('utf-8').decode(new Uint8Array(ev.buffer, ev.byteOffset, ev.byteLength)) as EventKind
  }
  return String(ev) as EventKind
}

function toNumber(n: unknown): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n
  if (typeof n === 'bigint') return Number(n)
  const x = Number(n)
  return Number.isFinite(x) ? x : 0
}

/** Parquet timestamps may surface as Date or bigint ms */
export function rowTimestampMs(ts: unknown): number {
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'bigint') return Number(ts)
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts
  return 0
}

export function rowToRawGameRow(row: Record<string, unknown>): RawGameRow | null {
  const user_id = row.user_id != null ? String(row.user_id) : ''
  const match_id = row.match_id != null ? String(row.match_id) : ''
  const map_id = row.map_id != null ? String(row.map_id) : ''
  const event = decodeEventField(row.event)
  if (!user_id || !match_id || !map_id || !event) return null
  if (!KNOWN_EVENTS.has(event)) return null

  return {
    user_id,
    match_id,
    map_id,
    x: toNumber(row.x),
    y: toNumber(row.y),
    z: toNumber(row.z),
    ts: rowTimestampMs(row.ts),
    event,
  }
}

export function normalizeMatchTimes(events: GameEvent[]): GameEvent[] {
  if (!events.length) return events
  const byMatch = new Map<string, GameEvent[]>()
  for (const e of events) {
    const list = byMatch.get(e.match_id)
    if (list) list.push(e)
    else byMatch.set(e.match_id, [e])
  }
  const out: GameEvent[] = []
  for (const [, list] of byMatch) {
    let min = Infinity
    for (const e of list) min = Math.min(min, e.ts)
    if (!Number.isFinite(min)) min = 0
    for (const e of list) {
      out.push({ ...e, tMs: e.ts - min })
    }
  }
  return out
}

export function rawRowsToGameEvents(rows: Record<string, unknown>[]): GameEvent[] {
  const raw: RawGameRow[] = []
  for (const row of rows) {
    const r = rowToRawGameRow(row)
    if (r) raw.push(r)
  }
  const game: GameEvent[] = raw.map((r) => ({
    ...r,
    tMs: 0,
    isBot: isBotUserId(r.user_id),
  }))
  return normalizeMatchTimes(game)
}

export function isMovementEvent(e: EventKind): boolean {
  return (MOVEMENT_EVENTS as readonly string[]).includes(e)
}
