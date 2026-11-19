// Electrical safety engine: energy sources, LOTO state, voltages a meter would see, insulation testing on a
// 6-lead motor circuit, and every technician action with its NFPA 70E consequences.

import type {
  DeadTest, DiagnosisId, ElecScenario, ElecState, InsVolts, LockTarget, LogKind, MeterMode, Point, PpeId, RepairId, Scene,
} from './types'
import { CHECKLIST, DIAGNOSES, POINT_LABEL, POINT_SCENE, PPE_ITEMS, REPAIRS } from './types'

// ---- actions ------------------------------------------------------------------------------------

export type Action =
  | { type: 'tick' }
  | { type: 'wait'; minutes: number }
  | { type: 'checklist'; id: string }
  | { type: 'goto'; scene: Scene }
  | { type: 'readLabel' }
  | { type: 'ppe'; id: PpeId; on: boolean }
  | { type: 'breaker'; closed: boolean }
  | { type: 'lp2'; closed: boolean }
  | { type: 'lock'; target: LockTarget; on: boolean }
  | { type: 'tag'; target: LockTarget; on: boolean }
  | { type: 'tryStart' }
  | { type: 'keypad'; key: 'RUN' | 'STOP' | 'RESET' }
  | { type: 'door'; open: boolean }
  | { type: 'meterMode'; mode: MeterMode }
  | { type: 'meterVolts'; volts: InsVolts }
  | { type: 'probe'; point: Point }
  | { type: 'meterClear' }
  | { type: 'insTest' }
  | { type: 'liftLeads'; lifted: boolean }
  | { type: 'cover'; off: boolean }
  | { type: 'inspectBox' }
  | { type: 'unboltFeeders'; unbolted: boolean }
  | { type: 'clearLugs' }
  | { type: 'wye'; open: boolean }
  | { type: 'diagnose'; id: DiagnosisId }
  | { type: 'repair'; id: RepairId }
  | { type: 'finish' }

// ---- penalties ----------------------------------------------------------------------------------

export const PENALTY: Record<string, { points: number; label: string }> = {
  ppe_breaker: { points: -20, label: 'Operated the 480 V breaker without adequate arc flash PPE' },
  ppe_test: { points: -20, label: 'Voltage testing on unverified conductors without adequate PPE' },
  ppe_door: { points: -15, label: 'Opened the drive cabinet energized without adequate PPE' },
  no_prove_before: { points: -10, label: 'Absence-of-voltage test without proving the meter on a known source first' },
  no_prove_after: { points: -10, label: 'Meter not re-proved after testing dead' },
  bus_ac_only: { points: -10, label: 'DC bus checked with AC volts only (reads zero even at 650 V DC)' },
  work_not_verified: { points: -20, label: 'Hands on conductors before absence of voltage was verified' },
  work_not_locked: { points: -15, label: 'Hands on conductors before lockout was applied' },
  bus_charged: { points: -10, label: 'Worked on terminals with the DC bus above 50 V (CHARGE lamp lit)' },
  reenergized: { points: -15, label: 'Re-energized the equipment while attempting a try-step without a lock' },
  meg_into_drive: { points: -30, label: 'Insulation test applied with the drive output connected: IGBTs destroyed' },
  meg_through_contactor: { points: -10, label: 'Insulation test through an open contactor instead of lifted leads' },
  meg_low_volts: { points: -5, label: 'Insulation test voltage too low for a 460 V motor (use 500 V)' },
  meg_not_verified: { points: -10, label: 'Insulation test on a circuit not verified de-energized' },
  locks_early: { points: -10, label: 'Lockout removed before the equipment was restored and clear' },
  ctrl_live_touch: { points: -10, label: 'Control circuit left energized while working in the cabinet' },
  run_not_restored: { points: -5, label: 'Attempted to run the drive before the circuit was reconnected' },
}

// ---- helpers ------------------------------------------------------------------------------------

function log(s: ElecState, kind: LogKind, text: string): ElecState {
  const next = [...s.log, { t: s.t, kind, text }]
  return { ...s, log: next.length > 800 ? next.slice(-800) : next }
}

function violate(s: ElecState, id: string, extra?: string): ElecState {
  const p = PENALTY[id]
  const text = extra ? `${p.label}. ${extra}` : p.label
  return log({ ...s, violations: [...s.violations, { id, t: s.t, text }] }, 'violation', text)
}

function fmtT(t: number): string {
  return `${Math.floor(t / 60)}m${String(t % 60).padStart(2, '0')}s`
}

