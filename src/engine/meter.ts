// What the Fluke 789 shows for the current knob position and lead placement.
// Pure: readings are derived from the solved loop every render; the session logs a snapshot when leads are placed.

import type { NodeId, SessionState } from './types'
import { NODE_LABEL } from './types'
import type { LoopSolution } from './loop'
import { leadsAcrossInput, leadsAcrossTransmitter, meterInOutput, meterSimulating, meterSourcing, resistanceBetween } from './loop'

export interface MeterReading {
  /** Primary display text, e.g. "24.02" */
  primary: string
  /** Unit annunciators at the top right of the LCD, e.g. ["mA", "DC"] */
  units: string[]
  /** Secondary display, e.g. "50.1 %" in mA modes */
  secondary: string
  /** Range annunciator shown under the primary digits, e.g. "30" (mA range) */
  range: string
  beep: boolean
  /** Lower-right annunciators: LOOP POWER, 250Ω HART, SOURCE, SIMULATE, RAMP … */
  annunciators: string[]
  /** What the log line should say; empty when nothing meaningful is connected */
  logText: string
  /** Set when this reading is physically meaningless or unsafe */
  warn: string | null
}

export function pctOfSpan(ma: number): number {
  return ((ma - 4) / 16) * 100
}

function fmt(v: number, digits: number): string {
  return v.toFixed(digits)
}

function lbl(n: NodeId | null): string {
  return n ? NODE_LABEL[n] : '—'
}

const NONE: MeterReading = { primary: '', units: [], secondary: '', range: '', beep: false, annunciators: [], logText: '', warn: null }

/** Which output behaviour the 789 has auto-selected for the current lead placement. */
export function outputBehaviour(s: SessionState, sol: LoopSolution): 'simulate' | 'source' | 'fighting' | 'open' | 'none' {
  if (!meterInOutput(s)) return 'none'
  if (meterSimulating(s)) return 'simulate'
  if (meterSourcing(s)) return 'source'
  if (leadsAcrossInput(s) && sol.energized) return 'fighting'
  if (leadsAcrossTransmitter(s)) return 'open'
  return 'none'
}

