import type { MapMiniConfig } from '../mapConfig'
import { MINIMAP_SIZE, worldToMinimap1024 } from '../mapConfig'
import type { EventKind, GameEvent, HeatmapMode, MapLegendToggles } from '../types'
import { isMovementEvent } from '../parquet/parseRows'
import { markerStyle, MARKER_RADIUS } from './eventColors'
import { drawCombatIcon, fillStar } from './legendShapes'
import { ANALYSIS_GRID } from '../analytics/spatialGrid'

const COMBAT_MARKERS: EventKind[] = ['Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm']

function decimate<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  const out: T[] = []
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]!)
  return out
}

function buildHeatmapWeights(
  events: GameEvent[],
  mode: HeatmapMode,
  mapCfg: MapMiniConfig,
  grid: number,
  tMax: number,
): Float32Array {
  const cells = grid * grid
  const acc = new Float32Array(cells)
  const add = (x: number, z: number, w: number) => {
    const { px, py } = worldToMinimap1024(x, z, mapCfg)
    if (px < 0 || py < 0 || px > MINIMAP_SIZE || py > MINIMAP_SIZE) return
    const gx = Math.min(grid - 1, Math.max(0, Math.floor((px / MINIMAP_SIZE) * grid)))
    const gy = Math.min(grid - 1, Math.max(0, Math.floor((py / MINIMAP_SIZE) * grid)))
    acc[gy * grid + gx] += w
  }

  for (const e of events) {
    if (e.tMs > tMax) continue
    if (mode === 'traffic') {
      if (isMovementEvent(e.event)) add(e.x, e.z, 1)
    } else if (mode === 'traffic_human') {
      if (isMovementEvent(e.event) && !e.isBot) add(e.x, e.z, 1)
    } else if (mode === 'traffic_bot') {
      if (isMovementEvent(e.event) && e.isBot) add(e.x, e.z, 1)
    } else if (mode === 'kills') {
      if (e.event === 'Kill' || e.event === 'BotKill') add(e.x, e.z, 2)
    } else if (mode === 'deaths') {
      if (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm') add(e.x, e.z, 2)
    } else if (mode === 'storm_deaths') {
      if (e.event === 'KilledByStorm') add(e.x, e.z, 3)
    } else if (mode === 'loot') {
      if (e.event === 'Loot') add(e.x, e.z, 1.5)
    }
  }

  const blur = new Float32Array(cells)
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      let s = 0
      let c = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx
          const ny = gy + dy
          if (nx >= 0 && nx < grid && ny >= 0 && ny < grid) {
            s += acc[ny * grid + nx]!
            c += 1
          }
        }
      }
      blur[gy * grid + gx] = s / c
    }
  }
  return blur
}

function heatmapRGBA(mode: HeatmapMode, v: number): [number, number, number, number] {
  if (mode === 'traffic' || mode === 'traffic_human') {
    return [59, 130, 246, Math.floor(200 * v * v)]
  }
  if (mode === 'traffic_bot') {
    return [148, 163, 184, Math.floor(190 * v * v)]
  }
  if (mode === 'kills') {
    return [239, 68, 68, Math.floor(210 * v)]
  }
  if (mode === 'deaths') {
    return [167, 139, 250, Math.floor(200 * v)]
  }
  if (mode === 'storm_deaths') {
    return [168, 85, 247, Math.floor(215 * v)]
  }
  if (mode === 'loot') {
    return [250, 204, 21, Math.floor(195 * v)]
  }
  return [100, 116, 139, 0]
}

function drawRegionMasks(
  ctx: CanvasRenderingContext2D,
  scale: number,
  deadMask: Uint8Array | null,
  chokeMask: Uint8Array | null,
  showDead: boolean,
  showChoke: boolean,
  grid: number,
) {
  const cell = MINIMAP_SIZE / grid
  if (showDead && deadMask) {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.09)'
    for (let i = 0; i < deadMask.length; i++) {
      if (!deadMask[i]) continue
      const gx = i % grid
      const gy = Math.floor(i / grid)
      ctx.fillRect(gx * cell, gy * cell, cell, cell)
    }
  }
  if (showChoke && chokeMask) {
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)'
    ctx.lineWidth = 1.25 / scale
    for (let i = 0; i < chokeMask.length; i++) {
      if (!chokeMask[i]) continue
      const gx = i % grid
      const gy = Math.floor(i / grid)
      ctx.strokeRect(gx * cell + 0.5 / scale, gy * cell + 0.5 / scale, cell - 1 / scale, cell - 1 / scale)
    }
  }
}

