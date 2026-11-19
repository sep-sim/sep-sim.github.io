// Electrical safety module: VFD ground fault, LOTO, absence-of-voltage verification, insulation testing.

export type Scene = 'mcc' | 'drive' | 'motor'

export type Point =
  | 'RECEPT_H' | 'RECEPT_N' | 'RECEPT_G'
  | 'L1' | 'L2' | 'L3' | 'DC_P' | 'DC_N' | 'U' | 'V' | 'W'
  | 'C_T1' | 'C_T2' | 'C_T3' | 'GND' | 'CTRL_H' | 'CTRL_N'
  | 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'CBL_1' | 'CBL_2' | 'CBL_3' | 'FRAME'

export const POINT_SCENE: Record<Point, Scene> = {
  RECEPT_H: 'mcc', RECEPT_N: 'mcc', RECEPT_G: 'mcc',
  L1: 'drive', L2: 'drive', L3: 'drive', DC_P: 'drive', DC_N: 'drive', U: 'drive', V: 'drive', W: 'drive',
  C_T1: 'drive', C_T2: 'drive', C_T3: 'drive', GND: 'drive', CTRL_H: 'drive', CTRL_N: 'drive',
  T1: 'motor', T2: 'motor', T3: 'motor', T4: 'motor', T5: 'motor', T6: 'motor',
  CBL_1: 'motor', CBL_2: 'motor', CBL_3: 'motor', FRAME: 'motor',
}

export const POINT_LABEL: Record<Point, string> = {
  RECEPT_H: 'receptacle hot', RECEPT_N: 'receptacle neutral', RECEPT_G: 'receptacle ground',
  L1: 'R/L1', L2: 'S/L2', L3: 'T/L3', DC_P: 'PA/+ (DC bus)', DC_N: 'PC/− (DC bus)',
  U: 'U/T1 (drive output)', V: 'V/T2 (drive output)', W: 'W/T3 (drive output)',
  C_T1: '1M-T1 motor lead', C_T2: '1M-T2 motor lead', C_T3: '1M-T3 motor lead',
  GND: 'cabinet ground bar', CTRL_H: 'X1-1 (120 V control)', CTRL_N: 'X1-2 (control neutral)',
  T1: 'bushing T1', T2: 'bushing T2', T3: 'bushing T3', T4: 'board T4', T5: 'board T5', T6: 'board T6',
  CBL_1: 'feeder lug L1', CBL_2: 'feeder lug L2', CBL_3: 'feeder lug L3', FRAME: 'motor frame ground stud',
}

export type PpeId = 'hardhat' | 'glasses' | 'hearing' | 'cotton' | 'ar8' | 'ar12' | 'suit40' | 'faceshield' | 'gloves_leather' | 'gloves00' | 'boots'
export type PpeSlot = 'head' | 'eyes' | 'ears' | 'body' | 'face' | 'hands' | 'feet'

export interface PpeItem { id: PpeId; label: string; slot: PpeSlot; arcRating?: number; shockOk?: boolean; note: string }

export const PPE_ITEMS: PpeItem[] = [
  { id: 'hardhat', label: 'Hard hat, Class E', slot: 'head', note: 'Rated 20 kV. Required under the arc flash hood or face shield.' },
  { id: 'glasses', label: 'Safety glasses', slot: 'eyes', note: 'Worn under the face shield or hood.' },
  { id: 'hearing', label: 'Hearing protection (ear canal inserts)', slot: 'ears', note: 'Required for every arc flash PPE category.' },
  { id: 'cotton', label: 'Cotton work shirt and jeans', slot: 'body', arcRating: 0, note: 'Natural fiber underlayer only. No arc rating.' },
  { id: 'ar8', label: 'AR shirt and pants, 8 cal/cm²', slot: 'body', arcRating: 8, note: 'Daily wear. Meets PPE category 2 only.' },
  { id: 'ar12', label: 'AR coverall, 12 cal/cm²', slot: 'body', arcRating: 12, note: 'With an AR face shield and balaclava, or a 12 cal hood.' },
  { id: 'suit40', label: 'Arc flash suit with hood, 40 cal/cm²', slot: 'body', arcRating: 40, note: 'Jacket, bib overalls and hood. Hood covers the face.' },
  { id: 'faceshield', label: 'AR face shield and balaclava, 12 cal/cm²', slot: 'face', arcRating: 12, note: 'Required with AR daily wear or coverall. Not needed with the 40 cal hood.' },
  { id: 'gloves_leather', label: 'Leather work gloves', slot: 'hands', shockOk: false, note: 'Arc protection only. No shock protection.' },
  { id: 'gloves00', label: 'Class 00 rubber insulating gloves with leather protectors', slot: 'hands', shockOk: true, note: 'Max use 500 V AC. Required for shock exposure at 480 V.' },
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
  drive: { model: string; faultCode: string; faultText: string }
  /** Insulation tests a sharp tech needs to localize the fault. */
  targetTests: number
}