export function meterReading(s: SessionState, sol: LoopSolution): MeterReading {
  const m = s.meter
  if (m.mode === 'OFF') return NONE
  const a = m.probeA
  const b = m.probeB
  const placed = a != null && b != null
  const rel = (v: number) => (m.rel != null ? v - m.rel : v)
  const ann: string[] = []
  if (m.rel != null) ann.push('REL Δ')
  if (m.minMax !== 'off') ann.push(m.minMax.toUpperCase())

  switch (m.mode) {
    case 'VAC': {
      const v = placed ? 0.02 : 0
      return { ...NONE, primary: fmt(rel(v), 3), units: ['V', 'AC'], range: m.manualRange ? '30' : '', annunciators: ann, logText: placed ? `V AC ${lbl(a)} → ${lbl(b)}: ${fmt(v, 2)} V AC` : '' }
    }
    case 'VDC':
    case 'mVDC': {
      const mv = m.mode === 'mVDC'
      if (!placed) return { ...NONE, primary: '- - - -', units: [mv ? 'mV' : 'V', 'DC'], range: m.manualRange ? (mv ? '300' : '30') : '', annunciators: ann }
      const v = sol.node[a] - sol.node[b]
      const shown = mv ? Math.max(-300, Math.min(300, v * 1000)) : v
      const over = mv && Math.abs(v * 1000) > 300
      return {
        ...NONE, primary: over ? 'OL' : fmt(rel(shown), mv ? 1 : 3), units: [mv ? 'mV' : 'V', 'DC'], range: m.manualRange ? (mv ? '300' : '30') : '',
        annunciators: ann, logText: `${mv ? 'mV' : 'V'} DC ${lbl(a)} → ${lbl(b)}: ${over ? 'OL' : fmt(shown, mv ? 1 : 2)} ${mv ? 'mV' : 'V'} DC`,
      }
    }
    case 'OHM': {
      if (!placed) return { ...NONE, primary: 'OL', units: ['Ω'], annunciators: ann }
      const live = sol.supplyVolts > 0 && (sol.node[a] > 0.5 || sol.node[b] > 0.5)
      if (live) {
        return {
          ...NONE, primary: 'OL', units: ['Ω'], annunciators: [...ann, '⚠'],
          logText: `Ω ${lbl(a)} → ${lbl(b)}: OL (live circuit)`,
          warn: `Resistance measured on a live circuit (${lbl(a)} → ${lbl(b)}). Reading is meaningless and risks the meter. De-energize first.`,
        }
      }
      const r = resistanceBetween(s, a, b)
      const beep = r !== 'OL' && !r.includes('k') && parseFloat(r) < 30
      return {
        ...NONE, primary: r.replace(/ ?(k?Ω.*)$/, ''), units: [r.includes('k') ? 'kΩ' : 'Ω'], beep,
        annunciators: beep ? [...ann, '·)))'] : ann,
        logText: `Ω ${lbl(a)} → ${lbl(b)}: ${r}${beep ? ' (continuity)' : ''}`,
      }
    }
    case 'mA': {
      if (a == null) return { ...NONE, primary: '0.000', units: ['mA', 'DC'], secondary: '-25.0 %', range: '30', annunciators: ann }
      const ma = sol.current
      const how = a === 'XMTR_TEST' ? 'across PT-101 TEST terminals (loop not broken)' : `in series at ${lbl(a)} (lifted wire)`
      return {
        ...NONE, primary: fmt(rel(ma), 3), units: ['mA', 'DC'], secondary: `${fmt(pctOfSpan(ma), 1)} %`, range: '30', annunciators: ann,
        logText: `mA DC ${how}: ${fmt(ma, 2)} mA`,
      }
    }
    case 'LOOP': {
      const annL = [...ann, 'LOOP POWER', ...(m.hart250 ? ['250Ω HART'] : [])]
      if (!placed) return { ...NONE, primary: '0.000', units: ['mA', 'DC'], secondary: '-25.0 %', range: '30', annunciators: annL }
      if (!leadsAcrossTransmitter(s)) {
        return {
          ...NONE, primary: '0.000', units: ['mA', 'DC'], secondary: '-25.0 %', range: '30', annunciators: annL,
          logText: `mA LOOP POWER ${lbl(a)} → ${lbl(b)}: 0.000 mA (nothing to power between these points)`,
          warn: 'LOOP POWER feeds 24 V between the leads. Only a lifted 2-wire transmitter belongs there.',
        }
      }
      const ma = sol.meterCurrent
      return {
        ...NONE, primary: fmt(rel(ma), 3), units: ['mA', 'DC'], secondary: `${fmt(pctOfSpan(ma), 1)} %`, range: '30', annunciators: annL,
        logText: `mA LOOP POWER across PT-101 (transmitter lifted, powered by the 789): ${fmt(ma, 2)} mA`,
      }
    }
    case 'OUT':
    case 'OUT_AUTO': {
      const out = m.outMa
      const behaviour = outputBehaviour(s, sol)
      const annO = [...ann, ...(m.mode === 'OUT_AUTO' ? [m.ramp === 'step' ? 'STEP' : `${m.ramp.toUpperCase()} RAMP`] : [])]
      if (behaviour === 'simulate') annO.push('SIMULATE')
      else if (behaviour !== 'none') annO.push('SOURCE')
      const base: MeterReading = { ...NONE, primary: fmt(out, 3), units: ['mA', 'DC'], secondary: `${fmt(pctOfSpan(out), 1)} %`, range: '', annunciators: annO }
      if (!placed) return base
      switch (behaviour) {
        case 'simulate':
          return { ...base, logText: `SIMULATE across PT-101 wires: ${fmt(out, 2)} mA driven through the loop` }
        case 'source':
          return { ...base, logText: `SOURCE into ${lbl(a)} → ${lbl(b)}: ${fmt(out, 2)} mA into the RTU input` }
        case 'fighting':
          return { ...base, primary: 'OL', annunciators: [...annO, '⚠'], logText: `OUTPUT into a live loop at ${lbl(a)} → ${lbl(b)}: out of compliance`, warn: 'Sourcing into a powered input fights the loop supply. Pull F1 first.' }
        case 'open':
          return { ...base, primary: 'OL', logText: 'OUTPUT across PT-101 wires: no external loop voltage and no return path, nothing flows' }
        default:
          return { ...base, logText: `OUTPUT ${lbl(a)} → ${lbl(b)}: no effect at these points`, warn: 'OUTPUT belongs across the transmitter wires (simulate) or a de-energized input (source).' }
      }
    }
  }
  return NONE
}
