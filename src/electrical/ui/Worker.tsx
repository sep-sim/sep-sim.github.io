import type { PpeId } from '../types'
import { PPE_ITEMS } from '../types'
import sprite from './assets/worker.png'

/**
 * The technician from the arc flash PPE chart. The figure is the chart's own artwork; gear that is not yet on him
 * shows as a grey ghost with a dashed outline, and picking an item from the rack brings that part to full colour.
 * Regions are in the sprite's own pixel space (192 × 430).
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

export function Worker({ ppe, adequate }: { ppe: PpeId[]; adequate: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('ar12') ? 'ar12' : on('ar8') ? 'ar8' : 'cotton'
  const rubber = PPE_ITEMS.find((p) => p.slot === 'hands' && p.shockOk && on(p.id))
  const tag = { cotton: '', ar8: 'ATPV 8', ar12: 'ATPV 12', suit40: 'ATPV 40' }[body]

  const worn: Region[] = []
  const missing: { label: string; r: Region }[] = []
  const slot = (key: keyof typeof R, isOn: boolean, label: string) => {
    if (isOn) worn.push(...R[key])
    else missing.push({ label, r: R[key][0] })
  }
  slot('hat', on('hardhat'), 'hard hat')
  slot('visor', on('faceshield') || body === 'suit40', 'face shield')
  slot('hood', body === 'suit40' || on('faceshield'), body === 'suit40' ? 'hood' : 'hood or balaclava')
  slot('jacket', body !== 'cotton', 'AR clothing')
  slot('pants', body !== 'cotton', 'AR pants')
  slot('cuffs', rubber != null, 'rubber gloves')
  slot('gloves', rubber != null || on('gloves_leather'), 'gloves')
  slot('boots', on('boots'), 'leather boots')

  return (
    <svg viewBox="0 0 192 430" className={`worker photo ${adequate ? 'ok' : ''}`}>
      <defs>
        <filter id="wGhost"><feColorMatrix type="saturate" values="0" /></filter>
        <clipPath id="wWorn">{worn.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}</clipPath>
      </defs>
      <image href={sprite} width="192" height="430" filter="url(#wGhost)" opacity="0.22" />
      <image href={sprite} width="192" height="430" clipPath="url(#wWorn)" />
      {/* class colour on the rubber cuffs */}
      {rubber && R.cuffs.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={r.y + 4} width={r.w} height={r.h - 8} fill={rubber.cuff} opacity="0.55" style={{ mixBlendMode: 'multiply' }} />
          <text x={r.x + r.w / 2} y={r.y + 22} textAnchor="middle" style={{ fontSize: 8, fontWeight: 800, fill: rubber.gloveClass === '1' || rubber.gloveClass === '00' ? '#222' : '#fff', paintOrder: 'stroke', stroke: '#0008', strokeWidth: 1.5 }}>{rubber.gloveClass}</text>
        </g>
      ))}
      {/* arc rating on the chest once an AR layer is on */}
      {tag && <g><rect x="104" y="136" width="30" height="16" rx="2" fill="#f4f4f0" stroke="#333" /><text x="119" y="143" textAnchor="middle" style={{ fontSize: 5.5, fontWeight: 800, fill: '#111' }}>{tag.split(' ')[0]}</text><text x="119" y="150" textAnchor="middle" style={{ fontSize: 6, fontWeight: 800, fill: '#111' }}>{tag.split(' ')[1]}</text></g>}
      {/* ghosted items get a dashed outline and a label */}
      {missing.map((m) => (
        <g key={m.label}>
          <rect x={m.r.x} y={m.r.y} width={m.r.w} height={m.r.h} fill="none" stroke="#c0252b" strokeWidth="1.2" strokeDasharray="3 2" rx="3" />
          <text x={m.r.x + m.r.w / 2} y={m.r.y + m.r.h / 2 + 3} textAnchor="middle" style={{ fontSize: 7.5, fontWeight: 800, fill: '#c0252b', paintOrder: 'stroke', stroke: '#fff', strokeWidth: 2.5 }}>{m.label}</text>
        </g>
      ))}
    </svg>
  )
}
