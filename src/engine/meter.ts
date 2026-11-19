// What the Fluke 789 shows for the current knob position and lead placement.
// Pure: readings are derived from the solved loop every render; the session logs a snapshot when leads are placed.

import type { NodeId, SessionState } from './types'
import { NODE_LABEL } from './types'
import type { LoopSolution } from './loop'
import { leadsAcrossInput, leadsAcrossTransmitter, resistanceBetween } from './loop'

export interface MeterReading {
  /** Primary display text, e.g. "24.02" */
  primary: string
  unit: string
  /** Secondary display, e.g. "50.1 %" in mA modes */
  secondary: string
  /** 0..1 bar graph fill, or null */
  bar: number | null
  beep: boolean
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

const NONE: MeterReading = { primary: '', unit: '', secondary: '', bar: null, beep: false, annunciators: [], logText: '', warn: null }

export function meterReading(s: SessionState, sol: LoopSolution): MeterReading {
  const m = s.meter
  const ann: string[] = ['AUTO']
  if (m.loopPower) ann.push('LOOP PWR')
  if (m.hart250) ann.push('250Ω')
  if (m.ramp !== 'off') ann.push('RAMP')
  if (m.mode === 'OFF') return NONE

  const a = m.probeA
  const b = m.probeB
  const placed = a != null && b != null

  switch (m.mode) {
    case 'VAC': {
      const v = placed ? 0.02 : 0
      return { ...NONE, primary: fmt(v, 2), unit: 'V AC', annunciators: ann, logText: placed ? `V AC ${lbl(a)} → ${lbl(b)}: ${fmt(v, 2)} V AC` : '' }
    }
    case 'VDC': {
      if (!placed) return { ...NONE, primary: '- - - -', unit: 'V DC', annunciators: ann }
      const v = sol.node[a] - sol.node[b]
      return { ...NONE, primary: fmt(v, 2), unit: 'V DC', annunciators: ann, logText: `V DC ${lbl(a)} → ${lbl(b)}: ${fmt(v, 2)} V DC` }
    }
    case 'OHM': {
      if (!placed) return { ...NONE, primary: 'OL', unit: 'Ω', annunciators: ann }
      const live = sol.supplyVolts > 0 && (sol.node[a] > 0.5 || sol.node[b] > 0.5)
      if (live) {
        return {
          ...NONE, primary: 'OL', unit: 'Ω', annunciators: [...ann, '⚠'],
          logText: `Ω ${lbl(a)} → ${lbl(b)}: OL (live circuit)`,
          warn: `Resistance measured on a live circuit (${lbl(a)} → ${lbl(b)}). Reading is meaningless and risks the meter. De-energize first.`,
        }
      }
      const r = resistanceBetween(s, a, b)
      const beep = r !== 'OL' && !r.includes('k') && parseFloat(r) < 30
      return {
        ...NONE, primary: r.replace(/ ?(k?Ω.*)$/, ''), unit: r.includes('k') ? 'kΩ' : 'Ω', beep,
        annunciators: beep ? [...ann, '·)))'] : ann,
        logText: `Ω ${lbl(a)} → ${lbl(b)}: ${r}${beep ? ' (continuity)' : ''}`,
      }
    }
    case 'mA': {
      if (m.loopPower) {
        if (!placed) return { ...NONE, primary: '0.00', unit: 'mA', secondary: '-25.0 %', bar: 0, annunciators: ann }
        if (!leadsAcrossTransmitter(s)) {
          return {
            ...NONE, primary: '0.00', unit: 'mA', secondary: '-25.0 %', bar: 0, annunciators: ann,
            logText: `mA LOOP PWR ${lbl(a)} → ${lbl(b)}: 0.00 mA (nothing to power between these points)`,
            warn: 'LOOP POWER feeds 24 V between the leads. Only a lifted 2-wire transmitter belongs there.',
          }
        }
        const ma = sol.meterCurrent
        return {
          ...NONE, primary: fmt(ma, 2), unit: 'mA', secondary: `${fmt(pctOfSpan(ma), 1)} %`, bar: ma / 24, annunciators: ann,
          logText: `mA LOOP PWR across PT-101 (transmitter lifted, powered by the 789): ${fmt(ma, 2)} mA`,
        }
      }
      if (a == null) return { ...NONE, primary: '0.00', unit: 'mA', secondary: '-25.0 %', bar: 0, annunciators: ann }
      const ma = sol.current
      const how = a === 'XMTR_TEST' ? 'across PT-101 TEST terminals (loop not broken)' : `in series at ${lbl(a)} (lifted wire)`
      return {
        ...NONE, primary: fmt(ma, 2), unit: 'mA', secondary: `${fmt(pctOfSpan(ma), 1)} %`, bar: ma / 24, annunciators: ann,
        logText: `mA DC ${how}: ${fmt(ma, 2)} mA`,
      }
    }
    case 'SOURCE':
    case 'SIM': {
      const tag = m.mode === 'SOURCE' ? 'SOURCE' : 'SIMULATE'
      const annOut = [...ann, tag]
      const out = m.outMa
      const base: MeterReading = { ...NONE, primary: fmt(out, 2), unit: 'mA', secondary: `${fmt(pctOfSpan(out), 1)} %`, bar: out / 24, annunciators: annOut }
      if (!placed) return base
      if (m.mode === 'SIM') {
        if (!leadsAcrossTransmitter(s)) {
          return { ...base, logText: `SIMULATE ${lbl(a)} → ${lbl(b)}: no effect, leads are not in the transmitter's place`, warn: 'SIMULATE stands in for a 2-wire transmitter. Lift PT-101 and clip across its loop wires.' }
        }
        if (sol.current < 0.1) return { ...base, primary: '0.00', annunciators: [...annOut, 'LO'], logText: 'SIMULATE across PT-101 wires: no loop current, loop is open or unpowered' }
        return { ...base, logText: `SIMULATE across PT-101 wires: ${fmt(out, 2)} mA driven through the loop` }
      }
      if (!leadsAcrossInput(s)) {
        return { ...base, logText: `SOURCE ${lbl(a)} → ${lbl(b)}: not across an input`, warn: 'SOURCE drives its own current. Use it into a de-energized input, not against a live loop.' }
      }
      if (sol.energized) {
        return { ...base, primary: 'OL', annunciators: [...annOut, '⚠'], logText: `SOURCE into a live loop at ${lbl(a)} → ${lbl(b)}: out of compliance`, warn: 'Sourcing into a powered loop fights the loop supply. Pull F1 first.' }
      }
      return { ...base, logText: `SOURCE into ${lbl(a)} → ${lbl(b)}: ${fmt(out, 2)} mA into the RTU input` }
    }
  }
  return NONE
}
