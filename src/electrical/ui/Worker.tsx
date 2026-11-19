import type { PpeId } from '../types'
import { PPE_ITEMS } from '../types'
import sprite from './assets/worker.png'

/**
 * The technician from the arc flash PPE chart. Gear that is on him shows in full colour; gear still on the rack is a
 * faint grey ghost. Nothing is drawn over the artwork. Regions are in the sprite's own pixel space (192 × 430).
 */
type Region = { x: number; y: number; w: number; h: number }
const R: Record<string, Region[]> = {
  hat: [{ x: 38, y: 6, w: 76, h: 42 }],
  visor: [{ x: 45, y: 44, w: 62, h: 44 }],
  hood: [{ x: 16, y: 44, w: 104, h: 80 }],
  jacket: [{ x: 0, y: 94, w: 152, h: 134 }],
  cuffs: [{ x: 0, y: 188, w: 32, h: 32 }, { x: 120, y: 188, w: 32, h: 32 }],
  gloves: [{ x: 2, y: 214, w: 36, h: 54 }, { x: 118, y: 214, w: 36, h: 54 }],
  pants: [{ x: 16, y: 226, w: 116, h: 154 }],
  boots: [{ x: 8, y: 370, w: 140, h: 40 }],
}

export function Worker({ ppe }: { ppe: PpeId[]; adequate?: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('ar12') ? 'ar12' : on('ar8') ? 'ar8' : 'cotton'
  const rubber = PPE_ITEMS.find((p) => p.slot === 'hands' && p.shockOk && on(p.id))

  const worn: Region[] = []
  if (on('hardhat')) worn.push(...R.hat)
  if (on('faceshield') || body === 'suit40') worn.push(...R.visor, ...R.hood)
  if (body !== 'cotton') worn.push(...R.jacket, ...R.pants)
  if (rubber) worn.push(...R.cuffs)
  if (rubber || on('gloves_leather')) worn.push(...R.gloves)
  if (on('boots')) worn.push(...R.boots)

  return (
    <svg viewBox="0 0 192 430" className="worker photo">
      <defs>
        <filter id="wGhost"><feColorMatrix type="saturate" values="0" /></filter>
        <clipPath id="wWorn">{worn.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}</clipPath>
      </defs>
      <image href={sprite} width="192" height="430" filter="url(#wGhost)" opacity="0.18" />
      <image href={sprite} width="192" height="430" clipPath="url(#wWorn)" />
    </svg>
  )
}