export type MeterMode = 'OFF' | 'VAC' | 'VDC' | 'OHM' | 'INS'
export const INS_VOLTS = [50, 100, 250, 500, 1000] as const
export type InsVolts = (typeof INS_VOLTS)[number]

export type LockTarget = 'mcc' | 'lp2'

export type DiagnosisId = 'termination_fault' | 'motor_winding' | 'cable_fault' | 'drive_output' | 'nuisance'
export const DIAGNOSES: { id: DiagnosisId; label: string }[] = [
  { id: 'termination_fault', label: 'Ground fault at a feeder termination in the motor terminal box' },
  { id: 'motor_winding', label: 'Motor stator winding insulation failed to ground' },
  { id: 'cable_fault', label: 'Feeder cable insulation failed to ground between the drive and the motor' },
  { id: 'drive_output', label: 'Drive output stage (IGBT) failure' },
  { id: 'nuisance', label: 'Nuisance trip, no insulation fault found' },
]

export type RepairId = 'remake_terminations' | 'replace_motor' | 'replace_cable' | 'replace_vfd' | 'clean_dry_box'
export const REPAIRS: { id: RepairId; label: string }[] = [
  { id: 'remake_terminations', label: 'Cut back and re-terminate the damaged feeder lug, new heat shrink and phase tape' },
  { id: 'clean_dry_box', label: 'Dry the terminal box, clear the breather, seal the conduit hub' },
  { id: 'replace_motor', label: 'Replace motor P-101M (send to shop for rewind)' },
  { id: 'replace_cable', label: 'Pull new feeder cable, drive to motor' },
  { id: 'replace_vfd', label: 'Replace VFD-101 power module' },
]

export interface ChecklistItem { id: string; label: string }
export const CHECKLIST: ChecklistItem[] = [
  { id: 'label', label: 'Read the arc flash label on VFD-101: incident energy, boundaries, glove class' },
  { id: 'sources', label: 'Review one-line E-401 and list every source: MCC-3 bucket 3B (480 V), LP-2 ckt 7 (120 V control), DC bus capacitors' },
  { id: 'notify', label: 'Notify operations: P-101 out of service, standby pump P-102 carrying the station' },
  { id: 'jsa', label: 'JSA reviewed; arc flash boundary marked; second person at the boundary' },
  { id: 'meter', label: 'Fluke 1587 verified CAT III 1000 V, leads inspected, due date in cal' },
]

export type LogKind = 'info' | 'measure' | 'action' | 'warn' | 'inspect' | 'violation'
export interface LogEntry { t: number; kind: LogKind; text: string }

export interface InsTest { a: Point; b: Point; volts: InsVolts; reading: string; t: number }
export interface DeadTest { a: Point; b: Point; mode: MeterMode; t: number }

export interface ElecState {
  scenario: ElecScenario
  t: number
  log: LogEntry[]
  scene: Scene
  checklist: Record<string, boolean>
  labelRead: boolean
  ppe: PpeId[]
  mccClosed: boolean
  lp2Closed: boolean
  locks: Record<LockTarget, boolean>
  tags: Record<LockTarget, boolean>
  tOff: number | null
  busAtOff: number
  tryStepDone: boolean
  /** Things that happened at least once, for scoring after restoration. */
  done: { breakerOpened: boolean; lp2Opened: boolean; mccLocked: boolean; mccTagged: boolean; lp2Locked: boolean; lp2Tagged: boolean }
  doorOpen: boolean
  drive: { faulted: boolean; running: boolean; damaged: boolean; display: string }
  leadsLifted: boolean
  jbox: { coverOff: boolean; feedersUnbolted: boolean; lugsCleared: boolean; wyeOpen: boolean; inspected: boolean }
  meter: { mode: MeterMode; insVolts: InsVolts; probeA: Point | null; probeB: Point | null; lastTest: string | null }
  proofs: number[]
  deadTests: DeadTest[]
  insTests: InsTest[]
  tests: number
  violations: { id: string; t: number; text: string }[]
  faultCleared: boolean
  diagnosis: DiagnosisId | null
  repairs: RepairId[]
  finished: boolean
}
