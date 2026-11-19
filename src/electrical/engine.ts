// Electrical safety engine: energy sources, LOTO state, voltages a meter would see, insulation testing on a
// 6-lead motor circuit, and every technician action with its NFPA 70E consequences.

import type {
  DeadTest, DiagnosisId, ElecScenario, ElecState, LockTarget, LogKind, MeggerLeadId, MeggerMode, MeggerResult, MeggerVolts, MeterMode, Point, PpeId, RepairId, Scene, TicRange,
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
  | { type: 'ppeConfirm' }
  | { type: 'breaker'; closed: boolean }
  | { type: 'lp2'; closed: boolean }
  | { type: 'lock'; target: LockTarget; on: boolean }
  | { type: 'tag'; target: LockTarget; on: boolean }
  | { type: 'tryStart' }
  | { type: 'keypad'; key: 'RUN' | 'STOP' | 'RESET' }
  | { type: 'door'; open: boolean }
  | { type: 'meterMode'; mode: MeterMode }
  | { type: 'probe'; point: Point }
  | { type: 'meterClear' }
  | { type: 'meggerMode'; mode: MeggerMode }
  | { type: 'meggerVolts'; volts: MeggerVolts }
  | { type: 'meggerLead'; lead: MeggerLeadId; point: Point }
  | { type: 'meggerClear' }
  | { type: 'meggerTest' }
  | { type: 'ticPower'; on: boolean }
  | { type: 'ticRange'; range: TicRange }
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
  ppe_door: { points: -15, label: 'Opened the drive cabinet energized without the PPE the label calls for' },
  no_prove_before: { points: -10, label: 'Absence-of-voltage test without proving the meter on a known source first' },
  no_prove_after: { points: -10, label: 'Meter not re-proved after testing dead' },
  bus_ac_only: { points: -10, label: 'DC bus checked with AC volts only (reads zero even at 650 V DC)' },
  bus_tic_only: { points: -10, label: 'DC bus checked with a non-contact AC detector only: it cannot see DC' },
  tic_high_range: { points: -15, label: 'TIC 300 PRO on HIGH range at 480 V: threshold is 1500 V, a live bus reads dead' },
  tic_no_selftest: { points: -5, label: 'Non-contact detector used without a self-test first' },
  work_not_verified: { points: -20, label: 'Hands on conductors before absence of voltage was verified' },
  work_not_locked: { points: -15, label: 'Hands on conductors before lockout was applied' },
  bus_charged: { points: -10, label: 'Worked on terminals with the DC bus above 50 V (CHARGE lamp lit)' },
  reenergized: { points: -15, label: 'Re-energized the equipment while attempting a try-step without a lock' },
  meg_into_drive: { points: -30, label: 'Insulation test applied with the drive output connected: IGBTs destroyed' },
  meg_through_contactor: { points: -10, label: 'Insulation test through an open contactor instead of lifted leads' },
  meg_low_volts: { points: -5, label: 'Insulation test voltage too low for a 460 V motor (use 500 V)' },
  meg_high_volts: { points: -5, label: 'Insulation test voltage too high for a 460 V winding (2.5 kV and up overstresses it)' },
  meg_polarity: { points: 0, label: 'Megger leads reversed: − lead belongs on the conductor, + to earth' },
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
    ppeConfirmed: null,
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
    meter: { mode: 'OFF', probeA: null, probeB: null },
    megger: { mode: 'OFF', volts: 500, minus: null, plus: null, testing: false, tStart: null, result: null, inhibit: null },
    tic: { on: false, range: 'LOW', selfTestAt: null, last: null, busChecked: false },
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
  const glove = PPE_ITEMS.find((p) => p.slot === 'hands' && p.shockOk && worn.has(p.id))
  if (!glove) issues.push('No voltage-rated gloves (class 00 or higher required for 480 V shock exposure)')
  else if ((glove.maxUseAc ?? 0) < s.scenario.label.voltage) issues.push(`Class ${glove.gloveClass} gloves are rated ${glove.maxUseAc} V, below ${s.scenario.label.voltage} V`)
  if (!worn.has('boots')) issues.push('No leather footwear')
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
 * Absence-of-voltage checks that must be done before hands go on conductors. AC points accept either the TIC 300 PRO on
 * LOW range or the 87V on V AC to ground. The DC bus is DC: only the 87V on V DC proves it, a non-contact detector sees nothing.
 */
export const REQUIRED_DEAD: { a: Point; b: Point; mode: MeterMode; tic: boolean; label: string }[] = [
  { a: 'L1', b: 'GND', mode: 'VAC', tic: true, label: 'R/L1 to ground' },
  { a: 'L2', b: 'GND', mode: 'VAC', tic: true, label: 'S/L2 to ground' },
  { a: 'L3', b: 'GND', mode: 'VAC', tic: true, label: 'T/L3 to ground' },
  { a: 'CTRL_H', b: 'CTRL_N', mode: 'VAC', tic: true, label: 'X1-1 120 V control' },
  { a: 'DC_P', b: 'DC_N', mode: 'VDC', tic: false, label: 'DC bus PA/+ to PC/− (V DC only)' },
]

function pairKey(a: Point, b: Point): string {
  return [a, b].sort().join('-')
}

function satisfies(r: (typeof REQUIRED_DEAD)[number], d: DeadTest): boolean {
  if (d.instrument === 'tic') return r.tic && d.a === r.a
  if (d.mode !== r.mode) return false
  if (r.a === 'CTRL_H') return (d.a === 'CTRL_H' || d.b === 'CTRL_H') && (d.a === 'CTRL_N' || d.b === 'CTRL_N' || d.a === 'GND' || d.b === 'GND')
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

export function provedBefore(s: ElecState): boolean {
  const req = requiredRecords(s)
  if (req.length === 0) return false
  return s.proofs.some((t) => t <= req[0].t)
}

export function provedAfter(s: ElecState): boolean {
  const req = requiredRecords(s)
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

export function fmtMohm(r: number, volts: MeggerVolts): string {
  const cap = volts >= 500 ? 2000 : volts >= 250 ? 1000 : 200
  if (!Number.isFinite(r) || r >= cap) return `OL (> ${cap >= 1000 ? `${cap / 1000}.0 GΩ` : `${cap} MΩ`})`
  if (r >= 1000) return `${(r / 1000).toFixed(2)} GΩ`
  if (r >= 10) return `${r.toFixed(0)} MΩ`
  if (r >= 1) return `${r.toFixed(1)} MΩ`
  return `${r.toFixed(2)} MΩ`
}

export interface InsResult {
  ok: boolean
  /** resistance in MΩ at the 60 s mark; Infinity for over range */
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
    const shown = v.ac > 30 ? `${v.ac.toFixed(0)} V AC` : `${Math.abs(v.dc).toFixed(0)} V DC`
    return { ok: false, r: OL, reading: `⚡ ${shown}`, text: `${shown} present between the leads. Test inhibited.` }
  }

  const driveTerminals: Point[] = ['L1', 'L2', 'L3', 'DC_P', 'DC_N', 'U', 'V', 'W']
  if (driveTerminals.includes(a) || driveTerminals.includes(b)) {
    return { ok: true, r: 0.6, reading: fmtMohm(0.6, volts), text: 'Test voltage applied straight into the drive terminals.', warnId: 'meg_into_drive', damage: true }
  }

  const ground: Point[] = ['GND', 'FRAME', 'RECEPT_G']
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

/**
 * Dielectric absorption: sound insulation keeps climbing after the voltage is applied, contaminated or faulted
 * insulation does not. `r60` is the one-minute value. Shape gives DAR ≈ 1.29 and PI ≈ 2.0 for good windings.
 */
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

/** Live resistance the Megger shows `seconds` into the running test. */
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
  return isLive(s, m.probeA, m.probeB) ? 'OL ⚠ live' : 'OL'
}

function placeLead(s: ElecState, p: Point): ElecState {
  const m = s.meter
  if (m.mode === 'OFF') return log(s, 'warn', 'Meter is off.')
  if (POINT_SCENE[p] !== s.scene) return s
  if (m.probeA == null || m.probeB != null) {
    return { ...s, meter: { ...m, probeA: p, probeB: null } }
  }
  const a = m.probeA
  const b = p
  let next: ElecState = { ...s, meter: { ...m, probeB: b } }
  if (m.mode === 'OHM') {
    return log(next, 'measure', `87V Ω ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${isLive(s, a, b) ? 'OL (live circuit!)' : 'OL'}`)
  }
  const v = voltageBetween(s, a, b)
  const reading = m.mode === 'VAC' ? `${v.ac.toFixed(1)} V AC` : `${v.dc.toFixed(1)} V DC`
  next = { ...next, tests: next.tests + 1 }

  const recept = (x: Point) => x.startsWith('RECEPT')
  if (recept(a) && recept(b)) {
    if (m.mode === 'VAC' && v.ac > 100) {
      next = { ...next, proofs: [...next.proofs, next.t] }
      return log(next, 'measure', `87V proved on known live source: ${POINT_LABEL[a]} → ${POINT_LABEL[b]} ${reading}`)
    }
    return log(next, 'measure', `87V ${m.mode === 'VAC' ? 'V AC' : 'V DC'} ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${reading}`)
  }

  const scene = POINT_SCENE[a]
  if (scene === 'drive' && !verifiedDead(s)) next = requireSuit(next, 'ppe_test')
  const live = m.mode === 'VAC' ? v.ac > 30 : Math.abs(v.dc) > 30
  if (!live) {
    const d: DeadTest = { a, b, mode: m.mode, t: next.t, instrument: 'dmm' }
    next = { ...next, deadTests: [...next.deadTests, d] }
  }
  return log(next, 'measure', `87V ${m.mode === 'VAC' ? 'V AC' : 'V DC'} ${POINT_LABEL[a]} → ${POINT_LABEL[b]}: ${reading}${live ? '  ⚡ LIVE' : ''}`)
}

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
  return log(next, 'info', `Megger discharging the circuit under test, ${Math.round(m.volts * 0.9)} V falling to 0.`)
}

function meggerStart(s: ElecState): ElecState {
  const m = s.megger
  if (m.mode === 'OFF') return log(s, 'warn', 'Megger is off.')
  if (m.mode === 'DD' || m.mode === 'SV' || m.mode === 'RAMP') return log(s, 'warn', `Megger ${m.mode} test is not modeled in this scenario. Use IR, IR(t), DAR or PI.`)
  const base = insulationTest(s)
  if (!base.ok) return log({ ...s, megger: { ...m, inhibit: base.reading, result: null } }, 'warn', `Megger: ${base.text}`)
  let next: ElecState = { ...s, megger: { ...m, testing: true, tStart: s.t, result: null, inhibit: null }, tests: s.tests + 1 }
  if (!lockedOut(s) || !verifiedDead(s)) next = violate(next, 'meg_not_verified')
  if (m.volts < 500) next = violate(next, 'meg_low_volts')
  if (m.volts >= 2500) next = violate(next, 'meg_high_volts')
  if (base.polarityNote) next = log(next, 'warn', PENALTY.meg_polarity.label)
  if (base.r === 0) next = log(next, 'info', `Megger: ${base.text}`)
  if (base.warnId) {
    next = violate(next, base.warnId)
    if (base.damage) next = { ...next, drive: { ...next.drive, damaged: true } }
  }
  const kv = m.volts >= 1000 ? `${m.volts / 1000} kV` : `${m.volts} V`
  return log(next, 'action', `Megger ${m.mode === 'IRT' ? 'IR(t)' : m.mode} test started at ${kv}: ${POINT_LABEL[m.minus!]} (−) → ${POINT_LABEL[m.plus!]} (+).`)
}

/** Advance a running test; auto-stop timed modes. */
function meggerTick(s: ElecState): ElecState {
  const m = s.megger
  if (!m.testing || m.tStart == null) return s
  const stopAt = MEGGER_AUTO_STOP[m.mode]
  if (stopAt != null && s.t - m.tStart >= stopAt) return meggerStop(s)
  return s
}

/** AC magnitude a non-contact detector sees at a point, volts to ground. */
export function ticVolts(s: ElecState, p: Point): number {
  const ph = acPhasor(s, p)
  return Math.hypot(ph[0], ph[1])
}

function ticCheck(s: ElecState, p: Point): ElecState {
  const t = s.tic
  if (!t.on) return log(s, 'warn', 'TIC 300 PRO is off.')
  if (POINT_SCENE[p] !== s.scene) return s
  const ac = ticVolts(s, p)
  const threshold = t.range === 'LOW' ? 30 : 1500
  const detected = ac >= threshold
  let next: ElecState = { ...s, tic: { ...t, last: { point: p, detected, t: s.t } }, tests: s.tests + 1 }
  const isDc = p === 'DC_P' || p === 'DC_N'
  if (POINT_SCENE[p] === 'drive' && !verifiedDead(s)) next = requireSuit(next, 'ppe_test')
  next = log(next, 'measure', `TIC 300 PRO ${t.range} at ${POINT_LABEL[p]}: ${detected ? '⚡ tip flashing, beeper sounding – AC voltage present' : 'no indication'}`)
  if (detected) {
    if (p.startsWith('RECEPT')) next = { ...next, proofs: [...next.proofs, next.t] }
    return next
  }
  if (isDc) {
    next = { ...next, tic: { ...next.tic, busChecked: true } }
    return log(next, 'info', `Bus is DC. A non-contact AC detector shows nothing whether the bus is dead or holding ${busVolts(s).toFixed(0)} V. Use the 87V on V DC.`)
  }
  if (t.range === 'HIGH') return violate(next, 'tic_high_range', ac >= 30 ? `${POINT_LABEL[p]} is live at ${ac.toFixed(0)} V.` : undefined)
  if (p.startsWith('RECEPT')) return next
  if (t.selfTestAt == null && !next.violations.some((v) => v.id === 'tic_no_selftest')) next = violate(next, 'tic_no_selftest')
  const d: DeadTest = { a: p, b: 'GND', mode: 'VAC', t: next.t, instrument: 'tic' }
  return { ...next, deadTests: [...next.deadTests, d] }
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
      return meggerTick({ ...s, t: s.t + 1 })
    case 'wait':
      return log(meggerTick({ ...s, t: s.t + a.minutes * 60 }), 'info', `Waited ${a.minutes} minutes. DC bus now ${busVolts({ ...s, t: s.t + a.minutes * 60 }).toFixed(0)} V, CHARGE lamp ${chargeLampOn({ ...s, t: s.t + a.minutes * 60 }) ? 'lit' : 'off'}.`)
    case 'checklist': {
      const next = { ...s, checklist: { ...s.checklist, [a.id]: !s.checklist[a.id] } }
      const item = CHECKLIST.find((c) => c.id === a.id)
      return next.checklist[a.id] ? log(next, 'info', `Pre-work: ${item?.label}`) : next
    }
    case 'goto': {
      if (a.scene === s.scene) return s
      const names: Record<Scene, string> = { mcc: 'the MCC room', drive: 'the open VFD-101 cabinet', motor: 'P-101 motor' }
      const stopped = s.megger.testing ? meggerStop(s) : s
      const next = { ...stopped, scene: a.scene, meter: { ...stopped.meter, probeA: null, probeB: null }, megger: { ...stopped.megger, minus: null, plus: null, result: null, inhibit: null } }
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
        if (item.slot === 'hands') ppe = ppe.filter((p) => PPE_ITEMS.find((x) => x.id === p)?.slot !== 'hands')
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
        return log(next, 'action', `Suited up against the label: ${chk.bodyRating} cal/cm² arc-rated clothing for ${l.incidentEnergy} cal/cm² at ${l.workingDistance} in, head and face protection, class ${glove?.gloveClass ?? l.gloveClass} gloves with leather protectors${over}, hearing, eyes, leather footwear.`)
      }
      return log(next, 'warn', `PPE confirmed but does not meet the label: ${chk.issues.join('; ')}.`)
    }
    case 'breaker': {
      if (a.closed === s.mccClosed) return s
      if (s.locks.mcc) return log(s, 'warn', 'MCC-3 3B handle will not move: locked.')
      let next = requireSuit(s, 'ppe_before_loto')
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
      const next = { ...requireSuit(s, 'ppe_before_loto'), lp2Closed: a.closed, done: { ...s.done, lp2Opened: s.done.lp2Opened || !a.closed } }
      return log(next, 'action', a.closed ? 'LP-2 ckt 7 closed. 120 V control circuit live, 1M contactor pulled in.' : 'LP-2 ckt 7 opened. 120 V control circuit dead, 1M contactor dropped out.')
    }
    case 'lock': {
      const closed = a.target === 'mcc' ? s.mccClosed : s.lp2Closed
      if (a.on && closed) return log(s, 'warn', `Cannot lock ${a.target === 'mcc' ? 'MCC-3 3B' : 'LP-2 ckt 7'} in the OFF position while it is closed. Open it first.`)
      if (a.on === s.locks[a.target]) return s
      let next: ElecState = { ...(a.on ? requireSuit(s, 'ppe_before_loto') : s), locks: { ...s.locks, [a.target]: a.on } }
      if (a.on) next = { ...next, done: { ...next.done, [a.target === 'mcc' ? 'mccLocked' : 'lp2Locked']: true } }
      if (!a.on && !restored(s)) next = violate(next, 'locks_early')
      return log(next, 'action', `${a.on ? 'Applied' : 'Removed'} personal lock on ${a.target === 'mcc' ? 'MCC-3 bucket 3B handle' : 'LP-2 ckt 7 breaker lockout'}.`)
    }
    case 'tag': {
      if (a.on === s.tags[a.target]) return s
      const next: ElecState = { ...(a.on ? requireSuit(s, 'ppe_before_loto') : s), tags: { ...s.tags, [a.target]: a.on }, done: a.on ? { ...s.done, [a.target === 'mcc' ? 'mccTagged' : 'lp2Tagged']: true } : s.done }
      return log(next, 'action', `${a.on ? 'Hung' : 'Removed'} danger tag on ${a.target === 'mcc' ? 'MCC-3 3B' : 'LP-2 ckt 7'}: name, date, "Do not operate – VFD-101 ground fault".`)
    }
    case 'tryStart': {
      if (s.locks.mcc && s.locks.lp2 && !s.mccClosed && !s.lp2Closed) {
        return log({ ...requireSuit(s, 'ppe_before_loto'), tryStepDone: true }, 'action', 'Try-step: MCC-3 3B handle will not move with the lock on. LP-2 ckt 7 locked. RUN pressed on the keypad: no response. Equipment cannot be restarted.')
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
      if (a.open && s.mccClosed) next = requireSuit(next, 'ppe_door')
      next = { ...next, doorOpen: a.open }
      return log(next, 'action', a.open ? `Opened VFD-101 cabinet door. CHARGE lamp ${chargeLampOn(s) ? 'LIT' : 'off'}.` : 'Closed VFD-101 cabinet door.')
    }
    case 'meterMode':
      return { ...s, meter: { ...s.meter, mode: a.mode, probeA: null, probeB: null } }
    case 'probe':
      return placeLead(s, a.point)
    case 'meterClear':
      return { ...s, meter: { ...s.meter, probeA: null, probeB: null } }
    case 'meggerMode': {
      const stopped = s.megger.testing ? meggerStop(s) : s
      return { ...stopped, megger: { ...stopped.megger, mode: a.mode, result: null, inhibit: null } }
    }
    case 'meggerVolts': {
      if (s.megger.testing) return log(s, 'warn', 'Stop the test before changing the voltage.')
      return { ...s, megger: { ...s.megger, volts: a.volts, result: null, inhibit: null } }
    }
    case 'meggerLead': {
      if (POINT_SCENE[a.point] !== s.scene) return s
      if (s.megger.mode === 'OFF') return log(s, 'warn', 'Megger is off.')
      const stopped = s.megger.testing ? meggerStop(s) : s
      return { ...stopped, megger: { ...stopped.megger, [a.lead]: a.point, result: null, inhibit: null } }
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
    case 'ticSelfTest': {
      if (!s.tic.on) return log(s, 'warn', 'TIC 300 PRO is off.')
      return log({ ...s, tic: { ...s.tic, selfTestAt: s.t, last: null } }, 'action', 'TIC 300 PRO self-test: tip flashes, beeper sounds. Unit OK.')
    }
    case 'ticCheck':
      return ticCheck(s, a.point)
    case 'liftLeads': {
      if (a.lifted === s.leadsLifted) return s
      if (!s.doorOpen) return log(s, 'warn', 'Open the cabinet door first.')
      let next = a.lifted ? requireHandsOn(s, 'drive') : s
      next = { ...next, leadsLifted: a.lifted, meter: { ...next.meter, probeA: null, probeB: null }, megger: { ...next.megger, minus: null, plus: null, result: null } }
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
      next = { ...next, jbox: { ...next.jbox, feedersUnbolted: a.unbolted, lugsCleared: a.unbolted ? next.jbox.lugsCleared : false }, meter: { ...next.meter, probeA: null, probeB: null }, megger: { ...next.megger, minus: null, plus: null, result: null } }
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
