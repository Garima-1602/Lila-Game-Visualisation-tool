export type MapId = 'AmbroseValley' | 'GrandRift' | 'Lockdown'

export type EventKind =
  | 'Position'
  | 'BotPosition'
  | 'Kill'
  | 'Killed'
  | 'BotKill'
  | 'BotKilled'
  | 'KilledByStorm'
  | 'Loot'

export interface RawGameRow {
  user_id: string
  match_id: string
  map_id: string
  x: number
  y: number
  z: number
  ts: number
  event: EventKind
}

export interface LoadedFileMeta {
  /** e.g. February_10 from webkitRelativePath */
  sourceDay: string | null
  fileName: string
}

export interface GameEvent extends RawGameRow {
  /** ms within match — comparable across files sharing match_id */
  tMs: number
  isBot: boolean
  /** Populated when loading from folder structure */
  sourceDay?: string
}

export type HeatmapMode =
  | 'off'
  | 'traffic'
  | 'traffic_human'
  | 'traffic_bot'
  | 'kills'
  | 'loot'
  | 'storm_deaths'
  | 'deaths'

/** Match phase window relative to loaded timeline bounds (design pacing). */
export type MatchPhase = 'all' | 'early' | 'mid' | 'late'

export const MOVEMENT_EVENTS: EventKind[] = ['Position', 'BotPosition']

export const MARKER_EVENTS: EventKind[] = [
  'Kill',
  'Killed',
  'BotKill',
  'BotKilled',
  'KilledByStorm',
  'Loot',
]

/** Minimap overlay toggles (telemetry up to timeline scrubber). */
export interface MapLegendToggles {
  lootStars: boolean
  combatIcons: boolean
}
