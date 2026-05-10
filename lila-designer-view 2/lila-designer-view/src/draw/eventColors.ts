import type { EventKind } from '../types'

export const MARKER_RADIUS = 5

export function markerStyle(event: EventKind): { fill: string; stroke: string; label: string } {
  switch (event) {
    case 'Kill':
      return { fill: 'rgba(248, 113, 113, 0.96)', stroke: 'rgba(127, 29, 29, 0.95)', label: 'Kill (human)' }
    case 'Killed':
      return { fill: 'rgba(226, 232, 240, 0.95)', stroke: 'rgba(15, 23, 42, 0.95)', label: 'Killed (human)' }
    case 'BotKill':
      return { fill: 'rgba(56, 189, 248, 0.95)', stroke: 'rgba(12, 74, 110, 0.95)', label: 'Bot kill' }
    case 'BotKilled':
      return { fill: 'rgba(251, 191, 36, 0.95)', stroke: 'rgba(120, 53, 15, 0.92)', label: 'Killed by bot' }
    case 'KilledByStorm':
      return { fill: 'rgba(192, 132, 252, 0.95)', stroke: 'rgba(88, 28, 135, 0.95)', label: 'Storm' }
    case 'Loot':
      return { fill: 'rgba(250, 204, 21, 0.96)', stroke: 'rgba(120, 53, 15, 0.92)', label: 'Loot' }
    default:
      return { fill: '#fff', stroke: '#333', label: event }
  }
}
