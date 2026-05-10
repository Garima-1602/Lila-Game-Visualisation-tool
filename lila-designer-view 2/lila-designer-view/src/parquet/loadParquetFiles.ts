import { parquetReadObjects } from 'hyparquet'
import { compressors } from 'hyparquet-compressors'
import type { GameEvent } from '../types'
import { asyncBufferFromUint8Array } from './asyncBuffer'
import { rawRowsToGameEvents } from './parseRows'

export interface FileLoadInput {
  buffer: Uint8Array
  sourceDay: string | null
  fileName: string
}

export interface LoadProgress {
  done: number
  total: number
  fileName: string
}

const CONCURRENCY = 4

async function readOneFile(input: FileLoadInput): Promise<GameEvent[]> {
  const file = asyncBufferFromUint8Array(input.buffer)
  const rows = await parquetReadObjects({
    file,
    compressors,
    utf8: true,
  })
  const events = rawRowsToGameEvents(rows as Record<string, unknown>[])
  const day = input.sourceDay ?? undefined
  return events.map((e) => ({ ...e, sourceDay: day }))
}

export async function loadParquetFiles(
  files: FileLoadInput[],
  onProgress?: (p: LoadProgress) => void,
): Promise<GameEvent[]> {
  const all: GameEvent[] = []
  let done = 0
  const total = files.length
  const queue = [...files]

  const workers = Array.from({ length: Math.min(CONCURRENCY, Math.max(1, queue.length)) }, async () => {
    while (queue.length) {
      const next = queue.shift()
      if (!next) break
      onProgress?.({ done, total, fileName: next.fileName })
      const chunk = await readOneFile(next)
      all.push(...chunk)
      done += 1
      onProgress?.({ done, total, fileName: next.fileName })
    }
  })
  await Promise.all(workers)

  all.sort((a, b) => {
    const mc = a.match_id.localeCompare(b.match_id)
    if (mc !== 0) return mc
    if (a.tMs !== b.tMs) return a.tMs - b.tMs
    return a.user_id.localeCompare(b.user_id)
  })
  return all
}

/** Parse webkitRelativePath like "player_data/February_10/file.nakama-0" */
export function dayFromRelativePath(path: string): string | null {
  const m = path.match(/(February_\d+)/i)
  return m ? m[1] : null
}
