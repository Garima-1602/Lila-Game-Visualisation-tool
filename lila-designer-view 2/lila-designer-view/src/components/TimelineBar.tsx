export interface TimelineBarProps {
  tMin: number
  tMax: number
  currentT: number
  playing: boolean
  speed: number
  onChangeT: (t: number) => void
  onTogglePlay: () => void
  onSpeedChange: (s: number) => void
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const rs = s % 60
  const rms = Math.floor(ms % 1000)
  return `${m}:${rs.toString().padStart(2, '0')}.${rms.toString().padStart(3, '0')}`
}

export function TimelineBar({
  tMin,
  tMax,
  currentT,
  playing,
  speed,
  onChangeT,
  onTogglePlay,
  onSpeedChange,
}: TimelineBarProps) {
  const span = Math.max(1, tMax - tMin)

  return (
    <div className="timeline-bar">
      <button type="button" className="btn-play" onClick={onTogglePlay} aria-pressed={playing}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <label className="speed-label">
        Speed
        <select
          value={String(speed)}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          aria-label="Playback speed"
        >
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
      </label>
      <div className="timeline-track-wrap">
        <input
          type="range"
          className="timeline-range"
          min={tMin}
          max={tMax}
          step={Math.max(1, Math.floor(span / 4000))}
          value={Math.min(tMax, Math.max(tMin, currentT))}
          onChange={(e) => onChangeT(Number(e.target.value))}
          aria-valuemin={tMin}
          aria-valuemax={tMax}
          aria-valuenow={currentT}
        />
      </div>
      <div className="timeline-readout mono">
        {formatMs(currentT - tMin)} / {formatMs(tMax - tMin)}
      </div>
    </div>
  )
}
