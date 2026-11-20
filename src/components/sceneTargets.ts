import type { PointerEvent } from 'react'

export type XY = [number, number]
export const SNAP = 18

/** Positions of every `[data-point]` target in the SVG that holds `g`, read at the moment of a drop. */
export function scanTargets(g: SVGGElement): Record<string, XY> {
  const found: Record<string, XY> = {}
  g.ownerSVGElement?.querySelectorAll<SVGGElement>('[data-point]').forEach((el) => {
    const c = el.querySelector('circle')
    const id = el.dataset.point
    if (c && id) found[id] = [Number(c.getAttribute('cx')), Number(c.getAttribute('cy'))]
  })
  return found
}

/** Pointer position in the SVG's own coordinates. */
export function svgPoint(g: SVGGElement, e: PointerEvent<SVGGElement>): XY {
  const svg = g.ownerSVGElement!
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
  return [p.x, p.y]
}

/** Nearest target within snapping distance of `at`, if any. */
export function nearestTarget(targets: Record<string, XY>, at: XY): string | null {
  let best: string | null = null
  let bestD = SNAP
  for (const [id, [x, y]] of Object.entries(targets)) {
    const d = Math.hypot(x - at[0], y - at[1])
    if (d < bestD) { best = id; bestD = d }
  }
  return best
}
