import type { MapId } from './types'

/** README: minimap images are 1024×1024; world (x, z) maps via scale + origin. */
export const MINIMAP_SIZE = 1024

export interface MapMiniConfig {
  mapId: MapId
  label: string
  scale: number
  originX: number
  originZ: number
  /** public URL under Vite public/ */
  imageUrl: string
}

export const MAPS: MapMiniConfig[] = [
  {
    mapId: 'AmbroseValley',
    label: 'Ambrose Valley',
    scale: 900,
    originX: -370,
    originZ: -473,
    imageUrl: './minimaps/AmbroseValley_Minimap.png',
  },
  {
    mapId: 'GrandRift',
    label: 'Grand Rift',
    scale: 581,
    originX: -290,
    originZ: -290,
    imageUrl: './minimaps/GrandRift_Minimap.png',
  },
  {
    mapId: 'Lockdown',
    label: 'Lockdown',
    scale: 1000,
    originX: -500,
    originZ: -500,
    imageUrl: './minimaps/Lockdown_Minimap.jpg',
  },
]

export function mapConfigById(id: string): MapMiniConfig | undefined {
  return MAPS.find((m) => m.mapId === id)
}

/**
 * World xz → minimap pixel (0–1024), image space (origin top-left, Y down).
 * README: u = (x - origin_x) / scale, v = (z - origin_z) / scale;
 * pixel_x = u * 1024, pixel_y = (1 - v) * 1024
 */
export function worldToMinimap1024(
  x: number,
  z: number,
  cfg: MapMiniConfig,
): { px: number; py: number } {
  const u = (x - cfg.originX) / cfg.scale
  const v = (z - cfg.originZ) / cfg.scale
  return {
    px: u * MINIMAP_SIZE,
    py: (1 - v) * MINIMAP_SIZE,
  }
}
