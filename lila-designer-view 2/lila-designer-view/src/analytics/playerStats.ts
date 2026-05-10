import type { GameEvent } from '../types'

export interface PlayerFocusStats {
  userId: string
  isBot: boolean
  kills: number
  deaths: number
  loot: number
  tFirst: number
  tLast: number
  pathSamples: number
}

export function computePlayerStats(events: GameEvent[], tCut: number, userId: string): PlayerFocusStats | null {
  const mine = events.filter((e) => e.user_id === userId && e.tMs <= tCut)
  if (!mine.length) return null
  let kills = 0
  let deaths = 0
  let loot = 0
  let pathSamples = 0
  let tFirst = mine[0]!.tMs
  let tLast = mine[0]!.tMs
  for (const e of mine) {
    tFirst = Math.min(tFirst, e.tMs)
    tLast = Math.max(tLast, e.tMs)
    if (e.event === 'Kill' || e.event === 'BotKill') kills += 1
    if (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm') deaths += 1
    if (e.event === 'Loot') loot += 1
    if (e.event === 'Position' || e.event === 'BotPosition') pathSamples += 1
  }
  return {
    userId,
    isBot: mine[0]!.isBot,
    kills,
    deaths,
    loot,
    tFirst,
    tLast,
    pathSamples,
  }
}

export function listParticipantIds(events: GameEvent[], tCut: number): string[] {
  const s = new Set<string>()
  for (const e of events) {
    if (e.tMs <= tCut) s.add(e.user_id)
  }
  return [...s].sort()
}