export function createElecSession(scenario: ElecScenario): ElecState {
  const s: ElecState = {
    scenario,
    t: 0,
    log: [],
    scene: 'mcc',
    checklist: Object.fromEntries(CHECKLIST.map((c) => [c.id, false])),
    labelRead: false,
    ppe: ['cotton', 'boots'],
    mccClosed: true,
    lp2Closed: true,
    locks: { mcc: false, lp2: false },
    tags: { mcc: false, lp2: false },
    tOff: null,
    busAtOff: 0,
    tryStepDone: false,
    done: { breakerOpened: false, lp2Opened: false, mccLocked: false, mccTagged: false, lp2Locked: false, lp2Tagged: false },
    doorOpen: false,
    drive: { faulted: true, running: false, damaged: false, display: scenario.drive.faultCode },
    leadsLifted: false,
    jbox: { coverOff: false, feedersUnbolted: false, lugsCleared: false, wyeOpen: false, inspected: false },
    meter: { mode: 'OFF', insVolts: 500, probeA: null, probeB: null, lastTest: null },
    proofs: [],
    deadTests: [],
    insTests: [],
    tests: 0,
    violations: [],
    faultCleared: false,
    diagnosis: null,
    repairs: [],
    finished: false,
  }
  return log(s, 'info', `Work order received: ${scenario.workOrder}`)
}

// ---- energy state -------------------------------------------------------------------------------

/** DC bus voltage. Charged from the line; decays through the bleeder once the breaker opens (τ ≈ 3 min). */
export function busVolts(s: ElecState): number {
  if (s.mccClosed) return 648
  if (s.tOff == null) return 0
  return s.busAtOff * Math.exp(-(s.t - s.tOff) / 180)
}

export function chargeLampOn(s: ElecState): boolean {
  return busVolts(s) > 50
}

/** Output isolation contactor 1M is held in by the 120 V control circuit. */
export function contactorClosed(s: ElecState): boolean {
  return s.lp2Closed
}

export function keypadLit(s: ElecState): boolean {
  return s.mccClosed || busVolts(s) > 200
}

type Phasor = [number, number]

function acPhasor(s: ElecState, p: Point): Phasor {
  const ph = (mag: number, deg: number): Phasor => [mag * Math.cos((deg * Math.PI) / 180), mag * Math.sin((deg * Math.PI) / 180)]
  switch (p) {
    case 'RECEPT_H': return [120, 0]
    case 'CTRL_H': return s.lp2Closed ? [120, 0] : [0, 0]
    case 'L1': return s.mccClosed ? ph(277, 0) : [0, 0]
    case 'L2': return s.mccClosed ? ph(277, -120) : [0, 0]
    case 'L3': return s.mccClosed ? ph(277, 120) : [0, 0]
    default: return [0, 0]
  }
}

function dcLevel(s: ElecState, p: Point): number {
  const bus = busVolts(s)
  if (p === 'DC_P') return bus / 2
  if (p === 'DC_N') return -bus / 2
  return 0
}

/** Volts the meter reads between two points, AC and DC components. */
export function voltageBetween(s: ElecState, a: Point, b: Point): { ac: number; dc: number } {
  const pa = acPhasor(s, a)
  const pb = acPhasor(s, b)
  let ac = Math.hypot(pa[0] - pb[0], pa[1] - pb[1])
  const dc = dcLevel(s, a) - dcLevel(s, b)
  // a charged DC bus shows a little ripple on an AC range
  if ((a === 'DC_P' || a === 'DC_N' || b === 'DC_P' || b === 'DC_N') && Math.abs(dc) > 50) ac = Math.max(ac, 2.1)
  return { ac, dc }
}

export function isLive(s: ElecState, a: Point, b: Point): boolean {
  const v = voltageBetween(s, a, b)
  return v.ac > 30 || Math.abs(v.dc) > 30
}

// ---- PPE -----------------------------------------------------------------------------------------

export function ppeCheck(s: ElecState): { adequate: boolean; issues: string[]; bodyRating: number } {
  const worn = new Set(s.ppe)
  const ie = s.scenario.label.incidentEnergy
  const issues: string[] = []
  const body = PPE_ITEMS.filter((p) => p.slot === 'body' && worn.has(p.id)).reduce((m, p) => Math.max(m, p.arcRating ?? 0), 0)
  if (body < ie) issues.push(`Body arc rating ${body} cal/cm² is below the ${ie} cal/cm² incident energy`)
  const hood = worn.has('suit40')
  if (!hood) {
    if (!worn.has('faceshield')) issues.push('No arc-rated face and head protection')
    else if (12 < ie) issues.push('Face shield rating below incident energy')
  }
  if (!worn.has('hardhat')) issues.push('No hard hat')
  if (!worn.has('glasses')) issues.push('No safety glasses')
  if (!worn.has('hearing')) issues.push('No hearing protection')
  if (!worn.has('gloves00')) issues.push('No voltage-rated gloves (class 00 required for 480 V shock exposure)')
  if (!worn.has('boots')) issues.push('No leather footwear')
  return { adequate: issues.length === 0, issues, bodyRating: body }
}

