// Session reducer: every technician action goes through here, gets logged, and updates the world.

import type {
  DiagnosisId, InspectWhere, LogEntry, LogKind, MeterKey, MeterMode, MeterState, NodeId, RepairId, Scenario, SessionState,
} from './types'
import { JACK_LABEL, NODE_LABEL, PREWORK_CHECKLIST, REPAIRS, SERIES_CAPABLE, jackForMode } from './types'
import type { Jack, LeadId } from './types'
import { hasFault, hmiReading, solveLoop } from './loop'
import { meterReading, outputBehaviour } from './meter'

export type Action =
  | { type: 'tick' }
  | { type: 'checklist'; id: string }
  | { type: 'meterMode'; mode: MeterMode }
  | { type: 'meterKey'; key: MeterKey }
  | { type: 'probe'; node: NodeId; lead?: LeadId }
  | { type: 'meterJack'; jack: Jack; on: boolean }
  | { type: 'meterLift'; lead: LeadId }
  | { type: 'meterClear' }
  | { type: 'inspect'; where: InspectWhere }
  | { type: 'fuse'; pulled: boolean }
  | { type: 'hartConnect' }
  | { type: 'hartDisconnect' }
  | { type: 'hartLoopPower'; on: boolean }
  | { type: 'hartRead' }
  | { type: 'hartLoopTest'; ma: number | null }
  | { type: 'hartSetRange'; lrv: number; urv: number }
  | { type: 'hartApply'; which: 'lrv' | 'urv' }
  | { type: 'hartZeroTrim' }
  | { type: 'valve'; open: boolean }
  | { type: 'pump'; psi: number | null }
  | { type: 'repair'; id: RepairId }
  | { type: 'diagnose'; id: DiagnosisId }
  | { type: 'finish' }

const STEP_POINTS = [4, 8, 12, 16, 20]

export function createSession(scenario: Scenario): SessionState {
  const base: SessionState = {
    scenario,
    t: 0,
    log: [],
    checklist: Object.fromEntries(PREWORK_CHECKLIST.map((c) => [c.id, false])),
    fieldWorkStarted: false,
    checklistDoneBeforeField: 0,
    faults: scenario.faults.map((f) => ({ ...f })),
    fusePulled: false,
    isolationOpen: scenario.initial.isolationOpen,
    trappedPressure: scenario.initial.trappedPressure,
    pumpPressure: null,
    xmtr: { lrv: scenario.initial.xmtrLrv, urv: scenario.initial.xmtrUrv },
    hart: { connected: false, loopPower: false, loopTest: null, screen: null },
    meter: { mode: 'OFF', jacks: { red: null, black: false }, probeA: null, probeB: null, held: null, hart250: false, outMa: 4, ramp: 'slow', rampDir: 1, manualRange: false, rel: null, minMax: 'off', backlight: false },
    measurements: 0,
    ohmsOnLive: 0,
    sourceIntoLive: 0,
    pumpWithIsolationOpen: 0,
    inspections: {},
    diagnosis: null,
    repairs: [],
    hmiHistory: [],
    finished: false,
  }
  const s = log(base, 'info', `Work order received: ${scenario.workOrder}`)
  return sampleHmi(s)
}

function log(s: SessionState, kind: LogKind, text: string): SessionState {
  const entry: LogEntry = { t: s.t, kind, text }
  const next = [...s.log, entry]
  return { ...s, log: next.length > 600 ? next.slice(-600) : next }
}

function sampleHmi(s: SessionState): SessionState {
  const sol = solveLoop(s)
  const r = hmiReading(s, sol)
  const sample = { t: s.t, eu: r.eu, ma: r.ma, quality: r.quality }
  const hist = [...s.hmiHistory, sample]
  return { ...s, hmiHistory: hist.length > 120 ? hist.slice(-120) : hist }
}

