// Electrical safety module: medium-voltage VFD ground fault, LOTO across four sources, absence-of-voltage
// verification with the right instrument for each voltage, insulation testing at 2.5 kV.

/** The Fluke 789 is the standard meter across modules; its knob positions come from the loop engine's catalog. */
export type { MeterMode, MeterKey } from '../engine/types'
import type { MeterJacks, MeterMode } from '../engine/types'

export type Scene = 'room' | 'compartment' | 'motor'

export type Point =
  | 'RECEPT_H' | 'RECEPT_N' | 'RECEPT_G'
  | 'AUX_T1' | 'AUX_T2' | 'AUX_T3' | 'AUX_G'
  | 'CTRL_H' | 'CTRL_N'
  | 'BP_L1' | 'BP_L2' | 'BP_L3'
  | 'VO_1' | 'VO_2' | 'VO_3'
  | 'U' | 'V' | 'W' | 'GND' | 'PROVE_MV'
  | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'CBL_1' | 'CBL_2' | 'CBL_3' | 'FRAME'

export const POINT_SCENE: Record<Point, Scene> = {
  RECEPT_H: 'room', RECEPT_N: 'room', RECEPT_G: 'room',
  AUX_T1: 'room', AUX_T2: 'room', AUX_T3: 'room', AUX_G: 'room',
  CTRL_H: 'room', CTRL_N: 'room',
  BP_L1: 'compartment', BP_L2: 'compartment', BP_L3: 'compartment',
  VO_1: 'compartment', VO_2: 'compartment', VO_3: 'compartment',
  U: 'compartment', V: 'compartment', W: 'compartment', GND: 'compartment', PROVE_MV: 'room',
  T1: 'motor', T2: 'motor', T3: 'motor', T4: 'motor', T5: 'motor', T6: 'motor',
  CBL_1: 'motor', CBL_2: 'motor', CBL_3: 'motor', FRAME: 'motor',
}

export const POINT_LABEL: Record<Point, string> = {
  RECEPT_H: 'receptacle hot', RECEPT_N: 'receptacle neutral', RECEPT_G: 'receptacle ground',
  AUX_T1: 'aux bucket T1 (480 V)', AUX_T2: 'aux bucket T2 (480 V)', AUX_T3: 'aux bucket T3 (480 V)', AUX_G: 'aux bucket ground',
  CTRL_H: 'relay compartment X1-1 (120 V)', CTRL_N: 'relay compartment X1-2 (neutral)',
  BP_L1: 'bypass stab L1 (4160 V)', BP_L2: 'bypass stab L2 (4160 V)', BP_L3: 'bypass stab L3 (4160 V)',
  VO_1: 'VFD output termination 1', VO_2: 'VFD output termination 2', VO_3: 'VFD output termination 3',
  U: 'motor connection U', V: 'motor connection V', W: 'motor connection W', GND: 'compartment ground bus',
  PROVE_MV: 'M42 feeder viewing window (live 4160 V)',
  T1: 'bushing T1', T2: 'bushing T2', T3: 'bushing T3', T4: 'board T4', T5: 'board T5', T6: 'board T6',
  CBL_1: 'feeder termination L1', CBL_2: 'feeder termination L2', CBL_3: 'feeder termination L3', FRAME: 'motor frame ground stud',
}

export type PpeId = 'hardhat' | 'hood40' | 'glasses' | 'hearing' | 'cotton' | 'frs8' | 'frj12' | 'suit40' | 'gloves_leather' | 'gloves00' | 'gloves0' | 'gloves1' | 'gloves2' | 'gloves3' | 'gloves4' | 'boots'
export type PpeSlot = 'head' | 'eyes' | 'ears' | 'body' | 'hands' | 'feet'

export interface PpeItem { id: PpeId; label: string; slot: PpeSlot; arcRating?: number; shockOk?: boolean; note: string; gloveClass?: string; gloveRank?: number; maxUseAc?: number; cuff?: string }

