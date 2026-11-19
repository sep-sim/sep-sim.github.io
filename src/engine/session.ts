// Session reducer: every technician action goes through here, gets logged, and updates the world.

import type {
  DiagnosisId, InspectWhere, LogEntry, LogKind, MeterMode, NodeId, RepairId, Scenario, SessionState,
} from './types'
import { NODE_LABEL, PREWORK_CHECKLIST, REPAIRS, SERIES_CAPABLE } from './types'
import { hasFault, hmiReading, resistanceBetween, solveLoop } from './loop'

export type Action =
  | { type: 'tick' }
  | { type: 'checklist'; id: string }
  | { type: 'meterMode'; mode: MeterMode }
  | { type: 'probe'; node: NodeId }
  | { type: 'meterClear' }
  | { type: 'inspect'; where: InspectWhere }
  | { type: 'fuse'; pulled: boolean }
  | { type: 'hartConnect' }
  | { type: 'hartDisconnect' }
  | { type: 'hartRead' }
  | { type: 'hartLoopTest'; ma: number | null }
  | { type: 'hartSetRange'; lrv: number; urv: number }
  | { type: 'valve'; open: boolean }
  | { type: 'pump'; psi: number | null }
  | { type: 'repair'; id: RepairId }
  | { type: 'diagnose'; id: DiagnosisId }
  | { type: 'finish' }

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
    hart: { connected: false, loopTest: null, screen: null },
    meter: { mode: 'V', probeA: null, probeB: null, display: '----' },
    measurements: 0,
    ohmsOnLive: 0,
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

function noise(scale: number): number {
  return (Math.random() - 0.5) * 2 * scale
}

function fmtV(v: number): string {
  return `${(v + noise(0.03)).toFixed(2)} V DC`
}

function fmtMa(ma: number): string {
  return `${(ma + (ma > 0 ? noise(0.02) : 0)).toFixed(2)} mA`
}

function measureVolts(s: SessionState, a: NodeId, b: NodeId): SessionState {
  const sol = solveLoop(s)
  const v = sol.node[a] - sol.node[b]
  const display = sol.supplyVolts === 0 && !s.fusePulled ? fmtV(0) : fmtV(v)
  const next: SessionState = { ...s, measurements: s.measurements + 1, meter: { ...s.meter, display } }
  return log(next, 'measure', `V DC  ${NODE_LABEL[a]} → ${NODE_LABEL[b]}: ${display}`)
}

function measureOhms(s: SessionState, a: NodeId, b: NodeId): SessionState {
  const sol = solveLoop(s)
  // A meter sees a live source if either probed point sits at loop potential.
  const live = sol.supplyVolts > 0 && (sol.node[a] > 0.5 || sol.node[b] > 0.5)
  if (live) {
    const display = 'OL  ⚠'
    let next: SessionState = {
      ...s, measurements: s.measurements + 1, ohmsOnLive: s.ohmsOnLive + 1, meter: { ...s.meter, display },
    }
    next = log(next, 'warn', `Resistance measured on a live circuit (${NODE_LABEL[a]} → ${NODE_LABEL[b]}). Reading is meaningless and risks the meter. De-energize first.`)
    return next
  }
  const display = resistanceBetween(s, a, b)
  const next: SessionState = { ...s, measurements: s.measurements + 1, meter: { ...s.meter, display } }
  return log(next, 'measure', `Ω  ${NODE_LABEL[a]} → ${NODE_LABEL[b]}: ${display}`)
}

function measureMa(s: SessionState, at: NodeId): SessionState {
  if (!SERIES_CAPABLE.includes(at)) {
    return log(s, 'warn', `Cannot insert the meter in series at ${NODE_LABEL[at]} without lifting cabinet wiring. Use a terminal block, JB, or the transmitter TEST terminals.`)
  }
  const sol = solveLoop(s)
  const display = fmtMa(sol.current)
  const next: SessionState = { ...s, measurements: s.measurements + 1, meter: { ...s.meter, display } }
  const how = at === 'XMTR_TEST' ? 'across PT-101 TEST terminals (loop not broken)' : `in series at ${NODE_LABEL[at]} (lifted wire)`
  return log(next, 'measure', `mA DC ${how}: ${display}`)
}

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
      if (sol.current < 3) lines.push('Local LCD is dark (no loop power).')
      else if (hasFault(s, 'xmtr_fail_high') || hasFault(s, 'xmtr_fail_low')) lines.push(`Local LCD: "SENSOR FAIL"  ${sol.current.toFixed(1)} mA`)
      else lines.push(`Local LCD: PV ${sol.pressureSeen.toFixed(1)} ${s.scenario.loop.unit}  ${sol.current.toFixed(2)} mA`)
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