/** Marks the first hands-on field action so pre-work can be scored. */
function fieldAction(s: SessionState): SessionState {
  if (s.fieldWorkStarted) return s
  const done = Object.values(s.checklist).filter(Boolean).length
  return { ...s, fieldWorkStarted: true, checklistDoneBeforeField: done }
}

function clampMa(v: number): number {
  return Math.round(Math.max(0, Math.min(24, v)) * 100) / 100
}

// ---- meter -------------------------------------------------------------------------------------

/** Log what the 789 shows for the current placement, and apply any penalty the reading carries. */
function recordReading(s: SessionState, countsAsMeasurement: boolean): SessionState {
  const sol = solveLoop(s)
  const r = meterReading(s, sol)
  if (!r.logText) return s
  let next: SessionState = countsAsMeasurement ? { ...s, measurements: s.measurements + 1 } : s
  if (r.warn) {
    if (s.meter.mode === 'OHM') next = { ...next, ohmsOnLive: next.ohmsOnLive + 1 }
    if (outputBehaviour(s, sol) === 'fighting') next = { ...next, sourceIntoLive: next.sourceIntoLive + 1 }
    next = log(next, 'measure', `789: ${r.logText}`)
    return log(next, 'warn', r.warn)
  }
  return log(next, 'measure', `789: ${r.logText}`)
}

function setMeter(s: SessionState, patch: Partial<MeterState>): SessionState {
  return { ...s, meter: { ...s.meter, ...patch } }
}

function isOutput(mode: MeterMode): boolean {
  return mode === 'OUT' || mode === 'OUT_AUTO'
}

/**
 * Keys on the 789 face. In the OUTPUT positions the orange functions apply:
 *   100% / 0%  → SpanCheck (20 mA / 4 mA, press again at the limit to toggle)
 *   MIN MAX / ·))) → %STEP up / down (25 % steps)
 *   RANGE / REL Δ → COARSE up / down
 *   HOLD / Hz → FINE up / down
 */
function meterKey(s: SessionState, key: MeterKey): SessionState {
  const m = s.meter
  if (m.mode === 'OFF') return s
  const out = isOutput(m.mode)
  switch (key) {
    case 'HUNDRED': return out ? setOut(s, m.outMa >= 20 ? 4 : 20) : s
    case 'ZERO': return out ? setOut(s, m.outMa <= 4 ? 20 : 4) : s
    case 'MINMAX': {
      if (out) return setOut(s, STEP_POINTS.find((p) => p > m.outMa + 0.001) ?? 20)
      const order = ['off', 'max', 'min'] as const
      return setMeter(s, { minMax: order[(order.indexOf(m.minMax) + 1) % order.length] })
    }
    case 'BEEPER': {
      if (out) return setOut(s, [...STEP_POINTS].reverse().find((p) => p < m.outMa - 0.001) ?? 4)
      return s
    }
    case 'RANGE': return out ? setOut(s, m.outMa + 1) : setMeter(s, { manualRange: !m.manualRange })
    case 'HOLD': {
      if (out) return setOut(s, m.outMa + 0.01)
      if (m.held != null) return setMeter(s, { held: null })
      const r = meterReading(s, solveLoop(s))
      return setMeter(s, { held: `${r.primary} ${r.units.join(' ')}`.trim() })
    }
    case 'REL': {
      if (out) return setOut(s, m.outMa - 1)
      if (m.rel != null) return setMeter(s, { rel: null })
      const r = meterReading(s, solveLoop(s))
      const v = Number(r.primary)
      return Number.isFinite(v) ? setMeter(s, { rel: v }) : s
    }
    case 'HZ': return out ? setOut(s, m.outMa - 0.01) : s
    case 'BACKLIGHT': return setMeter(s, { backlight: !m.backlight })
    case 'BLUE': {
      if (m.mode === 'LOOP') {
        const on = !m.hart250
        return log(setMeter(s, { hart250: on }), 'action', on ? '789: 250 Ω HART resistor in.' : '789: 250 Ω HART resistor out.')
      }
      if (m.mode === 'OUT_AUTO') {
        const order = ['slow', 'fast', 'step'] as const
        const ramp = order[(order.indexOf(m.ramp) + 1) % order.length]
        return log(setMeter(s, { ramp, rampDir: 1 }), 'action', `789: ${ramp === 'step' ? '25 % step' : `${ramp} ramp`} 4–20 mA.`)
      }
      return s
    }
  }
}