export const PPE_ITEMS: PpeItem[] = [
  { id: 'hardhat', label: 'Hard hat', slot: 'head', note: 'Class E, rated 20 kV. Worn under the balaclava hood.' },
  { id: 'hood40', label: 'Balaclava hood, 40 cal/cm²', slot: 'head', arcRating: 40, note: 'Arc-rated hood over the hard hat: covers head, neck and face. Required above 12 cal/cm².' },
  { id: 'glasses', label: 'Safety glasses', slot: 'eyes', note: 'Worn under the hood.' },
  { id: 'hearing', label: 'Hearing protection, ear canal inserts', slot: 'ears', note: 'Required for every arc flash PPE category.' },
  { id: 'cotton', label: 'Cotton work shirt and jeans', slot: 'body', arcRating: 0, note: 'Natural fiber underlayer only. No arc rating.' },
  { id: 'frs8', label: 'AR/FR shirt and pants, 8 cal/cm², CAT 2', slot: 'body', arcRating: 8, note: 'Daily wear. Meets PPE category 2 only.' },
  { id: 'frj12', label: 'AR/FR jacket and pants, 12 cal/cm²', slot: 'body', arcRating: 12, note: 'Jacket over the daily wear. Meets PPE category 3 only up to 12 cal/cm².' },
  { id: 'suit40', label: 'Arc flash suit jacket and pants, 40 cal/cm²', slot: 'body', arcRating: 40, note: 'PPE category 4 suit. Worn with the 40 cal balaclava hood.' },
  { id: 'gloves_leather', label: 'Leather protector gloves', slot: 'hands', shockOk: false, note: 'Worn over the rubber insulating gloves. No shock protection on their own.' },
  { id: 'gloves00', label: 'Class 00 rubber insulating gloves', slot: 'hands', shockOk: true, gloveClass: '00', gloveRank: 0, maxUseAc: 500, cuff: '#d9c6a5', note: 'Max use 500 V AC / 750 V DC. Beige label. Low voltage only.' },
  { id: 'gloves0', label: 'Class 0 rubber insulating gloves', slot: 'hands', shockOk: true, gloveClass: '0', gloveRank: 1, maxUseAc: 1000, cuff: '#b3202c', note: 'Max use 1,000 V AC / 1,500 V DC. Red label. 480 V work.' },
  { id: 'gloves1', label: 'Class 1 rubber insulating gloves', slot: 'hands', shockOk: true, gloveClass: '1', gloveRank: 2, maxUseAc: 7500, cuff: '#f2f2f2', note: 'Max use 7,500 V AC / 11,250 V DC. White label.' },
  { id: 'gloves2', label: 'Class 2 rubber insulating gloves', slot: 'hands', shockOk: true, gloveClass: '2', gloveRank: 3, maxUseAc: 17000, cuff: '#f2d21b', note: 'Max use 17,000 V AC / 25,500 V DC. Yellow label. The class the label calls for at 4160 V.' },
  { id: 'gloves3', label: 'Class 3 rubber insulating gloves', slot: 'hands', shockOk: true, gloveClass: '3', gloveRank: 4, maxUseAc: 26500, cuff: '#2e9e4f', note: 'Max use 26,500 V AC / 39,750 V DC. Green label.' },
  { id: 'gloves4', label: 'Class 4 rubber insulating gloves', slot: 'hands', shockOk: true, gloveClass: '4', gloveRank: 5, maxUseAc: 36000, cuff: '#f58a1f', note: 'Max use 36,000 V AC / 54,000 V DC. Orange label. Distribution voltage work.' },
  { id: 'boots', label: 'Leather EH-rated boots', slot: 'feet', note: 'Required.' },
]

export interface ArcLabel {
  equipment: string
  fedFrom: string
  voltage: number
  incidentEnergy: number
  workingDistance: number
  arcFlashBoundary: number
  limitedApproach: number
  restrictedApproach: number
  gloveClass: string
  gloveRank: number
  minArcRating: number
  studyDate: string
}

export type FaultKind = 'termination' | 'motor' | 'cable'

export interface ElecScenario {
  id: string
  title: string
  difficulty: 'intermediate' | 'advanced'
  workOrder: string
  fault: FaultKind
  label: ArcLabel
  motor: { tag: string; hp: number; volts: number; fla: number; rpm: number; frame: string; leads: 6 }
  drive: { model: string; relay: string; faultCode: string; faultText: string }
  /** insulation test voltage the standard calls for, and the highest acceptable */
  megVolts: { min: MeggerVolts; max: MeggerVolts }
  targetTests: number
}

/** Megger S1-568 voltage knob (right-hand arc) and test-mode knob. */
export const MEGGER_VOLTS = [250, 500, 1000, 2500, 5000] as const
export type MeggerVolts = (typeof MEGGER_VOLTS)[number]
export type MeggerMode = 'OFF' | 'IR' | 'IRT' | 'DAR' | 'PI' | 'DD' | 'SV' | 'RAMP'
export type MeggerLeadId = 'minus' | 'plus'

export interface MeggerResult {
  mode: MeggerMode
  volts: MeggerVolts
  seconds: number
  r: number
  reading: string
  dar?: number
  pi?: number
  leakNa: number
}

export interface MeggerState {
  mode: MeggerMode
  volts: MeggerVolts
  /** test leads connected to the + and − terminals */
  leads: { plus: boolean; minus: boolean }
  minus: Point | null
  plus: Point | null
  testing: boolean
  tStart: number | null
  result: MeggerResult | null
  inhibit: string | null
}

/** Energy sources the technician must isolate. */
export type LockTarget = 'mv' | 'bypass' | 'aux' | 'ctrl'
export const LOCK_TARGETS: { id: LockTarget; label: string; where: string; volts: string }[] = [
  { id: 'mv', label: 'Power isolation switch, VFD #2 incoming', where: 'JK section M22, left end of the MV lineup', volts: '4160 V' },
  { id: 'bypass', label: 'Bypass isolation switch, M12', where: 'JK section M12, feeds P-310 straight from the 4160 V bus', volts: '4160 V' },
  { id: 'aux', label: 'VFD-2 auxiliary bucket (cooling fans, CPT)', where: 'CENTERLINE 2100 bucket 3B', volts: '480 V' },
  { id: 'ctrl', label: 'Control circuit LP-1 ckt 7', where: 'panelboard LP-1 in the CENTERLINE lineup', volts: '120 V' },
]

