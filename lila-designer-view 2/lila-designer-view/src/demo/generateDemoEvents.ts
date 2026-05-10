import type { GameEvent } from '../types'
import { normalizeMatchTimes } from '../parquet/parseRows'

/**
 * Deterministic sample match on Ambrose Valley so the tool is usable before loading real parquet.
 * Coordinates follow README world→minimap example region.
 */
export function generateDemoEvents(): GameEvent[] {
  const matchId = 'demo-match-00000000-0000-4000-8000-000000000001.nakama-0'
  const human = 'f4e072fa-b7af-4761-b567-1d95b7ad0108'
  const bot = '1440'
  const map_id = 'AmbroseValley'
  const rows: GameEvent[] = []
  let t = 1_800_000_000_000 // epoch-like ms (arbitrary); normalized later

  const pathHuman = [
    { x: -301, z: -355 },
    { x: -280, z: -340 },
    { x: -250, z: -320 },
    { x: -220, z: -300 },
    { x: -200, z: -280 },
  ]
  const pathBot = [
    { x: -290, z: -350 },
    { x: -270, z: -330 },
    { x: -240, z: -310 },
  ]

  for (let i = 0; i < pathHuman.length; i++) {
    const p = pathHuman[i]!
    t += 800
    rows.push({
      user_id: human,
      match_id: matchId,
      map_id,
      x: p.x,
      y: 120,
      z: p.z,
      ts: t,
      tMs: 0,
      event: 'Position',
      isBot: false,
      sourceDay: 'February_10',
    })
  }

  for (let i = 0; i < pathBot.length; i++) {
    const p = pathBot[i]!
    t += 600
    rows.push({
      user_id: bot,
      match_id: matchId,
      map_id,
      x: p.x,
      y: 119,
      z: p.z,
      ts: t,
      tMs: 0,
      event: 'BotPosition',
      isBot: true,
      sourceDay: 'February_10',
    })
  }

  t += 1200
  rows.push({
    user_id: human,
    match_id: matchId,
    map_id,
    x: -215,
    y: 121,
    z: -295,
    ts: t,
    tMs: 0,
    event: 'BotKill',
    isBot: false,
    sourceDay: 'February_10',
  })
  t += 500
  rows.push({
    user_id: human,
    match_id: matchId,
    map_id,
    x: -218,
    y: 121,
    z: -298,
    ts: t,
    tMs: 0,
    event: 'Loot',
    isBot: false,
    sourceDay: 'February_10',
  })
  t += 2000
  rows.push({
    user_id: human,
    match_id: matchId,
    map_id,
    x: -205,
    y: 122,
    z: -275,
    ts: t,
    tMs: 0,
    event: 'Killed',
    isBot: false,
    sourceDay: 'February_10',
  })
  t += 400
  rows.push({
    user_id: human,
    match_id: matchId,
    map_id,
    x: -208,
    y: 121,
    z: -278,
    ts: t,
    tMs: 0,
    event: 'BotKilled',
    isBot: false,
    sourceDay: 'February_10',
  })
  t += 3000
  rows.push({
    user_id: human,
    match_id: matchId,
    map_id,
    x: -180,
    y: 125,
    z: -250,
    ts: t,
    tMs: 0,
    event: 'KilledByStorm',
    isBot: false,
    sourceDay: 'February_10',
  })

  return normalizeMatchTimes(rows)
}