function setOut(s: SessionState, ma: number): SessionState {
  const next = setMeter(s, { outMa: clampMa(ma) })
  const placed = next.meter.probeA != null && next.meter.probeB != null
  return placed ? recordReading(next, false) : next
}

function rampTick(s: SessionState): SessionState {
  const m = s.meter
  if (m.mode !== 'OUT_AUTO') return s
  let out = m.outMa
  let dir = m.rampDir
  if (m.ramp === 'slow') out += dir * 0.4
  else if (m.ramp === 'fast') out += dir * (16 / 15)
  else if (s.t % 5 === 0) out += dir * 4
  if (out >= 20) { out = 20; dir = -1 }
  if (out <= 4) { out = 4; dir = 1 }
  return setMeter(s, { outMa: clampMa(out), rampDir: dir })
}

function probe(s: SessionState, node: NodeId, lead?: LeadId): SessionState {
  const m = s.meter
  if (m.mode === 'OFF') return log(s, 'warn', '789 is switched off.')
  const want = jackForMode(m.mode)
  let jacks = m.jacks
  if (lead) {
    if (jacks.red == null || !jacks.black) return log(s, 'warn', 'Plug both leads into the 789 first: black in COM, red in the jack this knob position uses.')
    if (jacks.red !== want) return log(s, 'warn', `789 input alert, LEAd flashing: the red lead is in the ${JACK_LABEL[jacks.red]} jack but this position uses ${JACK_LABEL[want]}. Move the lead.`)
  } else {
    jacks = { red: want, black: true }
  }
  const s1 = setMeter(fieldAction(s), { held: null, jacks })

  // mA measure: single-point series insertion
  if (m.mode === 'mA') {
    if (!SERIES_CAPABLE.includes(node)) {
      return log(s1, 'warn', `Cannot insert the meter in series at ${NODE_LABEL[node]} without lifting cabinet wiring. Use a terminal block, JB, or the transmitter TEST terminals.`)
    }
    return recordReading(setMeter(s1, { probeA: node, probeB: null }), true)
  }

  // everything else: two leads
  const counts = m.mode !== 'VAC'
  if (lead) {
    const placed = setMeter(s1, lead === 'red' ? { probeA: node } : { probeB: node })
    return placed.meter.probeA != null && placed.meter.probeB != null ? recordReading(placed, counts) : placed
  }
  if (m.probeA == null || m.probeB != null) {
    return setMeter(s1, { probeA: node, probeB: null })
  }
  const placed = setMeter(s1, { probeB: node })
  return recordReading(placed, counts)
}

// ---- field --------------------------------------------------------------------------------------

