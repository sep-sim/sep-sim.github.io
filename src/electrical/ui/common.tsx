import type { ElecState, Point } from '../types'

export interface SceneProps {
  state: ElecState
  onProbe: (p: Point) => void
}

/** A clickable test point on a scene. */
export function TP({ state, id, x, y, label, onProbe, side = 'right' }: { state: ElecState; id: Point; x: number; y: number; label?: string; onProbe: (p: Point) => void; side?: 'left' | 'right' | 'top' | 'bottom' }) {
  const m = state.meter
  const cls = `etp${m.probeA === id ? ' a' : ''}${m.probeB === id ? ' b' : ''}`
  const lx = side === 'left' ? x - 12 : side === 'right' ? x + 12 : x
  const ly = side === 'top' ? y - 12 : side === 'bottom' ? y + 18 : y + 4
  const anchor = side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle'
  return (
    <g className={cls} onClick={(e) => { e.stopPropagation(); onProbe(id) }}>
      <circle cx={x} cy={y} r={8} />
      {label && <text x={lx} y={ly} textAnchor={anchor} className="etp-label">{label}</text>}
    </g>
  )
}

export function Hotspot({ x, y, w, h, label, onClick, hint }: { x: number; y: number; w: number; h: number; label: string; onClick: () => void; hint?: string }) {
  return (
    <g className="hotspot" onClick={(e) => { e.stopPropagation(); onClick() }}>
      <rect x={x} y={y} width={w} height={h} rx={6} />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle">{label}</text>
      {hint && <text x={x + w / 2} y={y + h + 14} textAnchor="middle" className="hint">{hint}</text>}
    </g>
  )
}