function hartRead(s: SessionState): SessionState {
  const sol = solveLoop(s)
  if (!s.hart.connected) return log(s, 'warn', 'HART: communicator not connected to the loop.')
  if (!sol.hartReachable) {
    return log({ ...s, hart: { ...s.hart, screen: null }, measurements: s.measurements + 1 }, 'measure', 'HART: "No device found." Loop current below 3.5 mA or polarity wrong.')
  }
  const status: string[] = []
  if (hasFault(s, 'xmtr_fail_high') || hasFault(s, 'xmtr_fail_low')) status.push('SENSOR FAILURE', 'PV OUT OF LIMITS')
  if (s.hart.loopTest != null) status.push('LOOP CURRENT FIXED')
  if (sol.pressureSeen > s.xmtr.urv || sol.pressureSeen < s.xmtr.lrv) status.push('PV OUT OF RANGE')
  if (status.length === 0) status.push('DEVICE OK')
  const screen = {
    tag: s.scenario.loop.tag,
    pv: sol.pressureSeen,
    ao: sol.xmtrDemand,
    lrv: s.xmtr.lrv,
    urv: s.xmtr.urv,
    status,
  }
  const next: SessionState = { ...s, hart: { ...s.hart, screen }, measurements: s.measurements + 1 }
  return log(next, 'measure', `HART read: PV ${screen.pv.toFixed(1)} ${s.scenario.loop.unit}, AO ${screen.ao.toFixed(2)} mA, LRV ${screen.lrv}, URV ${screen.urv}, status ${status.join('/')}`)
}

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

export function reduce(s: SessionState, a: Action): SessionState {
  if (s.finished && a.type !== 'tick') return s
  switch (a.type) {
    case 'tick': {
      return sampleHmi({ ...s, t: s.t + 1 })
    }
    case 'checklist': {
      const next = { ...s, checklist: { ...s.checklist, [a.id]: !s.checklist[a.id] } }
      const item = PREWORK_CHECKLIST.find((c) => c.id === a.id)
      return next.checklist[a.id] ? log(next, 'info', `Pre-work: ${item?.label}`) : next
    }
    case 'meterMode':
      return { ...s, meter: { mode: a.mode, probeA: null, probeB: null, display: '----' } }
    case 'meterClear':
      return { ...s, meter: { ...s.meter, probeA: null, probeB: null, display: '----' } }
    case 'probe': {
      const s1 = fieldAction(s)
      const m = s1.meter
      if (m.mode === 'mA') {
        return measureMa({ ...s1, meter: { ...m, probeA: a.node, probeB: null } }, a.node)
      }
      if (m.probeA == null || m.probeB != null) {
        return { ...s1, meter: { ...m, probeA: a.node, probeB: null, display: '----' } }
      }
      const withB: SessionState = { ...s1, meter: { ...m, probeB: a.node } }
      return m.mode === 'V' ? measureVolts(withB, m.probeA, a.node) : measureOhms(withB, m.probeA, a.node)
    }
    case 'inspect':
      return inspect(fieldAction(s), a.where)
    case 'fuse': {
      const next = { ...fieldAction(s), fusePulled: a.pulled }
      return log(next, 'action', a.pulled ? 'Pulled fuse F1 – loop de-energized.' : 'Re-seated fuse F1 – loop energized.')
    }
    case 'hartConnect':
      return log({ ...fieldAction(s), hart: { ...s.hart, connected: true } }, 'action', 'HART communicator clipped across the loop at PT-101.')
    case 'hartDisconnect':
      return log({ ...s, hart: { connected: false, loopTest: null, screen: null } }, 'action', 'HART communicator removed. Loop test cleared.')
    case 'hartRead':
      return hartRead(fieldAction(s))
    case 'hartLoopTest': {
      if (!s.hart.connected || !solveLoop(s).hartReachable) return log(s, 'warn', 'HART: no device to command.')
      const next = { ...s, hart: { ...s.hart, loopTest: a.ma } }
      return log(next, 'action', a.ma == null ? 'HART: loop test ended, output returned to PV.' : `HART: loop test – output fixed at ${a.ma.toFixed(2)} mA.`)
    }
    case 'hartSetRange': {
      if (!s.hart.connected || !solveLoop(s).hartReachable) return log(s, 'warn', 'HART: no device to configure.')
      if (!(a.urv > a.lrv)) return log(s, 'warn', 'HART: URV must be greater than LRV.')
      const next = { ...s, xmtr: { lrv: a.lrv, urv: a.urv }, hart: { ...s.hart, screen: null } }
      return log(next, 'action', `HART: range set LRV ${a.lrv} / URV ${a.urv} ${s.scenario.loop.unit}.`)
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
    case 'diagnose': {
      const label = a.id
      return log({ ...s, diagnosis: a.id }, 'action', `Diagnosis recorded: ${label}`)
    }
    case 'finish':
      return log({ ...s, finished: true }, 'info', 'Work order closed by technician.')
  }
}
