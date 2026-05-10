import { useId } from 'react'
import type { EventKind } from '../types'

const vb = '-10 -10 20 20'

function slugId(prefix: string, reactId: string): string {
  return `${prefix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/** Mini previews aligned with `drawCombatIcon` (sidebar legend). */
export function LegendShapeIcon({ kind }: { kind: EventKind }) {
  const reactId = useId()
  const lootGradId = slugId('loot', reactId)

  switch (kind) {
    case 'Kill':
      return (
        <svg width="22" height="22" viewBox={vb} aria-hidden>
          <polygon
            points="0,-5.4 4.95,3.15 -4.95,3.15"
            fill="rgba(248, 113, 113, 0.96)"
            stroke="rgba(127, 29, 29, 0.95)"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'Killed':
      return (
        <svg width="22" height="22" viewBox={vb} aria-hidden>
          <circle cx="0" cy="-0.9" r="3.1" fill="rgba(226, 232, 240, 0.95)" stroke="rgba(15, 23, 42, 0.95)" strokeWidth="0.85" />
          <line x1="-2.2" y1="2.2" x2="-3.6" y2="5.4" stroke="rgba(15, 23, 42, 0.95)" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="2.2" y1="2.2" x2="3.6" y2="5.4" stroke="rgba(15, 23, 42, 0.95)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'BotKill':
      return (
        <svg width="22" height="22" viewBox={vb} aria-hidden>
          <rect
            x="-4.2"
            y="-4.2"
            width="8.4"
            height="8.4"
            rx="0.6"
            fill="rgba(56, 189, 248, 0.95)"
            stroke="rgba(12, 74, 110, 0.95)"
            strokeWidth="0.85"
          />
        </svg>
      )
    case 'BotKilled':
      return (
        <svg width="22" height="22" viewBox={vb} aria-hidden>
          <polygon
            points="0,-4.6 4.6,0 0,4.6 -4.6,0"
            fill="rgba(251, 191, 36, 0.95)"
            stroke="rgba(120, 53, 15, 0.92)"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'KilledByStorm':
      return (
        <svg width="22" height="22" viewBox={vb} aria-hidden>
          <circle
            r="4.8"
            fill="rgba(192, 132, 252, 0.95)"
            stroke="rgba(88, 28, 135, 0.95)"
            strokeWidth="1"
            strokeDasharray="2.2 1.8"
          />
        </svg>
      )
    case 'Loot':
      return (
        <svg width="22" height="22" viewBox={vb} aria-hidden>
          <defs>
            <linearGradient id={lootGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>
          <polygon
            points="0,-5.2 1.6,-1.6 5.2,-1.6 2.4,0.8 3.6,4.8 0,2.4 -3.6,4.8 -2.4,0.8 -5.2,-1.6 -1.6,-1.6"
            fill={`url(#${lootGradId})`}
            stroke="rgba(120, 53, 15, 0.9)"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return (
        <svg width="22" height="22" viewBox={vb} aria-hidden>
          <circle r="3" fill="#94a3b8" />
        </svg>
      )
  }
}
