// Electrical + process model for a single 2-wire 4-20 mA loop.
// The loop is a series chain: PS+ → fuse → TB → + conductor → JB → transmitter → JB → − conductor → TB → AI load → PS−.

import type { NodeId, SessionState, FaultKind } from './types'

export const SERIES_ORDER: NodeId[] = [
  'PS_PLUS', 'F1_OUT', 'TB_1', 'JB_1', 'XMTR_PLUS', 'XMTR_MINUS', 'JB_2', 'TB_2', 'AI_PLUS', 'AI_MINUS', 'PS_MINUS',
]

// segment k joins SERIES_ORDER[k] and SERIES_ORDER[k+1]
export const SEG = {
  FUSE: 0, CAB_PLUS: 1, PLUS_CONDUCTOR: 2, JB_PLUS: 3, XMTR: 4, JB_MINUS: 5,
  MINUS_CONDUCTOR: 6, CAB_MINUS: 7, LOAD: 8, CAB_RETURN: 9,
} as const

export interface LoopSolution {
  supplyVolts: number
  energized: boolean
  current: number
  xmtrDemand: number
  node: Record<NodeId, number>
  openSegments: number[]
  reversed: boolean
  pressureSeen: number
  processPressure: number
  hartReachable: boolean
}

function pseudo(t: number): number {
  const x = Math.sin(t * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function hasFault(s: SessionState, kind: FaultKind): boolean {
  return s.faults.some((f) => f.kind === kind)
}

export function processPressure(s: SessionState): number {
  const p = s.scenario.process
  return p.basePressure + p.swing * Math.sin((2 * Math.PI * s.t) / p.period) + p.noise * (pseudo(s.t) - 0.5) * 2
}

export function pressureSeen(s: SessionState): number {
  if (!s.isolationOpen) return s.pumpPressure ?? s.trappedPressure
  if (hasFault(s, 'impulse_plugged')) return s.trappedPressure
  return processPressure(s)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function xmtrDemand(s: SessionState): number {
  if (s.hart.loopTest != null) return s.hart.loopTest
  if (hasFault(s, 'xmtr_fail_high')) return 21.6
  if (hasFault(s, 'xmtr_fail_low')) return 3.6
  const span = s.xmtr.urv - s.xmtr.lrv
  const raw = 4 + (16 * (pressureSeen(s) - s.xmtr.lrv)) / (span === 0 ? 1 : span)
  return clamp(raw, 3.8, 20.5)
}

export function openSegments(s: SessionState): number[] {
  const out: number[] = []
  if (s.fusePulled || hasFault(s, 'blown_fuse')) out.push(SEG.FUSE)
  if (hasFault(s, 'open_plus_conductor')) out.push(SEG.PLUS_CONDUCTOR)
  if (hasFault(s, 'loose_terminal_jb_plus')) out.push(SEG.JB_PLUS)
  if (hasFault(s, 'loose_terminal_jb_minus')) out.push(SEG.JB_MINUS)
  if (hasFault(s, 'open_minus_conductor')) out.push(SEG.MINUS_CONDUCTOR)
  return out
}

export function solveLoop(s: SessionState): LoopSolution {
  const cfg = s.scenario.loop
  const supplyVolts = hasFault(s, 'supply_dead') ? 0 : cfg.supplyVolts
  const opens = openSegments(s)
  const reversed = hasFault(s, 'reversed_polarity_jb')
  const demand = xmtrDemand(s)
  const node = {} as Record<NodeId, number>
  for (const n of SERIES_ORDER) node[n] = 0
  node.XMTR_TEST = 0

  const energized = supplyVolts > 0 && !opens.includes(SEG.FUSE)
  let current = 0

  if (supplyVolts < 10.5 || opens.length > 0 || reversed) {
    // No current flows. Everything upstream of the first break sits at supply, downstream at 0.
    // A reverse-biased transmitter blocks like an open at the transmitter segment.
    const firstOpen = opens.length > 0 ? Math.min(...opens) : SEG.XMTR
    for (let i = 0; i < SERIES_ORDER.length; i++) {
      node[SERIES_ORDER[i]] = i <= firstOpen ? supplyVolts : 0
    }
    if (reversed && opens.length === 0) {
      // Conductors swapped at JB-1: transmitter (+) lands on the − conductor side.
      node.XMTR_PLUS = 0
      node.XMTR_MINUS = supplyVolts
    }
    node.XMTR_TEST = node.XMTR_MINUS
  } else {
    current = demand
    const I = current / 1000
    const Rw = cfg.wireOhmsPerConductor
    node.PS_MINUS = 0
    node.AI_MINUS = 0
    node.AI_PLUS = I * cfg.loadOhms
    node.TB_2 = node.AI_PLUS
    node.JB_2 = node.TB_2 + I * Rw
    node.XMTR_MINUS = node.JB_2
    node.XMTR_TEST = node.JB_2
    node.PS_PLUS = supplyVolts
    node.F1_OUT = supplyVolts
    node.TB_1 = supplyVolts
    node.JB_1 = supplyVolts - I * Rw
    node.XMTR_PLUS = node.JB_1
  }

  return {
    supplyVolts,
    energized,
    current,
    xmtrDemand: demand,
    node,
    openSegments: opens,
    reversed,
    pressureSeen: pressureSeen(s),
    processPressure: processPressure(s),
    hartReachable: s.hart.connected && current >= 3.5 && !reversed,
  }
}

/** Resistance a meter would see between two nodes on a de-energized loop. */
export function resistanceBetween(s: SessionState, a: NodeId, b: NodeId): string {
  const idx = (n: NodeId) => SERIES_ORDER.indexOf(n === 'XMTR_TEST' ? 'XMTR_MINUS' : n)
  const ia = idx(a)
  const ib = idx(b)
  if (ia === ib) return '0.1 Ω'
  const lo = Math.min(ia, ib)
  const hi = Math.max(ia, ib)
  const opens = openSegments(s)
  let r = 0
  for (let k = lo; k < hi; k++) {
    if (opens.includes(k)) return 'OL'
    switch (k) {
      case SEG.XMTR: return '1.4 kΩ (device)'
      case SEG.PLUS_CONDUCTOR:
      case SEG.MINUS_CONDUCTOR: r += s.scenario.loop.wireOhmsPerConductor; break
      case SEG.LOAD: r += s.scenario.loop.loadOhms; break
      default: r += 0.1
    }
  }
  return `${r.toFixed(1)} Ω`
}

export function hmiReading(s: SessionState, sol: LoopSolution): { eu: number; ma: number; quality: string } {
  const cfg = s.scenario.loop
  const ma = sol.current
  const eu = cfg.lrv + ((ma - 4) / 16) * (cfg.urv - cfg.lrv)
  let quality = 'GOOD'
  if (ma < 3.7) quality = 'BAD – UNDER RANGE'
  else if (ma > 20.6) quality = 'BAD – OVER RANGE'
  return { eu, ma, quality }
}

/** True when the loop is back in service: HMI tracks process within 1% of span, nothing left in a test state. */
export function loopInService(s: SessionState): boolean {
  if (!s.isolationOpen || s.pumpPressure != null || s.hart.loopTest != null || s.fusePulled) return false
  const sol = solveLoop(s)
  const { eu, quality } = hmiReading(s, sol)
  if (quality !== 'GOOD') return false
  const span = s.scenario.loop.urv - s.scenario.loop.lrv
  return Math.abs(eu - sol.processPressure) <= 0.01 * span
}