export type DiagnosisId = 'termination_fault' | 'motor_winding' | 'cable_fault' | 'drive_output' | 'nuisance'
export const DIAGNOSES: { id: DiagnosisId; label: string }[] = [
  { id: 'termination_fault', label: 'Ground fault at a feeder termination in the motor terminal box' },
  { id: 'motor_winding', label: 'Motor stator winding insulation failed to ground' },
  { id: 'cable_fault', label: 'Feeder cable insulation failed to ground between the controller and the motor' },
  { id: 'drive_output', label: 'Drive output cell failure' },
  { id: 'nuisance', label: 'Nuisance trip, no insulation fault found' },
]

export type RepairId = 'remake_terminations' | 'replace_motor' | 'replace_cable' | 'replace_vfd' | 'clean_dry_box'
export const REPAIRS: { id: RepairId; label: string }[] = [
  { id: 'remake_terminations', label: 'Cut back and rebuild the failed MV termination: new stress cone, lug, shrink' },
  { id: 'clean_dry_box', label: 'Dry the terminal box, clear the breather, seal the conduit hub' },
  { id: 'replace_motor', label: 'Pull P-310M for rewind (4000 HP, shop job)' },
  { id: 'replace_cable', label: 'Pull new 5 kV shielded feeder, controller to motor' },
  { id: 'replace_vfd', label: 'Replace the damaged VFD output cell' },
]

export interface ChecklistItem { id: string; label: string }
export const CHECKLIST: ChecklistItem[] = [
  { id: 'label', label: 'Read the arc flash label on the M12/M22 doors: incident energy, boundaries, glove class' },
  { id: 'sources', label: 'Review one-line E-310 and list every source: 4160 V VFD incoming, 4160 V bypass, 480 V aux bucket, 120 V control, drive cell capacitors' },
  { id: 'notify', label: 'Notify operations: P-310 out of service, P-320 carrying the station' },
  { id: 'jsa', label: 'JSA reviewed; arc flash boundary roped off; qualified second person at the boundary' },
  { id: 'meter', label: 'Fluke 789 (CAT III 1000 V) and Megger S1-568 in cal; TIC 300 PRO self-test for the 4160 V side' },
]

export type LogKind = 'info' | 'measure' | 'action' | 'warn' | 'inspect' | 'violation'
export interface LogEntry { t: number; kind: LogKind; text: string }

export type Instrument = 'dmm' | 'tic'
/** `n` is the measurement sequence number, so live-dead-live order holds even within one second. */
export interface DeadTest { a: Point; b: Point; mode: MeterMode; t: number; n: number; instrument: Instrument }

export type TicRange = 'LOW' | 'HIGH'
export interface TicState {
  on: boolean
  range: TicRange
  /** tracer clipped to the hot stick; it is never hand-held near 4160 V */
  hotStick: boolean
  /** tracer clipped to the hot stick; it is never hand-held near 4160 V */
  selfTestAt: number | null
  last: { point: Point; detected: boolean; t: number } | null
}

export interface InsTest { a: Point; b: Point; volts: MeggerVolts; reading: string; t: number; mode: MeggerMode; dar?: number; pi?: number }

export type InspectWhere = 'box'

export interface ElecState {
  scenario: ElecScenario
  t: number
  log: LogEntry[]
  scene: Scene
  checklist: Record<string, boolean>
  labelRead: boolean
  ppe: PpeId[]
  ppeConfirmed: { t: number; adequate: boolean } | null
  /** true = closed / energized */
  closed: Record<LockTarget, boolean>
  locks: Record<LockTarget, boolean>
  tags: Record<LockTarget, boolean>
  done: Record<LockTarget, { opened: boolean; locked: boolean; tagged: boolean }>
  /** when the VFD incoming was last opened, for the cell capacitor decay */
  tOff: number | null
  linkAtOff: number
  tryStepDone: boolean
  /** motor connection compartment door (M12 lower) */
  doorOpen: boolean
  auxDoorOpen: boolean
  drive: { faulted: boolean; running: boolean; damaged: boolean; display: string }
  leadsLifted: boolean
  jbox: { coverOff: boolean; feedersUnbolted: boolean; lugsCleared: boolean; wyeOpen: boolean; inspected: boolean }
  meter: { mode: MeterMode; jacks: MeterJacks; probeA: Point | null; probeB: Point | null; held: string | null; rel: number | null; manualRange: boolean; backlight: boolean }
  megger: MeggerState
  tic: TicState
  /** instrument proved on a known live source: the 789 on the receptacle by contact, the TIC on the receptacle on LOW */
  proofs: { t: number; n: number; instrument: 'tic' | 'dmm' }[]
  deadTests: DeadTest[]
  insTests: InsTest[]
  tests: number
  violations: { id: string; t: number; text: string }[]
  faultCleared: boolean
  diagnosis: DiagnosisId | null
  repairs: RepairId[]
  finished: boolean
}
