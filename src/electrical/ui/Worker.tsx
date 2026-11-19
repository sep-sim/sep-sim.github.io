import type { PpeId } from '../types'
import { PPE_ITEMS } from '../types'
import sprite from './assets/worker.png'

/**
 * The technician from the arc flash PPE chart. Gear that is on him shows in full colour; gear still on the rack is a
 * faint grey ghost. Nothing is drawn over the artwork. Regions are in the sprite's own pixel space (196 × 432).
 */
type Region = { x: number; y: number; w: number; h: number }
const R: Record<string, Region[]> = {
  hat: [{ x: 40, y: 0, w: 80, h: 50 }],
  visor: [{ x: 48, y: 46, w: 64, h: 44 }],
  hood: [{ x: 18, y: 46, w: 108, h: 80 }],
  jacket: [{ x: 0, y: 96, w: 160, h: 134 }],
  cuffs: [{ x: 0, y: 190, w: 36, h: 32 }, { x: 122, y: 190, w: 38, h: 32 }],
  gloves: [{ x: 0, y: 216, w: 42, h: 56 }, { x: 118, y: 216, w: 44, h: 56 }],
  pants: [{ x: 18, y: 228, w: 120, h: 154 }],
  boots: [{ x: 6, y: 372, w: 150, h: 60 }],
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
    <svg viewBox="0 0 196 432" className="worker photo">
      <defs>
        <filter id="wGhost"><feColorMatrix type="saturate" values="0" /></filter>
        <clipPath id="wWorn">{worn.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}</clipPath>
      </defs>
      <image href={sprite} width="196" height="432" filter="url(#wGhost)" opacity="0.18" />
      <image href={sprite} width="196" height="432" clipPath="url(#wWorn)" />
    </svg>
  )
}
