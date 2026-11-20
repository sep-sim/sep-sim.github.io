// Electrical safety engine, medium-voltage edition: a 4160 V VFD with bypass on a 4000 HP pump motor, fed auxiliaries
// from a 480 V MCC and control from 120 V. Energy state, LOTO across four sources, what each instrument sees,
// insulation testing on a 6-lead motor circuit, and every technician action with its NFPA 70E consequence.

import type {
  DeadTest, DiagnosisId, ElecScenario, ElecState, LockTarget, LogKind, MeggerLeadId, MeggerMode, MeggerResult, MeggerVolts,
  MeterKey, MeterMode, Point, PpeId, RepairId, Scene, TicRange,
} from './types'
import { CHECKLIST, DIAGNOSES, LOCK_TARGETS, POINT_LABEL, POINT_SCENE, PPE_ITEMS, REPAIRS } from './types'
import { JACK_LABEL, jackForMode } from '../engine/types'
import type { Jack, LeadId } from '../engine/types'

// ---- actions ------------------------------------------------------------------------------------

export type Action =
  | { type: 'tick' }
  | { type: 'wait'; minutes: number }
  | { type: 'checklist'; id: string }
  | { type: 'goto'; scene: Scene }
  | { type: 'readLabel' }
  | { type: 'ppe'; id: PpeId; on: boolean }
  | { type: 'ppeConfirm' }
  | { type: 'switch'; target: LockTarget; closed: boolean }
  | { type: 'lock'; target: LockTarget; on: boolean }
  | { type: 'tag'; target: LockTarget; on: boolean }
  | { type: 'tryStart' }
  | { type: 'relay'; key: 'START' | 'STOP' | 'RESET' }
  | { type: 'door'; open: boolean }
  | { type: 'auxDoor'; open: boolean }
  | { type: 'meterMode'; mode: MeterMode }
  | { type: 'meterKey'; key: MeterKey }
  | { type: 'probe'; point: Point; lead?: LeadId }
  | { type: 'meterJack'; jack: Jack; on: boolean }
  | { type: 'meterLift'; lead: LeadId }
  | { type: 'meterClear' }
  | { type: 'meggerMode'; mode: MeggerMode }
  | { type: 'meggerVolts'; volts: MeggerVolts }
  | { type: 'meggerJack'; term: MeggerLeadId; on: boolean }
  | { type: 'meggerLead'; lead: MeggerLeadId; point: Point; drag?: boolean }
  | { type: 'meggerLift'; lead: MeggerLeadId }
  | { type: 'meggerClear' }
  | { type: 'meggerTest' }
  | { type: 'ticPower'; on: boolean }
  | { type: 'ticRange'; range: TicRange }
  | { type: 'ticHotStick'; on: boolean }
  | { type: 'ticSelfTest' }
  | { type: 'ticCheck'; point: Point }
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
  ppe_before_loto: { points: -20, label: 'Started isolating equipment before suiting up in the PPE the label calls for' },
  ppe_test: { points: -20, label: 'Voltage testing on unverified conductors without the PPE the label calls for' },
  ppe_door: { points: -15, label: 'Opened an energized compartment without the PPE the label calls for' },
  dmm_on_mv: { points: -20, label: 'Contact meter rated CAT III 1000 V placed on 4160 V conductors' },
  tic_low_range_mv: { points: -5, label: 'TIC 300 PRO on LOW range at 4160 V: it picks up the adjacent live bus, HIGH is the range for MV' },
  tic_no_selftest: { points: -5, label: 'Non-contact detector used without a self-test first' },
  tic_no_hotstick: { points: -10, label: 'TIC 300 PRO hand-held at a 4160 V conductor: inside the restricted approach boundary, the tracer goes on the hot stick' },
  no_prove_before: { points: -10, label: 'Absence-of-voltage test without proving the instrument on a known source first' },
  no_prove_after: { points: -10, label: 'Instrument not re-proved after testing dead' },
  work_not_verified: { points: -20, label: 'Hands on conductors before absence of voltage was verified' },
  work_not_locked: { points: -15, label: 'Hands on conductors before lockout of every source was applied' },
  cells_charged: { points: -10, label: 'Worked in the motor connection compartment with the drive cell capacitors still charged' },
  reenergized: { points: -15, label: 'Re-energized the equipment while attempting a try-step without a lock' },
  meg_into_drive: { points: -30, label: 'Insulation test applied with the drive output still connected: output cells destroyed' },
  meg_through_contactor: { points: -10, label: 'Insulation test through an open contactor instead of lifted leads' },
  meg_low_volts: { points: -5, label: 'Insulation test voltage too low for a 4160 V motor (IEEE 43: 2.5 kV)' },
  meg_high_volts: { points: -5, label: 'Insulation test voltage above the acceptable range for this winding' },
  meg_polarity: { points: 0, label: 'Megger leads reversed: − lead belongs on the conductor, + to earth' },
  locks_early: { points: -10, label: 'Lockout removed before the equipment was restored and clear' },
  ctrl_live_touch: { points: -10, label: 'Control circuit left energized while working in the compartment' },
  run_not_restored: { points: -5, label: 'Attempted to start the drive before the circuit was reconnected' },
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

export function targetLabel(t: LockTarget): string {
  return LOCK_TARGETS.find((x) => x.id === t)!.label
}

