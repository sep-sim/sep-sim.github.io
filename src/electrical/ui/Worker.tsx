import type { PpeId } from '../types'
import { PPE_ITEMS } from '../types'
import sprite from './assets/worker.png'

/**
 * The technician from the arc flash PPE chart. Gear that is on him shows in full colour; gear still on the rack is a
 * faint grey ghost. Nothing is drawn over the artwork. Regions are in the sprite's own pixel space (196 × 437).
 */
type Region = { x: number; y: number; w: number; h: number }
const R: Record<string, Region[]> = {
  hat: [{ x: 40, y: 5, w: 80, h: 50 }],
  visor: [{ x: 48, y: 51, w: 64, h: 44 }],
  hood: [{ x: 18, y: 51, w: 108, h: 80 }],
  jacket: [{ x: 0, y: 101, w: 160, h: 134 }],
  cuffs: [{ x: 0, y: 195, w: 36, h: 32 }, { x: 122, y: 195, w: 38, h: 32 }],
  gloves: [{ x: 0, y: 221, w: 42, h: 56 }, { x: 118, y: 221, w: 44, h: 56 }],
  pants: [{ x: 18, y: 233, w: 120, h: 154 }],
  boots: [{ x: 6, y: 377, w: 150, h: 60 }],
}

export function Worker({ ppe }: { ppe: PpeId[]; adequate?: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('frj12') ? 'frj12' : on('frs8') ? 'frs8' : 'cotton'
  const rubber = PPE_ITEMS.find((p) => p.slot === 'hands' && p.shockOk && on(p.id))

  const worn: Region[] = []
  if (on('hardhat')) worn.push(...R.hat)
  if (on('hood40')) worn.push(...R.visor, ...R.hood)
  if (body !== 'cotton') worn.push(...R.jacket, ...R.pants)
  if (rubber) worn.push(...R.cuffs)
  if (rubber || on('gloves_leather')) worn.push(...R.gloves)
  if (on('boots')) worn.push(...R.boots)

  return (
    <svg viewBox="0 0 196 437" className="worker photo">
      <defs>
        <filter id="wGhost"><feColorMatrix type="saturate" values="0" /></filter>
        <clipPath id="wWorn">{worn.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}</clipPath>
      </defs>
      <image href={sprite} width="196" height="437" filter="url(#wGhost)" opacity="0.18" />
      <image href={sprite} width="196" height="437" clipPath="url(#wWorn)" />
    </svg>
  )
}
