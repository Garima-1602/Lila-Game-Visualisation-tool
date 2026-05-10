import type { MatchSnapshot } from './matchSnapshot'
import type { GameEvent } from '../types'
import { ANALYSIS_GRID, accumulateSpatial, maxCell, sectorLabel } from './spatialGrid'
import type { MapMiniConfig } from '../mapConfig'

export interface InsightCard {
  title: string
  detail: string
  recommendation?: string
}

export function buildInsightCards(
  snap: MatchSnapshot,
  events: GameEvent[],
  tCut: number,
  mapCfg: MapMiniConfig,
): InsightCard[] {
  const cards: InsightCard[] = []
  const slice = events.filter((e) => e.tMs <= tCut)
  const grids = accumulateSpatial(slice, tCut, mapCfg, ANALYSIS_GRID)

  if (snap.kills > 0 && snap.deaths > 0) {
    const ratio = snap.kills / (snap.kills + snap.deaths)
    cards.push({
      title: 'Combat pace',
      detail: `${Math.round(ratio * 100)}% kills vs deaths in this view.`,
      recommendation:
        ratio > 0.65
          ? 'Lots of clean kills — check loot / respawn so hot zones stay fun.'
          : 'More trades than finishes — check cover and sightlines in contested areas.',
    })
  }

  const deadCells = snap.deadMask.reduce((a, b) => a + b, 0)
  if (deadCells > 4) {
    cards.push({
      title: 'Quiet corners',
      detail: `${deadCells} sectors with almost no traffic.`,
      recommendation: 'Pull rotations through with loot, routes, or objectives.',
    })
  }

  const chokeCells = snap.chokeMask.reduce((a, b) => a + b, 0)
  if (chokeCells > 2 && snap.kills >= 3) {
    const { gx, gy } = maxCell(grids.kills, ANALYSIS_GRID)
    cards.push({
      title: 'Stacked fights',
      detail: `${chokeCells} spots where traffic and kills line up (${sectorLabel(gx, gy, ANALYSIS_GRID)} is hottest).`,
      recommendation: 'Add side routes, height, or soft cover so one lane is not the only play.',
    })
  }

  if (snap.stormDeaths > 0 && slice.length > 0) {
    let tMin = 0
    let tMax = 1
    for (const e of slice) {
      tMin = Math.min(tMin, e.tMs)
      tMax = Math.max(tMax, e.tMs)
    }
    if (tMax <= tMin) tMax = tMin + 1
    const lateT = tMin + (tMax - tMin) * 0.55
    const lateStorm = slice.filter((e) => e.event === 'KilledByStorm' && e.tMs >= lateT)
    if (lateStorm.length >= snap.stormDeaths * 0.5) {
      cards.push({
        title: 'Storm deaths late',
        detail: 'Most ring deaths happen in the second half of the scrubber.',
        recommendation: 'Check rotate timing and safe space before endgame.',
      })
    }
  }

  const botKills = slice.filter((e) => e.event === 'BotKill').length
  const humanKills = slice.filter((e) => e.event === 'Kill').length
  if (snap.botPlayers > 0 && botKills > humanKills * 1.5 && humanKills + botKills > 2) {
    cards.push({
      title: 'Bots in the kill feed',
      detail: 'Bots are taking more kills than humans here.',
      recommendation: 'Tune bot count or aggression so PvP reads clearly on the map.',
    })
  }

  const lootDense = maxCell(grids.loot, ANALYSIS_GRID)
  if (lootDense.v > 0) {
    cards.push({
      title: 'Loot pile-up',
      detail: `Most pickups: ${sectorLabel(lootDense.gx, lootDense.gy, ANALYSIS_GRID)}.`,
      recommendation: 'Spread or tighten loot on purpose — match risk to reward.',
    })
  }

  if (!cards.length) {
    cards.push({
      title: 'Need more signal',
      detail: 'Scrub time or pick one match to see clearer patterns.',
    })
  }

  return cards.slice(0, 6)
}

export function deadZoneCaption(snap: MatchSnapshot): string | null {
  const n = snap.deadMask.reduce((a, b) => a + b, 0)
  if (n < 4) return null
  return `${n} quiet sectors (cyan on map).`
}

export function chokeCaption(snap: MatchSnapshot): string | null {
  const n = snap.chokeMask.reduce((a, b) => a + b, 0)
  if (n < 2) return null
  return `${n} choke spots (orange on map).`
}
