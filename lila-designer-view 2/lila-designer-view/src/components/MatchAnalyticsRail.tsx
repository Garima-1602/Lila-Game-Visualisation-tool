import { useMemo } from 'react'
import type { GameEvent } from '../types'
import type { MatchPhase } from '../types'
import type { MatchSnapshot } from '../analytics/matchSnapshot'
import type { InsightCard } from '../analytics/insights'
import { computePlayerStats, listParticipantIds } from '../analytics/playerStats'

export interface MatchAnalyticsRailProps {
  snapshot: MatchSnapshot
  insights: InsightCard[]
  deadCaption: string | null
  chokeCaption: string | null
  events: GameEvent[]
  playbackT: number
  phase: MatchPhase
  onPhase: (p: MatchPhase) => void
  heatmapOpacity: number
  onHeatmapOpacity: (v: number) => void
  showDeadZones: boolean
  onShowDeadZones: (v: boolean) => void
  showChokeZones: boolean
  onShowChokeZones: (v: boolean) => void
  focusUserId: string
  onFocusUserId: (id: string) => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

function formatDur(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const rs = s % 60
  return `${m}m ${rs}s`
}

export function MatchAnalyticsRail({
  snapshot,
  insights,
  deadCaption,
  chokeCaption,
  events,
  playbackT,
  phase,
  onPhase,
  heatmapOpacity,
  onHeatmapOpacity,
  showDeadZones,
  onShowDeadZones,
  showChokeZones,
  onShowChokeZones,
  focusUserId,
  onFocusUserId,
  collapsed,
  onToggleCollapsed,
}: MatchAnalyticsRailProps) {
  const participants = useMemo(() => listParticipantIds(events, playbackT), [events, playbackT])
  const focusStats = useMemo(
    () => (focusUserId ? computePlayerStats(events, playbackT, focusUserId) : null),
    [events, playbackT, focusUserId],
  )

  return (
    <aside className={`match-rail ${collapsed ? 'match-rail--collapsed' : ''}`} aria-label="Map readouts and tips">
      <button type="button" className="match-rail-toggle" onClick={onToggleCollapsed}>
        {collapsed ? '◀ Reads' : 'Reads ▶'}
      </button>
      {!collapsed && (
        <div className="match-rail-inner">
          <h2 className="match-rail-heading">What you are seeing</h2>
          <p className="match-rail-lede">Left bar filters apply here. Phase chips slice the timeline into thirds.</p>

          <div className="phase-chips" role="group" aria-label="Match phase">
            {(['all', 'early', 'mid', 'late'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`phase-chip ${phase === p ? 'phase-chip--active' : ''}`}
                onClick={() => onPhase(p)}
              >
                {p === 'all' ? 'Full' : p}
              </button>
            ))}
          </div>

          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-card-label">Humans</span>
              <span className="stat-card-value mono">{snapshot.humanPlayers}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Bots</span>
              <span className="stat-card-value mono">{snapshot.botPlayers}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">K / D / Storm</span>
              <span className="stat-card-value mono">
                {snapshot.kills} · {snapshot.deaths} · {snapshot.stormDeaths}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Loot</span>
              <span className="stat-card-value mono">{snapshot.loot}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Time on bar</span>
              <span className="stat-card-value mono">{formatDur(snapshot.durationMs)}</span>
            </div>
            <div className="stat-card stat-card--wide">
              <span className="stat-card-label">Busiest area</span>
              <span className="stat-card-value">{snapshot.mostActiveZone}</span>
            </div>
            <div className="stat-card stat-card--wide">
              <span className="stat-card-label">Top kill sector</span>
              <span className="stat-card-value">{snapshot.mostDangerousZone}</span>
            </div>
          </div>

          <label className="field match-rail-field">
            Heat strength
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={heatmapOpacity}
              onChange={(e) => onHeatmapOpacity(Number(e.target.value))}
            />
          </label>

          <label className="chk match-rail-chk">
            <input type="checkbox" checked={showDeadZones} onChange={(e) => onShowDeadZones(e.target.checked)} />
            Quiet zones (cyan)
          </label>
          {deadCaption ? <p className="insight-foot">{deadCaption}</p> : null}

          <label className="chk match-rail-chk">
            <input type="checkbox" checked={showChokeZones} onChange={(e) => onShowChokeZones(e.target.checked)} />
            Fight stacks (orange)
          </label>
          {chokeCaption ? <p className="insight-foot">{chokeCaption}</p> : null}

          <label className="field match-rail-field">
            Highlight one player
            <select
              value={focusUserId}
              onChange={(e) => onFocusUserId(e.target.value)}
              aria-label="Isolate one player"
            >
              <option value="">Everyone</option>
              {participants.map((id) => (
                <option key={id} value={id}>
                  {id.length > 20 ? `${id.slice(0, 18)}…` : id}
                </option>
              ))}
            </select>
          </label>
          {focusStats ? (
            <div className="focus-stats mono">
              <span>
                {focusStats.kills}K / {focusStats.deaths}D · {focusStats.loot} loot · {focusStats.pathSamples} path pts
              </span>
            </div>
          ) : null}

          <h3 className="match-rail-sub">Quick reads</h3>
          <ul className="insight-list">
            {insights.map((c, i) => (
              <li key={i} className="insight-card">
                <div className="insight-title">{c.title}</div>
                <p className="insight-detail">{c.detail}</p>
                {c.recommendation ? (
                  <details className="insight-more">
                    <summary>Designer tip</summary>
                    <p className="insight-rec">{c.recommendation}</p>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