// ---- verification tracking ------------------------------------------------------------------------

export const REQUIRED_DEAD: { a: Point; b: Point; mode: MeterMode }[] = [
  { a: 'L1', b: 'L2', mode: 'VAC' }, { a: 'L2', b: 'L3', mode: 'VAC' }, { a: 'L1', b: 'L3', mode: 'VAC' },
  { a: 'L1', b: 'GND', mode: 'VAC' }, { a: 'L2', b: 'GND', mode: 'VAC' }, { a: 'L3', b: 'GND', mode: 'VAC' },
  { a: 'DC_P', b: 'DC_N', mode: 'VDC' },
  { a: 'CTRL_H', b: 'CTRL_N', mode: 'VAC' },
]

function pairKey(a: Point, b: Point): string {
  return [a, b].sort().join('-')
}

export function deadTestDone(s: ElecState, r: { a: Point; b: Point; mode: MeterMode }): boolean {
  return s.deadTests.some((d) => pairKey(d.a, d.b) === pairKey(r.a, r.b) && d.mode === r.mode)
}

export function verifiedDead(s: ElecState): boolean {
  return REQUIRED_DEAD.every((r) => deadTestDone(s, r))
}

export function provedBefore(s: ElecState): boolean {
  const first = s.deadTests.find((d) => REQUIRED_DEAD.some((r) => pairKey(r.a, r.b) === pairKey(d.a, d.b)))
  if (!first) return false
  return s.proofs.some((t) => t <= first.t)
}

export function provedAfter(s: ElecState): boolean {
  const req = s.deadTests.filter((d) => REQUIRED_DEAD.some((r) => pairKey(r.a, r.b) === pairKey(d.a, d.b)))
  if (req.length === 0) return false
  const last = Math.max(...req.map((d) => d.t))
  return s.proofs.some((t) => t >= last)
}

export function lockedOut(s: ElecState): boolean {
  return !s.mccClosed && !s.lp2Closed && s.locks.mcc && s.locks.lp2
}

/** Electrically safe work condition per 70E 120.5: isolated, locked, tried, stored energy released, verified. */
export function eswc(s: ElecState): boolean {
  return lockedOut(s) && s.tryStepDone && !chargeLampOn(s) && verifiedDead(s)
}

// ---- insulation model ---------------------------------------------------------------------------------

const OL = Number.POSITIVE_INFINITY

function parallel(rs: number[]): number {
  const finite = rs.filter((r) => Number.isFinite(r))
  if (finite.length === 0) return OL
  return 1 / finite.reduce((a, r) => a + 1 / r, 0)
}

type NodeId = 'cable1' | 'cable2' | 'cable3' | 'motor1' | 'motor2' | 'motor3'

function pointNode(p: Point): NodeId | null {
  switch (p) {
    case 'C_T1': case 'CBL_1': return 'cable1'
    case 'C_T2': case 'CBL_2': return 'cable2'
    case 'C_T3': case 'CBL_3': return 'cable3'
    case 'T1': case 'T4': return 'motor1'
    case 'T2': case 'T5': return 'motor2'
    case 'T3': case 'T6': return 'motor3'
    default: return null
  }
}

/** Nodes electrically tied to `start` through bolted lugs and the wye point. */
function group(s: ElecState, start: NodeId): Set<NodeId> {
  const edges: [NodeId, NodeId][] = []
  if (!s.jbox.feedersUnbolted) edges.push(['cable1', 'motor1'], ['cable2', 'motor2'], ['cable3', 'motor3'])
  if (!s.jbox.wyeOpen) edges.push(['motor1', 'motor2'], ['motor2', 'motor3'])
  const seen = new Set<NodeId>([start])
  let grew = true
  while (grew) {
    grew = false
    for (const [x, y] of edges) {
      if (seen.has(x) && !seen.has(y)) { seen.add(y); grew = true }
      if (seen.has(y) && !seen.has(x)) { seen.add(x); grew = true }
    }
  }
  return seen
}

/** Insulation resistance of one node to ground, MΩ. */
function nodeToGround(s: ElecState, n: NodeId): number {
  const f = s.scenario.fault
  const cleared = s.faultCleared
  switch (n) {
    case 'motor1': return 140
    case 'motor2': return f === 'motor' && !cleared ? 0.3 : 125
    case 'motor3': return 160
    case 'cable1': return OL
    case 'cable2': {
      const rs: number[] = []
      if (f === 'cable' && !cleared) rs.push(0.02)
      if (f === 'termination' && !cleared && !s.jbox.lugsCleared) rs.push(0.05)
      return parallel(rs)
    }
    case 'cable3': return OL
  }
}