function inspect(s: SessionState, where: InspectWhere): SessionState {
  const sol = solveLoop(s)
  const lines: string[] = []
  switch (where) {
    case 'rtu': {
      lines.push(hasFault(s, 'supply_dead') ? 'PS-1: DC OK LED is dark.' : 'PS-1: DC OK LED green.')
      lines.push(s.fusePulled ? 'F1: fuse pulled, holder open.' : 'F1: fuse seated. This holder has no blown indicator; verify with the meter.')
      lines.push('TB-1: terminations tight, no corrosion. AI-1 CH3 status LED steady.')
      break
    }
    case 'jb': {
      if (hasFault(s, 'loose_terminal_jb_plus')) lines.push('Terminal 1: conductor pulled back, bare copper not under the clamp.')
      else if (hasFault(s, 'loose_terminal_jb_minus')) lines.push('Terminal 2: ferrule slipped, strands loose under the clamp.')
      else lines.push('Terminals 1 and 2: tight, no corrosion, shield landed on ground bar.')
      if (hasFault(s, 'reversed_polarity_jb')) lines.push('Conductor colors: black on terminal 1, white on terminal 2. Loop drawing shows white = (+).')
      lines.push('Cover gasket intact, no water ingress.')
      break
    }
    case 'xmtr': {
      const powered = sol.current >= 3 || sol.meterCurrent >= 3
      if (!powered) lines.push('Local LCD is dark (no loop power).')
      else if (hasFault(s, 'xmtr_fail_high') || hasFault(s, 'xmtr_fail_low')) lines.push(`Local LCD: "SENSOR FAIL"  ${sol.xmtrDemand.toFixed(1)} mA`)
      else lines.push(`Local LCD: PV ${sol.pressureSeen.toFixed(1)} ${s.scenario.loop.unit}  ${sol.xmtrDemand.toFixed(2)} mA`)
      lines.push('Housing dry, conduit seal poured, no visible damage.')
      break
    }
    case 'manifold': {
      lines.push(s.isolationOpen ? 'Isolation valve handle in line with the pipe (OPEN).' : 'Isolation valve handle perpendicular to the pipe (CLOSED).')
      lines.push(`PG-101 on the pipeline reads ${sol.processPressure.toFixed(0)} ${s.scenario.loop.unit}.`)
      lines.push(s.pumpPressure != null ? `Hand pump connected at the test port, applying ${s.pumpPressure} ${s.scenario.loop.unit}.` : 'Test port plugged.')
      break
    }
  }
  const text = lines.join(' ')
  const next: SessionState = { ...s, inspections: { ...s.inspections, [where]: text } }
  return log(next, 'inspect', `Inspect ${where.toUpperCase()}: ${text}`)
}

// ---- HART / Trex ---------------------------------------------------------------------------------

function hartRead(s: SessionState): SessionState {
  const sol = solveLoop(s)
  if (!s.hart.connected) return log(s, 'warn', 'Trex: not connected to the loop.')
  if (!sol.hartReachable) {
    return log({ ...s, hart: { ...s.hart, screen: null }, measurements: s.measurements + 1 }, 'measure', `Trex: "No device found." (${sol.hartBlocked})`)
  }
  const status: string[] = []
  if (hasFault(s, 'xmtr_fail_high') || hasFault(s, 'xmtr_fail_low')) status.push('SENSOR FAILURE', 'PV OUT OF LIMITS')
  if (s.hart.loopTest != null) status.push('LOOP CURRENT FIXED')
  if (sol.pressureSeen > s.xmtr.urv || sol.pressureSeen < s.xmtr.lrv) status.push('PV OUT OF RANGE')
  if (status.length === 0) status.push('DEVICE OK')
  const screen = { tag: s.scenario.loop.tag, pv: sol.pressureSeen, ao: sol.xmtrDemand, lrv: s.xmtr.lrv, urv: s.xmtr.urv, status }
  const next: SessionState = { ...s, hart: { ...s.hart, screen }, measurements: s.measurements + 1 }
  return log(next, 'measure', `Trex: found ${screen.tag}. PV ${screen.pv.toFixed(1)} ${s.scenario.loop.unit}, AO ${screen.ao.toFixed(2)} mA, LRV ${screen.lrv}, URV ${screen.urv}, status ${status.join('/')}`)
}

function requireDevice(s: SessionState): string | null {
  const sol = solveLoop(s)
  if (!s.hart.connected) return 'Trex: not connected.'
  if (!sol.hartReachable) return `Trex: no device to command (${sol.hartBlocked}).`
  return null
}

// ---- repairs --------------------------------------------------------------------------------------