export function createElecSession(scenario: ElecScenario): ElecState {
  const s: ElecState = {
    scenario,
    t: 0,
    log: [],
    scene: 'room',
    checklist: Object.fromEntries(CHECKLIST.map((c) => [c.id, false])),
    labelRead: false,
    ppe: ['cotton', 'boots'],
    ppeConfirmed: null,
    closed: { mv: true, bypass: true, aux: true, ctrl: true },
    locks: { mv: false, bypass: false, aux: false, ctrl: false },
    tags: { mv: false, bypass: false, aux: false, ctrl: false },
    done: {
      mv: { opened: false, locked: false, tagged: false }, bypass: { opened: false, locked: false, tagged: false },
      aux: { opened: false, locked: false, tagged: false }, ctrl: { opened: false, locked: false, tagged: false },
    },
    tOff: null,
    linkAtOff: 0,
    tryStepDone: false,
    doorOpen: false,
    auxDoorOpen: false,
    drive: { faulted: true, running: false, damaged: false, display: scenario.drive.faultCode },
    leadsLifted: false,
    jbox: { coverOff: false, feedersUnbolted: false, lugsCleared: false, wyeOpen: false, inspected: false },
    meter: { mode: 'OFF', jacks: { red: null, black: false }, probeA: null, probeB: null, held: null, rel: null, manualRange: false, backlight: false },
    megger: { mode: 'OFF', volts: 500, leads: { plus: false, minus: false }, minus: null, plus: null, testing: false, tStart: null, result: null, inhibit: null },
    tic: { on: false, range: 'LOW', hotStick: false, selfTestAt: null, last: null },
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

/** Drive cell capacitor voltage. Held up by the 4160 V incoming; bleeds down after the isolation switch opens (τ = 3 min, below 50 V inside the 15 minutes Toshiba calls for). */
export function linkVolts(s: ElecState): number {
  if (s.closed.mv) return 5600
  if (s.tOff == null) return 0
  return s.linkAtOff * Math.exp(-(s.t - s.tOff) / 180)
}

export function chargeLampOn(s: ElecState): boolean {
  return linkVolts(s) > 50
}

/** Output isolation contactor M32 is held in by the 120 V control circuit. */
export function contactorClosed(s: ElecState): boolean {
  return s.closed.ctrl
}

export function relayLit(s: ElecState): boolean {
  return s.closed.ctrl
}

export const MV_POINTS: Point[] = ['BP_L1', 'BP_L2', 'BP_L3', 'VO_1', 'VO_2', 'VO_3', 'U', 'V', 'W', 'PROVE_MV']

type Phasor = [number, number]

function acPhasor(s: ElecState, p: Point): Phasor {
  const ph = (mag: number, deg: number): Phasor => [mag * Math.cos((deg * Math.PI) / 180), mag * Math.sin((deg * Math.PI) / 180)]
  switch (p) {
    case 'RECEPT_H': return [120, 0]
    case 'CTRL_H': return s.closed.ctrl ? [120, 0] : [0, 0]
    case 'AUX_T1': return s.closed.aux ? ph(277, 0) : [0, 0]
    case 'AUX_T2': return s.closed.aux ? ph(277, -120) : [0, 0]
    case 'AUX_T3': return s.closed.aux ? ph(277, 120) : [0, 0]
    case 'BP_L1': return s.closed.bypass ? ph(2400, 0) : [0, 0]
    case 'BP_L2': return s.closed.bypass ? ph(2400, -120) : [0, 0]
    case 'BP_L3': return s.closed.bypass ? ph(2400, 120) : [0, 0]
    case 'PROVE_MV': return ph(2400, 0)
    // drive output and the motor connection are only live while the drive runs or the bypass contactor is in
    case 'VO_1': case 'U': return s.drive.running ? ph(2400, 0) : [0, 0]
    case 'VO_2': case 'V': return s.drive.running ? ph(2400, -120) : [0, 0]
    case 'VO_3': case 'W': return s.drive.running ? ph(2400, 120) : [0, 0]
    default: return [0, 0]
  }
}

/** Volts between two points. There is no DC point a hand meter can reach in this controller. */
export function voltageBetween(s: ElecState, a: Point, b: Point): { ac: number; dc: number } {
  const pa = acPhasor(s, a)
  const pb = acPhasor(s, b)
  return { ac: Math.hypot(pa[0] - pb[0], pa[1] - pb[1]), dc: 0 }
}

export function isLive(s: ElecState, a: Point, b: Point): boolean {
  return voltageBetween(s, a, b).ac > 30
}

/** AC volts to ground a non-contact detector sees at a point. */
export function ticVolts(s: ElecState, p: Point): number {
  const ph = acPhasor(s, p)
  return Math.hypot(ph[0], ph[1])
}

/** Any 4160 V source still live near the motor connection compartment. */
export function mvLiveNearby(s: ElecState): boolean {
  return s.closed.bypass || s.closed.mv || s.drive.running
}

// ---- PPE -----------------------------------------------------------------------------------------

export function ppeCheck(s: ElecState): { adequate: boolean; issues: string[]; bodyRating: number } {
  const worn = new Set(s.ppe)
  const l = s.scenario.label
  const issues: string[] = []
  const body = PPE_ITEMS.filter((p) => p.slot === 'body' && worn.has(p.id)).reduce((m, p) => Math.max(m, p.arcRating ?? 0), 0)
  if (body < l.incidentEnergy) issues.push(`Body arc rating ${body} cal/cm² is below the ${l.incidentEnergy} cal/cm² incident energy`)
  if (!worn.has('hardhat')) issues.push('No hard hat')
  if (!worn.has('hood40')) issues.push(l.incidentEnergy > 12 ? 'No arc-rated hood: the label needs the 40 cal/cm² balaclava hood' : 'No arc-rated head and face protection')
  if (!worn.has('glasses')) issues.push('No safety glasses')
  if (!worn.has('hearing')) issues.push('No hearing protection')
  if (!worn.has('boots')) issues.push('No leather footwear')
  const glove = PPE_ITEMS.find((p) => p.slot === 'hands' && p.shockOk && worn.has(p.id))
  if (!glove) issues.push(`No voltage-rated gloves (class ${l.gloveClass} required for ${l.voltage} V shock exposure)`)
  else if ((glove.maxUseAc ?? 0) < l.voltage) issues.push(`Class ${glove.gloveClass} gloves are rated ${glove.maxUseAc} V, below ${l.voltage} V`)
  else if ((glove.gloveRank ?? 0) < l.gloveRank) issues.push(`Class ${glove.gloveClass} gloves are below the class ${l.gloveClass} the label calls for`)
  else if (!worn.has('gloves_leather')) issues.push(`Class ${glove.gloveClass} rubber gloves without leather protectors over them`)
  return { adequate: issues.length === 0, issues, bodyRating: body }
}

/** Suited up: the technician confirmed the kit against the label and is still wearing an adequate kit. */
export function suitedUp(s: ElecState): boolean {
  return s.ppeConfirmed != null && s.ppeConfirmed.adequate && ppeCheck(s).adequate
}

function requireSuit(s: ElecState, id: string): ElecState {
  if (suitedUp(s)) return s
  const chk = ppeCheck(s)
  const why = s.ppeConfirmed == null ? 'PPE never confirmed against the label' : chk.issues[0] ?? 'kit changed after confirmation'
  return violate(s, id, why)
}

// ---- verification tracking ------------------------------------------------------------------------

/**
 * Absence-of-voltage checks required before hands go on conductors. The 4160 V points take the TIC 300 PRO on HIGH range
 * (a contact meter rated 1000 V has no business there). The 480 V and 120 V points take the Fluke 789 on V AC.
 */
export const REQUIRED_DEAD: { a: Point; b: Point; instrument: 'tic' | 'dmm'; label: string }[] = [
  { a: 'BP_L1', b: 'GND', instrument: 'tic', label: 'Bypass stab L1 (4160 V)' },
  { a: 'BP_L2', b: 'GND', instrument: 'tic', label: 'Bypass stab L2 (4160 V)' },
  { a: 'BP_L3', b: 'GND', instrument: 'tic', label: 'Bypass stab L3 (4160 V)' },
  { a: 'VO_1', b: 'GND', instrument: 'tic', label: 'VFD output termination 1' },
  { a: 'VO_2', b: 'GND', instrument: 'tic', label: 'VFD output termination 2' },
  { a: 'VO_3', b: 'GND', instrument: 'tic', label: 'VFD output termination 3' },
  { a: 'U', b: 'GND', instrument: 'tic', label: 'Motor connection U' },
  { a: 'V', b: 'GND', instrument: 'tic', label: 'Motor connection V' },
  { a: 'W', b: 'GND', instrument: 'tic', label: 'Motor connection W' },
  { a: 'AUX_T1', b: 'AUX_G', instrument: 'dmm', label: 'Aux bucket T1 to ground (480 V)' },
  { a: 'AUX_T2', b: 'AUX_G', instrument: 'dmm', label: 'Aux bucket T2 to ground (480 V)' },
  { a: 'AUX_T3', b: 'AUX_G', instrument: 'dmm', label: 'Aux bucket T3 to ground (480 V)' },
  { a: 'CTRL_H', b: 'CTRL_N', instrument: 'dmm', label: 'Control X1-1 to neutral (120 V)' },
]

function pairKey(a: Point, b: Point): string {
  return [a, b].sort().join('-')
}

function satisfies(r: (typeof REQUIRED_DEAD)[number], d: DeadTest): boolean {
  if (d.instrument !== r.instrument) return false
  if (d.instrument === 'tic') return d.a === r.a
  if (d.mode !== 'VAC') return false
  if (r.a === 'CTRL_H') return (d.a === 'CTRL_H' || d.b === 'CTRL_H') && (d.a === 'CTRL_N' || d.b === 'CTRL_N')
  return pairKey(d.a, d.b) === pairKey(r.a, r.b)
}

export function deadTestDone(s: ElecState, r: (typeof REQUIRED_DEAD)[number]): boolean {
  return s.deadTests.some((d) => satisfies(r, d))
}

export function verifiedDead(s: ElecState): boolean {
  return REQUIRED_DEAD.every((r) => deadTestDone(s, r))
}

function requiredRecords(s: ElecState): DeadTest[] {
  return s.deadTests.filter((d) => REQUIRED_DEAD.some((r) => satisfies(r, d)))
}

export type Instrument = 'tic' | 'dmm'
/** Live-dead-live is per instrument: the one that made the dead records must have been proved before the first and after the last. */
export function provedBeforeFor(s: ElecState, inst: Instrument): boolean {
  const req = requiredRecords(s).filter((d) => d.instrument === inst)
  if (req.length === 0) return false
  const first = Math.min(...req.map((d) => d.n))
  return s.proofs.some((p) => p.instrument === inst && p.n < first)
}
export function provedAfterFor(s: ElecState, inst: Instrument): boolean {
  const req = requiredRecords(s).filter((d) => d.instrument === inst)
  if (req.length === 0) return false
  const last = Math.max(...req.map((d) => d.n))
  return s.proofs.some((p) => p.instrument === inst && p.n > last)
}
function instrumentsUsed(s: ElecState): Instrument[] {
  const used = new Set(requiredRecords(s).map((d) => d.instrument))
  return (['tic', 'dmm'] as Instrument[]).filter((i) => used.has(i))
}
export function provedBefore(s: ElecState): boolean {
  const used = instrumentsUsed(s)
  return used.length > 0 && used.every((i) => provedBeforeFor(s, i))
}
export function provedAfter(s: ElecState): boolean {
  const used = instrumentsUsed(s)
  return used.length > 0 && used.every((i) => provedAfterFor(s, i))
}

export function lockedOut(s: ElecState): boolean {
  return LOCK_TARGETS.every((t) => !s.closed[t.id] && s.locks[t.id])
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
    case 'U': case 'CBL_1': return 'cable1'
    case 'V': case 'CBL_2': return 'cable2'
    case 'W': case 'CBL_3': return 'cable3'
    case 'T1': case 'T4': return 'motor1'
    case 'T2': case 'T5': return 'motor2'
    case 'T3': case 'T6': return 'motor3'
    default: return null
  }
}

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

/** Insulation resistance of one node to ground, MΩ, one-minute value. Form-wound 4 kV machine. */
function nodeToGround(s: ElecState, n: NodeId): number {
  const f = s.scenario.fault
  const cleared = s.faultCleared
  switch (n) {
    case 'motor1': return 2400
    case 'motor2': return f === 'motor' && !cleared ? 0.3 : 2100
    case 'motor3': return 2700
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

export function fmtMohm(r: number, volts: MeggerVolts): string {
  const cap = volts >= 5000 ? 20000 : volts >= 2500 ? 10000 : volts >= 1000 ? 4000 : volts >= 500 ? 2000 : 1000
  if (!Number.isFinite(r) || r >= cap) return `OL (> ${cap / 1000} GΩ)`
  if (r >= 1000) return `${(r / 1000).toFixed(2)} GΩ`
  if (r >= 10) return `${r.toFixed(0)} MΩ`
  if (r >= 1) return `${r.toFixed(1)} MΩ`
  return `${r.toFixed(2)} MΩ`
}

export interface InsResult {
  ok: boolean
  r: number
  reading: string
  text: string
  warnId?: string
  damage?: boolean
  polarityNote?: boolean
}

/** Static insulation result for the Megger's leads: − on the conductor under test, + to earth. */
export function insulationTest(s: ElecState, minusPt: Point | null = s.megger.minus, plusPt: Point | null = s.megger.plus, volts: MeggerVolts = s.megger.volts): InsResult {
  const a = minusPt
  const b = plusPt
  if (a == null || b == null) return { ok: false, r: OL, reading: '----', text: 'Leads not connected.' }
  if (POINT_SCENE[a] !== POINT_SCENE[b]) return { ok: false, r: OL, reading: '----', text: 'Leads are in two different places.' }
  if (isLive(s, a, b)) {
    const v = voltageBetween(s, a, b)
    return { ok: false, r: OL, reading: `⚡ ${v.ac.toFixed(0)} V AC`, text: `${v.ac.toFixed(0)} V AC present between the leads. Test inhibited.` }
  }

  const driveTerminals: Point[] = ['VO_1', 'VO_2', 'VO_3', 'BP_L1', 'BP_L2', 'BP_L3', 'AUX_T1', 'AUX_T2', 'AUX_T3', 'CTRL_H', 'CTRL_N']
  if (driveTerminals.includes(a) || driveTerminals.includes(b)) {
    return { ok: true, r: 0.6, reading: fmtMohm(0.6, volts), text: 'Test voltage applied into the controller, not the motor circuit.', warnId: 'meg_into_drive', damage: true }
  }

  const ground: Point[] = ['GND', 'FRAME', 'RECEPT_G', 'AUX_G']
  const na = pointNode(a)
  const nb = pointNode(b)
  const aG = ground.includes(a)
  const bG = ground.includes(b)
  if ((na == null && !aG) || (nb == null && !bG)) return { ok: false, r: OL, reading: '----', text: 'Nothing to test between these points.' }
  if (aG && bG) return { ok: true, r: 0, reading: '0.00 MΩ', text: 'Earth to earth.' }
  const polarityNote = aG && !bG

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
      return { ok: true, r: 0, reading: '0.00 MΩ', text, warnId, damage }
    }
    r = groupToGround(s, ga) + groupToGround(s, group(s, nb))
  } else {
    const n = (na ?? nb)!
    r = groupToGround(s, group(s, n))
  }
  if (s.drive.damaged && touchesCable && !s.leadsLifted) r = Math.min(r, 0.6)
  const reading = fmtMohm(r, volts)
  return { ok: true, r, reading, text: `${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${reading}`, warnId, damage, polarityNote }
}

/** Dielectric absorption: sound insulation keeps climbing, contaminated or faulted insulation does not. `r60` is the one-minute value. */
export function absorption(r60: number, seconds: number): number {
  if (!Number.isFinite(r60)) return OL
  if (r60 < 1) return r60
  const k = (0.25 + 0.75 * (1 - Math.exp(-seconds / 150))) / 0.497
  return r60 * k
}

export function leakageNa(r: number, volts: number): number {
  if (!Number.isFinite(r) || r <= 0) return 0
  return (volts / (r * 1e6)) * 1e9
}

export const MEGGER_AUTO_STOP: Partial<Record<MeggerMode, number>> = { IRT: 60, DAR: 60, PI: 600 }

export function meggerLive(s: ElecState): { r: number; seconds: number; reading: string } | null {
  const m = s.megger
  if (!m.testing || m.tStart == null) return null
  const base = insulationTest(s)
  const seconds = s.t - m.tStart
  const r = absorption(base.r, seconds)
  return { r, seconds, reading: fmtMohm(r, m.volts) }
}

// ---- inspection text ---------------------------------------------------------------------------------

export function inspectBoxText(s: ElecState): string {
  const f = s.scenario.fault
  const parts: string[] = []
  if (f === 'termination' && !s.faultCleared) {
    parts.push('Water line a half inch up the inside of the box, breather grille packed with dust and lint.')
    parts.push('L2 feeder termination: stress cone tracking from the cutback down to the lug, a carbon track to the box wall, shrink split below the lug.')
    parts.push('L1 and L3 terminations clean, shrink intact. T4-T5-T6 wye bar tight.')
  } else if (f === 'motor') {
    parts.push('Box dry, breather clear. All three feeder terminations clean, stress cones intact, phase tape brown/orange/yellow.')
    parts.push('Varnish smell from the stator side, discoloration at the T2 bushing. T4-T5-T6 wye bar tight.')
  } else if (f === 'cable') {
    parts.push('Box dry, breather clear. All three terminations clean, stress cones intact.')
    parts.push('Feeder jackets show fresh scuffing where they enter the conduit hub, consistent with the cable being disturbed. T4-T5-T6 wye bar tight.')
  } else {
    parts.push('Box dry, terminations clean and tight.')
  }
  return parts.join(' ')
}

// ---- reducer -------------------------------------------------------------------------------------------

function restored(s: ElecState): boolean {
  return !s.leadsLifted && !s.jbox.coverOff && !s.jbox.feedersUnbolted && !s.jbox.wyeOpen && !s.doorOpen && !s.auxDoorOpen
}

function meterReadingText(s: ElecState): string | null {
  const m = s.meter
  if (m.mode === 'OFF') return null
  if (m.probeA == null || m.probeB == null) return null
  if (POINT_SCENE[m.probeA] !== POINT_SCENE[m.probeB]) return null
  const v = voltageBetween(s, m.probeA, m.probeB)
  if (m.mode === 'VAC') return `${v.ac.toFixed(1)} V AC`
  if (m.mode === 'VDC') return `${v.dc.toFixed(1)} V DC`
  if (m.mode === 'mVDC') return v.ac > 0.3 ? 'OL mV DC' : '0.0 mV DC'
  if (m.mode === 'OHM') return isLive(s, m.probeA, m.probeB) ? 'OL ⚠ live' : 'OL'
  return '0.000 mA'
}

function meterKey(s: ElecState, key: MeterKey): ElecState {
  const m = s.meter
  if (m.mode === 'OFF') return s
  switch (key) {
    case 'HOLD': {
      if (m.held != null) return { ...s, meter: { ...m, held: null } }
      const t = meterReadingText(s)
      return t ? { ...s, meter: { ...m, held: t } } : s
    }
    case 'RANGE': return { ...s, meter: { ...m, manualRange: !m.manualRange } }
    case 'REL': {
      if (m.rel != null) return { ...s, meter: { ...m, rel: null } }
      if (m.probeA == null || m.probeB == null || (m.mode !== 'VAC' && m.mode !== 'VDC')) return s
      const v = voltageBetween(s, m.probeA, m.probeB)
      return { ...s, meter: { ...m, rel: m.mode === 'VAC' ? v.ac : v.dc } }
    }
    case 'BACKLIGHT': return { ...s, meter: { ...m, backlight: !m.backlight } }
    default: return s
  }
}

function placeLead(s: ElecState, p: Point, lead?: LeadId): ElecState {
  const m = s.meter
  if (m.mode === 'OFF') return log(s, 'warn', 'Meter is off.')
  if (POINT_SCENE[p] !== s.scene) return s
  const want = jackForMode(m.mode)
  let jacks = m.jacks
  if (lead) {
    if (jacks.red == null || !jacks.black) return log(s, 'warn', 'Plug both leads into the 789 first: black in COM, red in the jack this knob position uses.')
    if (jacks.red !== want) return log(s, 'warn', `789 input alert, LEAd flashing: the red lead is in the ${JACK_LABEL[jacks.red]} jack but this position uses ${JACK_LABEL[want]}. Move the lead.`)
  } else {
    jacks = { red: want, black: true }
  }
  if (MV_POINTS.includes(p)) {
    return violate({ ...s, meter: { ...m, jacks, probeA: null, probeB: null, held: null } }, 'dmm_on_mv', `${POINT_LABEL[p]}. The 789 stays off 4160 V conductors; verify them with the TIC 300 PRO.`)
  }
  let meter = { ...m, jacks, held: null }
  if (lead === 'red') meter = { ...meter, probeA: p }
  else if (lead === 'black') meter = { ...meter, probeB: p }
  else if (m.probeA == null || m.probeB != null) meter = { ...meter, probeA: p, probeB: null }
  else meter = { ...meter, probeB: p }
  const placed: ElecState = { ...s, meter }
  return meter.probeA != null && meter.probeB != null ? measure(placed) : placed
}

/** Both 789 leads are on points: read, log, and record a dead check or a proof. */
function measure(s: ElecState): ElecState {
  const m = s.meter
  const a = m.probeA!
  const b = m.probeB!
  let next: ElecState = s
  if (m.mode === 'mA' || m.mode === 'OUT' || m.mode === 'OUT_AUTO' || m.mode === 'LOOP') {
    return log(next, 'warn', `789 in a current position at ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: there is no 4-20 mA loop here. Use V AC or Ω.`)
  }
  if (m.mode === 'mVDC') {
    const v = voltageBetween(s, a, b)
    return log({ ...next, tests: next.tests + 1 }, 'measure', `789 mV DC ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${v.ac > 0.3 ? 'OL' : '0.0 mV DC'}`)
  }
  if (m.mode === 'OHM') {
    return log(next, 'measure', `789 Ω ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${isLive(s, a, b) ? 'OL (live circuit!)' : 'OL'}`)
  }
  const v = voltageBetween(s, a, b)
  const reading = m.mode === 'VAC' ? `${v.ac.toFixed(1)} V AC` : `${v.dc.toFixed(1)} V DC`
  next = { ...next, tests: next.tests + 1 }

  const recept = (x: Point) => x.startsWith('RECEPT')
  if (recept(a) && recept(b)) {
    if (m.mode === 'VAC' && v.ac > 100) {
      next = { ...next, proofs: [...next.proofs, { t: next.t, n: next.tests, instrument: 'dmm' }] }
      return log(next, 'measure', `789 proved on known live source: ${POINT_LABEL[a]} → ${POINT_LABEL[b]} ${reading}`)
    }
    return log(next, 'measure', `789 ${m.mode === 'VAC' ? 'V AC' : 'V DC'} ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${reading}`)
  }

  if (!verifiedDead(s)) next = requireSuit(next, 'ppe_test')
  const live = m.mode === 'VAC' ? v.ac > 30 : Math.abs(v.dc) > 30
  if (!live) {
    const d: DeadTest = { a, b, mode: m.mode, t: next.t, n: next.tests, instrument: 'dmm' }
    next = { ...next, deadTests: [...next.deadTests, d] }
  }
  return log(next, 'measure', `789 ${m.mode === 'VAC' ? 'V AC' : 'V DC'} ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${reading}${live ? '  ⚡ LIVE' : ''}`)
}

// ---- Megger -------------------------------------------------------------------------------------------

function meggerStop(s: ElecState): ElecState {
  const m = s.megger
  if (!m.testing || m.tStart == null) return s
  const base = insulationTest(s)
  const seconds = s.t - m.tStart
  const r = absorption(base.r, seconds)
  const result: MeggerResult = { mode: m.mode, volts: m.volts, seconds, r, reading: fmtMohm(r, m.volts), leakNa: leakageNa(r, m.volts) }
  if ((m.mode === 'DAR' || m.mode === 'IR' || m.mode === 'IRT') && seconds >= 60) {
    const r30 = absorption(base.r, 30)
    const r60 = absorption(base.r, 60)
    if (Number.isFinite(r60) && r30 > 0) result.dar = Math.round((r60 / r30) * 100) / 100
  }
  if (m.mode === 'PI' && seconds >= 600) {
    const r60 = absorption(base.r, 60)
    const r600 = absorption(base.r, 600)
    if (Number.isFinite(r600) && r60 > 0) result.pi = Math.round((r600 / r60) * 100) / 100
  }
  let next: ElecState = { ...s, megger: { ...m, testing: false, tStart: null, result } }
  next = { ...next, insTests: [...next.insTests, { a: m.minus!, b: m.plus!, volts: m.volts, reading: result.reading, t: next.t, mode: m.mode, dar: result.dar, pi: result.pi }] }
  const extras = [result.dar != null ? `DAR ${result.dar.toFixed(2)}` : '', result.pi != null ? `PI ${result.pi.toFixed(2)}` : ''].filter(Boolean).join(', ')
  const kv = m.volts >= 1000 ? `${m.volts / 1000} kV` : `${m.volts} V`
  next = log(next, 'measure', `Megger ${m.mode === 'IRT' ? 'IR(t)' : m.mode} ${kv} ${seconds}s: ${POINT_LABEL[m.minus!]} → ${POINT_LABEL[m.plus!]} ${result.reading}${extras ? ` (${extras})` : ''}`)
  return log(next, 'info', `Megger discharging the circuit under test, ${Math.round(m.volts * 0.9)} V falling to 0. Keep clear until the display reads safe.`)
}

function meggerStart(s: ElecState): ElecState {
  const m = s.megger
  if (m.mode === 'OFF') return log(s, 'warn', 'Megger is off.')
  if (m.mode === 'DD' || m.mode === 'SV' || m.mode === 'RAMP') return log(s, 'warn', `Megger ${m.mode} test is not modeled in this scenario. Use IR, IR(t), DAR or PI.`)
  const base = insulationTest(s)
  if (!base.ok) return log({ ...s, megger: { ...m, inhibit: base.reading, result: null } }, 'warn', `Megger: ${base.text}`)
  let next: ElecState = { ...s, megger: { ...m, testing: true, tStart: s.t, result: null, inhibit: null }, tests: s.tests + 1 }
  if (!lockedOut(s) || !verifiedDead(s)) next = violate(next, 'work_not_verified', 'Insulation test started before the circuit was verified dead and locked.')
  if (m.volts < s.scenario.megVolts.min) next = violate(next, 'meg_low_volts')
  if (m.volts > s.scenario.megVolts.max) next = violate(next, 'meg_high_volts')
  if (base.polarityNote) next = log(next, 'warn', PENALTY.meg_polarity.label)
  if (base.r === 0) next = log(next, 'info', `Megger: ${base.text}`)
  if (base.warnId) {
    next = violate(next, base.warnId)
    if (base.damage) next = { ...next, drive: { ...next.drive, damaged: true } }
  }
  const kv = m.volts >= 1000 ? `${m.volts / 1000} kV` : `${m.volts} V`
  return log(next, 'action', `Megger ${m.mode === 'IRT' ? 'IR(t)' : m.mode} test started at ${kv}: ${POINT_LABEL[m.minus!]} (−) → ${POINT_LABEL[m.plus!]} (+).`)
}

function meggerTick(s: ElecState): ElecState {
  const m = s.megger
  if (!m.testing || m.tStart == null) return s
  const stopAt = MEGGER_AUTO_STOP[m.mode]
  if (stopAt != null && s.t - m.tStart >= stopAt) return meggerStop(s)
  return s
}

// ---- TIC 300 PRO ----------------------------------------------------------------------------------------

function ticCheck(s: ElecState, p: Point): ElecState {
  const t = s.tic
  if (!t.on) return log(s, 'warn', 'TIC 300 PRO is off.')
  if (POINT_SCENE[p] !== s.scene) return s
  const ac = ticVolts(s, p)
  const mv = MV_POINTS.includes(p)
  // LOW range inside an MV compartment picks up whatever live bus is nearby; HIGH reads the conductor in front of the tip
  const pickup = t.range === 'LOW' && mv && mvLiveNearby(s)
  const detected = t.range === 'LOW' ? ac >= 30 || pickup : ac >= 1500
  let next: ElecState = { ...s, tic: { ...t, last: { point: p, detected, t: s.t } }, tests: s.tests + 1 }
  if (mv && !verifiedDead(s)) next = requireSuit(next, 'ppe_test')
  if (mv && !t.hotStick && !next.violations.some((v) => v.id === 'tic_no_hotstick')) next = violate(next, 'tic_no_hotstick')
  next = log(next, 'measure', `TIC 300 PRO ${t.range}${mv ? (t.hotStick ? ' on hot stick' : ' HAND-HELD') : ''} at ${POINT_LABEL[p]}: ${detected ? '⚡ tip flashing, beeper sounding – AC voltage present' : 'no indication'}${pickup && ac < 30 ? ' (proximity pickup from the live bus, not this conductor)' : ''}`)
  if (p.startsWith('RECEPT')) {
    // the 120 V receptacle is the known live source for the live-dead-live sequence, on LOW
    if (t.range === 'LOW' && detected) {
      next = { ...next, proofs: [...next.proofs, { t: next.t, n: next.tests, instrument: 'tic' }] }
      return log(next, 'info', 'TIC 300 PRO proved on the 120 V receptacle, LOW range.')
    }
    if (t.range === 'HIGH') return log(next, 'info', 'HIGH range starts at 1.5 kV: a 120 V receptacle will not light it. Prove the tracer on LOW.')
    return next
  }
  if (!mv) {
    if (!next.log.some((l) => l.text.includes('over 1,000 V'))) {
      next = log(next, 'info', 'Site procedure: the TIC 300 PRO is the verification instrument on systems over 1,000 V. This point is low voltage: verify it with the Fluke 789 by contact.')
    }
    return next
  }
  if (t.range === 'LOW') {
    if (!next.violations.some((v) => v.id === 'tic_low_range_mv')) next = violate(next, 'tic_low_range_mv')
    return next
  }
  if (detected) {
    return log(next, 'info', 'Live 4160 V indication. The live-dead-live proof is the receptacle on LOW, before and after the dead checks.')
  }
  if (t.selfTestAt == null && !next.violations.some((v) => v.id === 'tic_no_selftest')) next = violate(next, 'tic_no_selftest')
  const d: DeadTest = { a: p, b: 'GND', mode: 'VAC', t: next.t, n: next.tests, instrument: 'tic' }
  return { ...next, deadTests: [...next.deadTests, d] }
}

// ---- hands-on gates ---------------------------------------------------------------------------------------

function requireHandsOn(s: ElecState, where: 'compartment' | 'motor'): ElecState {
  let next = s
  if (!lockedOut(s)) next = violate(next, 'work_not_locked')
  else if (!verifiedDead(s)) next = violate(next, 'work_not_verified')
  if (where === 'compartment' && chargeLampOn(s)) next = violate(next, 'cells_charged', `Cells at ${linkVolts(s).toFixed(0)} V`)
  if (where === 'compartment' && s.closed.ctrl) next = violate(next, 'ctrl_live_touch')
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
      return meggerTick({ ...s, t: s.t + 1 })
    case 'wait': {
      const moved = meggerTick({ ...s, t: s.t + a.minutes * 60 })
      return log(moved, 'info', `Waited ${a.minutes} minutes. Drive cells now ${linkVolts(moved).toFixed(0)} V, CHARGE lamps ${chargeLampOn(moved) ? 'lit' : 'off'}.`)
    }
    case 'checklist': {
      const next = { ...s, checklist: { ...s.checklist, [a.id]: !s.checklist[a.id] } }
      const item = CHECKLIST.find((c) => c.id === a.id)
      return next.checklist[a.id] ? log(next, 'info', `JSA sign-off: ${item?.label}`) : next
    }
    case 'goto': {
      if (a.scene === s.scene) return s
      const names: Record<Scene, string> = { room: 'the electrical room', compartment: 'the M12 motor connection compartment', motor: 'P-310 motor' }
      const stopped = s.megger.testing ? meggerStop(s) : s
      const next = { ...stopped, scene: a.scene, meter: { ...stopped.meter, probeA: null, probeB: null, held: null }, megger: { ...stopped.megger, minus: null, plus: null, result: null, inhibit: null } }
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
        if (item.slot === 'body' && item.id !== 'cotton') ppe = ppe.filter((p) => !['frs8', 'frj12', 'suit40'].includes(p))
        // one class of rubber glove at a time; the leather protectors go over whichever class is on
        if (item.slot === 'hands' && item.shockOk) ppe = ppe.filter((p) => !PPE_ITEMS.find((x) => x.id === p)?.shockOk)
        ppe = [...ppe, a.id]
      }
      const next = { ...s, ppe }
      return a.on ? log(next, 'action', `Donned: ${item.label}`) : next
    }
    case 'ppeConfirm': {
      const chk = ppeCheck(s)
      const l = s.scenario.label
      const next: ElecState = { ...s, ppeConfirmed: { t: s.t, adequate: chk.adequate } }
      if (chk.adequate) {
        const glove = PPE_ITEMS.find((p) => p.slot === 'hands' && s.ppe.includes(p.id))
        const over = glove && glove.gloveClass !== l.gloveClass ? ` (label calls for class ${l.gloveClass}; class ${glove.gloveClass} is over-rated but acceptable)` : ''
        return log(next, 'action', `Suited up against the label: ${chk.bodyRating} cal/cm² arc-rated suit and hood for ${l.incidentEnergy} cal/cm² at ${l.workingDistance} in, class ${glove?.gloveClass ?? l.gloveClass} gloves with leather protectors${over}, hearing, eyes, leather footwear.`)
      }
      return log(next, 'warn', `PPE confirmed but does not meet the label: ${chk.issues.join('; ')}.`)
    }
    case 'switch': {
      const t = a.target
      if (a.closed === s.closed[t]) return s
      if (s.locks[t]) return log(s, 'warn', `${targetLabel(t)}: handle will not move, locked.`)
      if (t === 'aux' && a.closed && s.auxDoorOpen) return log(s, 'warn', 'Bucket 3B door interlock: the handle will not go to ON with the door open. Close and latch the door first.')
      let next = requireSuit(s, 'ppe_before_loto')
      next = { ...next, closed: { ...next.closed, [t]: a.closed } }
      if (!a.closed) next = { ...next, done: { ...next.done, [t]: { ...next.done[t], opened: true } } }
      if (t === 'mv') {
        if (a.closed) return log(next, 'action', 'Power isolation switch closed. VFD #2 incoming at 4160 V, cells charging.')
        next = { ...next, tOff: s.t, linkAtOff: linkVolts(s), drive: { ...next.drive, running: false } }
        return log(next, 'action', 'Power isolation switch opened. Blades visible open through the viewing window. Drive cell CHARGE lamps still lit.')
      }
      if (t === 'bypass') return log(next, 'action', a.closed ? 'M12 bypass isolation switch closed: 4160 V on the bypass stabs.' : 'M12 bypass isolation switch opened. Blades visible open. Bypass stabs dead.')
      if (t === 'aux') return log(next, 'action', a.closed ? 'CENTERLINE bucket 3B closed: drive cooling fans and CPT energized.' : 'CENTERLINE bucket 3B handle to OFF. Cooling fans spinning down, CPT dead.')
      return log(next, 'action', a.closed ? 'LP-1 ckt 7 closed. 120 V control circuit live, M32 isolation contactor coil energized.' : 'LP-1 ckt 7 opened. 120 V control dead, M32 isolation contactor dropped out, MPR dark.')
    }
    case 'lock': {
      const t = a.target
      if (a.on && s.closed[t]) return log(s, 'warn', `Cannot lock ${targetLabel(t)} in the OFF position while it is closed. Open it first.`)
      if (a.on === s.locks[t]) return s
      let next: ElecState = { ...(a.on ? requireSuit(s, 'ppe_before_loto') : s), locks: { ...s.locks, [t]: a.on } }
      if (a.on) next = { ...next, done: { ...next.done, [t]: { ...next.done[t], locked: true } } }
      if (!a.on && !restored(s)) next = violate(next, 'locks_early')
      return log(next, 'action', `${a.on ? 'Applied' : 'Removed'} personal lock on ${targetLabel(t)}.`)
    }
    case 'tag': {
      const t = a.target
      if (a.on === s.tags[t]) return s
      let next: ElecState = { ...(a.on ? requireSuit(s, 'ppe_before_loto') : s), tags: { ...s.tags, [t]: a.on } }
      if (a.on) next = { ...next, done: { ...next.done, [t]: { ...next.done[t], tagged: true } } }
      return log(next, 'action', `${a.on ? 'Hung' : 'Removed'} danger tag on ${targetLabel(t)}: name, date, "Do not operate – VFD #2 ground fault".`)
    }
    case 'tryStart': {
      if (lockedOut(s)) {
        return log({ ...requireSuit(s, 'ppe_before_loto'), tryStepDone: true }, 'action', 'Try-step: none of the four handles will move with the locks on. START pressed on the relay door: no response, MPR dark. Equipment cannot be restarted.')
      }
      if (!s.closed.mv && !s.locks.mv) {
        let next = violate(s, 'reenergized')
        next = { ...next, closed: { ...next.closed, mv: true } }
        return log(next, 'action', 'Try-step with no lock: the power isolation switch went back to ON. VFD #2 is energized again.')
      }
      return log(s, 'warn', 'Try-step before every source is open and locked proves nothing. Four sources: MV incoming, bypass, 480 V aux, 120 V control.')
    }
    case 'relay': {
      if (!relayLit(s)) return log(s, 'info', 'MPR is dark, no control power.')
      if (a.key === 'STOP') return log({ ...s, drive: { ...s.drive, running: false, display: s.drive.faulted ? s.scenario.drive.faultCode : 'STOPPED' } }, 'action', 'STOP pressed.')
      if (a.key === 'RESET') {
        if (!s.drive.faulted) return s
        return log({ ...s, drive: { ...s.drive, faulted: false, display: 'READY' } }, 'action', 'MPR RESET: 86 lockout cleared, drive READY.')
      }
      if (!s.closed.mv) return log(s, 'info', 'START pressed: no 4160 V incoming, drive will not start.')
      if (s.drive.faulted) return log(s, 'info', `START pressed: ${s.scenario.drive.faultCode} standing, reset required.`)
      if (!restored(s)) {
        return violate(log({ ...s, drive: { ...s.drive, faulted: true, display: 'OPEN CIRCUIT' } }, 'action', 'START pressed: drive tripped on output open circuit / phase loss.'), 'run_not_restored')
      }
      if (s.drive.damaged) return log({ ...s, drive: { ...s.drive, faulted: true, display: 'CELL FAULT' } }, 'action', 'START pressed: output cell fault, drive tripped. Output stage damaged.')
      if (!s.faultCleared) return log({ ...s, drive: { ...s.drive, faulted: true, display: s.scenario.drive.faultCode } }, 'action', `START pressed: ${s.scenario.drive.faultCode} within 0.2 s. Fault still present.`)
      return log({ ...s, drive: { ...s.drive, running: true, display: 'RUNNING' } }, 'action', `START pressed: ramped to 60.0 Hz, ${(s.scenario.motor.fla * 0.82).toFixed(0)} A, no fault.`)
    }
    case 'door': {
      if (a.open === s.doorOpen) return s
      let next = s
      if (a.open && (s.closed.mv || s.closed.bypass)) next = requireSuit(next, 'ppe_door')
      next = { ...next, doorOpen: a.open }
      return log(next, 'action', a.open ? `Opened the M12 motor connection compartment. Cell CHARGE lamps ${chargeLampOn(s) ? 'LIT' : 'off'}.` : 'Closed the M12 motor connection compartment.')
    }
    case 'auxDoor': {
      if (a.open === s.auxDoorOpen) return s
      // mechanical door interlock on the combination starter: the door latches stay engaged while the handle is ON
      if (a.open && s.closed.aux) return log(s, 'warn', 'Bucket 3B door interlock: the disconnect handle is ON, the door latches will not release. Turn the handle to OFF first.')
      return log({ ...s, auxDoorOpen: a.open }, 'action', a.open ? 'Opened CENTERLINE bucket 3B. Handle OFF, interlock released.' : 'Closed and latched CENTERLINE bucket 3B.')
    }
    case 'meterMode':
      return { ...s, meter: { ...s.meter, mode: a.mode, probeA: null, probeB: null, held: null, rel: null } }
    case 'meterKey':
      return meterKey(s, a.key)
    case 'probe':
      return placeLead(s, a.point, a.lead)
    case 'meterJack': {
      const j = s.meter.jacks
      const jacks = a.jack === 'COM' ? { ...j, black: a.on } : { ...j, red: a.on ? a.jack : j.red === a.jack ? null : j.red }
      if (jacks.red === j.red && jacks.black === j.black) return s
      const lead = a.jack === 'COM' ? 'black lead' : 'red lead'
      return log({ ...s, meter: { ...s.meter, jacks, probeA: null, probeB: null, held: null } }, 'action', `${a.on ? 'Plugged' : 'Unplugged'} the ${lead} ${a.on ? 'into' : 'from'} the 789 ${JACK_LABEL[a.jack]} jack.`)
    }
    case 'meterLift':
      return { ...s, meter: { ...s.meter, [a.lead === 'red' ? 'probeA' : 'probeB']: null, held: null } }
    case 'meterClear':
      return { ...s, meter: { ...s.meter, probeA: null, probeB: null, held: null, rel: null } }
    case 'meggerMode': {
      const stopped = s.megger.testing ? meggerStop(s) : s
      return { ...stopped, megger: { ...stopped.megger, mode: a.mode, result: null, inhibit: null } }
    }
    case 'meggerVolts': {
      if (s.megger.testing) return log(s, 'warn', 'Stop the test before changing the voltage.')
      return { ...s, megger: { ...s.megger, volts: a.volts, result: null, inhibit: null } }
    }
    case 'meggerJack': {
      if (s.megger.leads[a.term] === a.on) return s
      const stopped = s.megger.testing ? meggerStop(s) : s
      const next: ElecState = { ...stopped, megger: { ...stopped.megger, leads: { ...stopped.megger.leads, [a.term]: a.on }, [a.term]: null, result: null, inhibit: null } }
      return log(next, 'action', `${a.on ? 'Connected' : 'Disconnected'} the ${a.term === 'plus' ? 'red + lead' : 'black − lead'} ${a.on ? 'to' : 'from'} the Megger ${a.term === 'plus' ? '+' : '−'} terminal.`)
    }
    case 'meggerLead': {
      if (POINT_SCENE[a.point] !== s.scene) return s
      if (s.megger.mode === 'OFF') return log(s, 'warn', 'Megger is off.')
      if (a.drag && !s.megger.leads[a.lead]) return log(s, 'warn', `Connect the ${a.lead === 'plus' ? '+' : '−'} lead to the Megger first.`)
      const stopped = s.megger.testing ? meggerStop(s) : s
      const leads = a.drag ? stopped.megger.leads : { ...stopped.megger.leads, [a.lead]: true }
      return { ...stopped, megger: { ...stopped.megger, leads, [a.lead]: a.point, result: null, inhibit: null } }
    }
    case 'meggerLift': {
      const stopped = s.megger.testing ? meggerStop(s) : s
      return { ...stopped, megger: { ...stopped.megger, [a.lead]: null, result: null, inhibit: null } }
    }
    case 'meggerClear': {
      const stopped = s.megger.testing ? meggerStop(s) : s
      return { ...stopped, megger: { ...stopped.megger, minus: null, plus: null, result: null, inhibit: null } }
    }
    case 'meggerTest':
      return s.megger.testing ? meggerStop(s) : meggerStart(s)
    case 'ticPower':
      return { ...s, tic: { ...s.tic, on: a.on, last: null } }
    case 'ticRange':
      return s.tic.on ? { ...s, tic: { ...s.tic, range: a.range, last: null } } : s
    case 'ticHotStick':
      if (a.on === s.tic.hotStick) return s
      return log({ ...s, tic: { ...s.tic, hotStick: a.on, last: null } }, 'action', a.on ? 'Clipped the TIC 300 PRO to the hot stick.' : 'Took the TIC 300 PRO off the hot stick.')
    case 'ticSelfTest': {
      if (!s.tic.on) return log(s, 'warn', 'TIC 300 PRO is off.')
      return log({ ...s, tic: { ...s.tic, selfTestAt: s.t, last: null } }, 'action', 'TIC 300 PRO self-test: tip flashes, beeper sounds. Unit OK.')
    }
    case 'ticCheck':
      return ticCheck(s, a.point)
    case 'liftLeads': {
      if (a.lifted === s.leadsLifted) return s
      if (!s.doorOpen) return log(s, 'warn', 'Open the motor connection compartment first.')
      let next = a.lifted ? requireHandsOn(s, 'compartment') : s
      next = { ...next, leadsLifted: a.lifted, meter: { ...next.meter, probeA: null, probeB: null }, megger: { ...next.megger, minus: null, plus: null, result: null } }
      return log(next, 'action', a.lifted ? 'Unbolted motor cable terminations U, V, W from the connection bus, supported on insulated stands and wrapped. Motor circuit isolated from the controller.' : 'Re-landed U, V, W on the connection bus, torqued, shrink boots back on.')
    }
    case 'cover': {
      if (a.off === s.jbox.coverOff) return s
      if (s.scene !== 'motor') return s
      let next = a.off ? requireHandsOn(s, 'motor') : s
      next = { ...next, jbox: { ...next.jbox, coverOff: a.off } }
      return log(next, 'action', a.off ? 'Removed P-310M terminal box cover (12 bolts).' : 'Terminal box cover reinstalled, gasket seated, bolts torqued.')
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
      next = { ...next, jbox: { ...next.jbox, feedersUnbolted: a.unbolted, lugsCleared: a.unbolted ? next.jbox.lugsCleared : false }, meter: { ...next.meter, probeA: null, probeB: null }, megger: { ...next.megger, minus: null, plus: null, result: null } }
      return log(next, 'action', a.unbolted ? 'Unbolted feeder terminations L1, L2, L3 from bushings T1, T2, T3. Motor and cable separated.' : 'Feeder terminations bolted back on T1, T2, T3 and torqued.')
    }
    case 'clearLugs': {
      if (!s.jbox.feedersUnbolted) return log(s, 'warn', 'Feeder terminations are still bolted to the bushings.')
      if (s.jbox.lugsCleared) return s
      return log({ ...s, jbox: { ...s.jbox, lugsCleared: true } }, 'action', 'Lifted feeder terminations supported clear of the enclosure on insulated stands.')
    }
    case 'wye': {
      if (a.open === s.jbox.wyeOpen) return s
      if (!s.jbox.coverOff) return log(s, 'warn', 'Cover is on.')
      let next = a.open ? requireHandsOn(s, 'motor') : s
      next = { ...next, jbox: { ...next.jbox, wyeOpen: a.open }, meter: { ...next.meter, probeA: null, probeB: null }, megger: { ...next.megger, minus: null, plus: null, result: null } }
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