function groupToGround(s: ElecState, g: Set<NodeId>): number {
  return parallel([...g].map((n) => nodeToGround(s, n)))
}

export function fmtMohm(r: number, volts: InsVolts): string {
  const cap = volts >= 500 ? 2000 : volts >= 250 ? 1000 : 200
  if (!Number.isFinite(r) || r >= cap) return `OL (> ${cap >= 1000 ? `${cap / 1000}.0 GΩ` : `${cap} MΩ`})`
  if (r >= 1000) return `${(r / 1000).toFixed(2)} GΩ`
  if (r >= 10) return `${r.toFixed(0)} MΩ`
  if (r >= 1) return `${r.toFixed(1)} MΩ`
  return `${r.toFixed(2)} MΩ`
}

export interface InsResult {
  ok: boolean
  reading: string
  text: string
  warnId?: string
  warnText?: string
  damage?: boolean
}

export function insulationTest(s: ElecState): InsResult {
  const m = s.meter
  const a = m.probeA
  const b = m.probeB
  if (a == null || b == null) return { ok: false, reading: '----', text: 'Leads not placed.' }
  if (POINT_SCENE[a] !== POINT_SCENE[b]) return { ok: false, reading: '----', text: 'Leads are in two different places.' }
  if (isLive(s, a, b)) return { ok: false, reading: '⚡ >30 V', text: 'Voltage detected between the leads. Test inhibited.' }

  const driveTerminals: Point[] = ['L1', 'L2', 'L3', 'DC_P', 'DC_N', 'U', 'V', 'W']
  if (driveTerminals.includes(a) || driveTerminals.includes(b)) {
    return { ok: true, reading: '0.6 MΩ', text: 'Test voltage applied straight into the drive terminals.', warnId: 'meg_into_drive', damage: true }
  }

  const ground: Point[] = ['GND', 'FRAME', 'RECEPT_G']
  const na = pointNode(a)
  const nb = pointNode(b)
  const aG = ground.includes(a)
  const bG = ground.includes(b)
  if ((na == null && !aG) || (nb == null && !bG)) return { ok: false, reading: '----', text: 'Nothing to test between these points.' }
  if (aG && bG) return { ok: true, reading: '0.00 MΩ', text: 'Ground to ground.' }

  // Which node groups are under test, and whether either is still tied to the drive output.
  const groups = [na, nb].filter((n): n is NodeId => n != null).map((n) => group(s, n))
  const touchesCable = groups.some((g) => [...g].some((n) => n.startsWith('cable')))
  let warnId: string | undefined
  let damage = false
  if (touchesCable && !s.leadsLifted) {
    if (contactorClosed(s)) { warnId = 'meg_into_drive'; damage = true }
    else warnId = 'meg_through_contactor'
  }

  let r: number
  if (na != null && nb != null) {
    const ga = group(s, na)
    if (ga.has(nb)) {
      const same = na === nb
      const text = same
        ? 'Same conductor at both ends: continuity.'
        : s.jbox.wyeOpen && !s.jbox.feedersUnbolted
          ? 'Phase to phase through the bolted feeder and winding: continuity.'
          : 'Phase to phase reads through the windings and the wye point: continuity, not insulation. Open the wye point to test winding to winding.'
      return { ok: true, reading: '0.00 MΩ', text, warnId, damage }
    }
    r = groupToGround(s, ga) + groupToGround(s, group(s, nb))
  } else {
    const n = (na ?? nb)!
    r = groupToGround(s, group(s, n))
  }
  if (s.drive.damaged && touchesCable && !s.leadsLifted) r = Math.min(r, 0.6)
  const reading = fmtMohm(r, m.insVolts)
  return { ok: true, reading, text: `${POINT_LABEL[a]} → ${POINT_LABEL[b]} at ${m.insVolts} V: ${reading}`, warnId, damage }
}

// ---- inspection text ---------------------------------------------------------------------------------

export function inspectBoxText(s: ElecState): string {
  const f = s.scenario.fault
  const parts: string[] = []
  if (f === 'termination' && !s.faultCleared) {
    parts.push('Water line a half inch up the inside of the box, breather grille packed with dust and lint.')
    parts.push('T2 feeder lug: heat shrink split below the lug, strands flared and resting against the box wall with a black arc mark on the paint.')
    parts.push('T1 and T3 terminations tight, shrink intact. T4-T5-T6 wye bar tight.')
  } else if (f === 'motor') {
    parts.push('Box dry, breather clear. All three feeder lugs torqued, heat shrink intact, phase tape brown/orange/yellow.')
    parts.push('Faint varnish smell from the motor side. T4-T5-T6 wye bar tight.')
  } else if (f === 'cable') {
    parts.push('Box dry, breather clear. All three feeder lugs torqued, heat shrink intact.')
    parts.push('Feeder jackets show fresh scuffing where they enter the conduit hub, consistent with cable movement. T4-T5-T6 wye bar tight.')
  } else {
    parts.push('Box dry, terminations clean and tight.')
  }
  return parts.join(' ')
}