function applyRepair(s: SessionState, id: RepairId): SessionState {
  const label = REPAIRS.find((r) => r.id === id)?.label ?? id
  let next: SessionState = { ...s, repairs: [...s.repairs, id] }
  const drop = (...kinds: string[]) => { next = { ...next, faults: next.faults.filter((f) => !kinds.includes(f.kind)) } }
  switch (id) {
    case 're_terminate_jb': drop('loose_terminal_jb_plus', 'loose_terminal_jb_minus'); break
    case 'replace_cable_pair': drop('open_plus_conductor', 'open_minus_conductor'); break
    case 'replace_fuse': drop('blown_fuse'); next = { ...next, fusePulled: false }; break
    case 'replace_supply': drop('supply_dead'); break
    case 'replace_transmitter':
      drop('xmtr_fail_high', 'xmtr_fail_low')
      next = { ...next, xmtr: { lrv: s.scenario.loop.factoryLrv, urv: s.scenario.loop.factoryUrv }, hart: { ...next.hart, screen: null, loopTest: null } }
      break
    case 'blowdown_impulse': drop('impulse_plugged'); break
    case 'correct_polarity': drop('reversed_polarity_jb'); break
    case 'replace_ai_card': break
  }
  return log(next, 'action', `Repair: ${label}`)
}

// ---- reducer ----------------------------------------------------------------------------------------

