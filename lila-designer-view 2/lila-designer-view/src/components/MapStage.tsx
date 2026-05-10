import { useCallback, useEffect, useRef, useState } from 'react'
import type { MapMiniConfig } from '../mapConfig'
import { MINIMAP_SIZE } from '../mapConfig'
import { drawMinimapOverlay } from '../draw/renderMinimap'
import type { GameEvent, HeatmapMode, MapLegendToggles } from '../types'
import { FloatingMapLegend } from './FloatingMapLegend'

export interface MapStageProps {
  mapCfg: MapMiniConfig
  events: GameEvent[]
  /** Show events with tMs ≤ this value (match-relative ms). */
  playbackTMs: number
  showHumans: boolean
  showBots: boolean
  heatmap: HeatmapMode
  heatmapOpacity: number
  mapLegend: MapLegendToggles
  viewZoom: number
  focusUserId: string | null
  showDeadZones: boolean
  showChokeZones: boolean
  deadMask: Uint8Array | null
  chokeMask: Uint8Array | null
  onViewZoomChange?: (zoom: number) => void
}

const ZOOM_MIN = 0.35
const ZOOM_MAX = 14

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n))
}

export function MapStage({
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
  onViewZoomChange,
}: MapStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgOk, setImgOk] = useState(true)

  const [vw, setVw] = useState(400)
  const [vh, setVh] = useState(400)
  const [side, setSide] = useState(400)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const dragRef = useRef<{ active: boolean; id: number; sx: number; sy: number; px: number; py: number } | null>(
    null,
  )
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setImgOk(true)
  }, [mapCfg.imageUrl])

  useEffect(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [mapCfg.mapId])

  useEffect(() => {
    onViewZoomChange?.(scale)
  }, [scale, onViewZoomChange])

  const translate = useCallback(() => {
    const tx = (vw - side * scale) / 2 + pan.x
    const ty = (vh - side * scale) / 2 + pan.y
    return { tx, ty }
  }, [vw, vh, side, scale, pan])

  const zoomAt = useCallback(
    (anchorX: number, anchorY: number, factor: number) => {
      const { tx, ty } = translate()
      const wx = (anchorX - tx) / scale
      const wy = (anchorY - ty) / scale
      const newScale = clamp(scale * factor, ZOOM_MIN, ZOOM_MAX)
      const ntx = anchorX - wx * newScale
      const nty = anchorY - wy * newScale
      setPan({
        x: ntx - (vw - side * newScale) / 2,
        y: nty - (vh - side * newScale) / 2,
      })
      setScale(newScale)
    },
    [scale, side, translate, vw, vh],
  )

  const resetView = useCallback(() => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const exportPng = useCallback(() => {
    const inner = innerRef.current
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!inner || !canvas) return
    const s = Math.max(8, inner.offsetWidth)
    const out = document.createElement('canvas')
    out.width = s
    out.height = s
    const octx = out.getContext('2d')
    if (!octx) return
    octx.fillStyle = '#0f131c'
    octx.fillRect(0, 0, s, s)
    if (imgOk && img?.complete && img.naturalWidth > 0) {
      try {
        octx.drawImage(img, 0, 0, s, s)
      } catch {
        /* tainted or decode error */
      }
    }
    octx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, s, s)
    out.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${mapCfg.mapId}-map-view.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [imgOk, mapCfg.mapId])

  const redraw = useCallback(() => {
    const inner = innerRef.current
    const canvas = canvasRef.current
    if (!inner || !canvas) return
    const css = Math.max(8, inner.offsetWidth)
    if (css < 8) return
    const dpr = window.devicePixelRatio || 1
    const buf = Math.floor(css * dpr)
    if (canvas.width !== buf || canvas.height !== buf) {
      canvas.width = buf
      canvas.height = buf
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawMinimapOverlay({
      ctx,
      cssW: css,
      cssH: css,
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
    })
  }, [
    events,
    heatmap,
    heatmapOpacity,
    mapCfg,
    playbackTMs,
    showBots,
    showHumans,
    mapLegend,
    viewZoom,
    focusUserId,
    showDeadZones,
    showChokeZones,
    deadMask,
    chokeMask,
    scale,
  ])

  useEffect(() => {
    redraw()
  }, [redraw])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => {
      const cr = el.getBoundingClientRect()
      const w = cr.width
      const h = cr.height
      setVw(w)
      setVh(h)
      setSide(Math.max(200, Math.floor(Math.min(w, h) - 4)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const ro = new ResizeObserver(() => redraw())
    ro.observe(inner)
    return () => ro.disconnect()
  }, [redraw])

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const el = viewportRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      zoomAt(mx, my, factor)
    },
    [zoomAt],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      setDragging(true)
      dragRef.current = {
        active: true,
        id: e.pointerId,
        sx: e.clientX,
        sy: e.clientY,
        px: pan.x,
        py: pan.y,
      }
    },
    [pan.x, pan.y],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current
      if (!d?.active || d.id !== e.pointerId) return
      setPan({
        x: d.px + (e.clientX - d.sx),
        y: d.py + (e.clientY - d.sy),
      })
    },
    [],
  )

  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (d && d.id === e.pointerId) {
      dragRef.current = null
      setDragging(false)
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const onPointerUp = endDrag
  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = null
      setDragging(false)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    },
    [],
  )

  const { tx, ty } = translate()

  return (
    <div className="map-stage">
      <div className="map-toolbar">
        <span className="map-toolbar-hint">Scroll zoom · drag pan · Fit</span>
        <div className="map-toolbar-actions">
          <button type="button" className="btn-icon" title="Zoom out" onClick={() => zoomAt(vw / 2, vh / 2, 1 / 1.25)}>
            −
          </button>
          <span className="map-zoom-readout mono">{Math.round(scale * 100)}%</span>
          <button type="button" className="btn-icon" title="Zoom in" onClick={() => zoomAt(vw / 2, vh / 2, 1.25)}>
            +
          </button>
          <button type="button" className="btn btn-fit" title="Fit map to panel" onClick={resetView}>
            Fit
          </button>
          <button type="button" className="btn btn-fit" title="Download PNG (minimap + overlay)" onClick={exportPng}>
            PNG
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="map-viewport"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <div
          ref={innerRef}
          className="map-zoom-inner"
          style={{
            width: side,
            height: side,
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {imgOk ? (
            <img
              ref={imgRef}
              className="map-minimap-img"
              src={mapCfg.imageUrl}
              width={MINIMAP_SIZE}
              height={MINIMAP_SIZE}
              alt={`${mapCfg.label} minimap`}
              draggable={false}
              onError={() => setImgOk(false)}
              onLoad={() => {
                setImgOk(true)
                redraw()
              }}
            />
          ) : (
            <div className="map-minimap-fallback" aria-hidden>
              <span>{mapCfg.label}</span>
              <small>Add files to public/minimaps/ (see README)</small>
            </div>
          )}
          <canvas ref={canvasRef} className="map-overlay-canvas" />
        </div>
        <FloatingMapLegend heatmap={heatmap} />
      </div>
    </div>
  )
}