// ---- reducer -------------------------------------------------------------------------------------------

function restored(s: ElecState): boolean {
  return !s.leadsLifted && !s.jbox.coverOff && !s.jbox.feedersUnbolted && !s.jbox.wyeOpen && !s.doorOpen
}

function meterReadingText(s: ElecState): string | null {
  const m = s.meter
  if (m.mode === 'OFF') return null
  if (m.probeA == null || m.probeB == null) return null
  if (POINT_SCENE[m.probeA] !== POINT_SCENE[m.probeB]) return null
  const v = voltageBetween(s, m.probeA, m.probeB)
  if (m.mode === 'VAC') return `${v.ac.toFixed(1)} V AC`
  if (m.mode === 'VDC') return `${v.dc.toFixed(1)} V DC`
  if (m.mode === 'OHM') return isLive(s, m.probeA, m.probeB) ? 'OL ⚠ live' : 'OL'
  return m.lastTest ?? '----'
}

function placeLead(s: ElecState, p: Point): ElecState {
  const m = s.meter
  if (m.mode === 'OFF') return log(s, 'warn', 'Meter is off.')
  if (POINT_SCENE[p] !== s.scene) return s
  if (m.probeA == null || m.probeB != null) {
    return { ...s, meter: { ...m, probeA: p, probeB: null, lastTest: null } }
  }
  const a = m.probeA
  const b = p
  let next: ElecState = { ...s, meter: { ...m, probeB: b, lastTest: null } }
  if (m.mode === 'INS') return next
  if (m.mode === 'OHM') {
    return log(next, 'measure', `1587 Ω ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${isLive(s, a, b) ? 'OL (live circuit!)' : 'OL'}`)
  }
  const v = voltageBetween(s, a, b)
  const reading = m.mode === 'VAC' ? `${v.ac.toFixed(1)} V AC` : `${v.dc.toFixed(1)} V DC`
  next = { ...next, tests: next.tests + 1 }

  const recept = (x: Point) => x.startsWith('RECEPT')
  if (recept(a) && recept(b)) {
    if (m.mode === 'VAC' && v.ac > 100) {
      next = { ...next, proofs: [...next.proofs, next.t] }
      return log(next, 'measure', `1587 proved on known live source: ${POINT_LABEL[a]} → ${POINT_LABEL[b]} ${reading}`)
    }
    return log(next, 'measure', `1587 ${m.mode === 'VAC' ? 'V AC' : 'V DC'} ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${reading}`)
  }

  const scene = POINT_SCENE[a]
  if (scene === 'drive' && !verifiedDead(s)) {
    const ppe = ppeCheck(s)
    if (!ppe.adequate) next = violate(next, 'ppe_test', ppe.issues[0])
  }
  const live = m.mode === 'VAC' ? v.ac > 30 : Math.abs(v.dc) > 30
  if (!live) {
    const d: DeadTest = { a, b, mode: m.mode, t: next.t }
    next = { ...next, deadTests: [...next.deadTests, d] }
  }
  return log(next, 'measure', `1587 ${m.mode === 'VAC' ? 'V AC' : 'V DC'} ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${reading}${live ? '  ⚡ LIVE' : ''}`)
}

function runInsTest(s: ElecState): ElecState {
  if (s.meter.mode !== 'INS') return log(s, 'warn', 'Turn the 1587 to the insulation position first.')
  const r = insulationTest(s)
  let next: ElecState = { ...s, meter: { ...s.meter, lastTest: r.reading } }
  if (!r.ok) return log(next, 'warn', `1587 insulation: ${r.text}`)
  next = { ...next, tests: next.tests + 1 }
  const a = next.meter.probeA!
  const b = next.meter.probeB!
  next = { ...next, insTests: [...next.insTests, { a, b, volts: next.meter.insVolts, reading: r.reading, t: next.t }] }
  if (!lockedOut(s) || !verifiedDead(s)) next = violate(next, 'meg_not_verified')
  if (next.meter.insVolts < 500) next = violate(next, 'meg_low_volts')
  next = log(next, 'measure', `1587 insulation ${next.meter.insVolts} V: ${r.text}`)
  if (r.warnId) {
    next = violate(next, r.warnId)
    if (r.damage) next = { ...next, drive: { ...next.drive, damaged: true } }
  }
  return log(next, 'info', '1587 discharging the circuit under test.')
}