export function reduce(s: SessionState, a: Action): SessionState {
  if (s.finished && a.type !== 'tick') return s
  switch (a.type) {
    case 'tick':
      return sampleHmi(rampTick({ ...s, t: s.t + 1 }))
    case 'checklist': {
      const next = { ...s, checklist: { ...s.checklist, [a.id]: !s.checklist[a.id] } }
      const item = PREWORK_CHECKLIST.find((c) => c.id === a.id)
      return next.checklist[a.id] ? log(next, 'info', `JSA sign-off: ${item?.label}`) : next
    }
    case 'meterMode':
      return setMeter(s, { mode: a.mode, probeA: null, probeB: null, held: null, rel: null, minMax: 'off', rampDir: 1 })
    case 'meterKey':
      return meterKey(s, a.key)
    case 'meterClear':
      return setMeter(s, { probeA: null, probeB: null, held: null, rel: null })
    case 'probe':
      return probe(s, a.node, a.lead)
    case 'meterJack': {
      const j = s.meter.jacks
      const jacks = a.jack === 'COM' ? { ...j, black: a.on } : { ...j, red: a.on ? a.jack : j.red === a.jack ? null : j.red }
      if (jacks.red === j.red && jacks.black === j.black) return s
      const lead = a.jack === 'COM' ? 'black lead' : 'red lead'
      return log(setMeter(s, { jacks, probeA: null, probeB: null, held: null }), 'action', `${a.on ? 'Plugged' : 'Unplugged'} the ${lead} ${a.on ? 'into' : 'from'} the 789 ${JACK_LABEL[a.jack]} jack.`)
    }
    case 'meterLift':
      return setMeter(s, a.lead === 'red' || s.meter.mode === 'mA' ? { probeA: null, held: null } : { probeB: null, held: null })
    case 'inspect':
      return inspect(fieldAction(s), a.where)
    case 'fuse': {
      const next = { ...fieldAction(s), fusePulled: a.pulled }
      return log(next, 'action', a.pulled ? 'Pulled fuse F1 – loop de-energized.' : 'Re-seated fuse F1 – loop energized.')
    }
    case 'hartConnect':
      return hartRead(log({ ...fieldAction(s), hart: { ...s.hart, connected: true } }, 'action', 'Trex clipped across the loop at PT-101.'))
    case 'hartDisconnect':
      return log({ ...s, hart: { connected: false, loopPower: false, loopTest: null, screen: null } }, 'action', 'Trex removed. Loop test cleared.')
    case 'hartLoopPower': {
      const next = { ...fieldAction(s), hart: { ...s.hart, loopPower: a.on } }
      return log(next, 'action', a.on ? 'Trex: loop power on – communicator supplies the device.' : 'Trex: loop power off.')
    }
    case 'hartRead':
      return hartRead(fieldAction(s))
    case 'hartLoopTest': {
      const err = requireDevice(s)
      if (err) return log(s, 'warn', err)
      const next = { ...s, hart: { ...s.hart, loopTest: a.ma } }
      return log(next, 'action', a.ma == null ? 'Trex: loop test ended, output returned to PV.' : `Trex: loop test – output fixed at ${a.ma.toFixed(2)} mA.`)
    }
    case 'hartSetRange': {
      const err = requireDevice(s)
      if (err) return log(s, 'warn', err)
      if (!(a.urv > a.lrv)) return log(s, 'warn', 'Trex: URV must be greater than LRV.')
      const next = { ...s, xmtr: { lrv: a.lrv, urv: a.urv }, hart: { ...s.hart, screen: null } }
      return log(next, 'action', `Trex: range set LRV ${a.lrv} / URV ${a.urv} ${s.scenario.loop.unit}.`)
    }
    case 'hartApply': {
      const err = requireDevice(s)
      if (err) return log(s, 'warn', err)
      const pv = Math.round(solveLoop(s).pressureSeen * 10) / 10
      const xmtr = a.which === 'lrv' ? { ...s.xmtr, lrv: pv } : { ...s.xmtr, urv: pv }
      if (!(xmtr.urv > xmtr.lrv)) return log(s, 'warn', 'Trex: applied value would make URV ≤ LRV.')
      return log({ ...s, xmtr, hart: { ...s.hart, screen: null } }, 'action', `Trex: ${a.which.toUpperCase()} set to applied pressure ${pv} ${s.scenario.loop.unit}.`)
    }
    case 'hartZeroTrim': {
      const err = requireDevice(s)
      if (err) return log(s, 'warn', err)
      const pv = solveLoop(s).pressureSeen
      if (Math.abs(pv) > 0.05 * (s.xmtr.urv - s.xmtr.lrv)) return log(s, 'warn', `Trex: zero trim refused, applied pressure ${pv.toFixed(1)} is not near zero. Vent the transmitter first.`)
      return log(s, 'action', 'Trex: sensor zero trim completed.')
    }
    case 'valve': {
      const s1 = fieldAction(s)
      if (a.open === s1.isolationOpen) return s1
      if (!a.open) {
        const next = { ...s1, isolationOpen: false, trappedPressure: solveLoop(s1).processPressure }
        return log(next, 'action', `Closed isolation valve – ${next.trappedPressure.toFixed(0)} ${s.scenario.loop.unit} trapped on the transmitter.`)
      }
      const next = { ...s1, isolationOpen: true, pumpPressure: null }
      return log(next, 'action', 'Opened isolation valve – transmitter on process.')
    }
    case 'pump': {
      const s1 = fieldAction(s)
      if (a.psi == null) return log({ ...s1, pumpPressure: null }, 'action', 'Hand pump vented and removed from test port.')
      if (s1.isolationOpen) {
        return log({ ...s1, pumpWithIsolationOpen: s1.pumpWithIsolationOpen + 1 }, 'warn', 'Pump applied with the isolation valve OPEN: pump pressure goes nowhere against line pressure, and opening the test port vents process. Close isolation first.')
      }
      return log({ ...s1, pumpPressure: a.psi }, 'action', `Hand pump applying ${a.psi} ${s.scenario.loop.unit} at the test port.`)
    }
    case 'repair':
      return applyRepair(fieldAction(s), a.id)
    case 'diagnose':
      return log({ ...s, diagnosis: a.id }, 'action', `Diagnosis recorded: ${a.id}`)
    case 'finish':
      return log({ ...s, finished: true }, 'info', 'Work order closed by technician.')
  }
}
