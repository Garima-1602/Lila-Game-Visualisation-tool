import type { AsyncBuffer } from 'hyparquet'

/** In-memory parquet file for hyparquet */
export function asyncBufferFromUint8Array(u8: Uint8Array): AsyncBuffer {
  return {
    byteLength: u8.byteLength,
    slice(start, end = u8.byteLength) {
      const s = Math.max(0, start)
      const e = Math.min(end, u8.byteLength)
      return u8.slice(s, e).buffer
    },
  }
}