export interface DrawMinimapOptions {
  ctx: CanvasRenderingContext2D
  cssW: number
  cssH: number
  mapCfg: MapMiniConfig
  events: GameEvent[]
  playbackTMs: number
  showHumans: boolean
  showBots: boolean
  heatmap: HeatmapMode
  heatmapOpacity: number
  mapLegend: MapLegendToggles
  /** Map zoom factor from MapStage (1 = fit); low values cluster markers. */
  viewZoom: number
  focusUserId: string | null
  showDeadZones: boolean
  showChokeZones: boolean
  deadMask: Uint8Array | null
  chokeMask: Uint8Array | null
}

function clusterKey(px: number, py: number, cell: number): string {
  const gx = Math.floor(px / cell)
  const gy = Math.floor(py / cell)
  return `${gx},${gy}`
}

export function drawMinimapOverlay(opt: DrawMinimapOptions): void {
  const {
    ctx,
    cssW,
    cssH,
    mapCfg,
    events,
    playbackTMs,
    showHumans,
    showBots,
    heatmap,
    heatmapOpacity,
    mapLegend,
    viewZoom,
    focusUserId,
    showDeadZones,
    showChokeZones,
    deadMask,
    chokeMask,
  } = opt
  const dpr = window.devicePixelRatio || 1
  const w = cssW * dpr
  const h = cssH * dpr
  if (w < 2 || h < 2) return

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const scale = (Math.min(w, h) / MINIMAP_SIZE) * dpr
  const offsetX = (w - MINIMAP_SIZE * scale) / 2
  const offsetY = (h - MINIMAP_SIZE * scale) / 2
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE)
  ctx.clip()

  const tCut = playbackTMs
  const opacity = Math.min(1, Math.max(0.2, heatmapOpacity))

  if (heatmap !== 'off') {
    const grid = 96
    const weights = buildHeatmapWeights(events, heatmap, mapCfg, grid, tCut)
    let mx = 0
    for (let i = 0; i < weights.length; i++) mx = Math.max(mx, weights[i]!)
    if (mx > 0) {
      const img = ctx.createImageData(grid, grid)
      for (let gy = 0; gy < grid; gy++) {
        for (let gx = 0; gx < grid; gx++) {
          const v = weights[gy * grid + gx]! / mx
          const i = (gy * grid + gx) * 4
          const [r, g, b, a0] = heatmapRGBA(heatmap, v)
          img.data[i] = r
          img.data[i + 1] = g
          img.data[i + 2] = b
          img.data[i + 3] = Math.floor(a0 * opacity)
        }
      }
      ctx.imageSmoothingEnabled = true
      const tmp = document.createElement('canvas')
      tmp.width = grid
      tmp.height = grid
      const tctx = tmp.getContext('2d')!
      tctx.putImageData(img, 0, 0)
      ctx.drawImage(tmp, 0, 0, grid, grid, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE)
    }
  }

  drawRegionMasks(ctx, scale, deadMask, chokeMask, showDeadZones, showChokeZones, ANALYSIS_GRID)

  type Key = string
  const pathBuckets = new Map<Key, GameEvent[]>()
  for (const e of events) {
    if (e.tMs > tCut) continue
    if (!isMovementEvent(e.event)) continue
    if (e.isBot && !showBots) continue
    if (!e.isBot && !showHumans) continue
    const key = `${e.match_id}\0${e.user_id}`
    let arr = pathBuckets.get(key)
    if (!arr) {
      arr = []
      pathBuckets.set(key, arr)
    }
    arr.push(e)
  }

  const clusterMarkers = viewZoom < 1.22
  const clusterCell = 22

  for (const [, pts] of pathBuckets) {
    pts.sort((a, b) => a.tMs - b.tMs)
    const use = decimate(pts, 4000)
    if (use.length < 2) continue
    const bot = use[0]!.isBot
    const dim =
      focusUserId &&
      `${use[0]!.match_id}\0${use[0]!.user_id}` !== `${use[0]!.match_id}\0${focusUserId}`
    ctx.globalAlpha = dim ? 0.14 : 1
    const baseA = dim ? 0.14 : 1
    ctx.lineJoin = 'round'
    const n = use.length
    for (let i = 0; i < n - 1; i++) {
      const a0 = baseA * (0.18 + 0.82 * (i / Math.max(1, n - 2)))
      ctx.globalAlpha = a0
      ctx.strokeStyle = bot ? 'rgba(148, 163, 184, 0.42)' : 'rgba(34, 211, 238, 0.55)'
      ctx.lineWidth = bot ? 1.15 / scale : 1.45 / scale
      ctx.beginPath()
      const pa = worldToMinimap1024(use[i]!.x, use[i]!.z, mapCfg)
      const pb = worldToMinimap1024(use[i + 1]!.x, use[i + 1]!.z, mapCfg)
      ctx.moveTo(pa.px, pa.py)
      ctx.lineTo(pb.px, pb.py)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  const markerFilter = (e: GameEvent) => {
    if (e.tMs > tCut) return false
    if (e.isBot && !showBots) return false
    if (!e.isBot && !showHumans) return false
    return true
  }

  const combatList = events.filter((e) => markerFilter(e) && COMBAT_MARKERS.includes(e.event))
  const drawCombatOne = (e: GameEvent) => {
    const dim = focusUserId && e.user_id !== focusUserId
    ctx.globalAlpha = dim ? 0.16 : 1
    const { px, py } = worldToMinimap1024(e.x, e.z, mapCfg)
    if (mapLegend.combatIcons) drawCombatIcon(ctx, e.event, px, py, scale)
    else {
      const st = markerStyle(e.event)
      ctx.fillStyle = st.fill
      ctx.strokeStyle = st.stroke
      ctx.lineWidth = 1.2 / scale
      ctx.beginPath()
      ctx.arc(px, py, MARKER_RADIUS / scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  if (clusterMarkers && combatList.length > 35) {
    type B = { px: number; py: number; items: GameEvent[] }
    const buckets = new Map<string, B>()
    for (const e of combatList) {
      const { px, py } = worldToMinimap1024(e.x, e.z, mapCfg)
      const k = clusterKey(px, py, clusterCell)
      let b = buckets.get(k)
      if (!b) {
        b = { px: 0, py: 0, items: [] }
        buckets.set(k, b)
      }
      b.items.push(e)
      b.px += px
      b.py += py
    }
    for (const b of buckets.values()) {
      const n = b.items.length
      const px = b.px / n
      const py = b.py / n
      const dim = focusUserId && b.items.every((e) => e.user_id !== focusUserId)
      ctx.globalAlpha = dim ? 0.18 : 1
      if (n === 1) {
        drawCombatOne(b.items[0]!)
      } else {
        ctx.fillStyle = 'rgba(248, 113, 113, 0.92)'
        ctx.strokeStyle = 'rgba(127, 29, 29, 0.95)'
        ctx.lineWidth = 1.2 / scale
        ctx.beginPath()
        ctx.arc(px, py, (8 + Math.min(6, n / 8)) / scale, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = 'rgba(15, 19, 28, 0.95)'
        ctx.font = `600 ${Math.max(7, 9 - n / 40) / scale}px/1 system-ui,sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(n), px, py + 0.5 / scale)
      }
      ctx.globalAlpha = 1
    }
  } else {
    for (const e of combatList) drawCombatOne(e)
  }

  if (!mapLegend.lootStars) {
    for (const e of events) {
      if (!markerFilter(e)) continue
      if (e.event !== 'Loot') continue
      const dim = focusUserId && e.user_id !== focusUserId
      ctx.globalAlpha = dim ? 0.16 : 1
      const { px, py } = worldToMinimap1024(e.x, e.z, mapCfg)
      const st = markerStyle('Loot')
      ctx.fillStyle = st.fill
      ctx.strokeStyle = st.stroke
      ctx.lineWidth = 1.2 / scale
      ctx.beginPath()
      ctx.arc(px, py, MARKER_RADIUS / scale, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  } else {
    const lootPickups = events.filter((e) => markerFilter(e) && e.event === 'Loot')
    if (clusterMarkers && lootPickups.length > 60) {
      type B = { px: number; py: number; c: number }
      const buckets = new Map<string, B>()
      for (const e of lootPickups) {
        const { px, py } = worldToMinimap1024(e.x, e.z, mapCfg)
        const k = clusterKey(px, py, clusterCell)
        let b = buckets.get(k)
        if (!b) {
          b = { px: 0, py: 0, c: 0 }
          buckets.set(k, b)
        }
        b.px += px
        b.py += py
        b.c += 1
      }
      const st = markerStyle('Loot')
      for (const b of buckets.values()) {
        const px = b.px / b.c
        const py = b.py / b.c
        ctx.globalAlpha = 1
        if (b.c === 1) fillStar(ctx, px, py, 7 / scale, 3.2 / scale, st.fill, st.stroke, 1.1 / scale)
        else {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.95)'
          ctx.strokeStyle = 'rgba(120, 53, 15, 0.9)'
          ctx.beginPath()
          ctx.arc(px, py, 6 / scale, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = '#0f131c'
          ctx.font = `700 ${8 / scale}px/1 system-ui,sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(b.c), px, py + 0.5 / scale)
        }
      }
    } else {
      const lootDraw = decimate(lootPickups, 900)
      const st = markerStyle('Loot')
      for (const e of lootDraw) {
        const dim = focusUserId && e.user_id !== focusUserId
        ctx.globalAlpha = dim ? 0.16 : 1
        const { px, py } = worldToMinimap1024(e.x, e.z, mapCfg)
        fillStar(ctx, px, py, 7 / scale, 3.2 / scale, st.fill, st.stroke, 1.1 / scale)
        ctx.globalAlpha = 1
      }
    }
  }

  ctx.restore()
  ctx.restore()
}
