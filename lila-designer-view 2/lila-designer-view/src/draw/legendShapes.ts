import type { EventKind } from '../types'

/** Five-point star centered at (px, py) in minimap pixel space. */
export function fillStar(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  outerR: number,
  innerR: number,
  fill: string,
  stroke: string,
  lineW: number,
) {
  const spikes = 5
  ctx.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const a = (Math.PI / spikes) * i - Math.PI / 2
    const x = px + Math.cos(a) * r
    const y = py + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineW
  ctx.fill()
  ctx.stroke()
}

export function drawCombatIcon(
  ctx: CanvasRenderingContext2D,
  event: EventKind,
  px: number,
  py: number,
  scale: number,
) {
  const s = 6 / scale
  const lw = 1.4 / scale
  ctx.lineWidth = lw
  ctx.lineJoin = 'round'

  switch (event) {
    case 'Kill': {
      ctx.strokeStyle = 'rgba(127, 29, 29, 0.95)'
      ctx.fillStyle = 'rgba(248, 113, 113, 0.96)'
      ctx.beginPath()
      ctx.moveTo(px, py - s)
      ctx.lineTo(px + s * 0.9, py + s * 0.55)
      ctx.lineTo(px - s * 0.9, py + s * 0.55)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'Killed': {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.95)'
      ctx.fillStyle = 'rgba(226, 232, 240, 0.95)'
      const r = s * 0.42
      ctx.beginPath()
      ctx.arc(px, py - s * 0.15, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.lineWidth = 1.6 / scale
      ctx.beginPath()
      ctx.moveTo(px - s * 0.55, py + s * 0.2)
      ctx.lineTo(px - s * 0.85, py + s * 0.95)
      ctx.moveTo(px + s * 0.55, py + s * 0.2)
      ctx.lineTo(px + s * 0.85, py + s * 0.95)
      ctx.stroke()
      break
    }
    case 'BotKill': {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.95)'
      ctx.strokeStyle = 'rgba(12, 74, 110, 0.95)'
      ctx.beginPath()
      ctx.rect(px - s * 0.65, py - s * 0.65, s * 1.3, s * 1.3)
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'BotKilled': {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.95)'
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.92)'
      ctx.beginPath()
      ctx.moveTo(px + s, py)
      ctx.lineTo(px, py + s)
      ctx.lineTo(px - s, py)
      ctx.lineTo(px, py - s)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'KilledByStorm': {
      ctx.strokeStyle = 'rgba(88, 28, 135, 0.95)'
      ctx.fillStyle = 'rgba(192, 132, 252, 0.95)'
      ctx.setLineDash([3 / scale, 2.5 / scale])
      ctx.beginPath()
      ctx.arc(px, py, s * 0.85, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([])
      break
    }
    default:
      ctx.beginPath()
      ctx.arc(px, py, s * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()
  }
}
