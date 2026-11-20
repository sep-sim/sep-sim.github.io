import type { PointerEvent } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'

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

type XY = [number, number]
const SNAP = 18

/** Probe leads the technician drags onto `[data-point]` targets in the host SVG. Cables run in from the meter below the frame. */
export function LeadLayer({ leads, height, onDrop }: LeadLayerProps) {
  const g = useRef<SVGGElement>(null)
  const [targets, setTargets] = useState<Record<string, XY>>({})
  const [parked, setParked] = useState<Record<string, XY>>({})
  const [drag, setDrag] = useState<{ id: string; at: XY } | null>(null)

  useLayoutEffect(() => {
    const svg = g.current?.ownerSVGElement
    if (!svg) return
    const found: Record<string, XY> = {}
    svg.querySelectorAll<SVGGElement>('[data-point]').forEach((el) => {
      const c = el.querySelector('circle')
      const id = el.dataset.point
      if (c && id) found[id] = [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]
    })
    setTargets((prev) => (JSON.stringify(prev) === JSON.stringify(found) ? prev : found))
  }, [leads])

  const toSvg = (e: PointerEvent<SVGGElement>): XY => {
    const svg = g.current!.ownerSVGElement!
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return [p.x, p.y]
  }
  const home = (i: number): XY => [34 + i * 34, height + 12]
  const park = (i: number): XY => [44 + i * 34, height - 48]
  const tipOf = (lead: LeadSpec, i: number): XY => {
    if (drag?.id === lead.id) return drag.at
    if (lead.point && targets[lead.point]) return targets[lead.point]
    return parked[lead.id] ?? park(i)
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
                let best: string | null = null
                let bestD = SNAP
                for (const [id, [x, y]] of Object.entries(targets)) {
                  const d = Math.hypot(x - at[0], y - at[1])
                  if (d < bestD) { best = id; bestD = d }
                }
                setDrag(null)
                if (best) {
                  setParked((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== lead.id)))
                  if (best !== lead.point) onDrop(lead.id, best)
                } else {
                  setParked((p) => ({ ...p, [lead.id]: at }))
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
