import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnalyticsSummary } from './components/AnalyticsSummary'
import { LegendShapeIcon } from './components/LegendShapeIcons'
import { MapStage } from './components/MapStage'
const MatchRosterFlow = lazy(() =>
  import('./components/MatchRosterFlow').then((m) => ({ default: m.MatchRosterFlow })),
)
import { TimelineBar } from './components/TimelineBar'
import { generateDemoEvents } from './demo/generateDemoEvents'
import { MAPS, mapConfigById } from './mapConfig'
import { dayFromRelativePath, loadParquetFiles } from './parquet/loadParquetFiles'
import { buildInsightCards, chokeCaption, deadZoneCaption } from './analytics/insights'
import { buildMatchSnapshot } from './analytics/matchSnapshot'
import { MatchAnalyticsRail } from './components/MatchAnalyticsRail'
import type { GameEvent, HeatmapMode, MapId, MapLegendToggles, MatchPhase } from './types'

type MainTab = 'map' | 'graph' | 'summary'

function uniqueSorted(vals: string[]): string[] {
  return [...new Set(vals)].sort()
}

export default function App() {
  const dirInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [events, setEvents] = useState<GameEvent[]>(() => generateDemoEvents())
  const [loadLabel, setLoadLabel] = useState('Demo data loaded')
  const [busy, setBusy] = useState(false)

  const [mapId, setMapId] = useState<MapId>('AmbroseValley')
  const [daysPick, setDaysPick] = useState<Record<string, boolean>>({})
  const [matchId, setMatchId] = useState<string>('')
  const [showHumans, setShowHumans] = useState(true)
  const [showBots, setShowBots] = useState(true)
  const [heatmap, setHeatmap] = useState<HeatmapMode>('off')
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.85)
  const [mapLegend, setMapLegend] = useState<MapLegendToggles>({
    lootStars: true,
    combatIcons: true,
  })
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('all')
  const [showDeadZones, setShowDeadZones] = useState(true)
  const [showChokeZones, setShowChokeZones] = useState(true)
  const [focusUserId, setFocusUserId] = useState('')
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [mainTab, setMainTab] = useState<MainTab>('map')

  const [playbackT, setPlaybackT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const filterKeyRef = useRef('')
  const [viewZoom, setViewZoom] = useState(1)

  const mapCfg = mapConfigById(mapId)

  const availableDays = useMemo(() => {
    const d = events.map((e) => e.sourceDay).filter(Boolean) as string[]
    return uniqueSorted(d)
  }, [events])

  const baseFiltered = useMemo(() => {
    const dayKeys = Object.entries(daysPick)
      .filter(([, on]) => on)
      .map(([d]) => d)
    return events.filter((e) => {
      if (e.map_id !== mapId) return false
      if (dayKeys.length) {
        if (!e.sourceDay || !dayKeys.includes(e.sourceDay)) return false
      }
      return true
    })
  }, [events, mapId, daysPick])

  const matchChoices = useMemo(
    () => uniqueSorted(baseFiltered.map((e) => e.match_id)),
    [baseFiltered],
  )

  const visible = useMemo(() => {
    if (!matchId) return baseFiltered
    return baseFiltered.filter((e) => e.match_id === matchId)
  }, [baseFiltered, matchId])

  const tBounds = useMemo(() => {
    let tMin = 0
    let tMax = 1
    for (const e of visible) {
      tMin = Math.min(tMin, e.tMs)
      tMax = Math.max(tMax, e.tMs)
    }
    if (tMax <= tMin) tMax = tMin + 1
    return { tMin, tMax }
  }, [visible])

  const mapEvents = useMemo(() => {
    const span = tBounds.tMax - tBounds.tMin
    let base = visible
    if (matchPhase !== 'all') {
      let p0 = tBounds.tMin
      let p1 = tBounds.tMax
      if (matchPhase === 'early') p1 = tBounds.tMin + span / 3
      else if (matchPhase === 'mid') {
        p0 = tBounds.tMin + span / 3
        p1 = tBounds.tMin + (2 * span) / 3
      } else p0 = tBounds.tMin + (2 * span) / 3
      base = visible.filter((e) => e.tMs >= p0 && e.tMs <= p1)
    }
    return base.filter((e) => e.tMs <= playbackT)
  }, [visible, playbackT, matchPhase, tBounds.tMin, tBounds.tMax])

  const legendStats = useMemo(() => {
    let loot = 0
    let kills = 0
    let deaths = 0
    for (const e of mapEvents) {
      if (e.event === 'Loot') loot += 1
      if (e.event === 'Kill' || e.event === 'BotKill') kills += 1
      if (e.event === 'Killed' || e.event === 'BotKilled' || e.event === 'KilledByStorm') deaths += 1
    }
    return { loot, kills, deaths }
  }, [mapEvents])

  const matchSnapshot = useMemo(
    () => buildMatchSnapshot(mapEvents, playbackT, mapCfg!),
    [mapEvents, playbackT, mapCfg],
  )

  const insightCards = useMemo(
    () => buildInsightCards(matchSnapshot, mapEvents, playbackT, mapCfg!),
    [matchSnapshot, mapEvents, playbackT, mapCfg],
  )

  const deadInsight = matchSnapshot ? deadZoneCaption(matchSnapshot) : null
  const chokeInsight = matchSnapshot ? chokeCaption(matchSnapshot) : null

  useEffect(() => {
    const dayKey = Object.entries(daysPick)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort()
      .join(',')
    const fk = `${mapId}|${matchId}|${dayKey}`
    if (filterKeyRef.current !== fk) {
      filterKeyRef.current = fk
      setPlaybackT(tBounds.tMax)
      return
    }
    setPlaybackT((t) => Math.min(Math.max(t, tBounds.tMin), tBounds.tMax))
  }, [tBounds.tMin, tBounds.tMax, mapId, matchId, daysPick])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setPlaybackT((t) => {
        const step = 80 * speed
        const next = t + step
        if (next >= tBounds.tMax) return tBounds.tMin
        return next
      })
    }, 80)
    return () => clearInterval(id)
  }, [playing, speed, tBounds.tMax, tBounds.tMin])

  if (!mapCfg) return null

  const loadFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list).filter(
      (f) => f.name.endsWith('.nakama-0') || f.name.endsWith('.parquet'),
    )
    if (!arr.length) {
      setLoadLabel('No journey files found (.nakama-0)')
      return
    }
    setBusy(true)
    setLoadLabel(`Reading 0 / ${arr.length}…`)
    try {
      const inputs = await Promise.all(
        arr.map(async (f) => {
          const buf = new Uint8Array(await f.arrayBuffer())
          const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath ?? ''
          return {
            buffer: buf,
            sourceDay: rel ? dayFromRelativePath(rel) : null,
            fileName: f.name,
          }
        }),
      )
      const merged = await loadParquetFiles(inputs, (p) => {
        setLoadLabel(`Reading ${p.done} / ${p.total} — ${p.fileName}`)
      })
      filterKeyRef.current = ''
      setEvents(merged)
      setMatchId('')
      setDaysPick({})
      setLoadLabel(`Loaded ${merged.length.toLocaleString()} events from ${arr.length} files`)
    } catch (e) {
      setLoadLabel(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const onPickDir = useCallback(() => dirInputRef.current?.click(), [])
  const onPickFiles = useCallback(() => fileInputRef.current?.click(), [])

  return (
    <div className="app-shell">
      <input
        ref={dirInputRef}
        type="file"
        className="sr-only"
        {...{ webkitdirectory: '' }}
        multiple
        onChange={(e) => {
          const fl = e.target.files
          if (fl?.length) void loadFiles(fl)
          e.target.value = ''
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        multiple
        onChange={(e) => {
          const fl = e.target.files
          if (fl?.length) void loadFiles(fl)
          e.target.value = ''
        }}
      />

      <aside className="sidebar">
        <header className="brand">
          <h1>LILA BLACK</h1>
          <p className="tagline">Map + match replay</p>
        </header>

        <section className="panel">
          <h2>Data</h2>
          <div className="btn-row">
            <button type="button" className="btn primary" disabled={busy} onClick={onPickDir}>
              Load folder…
            </button>
            <button type="button" className="btn" disabled={busy} onClick={onPickFiles}>
              Load files…
            </button>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              filterKeyRef.current = ''
              setEvents(generateDemoEvents())
              setMatchId('')
              setLoadLabel('Demo data')
            }}
          >
            Load demo sample
          </button>
          <p className="status mono" role="status">
            {loadLabel}
          </p>
          <p className="hint">
            Load your unzipped <code className="mono">player_data</code> folder. Minimap art goes in{' '}
            <code className="mono">public/minimaps/</code> before you build.
          </p>
        </section>

        <section className="panel">
          <h2>Filters</h2>
          <label className="field">
            Map
            <select value={mapId} onChange={(e) => setMapId(e.target.value as MapId)}>
              {MAPS.map((m) => (
                <option key={m.mapId} value={m.mapId}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {availableDays.length > 0 && (
            <fieldset className="field">
              <legend>Collection day</legend>
              <div className="day-grid">
                {availableDays.map((d) => (
                  <label key={d} className="chk">
                    <input
                      type="checkbox"
                      checked={!!daysPick[d]}
                      onChange={(e) =>
                        setDaysPick((prev) => ({ ...prev, [d]: e.target.checked }))
                      }
                    />
                    {d.replace('February_', 'Feb ')}
                  </label>
                ))}
              </div>
              <p className="hint tiny">All days if none checked.</p>
            </fieldset>
          )}

          <label className="field">
            Match
            <select
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              aria-label="Match filter"
            >
              <option value="">All matches (overlay)</option>
              {matchChoices.map((id) => (
                <option key={id} value={id}>
                  {id.length > 48 ? `${id.slice(0, 24)}…` : id}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="panel">
          <h2>Layers</h2>
          <label className="chk">
            <input type="checkbox" checked={showHumans} onChange={(e) => setShowHumans(e.target.checked)} />
            Humans (cyan paths)
          </label>
          <label className="chk">
            <input type="checkbox" checked={showBots} onChange={(e) => setShowBots(e.target.checked)} />
            Bots (gray paths)
          </label>
          <label className="field">
            Heatmap
            <select value={heatmap} onChange={(e) => setHeatmap(e.target.value as HeatmapMode)}>
              <option value="off">Off</option>
              <option value="traffic">Traffic (all)</option>
              <option value="traffic_human">Traffic · humans</option>
              <option value="traffic_bot">Traffic · bots</option>
              <option value="kills">Kills</option>
              <option value="deaths">Deaths</option>
              <option value="storm_deaths">Storm deaths</option>
              <option value="loot">Loot</option>
            </select>
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={mapLegend.lootStars}
              onChange={(e) => setMapLegend((m) => ({ ...m, lootStars: e.target.checked }))}
            />
            Loot as stars (off = dots)
          </label>
          <label className="chk">
            <input
              type="checkbox"
              checked={mapLegend.combatIcons}
              onChange={(e) => setMapLegend((m) => ({ ...m, combatIcons: e.target.checked }))}
            />
            Combat icons (off = dots)
          </label>
          <p className="hint tiny mono">
            Up to scrubber: {legendStats.loot} loot · {legendStats.kills}K / {legendStats.deaths}D
          </p>
        </section>

        <section className="panel map-legend-panel">
          <h2>Marker key</h2>
          <p className="hint tiny">Matches the map when stars / icons above are on.</p>
          <ul className="marker-key-list" aria-label="Combat marker meanings">
            <li>
              <span className="marker-key-icon" title="Human kill">
                <LegendShapeIcon kind="Kill" />
              </span>
              <span className="marker-key-name">Human kill</span>
            </li>
            <li>
              <span className="marker-key-icon" title="Human died">
                <LegendShapeIcon kind="Killed" />
              </span>
              <span className="marker-key-name">Human died</span>
            </li>
            <li>
              <span className="marker-key-icon" title="Bot kill">
                <LegendShapeIcon kind="BotKill" />
              </span>
              <span className="marker-key-name">Bot kill</span>
            </li>
            <li>
              <span className="marker-key-icon" title="Bot died">
                <LegendShapeIcon kind="BotKilled" />
              </span>
              <span className="marker-key-name">Bot died</span>
            </li>
            <li>
              <span className="marker-key-icon" title="Storm death">
                <LegendShapeIcon kind="KilledByStorm" />
              </span>
              <span className="marker-key-name">Storm death</span>
            </li>
            <li>
              <span className="marker-key-icon" title="Loot pickup">
                <LegendShapeIcon kind="Loot" />
              </span>
              <span className="marker-key-name">Loot pickup</span>
            </li>
          </ul>
        </section>
      </aside>

      <main className={`main ${mainTab === 'map' ? 'main--map' : ''}`}>
        <nav className="main-tabs" aria-label="Main view">
          <button
            type="button"
            className={`main-tab ${mainTab === 'map' ? 'active' : ''}`}
            onClick={() => setMainTab('map')}
          >
            Map
          </button>
          <button
            type="button"
            className={`main-tab ${mainTab === 'graph' ? 'active' : ''}`}
            onClick={() => setMainTab('graph')}
          >
            Roster
          </button>
          <button
            type="button"
            className={`main-tab ${mainTab === 'summary' ? 'active' : ''}`}
            onClick={() => setMainTab('summary')}
          >
            Counts
          </button>
        </nav>

        {mainTab === 'map' && (
          <>
            <div className="map-workspace">
              <div className="map-workspace-main">
                <MapStage
                  mapCfg={mapCfg}
                  events={mapEvents}
                  playbackTMs={playbackT}
                  showHumans={showHumans}
                  showBots={showBots}
                  heatmap={heatmap}
                  heatmapOpacity={heatmapOpacity}
                  mapLegend={mapLegend}
                  viewZoom={viewZoom}
                  focusUserId={focusUserId || null}
                  showDeadZones={showDeadZones}
                  showChokeZones={showChokeZones}
                  deadMask={matchSnapshot?.deadMask ?? null}
                  chokeMask={matchSnapshot?.chokeMask ?? null}
                  onViewZoomChange={setViewZoom}
                />
              </div>
              <MatchAnalyticsRail
                snapshot={matchSnapshot}
                insights={insightCards}
                deadCaption={deadInsight}
                chokeCaption={chokeInsight}
                events={mapEvents}
                playbackT={playbackT}
                phase={matchPhase}
                onPhase={setMatchPhase}
                heatmapOpacity={heatmapOpacity}
                onHeatmapOpacity={setHeatmapOpacity}
                showDeadZones={showDeadZones}
                onShowDeadZones={setShowDeadZones}
                showChokeZones={showChokeZones}
                onShowChokeZones={setShowChokeZones}
                focusUserId={focusUserId}
                onFocusUserId={setFocusUserId}
                collapsed={railCollapsed}
                onToggleCollapsed={() => setRailCollapsed((c) => !c)}
              />
            </div>
            <TimelineBar
              tMin={tBounds.tMin}
              tMax={tBounds.tMax}
              currentT={playbackT}
              playing={playing}
              speed={speed}
              onChangeT={(t) => {
                setPlaybackT(t)
                setPlaying(false)
              }}
              onTogglePlay={() => setPlaying((p) => !p)}
              onSpeedChange={setSpeed}
            />
          </>
        )}

        {mainTab === 'graph' && (
          <Suspense fallback={<div className="panel-alt empty-flow">Loading roster…</div>}>
            <MatchRosterFlow matchId={matchId} events={baseFiltered} />
          </Suspense>
        )}

        {mainTab === 'summary' && (
          <AnalyticsSummary events={visible} mapId={mapId} matchFilter={matchId} />
        )}

        {mainTab === 'map' && (
          <p className="footer-note">
            2D placement from README scale · time = <code className="mono">tMs</code> · details in{' '}
            <code className="mono">VISUALIZATION.md</code>
          </p>
        )}
      </main>
    </div>
  )
}