function requireHandsOn(s: ElecState, where: 'drive' | 'motor'): ElecState {
  let next = s
  if (!lockedOut(s)) next = violate(next, 'work_not_locked')
  else if (!verifiedDead(s)) next = violate(next, 'work_not_verified')
  if (where === 'drive' && chargeLampOn(s)) next = violate(next, 'bus_charged', `Bus at ${busVolts(s).toFixed(0)} V`)
  if (where === 'drive' && s.lp2Closed) next = violate(next, 'ctrl_live_touch')
  return next
}

function applyRepair(s: ElecState, id: RepairId): ElecState {
  const label = REPAIRS.find((r) => r.id === id)?.label ?? id
  let next: ElecState = { ...s, repairs: [...s.repairs, id] }
  const f = s.scenario.fault
  if (id === 'remake_terminations' && f === 'termination') next = { ...next, faultCleared: true }
  if (id === 'replace_motor' && f === 'motor') next = { ...next, faultCleared: true }
  if (id === 'replace_cable' && f === 'cable') next = { ...next, faultCleared: true }
  if (id === 'replace_vfd') next = { ...next, drive: { ...next.drive, damaged: false } }
  if (id === 'replace_motor' || id === 'replace_cable' || id === 'remake_terminations') {
    next = { ...next, jbox: { ...next.jbox, feedersUnbolted: false, wyeOpen: false, lugsCleared: false } }
  }
  return log(next, 'action', `Repair: ${label}`)
}

