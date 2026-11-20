import type { PointerEvent } from 'react'
import { useRef, useState } from 'react'
import type { XY } from './sceneTargets'
import { nearestTarget, scanTargets, svgPoint } from './sceneTargets'

export interface LeadSpec {
  /** 'red' | 'black' for the 789, 'plus' | 'minus' for the Megger */
  id: string
  color: string
  label: string
  /** id of the test point the tip is clipped to, if any */
  point: string | null
}

export interface LeadLayerProps {
  leads: LeadSpec[]
  /** viewBox height of the host scene: the cables come in over the bottom edge */
  height: number
  onDrop: (lead: string, target: string | null) => void
}


/** Probe leads the technician drags onto `[data-point]` targets in the host SVG. Cables run in from the meter below the frame. */
export function LeadLayer({ leads, height, onDrop }: LeadLayerProps) {
  const g = useRef<SVGGElement>(null)
  /** where each tip was left: on a target (clipped) or loose on the scene */
  const [parked, setParked] = useState<Record<string, { at: XY; target: string | null }>>({})
  const [drag, setDrag] = useState<{ id: string; at: XY } | null>(null)
  const toSvg = (e: PointerEvent<SVGGElement>): XY => svgPoint(g.current!, e)
  const home = (i: number): XY => [34 + i * 34, height + 12]
  const park = (i: number): XY => [44 + i * 34, height - 48]
  const tipOf = (lead: LeadSpec, i: number): XY => {
    if (drag?.id === lead.id) return drag.at
    const p = parked[lead.id]
    if (!p) return park(i)
    // a tip left on a target stays there only while the engine still has the lead on that point
    if (p.target && p.target !== lead.point) return park(i)
    return p.at
  }

  return (
    <g ref={g} className="leads">
      {leads.map((lead, i) => {
        const [tx, ty] = tipOf(lead, i)
        const [hx, hy] = home(i)
        const dragging = drag?.id === lead.id
        const bx = tx - 18
        const by = ty + 18
        const cable = `M${hx} ${hy} C ${hx} ${hy - 120}, ${bx - 30} ${by + 70}, ${bx} ${by}`
        return (
          <g key={lead.id} className={`lead${dragging ? ' dragging' : ''}`}>
            <path d={cable} className="lead-cable edge" />
            <path d={cable} className="lead-cable" stroke={lead.color} />
            <g
              className="lead-tip"
              onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ id: lead.id, at: toSvg(e) }) }}
              onPointerMove={(e) => { if (drag?.id === lead.id) setDrag({ id: lead.id, at: toSvg(e) }) }}
              onPointerUp={(e) => {
                if (drag?.id !== lead.id) return
                const at = toSvg(e)
                const targets = scanTargets(g.current!)
                const best = nearestTarget(targets, at)
                setDrag(null)
                if (best) {
                  setParked((p) => ({ ...p, [lead.id]: { at: targets[best], target: best } }))
                  if (best !== lead.point) onDrop(lead.id, best)
                } else {
                  setParked((p) => ({ ...p, [lead.id]: { at, target: null } }))
                  if (lead.point) onDrop(lead.id, null)
                }
              }}
            >
              <title>{lead.point ? `${lead.label} lead on ${lead.point}: drag to move or lift` : `drag the ${lead.label} lead to a test point`}</title>
              <line x1={bx} y1={by} x2={tx - 5} y2={ty + 5} stroke="#dfe3e8" strokeWidth="11" strokeLinecap="round" opacity="0.7" />
              <line x1={bx} y1={by} x2={tx - 5} y2={ty + 5} stroke={lead.color} strokeWidth="9" strokeLinecap="round" />
              <line x1={bx + 3} y1={by - 3} x2={bx + 9} y2={by - 9} stroke="#111" strokeWidth="5" strokeLinecap="round" />
              <line x1={tx - 6} y1={ty + 6} x2={tx} y2={ty} stroke="#d8d8d8" strokeWidth="3" strokeLinecap="round" />
              <circle cx={tx - 10} cy={ty + 10} r="15" fill="transparent" />
            </g>
            {!lead.point && !dragging && <text x={bx} y={by + 16} textAnchor="middle" className="lead-tag">{lead.label}</text>}
          </g>
        )
      })}
    </g>
  )
}
