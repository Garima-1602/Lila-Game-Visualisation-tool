import { useMemo } from 'react'
import type { GameEvent } from '../types'

const EVENT_ORDER = [
  'Position',
  'BotPosition',
  'Kill',
  'Killed',
  'BotKill',
  'BotKilled',
  'KilledByStorm',
  'Loot',
] as const

export interface AnalyticsSummaryProps {
  events: GameEvent[]
  mapId: string
  matchFilter: string
}

export function AnalyticsSummary({ events, mapId, matchFilter }: AnalyticsSummaryProps) {
  const stats = useMemo(() => {
    const byEvent = new Map<string, number>()
    const users = new Map<string, boolean>()
    for (const e of events) {
      byEvent.set(e.event, (byEvent.get(e.event) ?? 0) + 1)
      users.set(e.user_id, e.isBot)
    }
    let humans = 0
    let bots = 0
    for (const isBot of users.values()) {
      if (isBot) bots += 1
      else humans += 1
    }
    return { byEvent, humans, bots, distinctUsers: users.size, rows: events.length }
  }, [events])

  return (
    <div className="panel-alt analytics-summary">
      <h2 className="analytics-title">Counts for current filters</h2>
      <dl className="analytics-dl">
        <div>
          <dt>Map</dt>
          <dd className="mono">{mapId}</dd>
        </div>
        <div>
          <dt>Match</dt>
          <dd className="mono">{matchFilter ? (matchFilter.length > 40 ? `${matchFilter.slice(0, 20)}…` : matchFilter) : 'All (overlay)'}</dd>
        </div>
        <div>
          <dt>Rows</dt>
          <dd>{stats.rows.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd>
            {stats.distinctUsers.toLocaleString()} <span className="analytics-muted">({stats.humans} human · {stats.bots} bot)</span>
          </dd>
        </div>
      </dl>
      <h3 className="analytics-sub">By event type</h3>
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {EVENT_ORDER.map((ev) => (
            <tr key={ev}>
              <td className="mono">{ev}</td>
              <td>{(stats.byEvent.get(ev) ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