export function reduceElec(s: ElecState, a: Action): ElecState {
  if (s.finished && a.type !== 'tick') return s
  switch (a.type) {
    case 'tick':
      return { ...s, t: s.t + 1 }
    case 'wait':
      return log({ ...s, t: s.t + a.minutes * 60 }, 'info', `Waited ${a.minutes} minutes. DC bus now ${busVolts({ ...s, t: s.t + a.minutes * 60 }).toFixed(0)} V, CHARGE lamp ${chargeLampOn({ ...s, t: s.t + a.minutes * 60 }) ? 'lit' : 'off'}.`)
    case 'checklist': {
      const next = { ...s, checklist: { ...s.checklist, [a.id]: !s.checklist[a.id] } }
      const item = CHECKLIST.find((c) => c.id === a.id)
      return next.checklist[a.id] ? log(next, 'info', `Pre-work: ${item?.label}`) : next
    }
    case 'goto': {
      if (a.scene === s.scene) return s
      const names: Record<Scene, string> = { mcc: 'the MCC room', drive: 'the open VFD-101 cabinet', motor: 'P-101 motor' }
      const next = { ...s, scene: a.scene, meter: { ...s.meter, probeA: null, probeB: null, lastTest: null } }
      return log(next, 'info', `Walked to ${names[a.scene]}.`)
    }
    case 'readLabel': {
      const l = s.scenario.label
      return log({ ...s, labelRead: true }, 'inspect', `Arc flash label: ${l.incidentEnergy} cal/cm² at ${l.workingDistance} in, AFB ${l.arcFlashBoundary} in, ${l.voltage} V, limited ${l.limitedApproach} in, restricted ${l.restrictedApproach} in, glove class ${l.gloveClass}, min arc rating ${l.minArcRating} cal/cm².`)
    }
    case 'ppe': {
      const item = PPE_ITEMS.find((p) => p.id === a.id)!
      let ppe = s.ppe.filter((p) => p !== a.id)
      if (a.on) {
        // one body garment and one glove type at a time
        if (item.slot === 'body' && item.id !== 'cotton') ppe = ppe.filter((p) => !['ar8', 'ar12', 'suit40'].includes(p))
        if (item.slot === 'hands') ppe = ppe.filter((p) => !['gloves_leather', 'gloves00'].includes(p))
        ppe = [...ppe, a.id]
      }
      const next = { ...s, ppe }
      return a.on ? log(next, 'action', `Donned: ${item.label}`) : next
    }
    case 'breaker': {
      if (a.closed === s.mccClosed) return s
      if (s.locks.mcc) return log(s, 'warn', 'MCC-3 3B handle will not move: locked.')
      let next = s
      const ppe = ppeCheck(s)
      if (!ppe.adequate) next = violate(next, 'ppe_breaker', ppe.issues[0])
      if (a.closed) {
        next = { ...next, mccClosed: true }
        return log(next, 'action', 'MCC-3 bucket 3B breaker closed. VFD-101 energized, DC bus charging.')
      }
      next = { ...next, mccClosed: false, tOff: s.t, busAtOff: busVolts(s), drive: { ...next.drive, running: false }, done: { ...next.done, breakerOpened: true } }
      return log(next, 'action', 'MCC-3 bucket 3B breaker opened. Handle in OFF, visible open confirmed through the window. CHARGE lamp still lit.')
    }
    case 'lp2': {
      if (a.closed === s.lp2Closed) return s
      if (s.locks.lp2) return log(s, 'warn', 'LP-2 ckt 7 will not move: locked.')
      const next = { ...s, lp2Closed: a.closed, done: { ...s.done, lp2Opened: s.done.lp2Opened || !a.closed } }
      return log(next, 'action', a.closed ? 'LP-2 ckt 7 closed. 120 V control circuit live, 1M contactor pulled in.' : 'LP-2 ckt 7 opened. 120 V control circuit dead, 1M contactor dropped out.')
    }
    case 'lock': {
      const closed = a.target === 'mcc' ? s.mccClosed : s.lp2Closed
      if (a.on && closed) return log(s, 'warn', `Cannot lock ${a.target === 'mcc' ? 'MCC-3 3B' : 'LP-2 ckt 7'} in the OFF position while it is closed. Open it first.`)
      if (a.on === s.locks[a.target]) return s
      let next: ElecState = { ...s, locks: { ...s.locks, [a.target]: a.on } }
      if (a.on) next = { ...next, done: { ...next.done, [a.target === 'mcc' ? 'mccLocked' : 'lp2Locked']: true } }
      if (!a.on && !restored(s)) next = violate(next, 'locks_early')
      return log(next, 'action', `${a.on ? 'Applied' : 'Removed'} personal lock on ${a.target === 'mcc' ? 'MCC-3 bucket 3B handle' : 'LP-2 ckt 7 breaker lockout'}.`)
    }
    case 'tag': {
      if (a.on === s.tags[a.target]) return s
      const next: ElecState = { ...s, tags: { ...s.tags, [a.target]: a.on }, done: a.on ? { ...s.done, [a.target === 'mcc' ? 'mccTagged' : 'lp2Tagged']: true } : s.done }
      return log(next, 'action', `${a.on ? 'Hung' : 'Removed'} danger tag on ${a.target === 'mcc' ? 'MCC-3 3B' : 'LP-2 ckt 7'}: name, date, "Do not operate – VFD-101 ground fault".`)
    }
    case 'tryStart': {
      if (s.locks.mcc && s.locks.lp2 && !s.mccClosed && !s.lp2Closed) {
        return log({ ...s, tryStepDone: true }, 'action', 'Try-step: MCC-3 3B handle will not move with the lock on. LP-2 ckt 7 locked. RUN pressed on the keypad: no response. Equipment cannot be restarted.')
      }
      if (!s.mccClosed && !s.locks.mcc) {
        let next = violate(s, 'reenergized')
        next = { ...next, mccClosed: true }
        return log(next, 'action', 'Try-step with no lock: the handle went back to ON. VFD-101 is energized again.')
      }
      return log(s, 'warn', 'Try-step before the lockout is complete proves nothing. Open and lock both sources first.')
    }
    case 'keypad': {
      if (!keypadLit(s)) return log(s, 'info', 'Keypad is dark.')
      if (a.key === 'STOP') return log({ ...s, drive: { ...s.drive, running: false, display: s.drive.faulted ? s.scenario.drive.faultCode : '0.0' } }, 'action', 'Keypad STOP.')
      if (a.key === 'RESET') {
        if (!s.drive.faulted) return s
        return log({ ...s, drive: { ...s.drive, faulted: false, display: '0.0' } }, 'action', `Keypad RESET: ${s.scenario.drive.faultCode} cleared, display 0.0 Hz.`)
      }
      // RUN
      if (!s.mccClosed) return log(s, 'info', 'RUN pressed: no main power, drive will not start.')
      if (s.drive.faulted) return log(s, 'info', `RUN pressed: ${s.scenario.drive.faultCode} standing, reset required.`)
      if (!restored(s)) {
        return violate(log({ ...s, drive: { ...s.drive, faulted: true, display: 'EPHO' } }, 'action', 'RUN pressed: output phase loss EPHO, drive tripped.'), 'run_not_restored')
      }
      if (s.drive.damaged) return log({ ...s, drive: { ...s.drive, faulted: true, display: 'OCA' } }, 'action', 'RUN pressed: OCA over-current at start, drive tripped. Output stage damaged.')
      if (!s.faultCleared) return log({ ...s, drive: { ...s.drive, faulted: true, display: s.scenario.drive.faultCode } }, 'action', `RUN pressed: ${s.scenario.drive.faultCode} ground fault within 0.2 s. Fault still present.`)
      return log({ ...s, drive: { ...s.drive, running: true, display: '60.0' } }, 'action', `RUN pressed: ramped to 60.0 Hz, ${(s.scenario.motor.fla * 0.82).toFixed(0)} A, no fault.`)
    }
    case 'door': {
      if (a.open === s.doorOpen) return s
      let next = s
      if (a.open && s.mccClosed) {
        const ppe = ppeCheck(s)
        if (!ppe.adequate) next = violate(next, 'ppe_door', ppe.issues[0])
      }
      next = { ...next, doorOpen: a.open }
      return log(next, 'action', a.open ? `Opened VFD-101 cabinet door. CHARGE lamp ${chargeLampOn(s) ? 'LIT' : 'off'}.` : 'Closed VFD-101 cabinet door.')
    }
    case 'meterMode':
      return { ...s, meter: { ...s.meter, mode: a.mode, probeA: null, probeB: null, lastTest: null } }
    case 'meterVolts':
      return { ...s, meter: { ...s.meter, insVolts: a.volts, lastTest: null } }
    case 'probe':
      return placeLead(s, a.point)
    case 'meterClear':
      return { ...s, meter: { ...s.meter, probeA: null, probeB: null, lastTest: null } }
    case 'insTest':
      return runInsTest(s)
    case 'liftLeads': {
      if (a.lifted === s.leadsLifted) return s
      if (!s.doorOpen) return log(s, 'warn', 'Open the cabinet door first.')
      let next = a.lifted ? requireHandsOn(s, 'drive') : s
      next = { ...next, leadsLifted: a.lifted, meter: { ...next.meter, probeA: null, probeB: null, lastTest: null } }
      return log(next, 'action', a.lifted ? 'Lifted motor leads T1, T2, T3 from the 1M contactor load side, taped and tagged. Motor circuit isolated from the drive.' : 'Re-landed motor leads T1, T2, T3 on 1M, torqued.')
    }
    case 'cover': {
      if (a.off === s.jbox.coverOff) return s
      if (s.scene !== 'motor') return s
      let next = a.off ? requireHandsOn(s, 'motor') : s
      next = { ...next, jbox: { ...next.jbox, coverOff: a.off } }
      return log(next, 'action', a.off ? 'Removed P-101M terminal box cover (8 bolts).' : 'Terminal box cover reinstalled, gasket seated, bolts torqued.')
    }
    case 'inspectBox': {
      if (!s.jbox.coverOff) return log(s, 'warn', 'Cover is on.')
      const text = inspectBoxText(s)
      return log({ ...s, jbox: { ...s.jbox, inspected: true } }, 'inspect', `Terminal box: ${text}`)
    }
    case 'unboltFeeders': {
      if (a.unbolted === s.jbox.feedersUnbolted) return s
      if (!s.jbox.coverOff) return log(s, 'warn', 'Cover is on.')
      let next = a.unbolted ? requireHandsOn(s, 'motor') : s
      next = { ...next, jbox: { ...next.jbox, feedersUnbolted: a.unbolted, lugsCleared: a.unbolted ? next.jbox.lugsCleared : false }, meter: { ...next.meter, probeA: null, probeB: null, lastTest: null } }
      return log(next, 'action', a.unbolted ? 'Unbolted feeder lugs L1, L2, L3 from bushings T1, T2, T3. Motor and cable separated.' : 'Feeder lugs bolted back on T1, T2, T3 and torqued.')
    }
    case 'clearLugs': {
      if (!s.jbox.feedersUnbolted) return log(s, 'warn', 'Feeder lugs are still bolted to the bushings.')
      if (s.jbox.lugsCleared) return s
      return log({ ...s, jbox: { ...s.jbox, lugsCleared: true } }, 'action', 'Lifted feeder lugs supported clear of the enclosure and wrapped.')
    }
    case 'wye': {
      if (a.open === s.jbox.wyeOpen) return s
      if (!s.jbox.coverOff) return log(s, 'warn', 'Cover is on.')
      let next = a.open ? requireHandsOn(s, 'motor') : s
      next = { ...next, jbox: { ...next.jbox, wyeOpen: a.open }, meter: { ...next.meter, probeA: null, probeB: null, lastTest: null } }
      return log(next, 'action', a.open ? 'Removed the T4-T5-T6 wye bar. Each winding now isolated: T1-T4, T2-T5, T3-T6.' : 'T4-T5-T6 wye bar reinstalled and torqued.')
    }
    case 'diagnose': {
      const label = DIAGNOSES.find((d) => d.id === a.id)?.label ?? a.id
      return log({ ...s, diagnosis: a.id }, 'action', `Diagnosis recorded: ${label}`)
    }
    case 'repair':
      return applyRepair(s, a.id)
    case 'finish':
      return log({ ...s, finished: true }, 'info', `Work order closed at ${fmtT(s.t)}.`)
  }
}

export { meterReadingText, restored }
