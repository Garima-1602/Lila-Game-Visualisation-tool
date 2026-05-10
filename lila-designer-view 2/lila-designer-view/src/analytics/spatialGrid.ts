import type { MapMiniConfig } from '../mapConfig'
import { MINIMAP_SIZE, worldToMinimap1024 } from '../mapConfig'
import type { GameEvent } from '../types'
import { isMovementEvent } from '../parquet/parseRows'

export const ANALYSIS_GRID = 40

export function cellIndex(gx: number, gy: number, grid: number): number {
  return gy * grid + gx
}

export function addToGrid(
  acc: Float32Array,
  grid: number,
  x: number,
  z: number,
  mapCfg: MapMiniConfig,
  w: number,
): void {
  const { px, py } = worldToMinimap1024(x, z, mapCfg)
  if (px < 0 || py < 0 || px > MINIMAP_SIZE || py > MINIMAP_SIZE) return
  const gx = Math.min(grid - 1, Math.max(0, Math.floor((px / MINIMAP_SIZE) * grid)))
  const gy = Math.min(grid - 1, Math.max(0, Math.floor((py / MINIMAP_SIZE) * grid)))
  acc[cellIndex(gx, gy, grid)] += w
}

export function blurBox3(acc: Float32Array, grid: number): Float32Array {
  const blur = new Float32Array(grid * grid)
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let s = 0
      let c = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx
          const ny = gy + dy
          if (nx >= 0 && nx < grid && ny >= 0 && ny < grid) {
            s += acc[cellIndex(nx, ny, grid)]!
            c += 1
          }
        }
      }
      blur[cellIndex(gx, gy, grid)] = s / c
    }
  }
  return blur
}

export function accumulateSpatial(
  events: GameEvent[],
  tMax: number,
  mapCfg: MapMiniConfig,
  grid: number = ANALYSIS_GRID,
): {
  traffic: Float32Array
  trafficHuman: Float32Array
  trafficBot: Float32Array
  kills: Float32Array
  deaths: Float32Array
  storm: Float32Array
  loot: Float32Array
} {
  const traffic = new Float32Array(grid * grid)
  const trafficHuman = new Float32Array(grid * grid)
  const trafficBot = new Float32Array(grid * grid)
  const kills = new Float32Array(grid * grid)
  const deaths = new Float32Array(grid * grid)
  const storm = new Float32Array(grid * grid)
  const loot = new Float32Array(grid * grid)

  for (const e of events) {
    if (e.tMs > tMax) continue
    if (isMovementEvent(e.event)) {
      addToGrid(traffic, grid, e.x, e.z, mapCfg, 1)
      if (e.isBot) addToGrid(trafficBot, grid, e.x, e.z, mapCfg, 1)
      else addToGrid(trafficHuman, grid, e.x, e.z, mapCfg, 1)
    }
    if (e.event === 'Kill' || e.event === 'BotKill') addToGrid(kills, grid, e.x, e.z, mapCfg, 2)
    if (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm')
      addToGrid(deaths, grid, e.x, e.z, mapCfg, 2)
    if (e.event === 'KilledByStorm') addToGrid(storm, grid, e.x, e.z, mapCfg, 2)
    if (e.event === 'Loot') addToGrid(loot, grid, e.x, e.z, mapCfg, 1)
  }

  return {
    traffic: blurBox3(traffic, grid),
    trafficHuman: blurBox3(trafficHuman, grid),
    trafficBot: blurBox3(trafficBot, grid),
    kills: blurBox3(kills, grid),
    deaths: blurBox3(deaths, grid),
    storm: blurBox3(storm, grid),
    loot: blurBox3(loot, grid),
  }
}

export function percentilePositive(arr: Float32Array, p: number): number {
  const list: number[] = []
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]! > 0) list.push(arr[i]!)
  }
  if (!list.length) return 0
  list.sort((a, b) => a - b)
  const idx = Math.min(list.length - 1, Math.floor((list.length - 1) * p))
  return list[idx]!
}

export function maxCell(arr: Float32Array, grid: number): { gx: number; gy: number; v: number } {
  let v = 0
  let gx = 0
  let gy = 0
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]! > v) {
      v = arr[i]!
      gx = i % grid
      gy = Math.floor(i / grid)
    }
  }
  return { gx, gy, v }
}

export function sectorLabel(gx: number, gy: number, grid: number): string {
  const xBand = gx < grid / 3 ? 'West' : gx < (2 * grid) / 3 ? 'Central' : 'East'
  const yBand = gy < grid / 3 ? 'north' : gy < (2 * grid) / 3 ? 'mid-map' : 'south'
  return `${xBand} · ${yBand}`
}
