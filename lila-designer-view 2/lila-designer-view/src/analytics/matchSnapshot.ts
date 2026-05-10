import type { MapMiniConfig } from '../mapConfig'
import type { GameEvent } from '../types'
import {
  ANALYSIS_GRID,
  accumulateSpatial,
  maxCell,
  percentilePositive,
  sectorLabel,
} from './spatialGrid'

export interface MatchSnapshot {
  humanPlayers: number
  botPlayers: number
  kills: number
  deaths: number
  stormDeaths: number
  loot: number
  durationMs: number
  mostActiveZone: string
  mostDangerousZone: string
  highestTrafficZone: string
  deadMask: Uint8Array
  chokeMask: Uint8Array
}

function uniqueParticipants(events: GameEvent[], bot: boolean): number {
  const s = new Set<string>()
  for (const e of events) {
    if (e.isBot !== bot) continue
    s.add(e.user_id)
  }
  return s.size
}

export function buildMatchSnapshot(
  events: GameEvent[],
  tCut: number,
  mapCfg: MapMiniConfig,
  grid: number = ANALYSIS_GRID,
): MatchSnapshot {
  const slice = events.filter((e) => e.tMs <= tCut)
  let kills = 0
  let deaths = 0
  let stormDeaths = 0
  let loot = 0
  let tMin = 0
  let tMax = 1
  for (const e of slice) {
    if (e.event === 'Kill' || e.event === 'BotKill') kills += 1
    if (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm') deaths += 1
    if (e.event === 'KilledByStorm') stormDeaths += 1
    if (e.event === 'Loot') loot += 1
    tMin = Math.min(tMin, e.tMs)
    tMax = Math.max(tMax, e.tMs)
  }
  if (tMax <= tMin) tMax = tMin + 1

  const grids = accumulateSpatial(slice, tCut, mapCfg, grid)
  const trafficT = percentilePositive(grids.traffic, 0.75)
  const killT = percentilePositive(grids.kills, 0.7)
  const trafficLow = percentilePositive(grids.traffic, 0.2)

  const topTraffic = maxCell(grids.traffic, grid)
  const topKills = maxCell(grids.kills, grid)

  const deadMask = new Uint8Array(grid * grid)
  const chokeMask = new Uint8Array(grid * grid)
  for (let i = 0; i < grid * grid; i++) {
    const tr = grids.traffic[i]!
    const k = grids.kills[i]!
    if (tr > 0 && tr <= trafficLow) deadMask[i] = 1
    if (tr >= trafficT && k >= killT && trafficT > 0 && killT > 0) chokeMask[i] = 1
  }

  return {
    humanPlayers: uniqueParticipants(slice, false),
    botPlayers: uniqueParticipants(slice, true),
    kills,
    deaths,
    stormDeaths,
    loot,
    durationMs: tMax - tMin,
    mostActiveZone: sectorLabel(topTraffic.gx, topTraffic.gy, grid),
    mostDangerousZone: sectorLabel(topKills.gx, topKills.gy, grid),
    highestTrafficZone: sectorLabel(topTraffic.gx, topTraffic.gy, grid),
    deadMask,
    chokeMask,
  }
}
