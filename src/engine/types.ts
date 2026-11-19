// Core domain types for the loop simulator.

export type NodeId =
  | 'PS_PLUS' | 'PS_MINUS' | 'F1_OUT' | 'TB_1' | 'TB_2'
  | 'JB_1' | 'JB_2' | 'XMTR_PLUS' | 'XMTR_MINUS' | 'XMTR_TEST'
  | 'AI_PLUS' | 'AI_MINUS'

export const NODE_LABEL: Record<NodeId, string> = {
  PS_PLUS: 'PS-1 (+)', PS_MINUS: 'PS-1 (−)', F1_OUT: 'F1 load side',
  TB_1: 'TB-1 term 1 (+)', TB_2: 'TB-1 term 2 (−)',
  JB_1: 'JB-1 term 1 (+)', JB_2: 'JB-1 term 2 (−)',
  XMTR_PLUS: 'PT-101 (+)', XMTR_MINUS: 'PT-101 (−)', XMTR_TEST: 'PT-101 TEST',
  AI_PLUS: 'AI-1 CH3 (+)', AI_MINUS: 'AI-1 CH3 (−)',
}

/** Nodes where a meter can be inserted in series for a mA reading. */
export const SERIES_CAPABLE: NodeId[] = ['TB_1', 'TB_2', 'JB_1', 'JB_2', 'XMTR_PLUS', 'XMTR_MINUS', 'XMTR_TEST']

export type FaultKind =
  | 'open_plus_conductor' | 'open_minus_conductor'
  | 'loose_terminal_jb_plus' | 'loose_terminal_jb_minus'
  | 'blown_fuse' | 'supply_dead'
  | 'xmtr_fail_high' | 'xmtr_fail_low'
  | 'impulse_plugged'
  | 'reversed_polarity_jb'

export interface Fault { kind: FaultKind }

export type DiagnosisId =
  | 'open_cable_plus' | 'open_cable_minus' | 'loose_jb' | 'blown_fuse' | 'supply_dead'
  | 'xmtr_fail_high' | 'xmtr_fail_low' | 'range_mismatch' | 'isolation_closed'
  | 'impulse_plugged' | 'reversed_polarity' | 'ai_card'

export const DIAGNOSES: { id: DiagnosisId; label: string }[] = [
  { id: 'open_cable_plus', label: 'Open circuit in field cable (+ conductor)' },
  { id: 'open_cable_minus', label: 'Open circuit in field cable (− conductor)' },
  { id: 'loose_jb', label: 'Loose / failed termination at JB-1' },
  { id: 'blown_fuse', label: 'Blown fuse F1 in RTU cabinet' },
  { id: 'supply_dead', label: '24 VDC power supply PS-1 failed' },
  { id: 'xmtr_fail_high', label: 'Transmitter sensor failure – output failed high' },
  { id: 'xmtr_fail_low', label: 'Transmitter sensor failure – output failed low' },
  { id: 'range_mismatch', label: 'Transmitter range (LRV/URV) does not match SCADA scaling' },
  { id: 'isolation_closed', label: 'Process isolation valve closed' },
  { id: 'impulse_plugged', label: 'Impulse line plugged' },
  { id: 'reversed_polarity', label: 'Loop polarity reversed at JB-1' },
  { id: 'ai_card', label: 'RTU analog input card failed' },
]

export type RepairId =
  | 're_terminate_jb' | 'replace_cable_pair' | 'replace_fuse' | 'replace_supply'
  | 'replace_transmitter' | 'blowdown_impulse' | 'correct_polarity' | 'replace_ai_card'

export const REPAIRS: { id: RepairId; label: string }[] = [
  { id: 're_terminate_jb', label: 'Re-terminate wiring at JB-1' },
  { id: 'replace_cable_pair', label: 'Move loop to a spare pair in the field cable' },
  { id: 'replace_fuse', label: 'Replace fuse F1' },
  { id: 'replace_supply', label: 'Replace power supply PS-1' },
  { id: 'replace_transmitter', label: 'Replace PT-101 with a new unit (factory range)' },
  { id: 'blowdown_impulse', label: 'Blow down / rod out impulse line' },
  { id: 'correct_polarity', label: 'Swap conductors at JB-1 to correct polarity' },
  { id: 'replace_ai_card', label: 'Replace RTU analog input card' },
]

export interface ChecklistItem { id: string; label: string }

export const PREWORK_CHECKLIST: ChecklistItem[] = [
  { id: 'notify', label: 'Notify the controller before touching PT-101' },
  { id: 'inhibit', label: 'Confirm the point is in maintenance / alarms inhibited and no ESD trip hangs on it' },
  { id: 'drawing', label: 'Pull the loop drawing and P&ID for PT-101' },
  { id: 'permit', label: 'Gas test and work permit for the Class I Div 2 area' },
  { id: 'ppe', label: 'Meter rated CAT III, PPE and intrinsically-safe communicator confirmed' },
]

export interface LoopConfig {
  tag: string
  description: string
  lrv: number
  urv: number
  unit: string
  supplyVolts: number
  loadOhms: number
  wireOhmsPerConductor: number
  factoryLrv: number
  factoryUrv: number
}

export interface ProcessModel {
  basePressure: number
  swing: number
  period: number
  noise: number
}

export interface Scenario {
  id: string
  title: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  workOrder: string
  loop: LoopConfig
  process: ProcessModel
  faults: Fault[]
  initial: { isolationOpen: boolean; trappedPressure: number; xmtrLrv: number; xmtrUrv: number }
  answer: { diagnosis: DiagnosisId; repairs: RepairId[] }
  targetMeasurements: number
}

export type LogKind = 'info' | 'measure' | 'action' | 'warn' | 'hmi' | 'inspect'
export interface LogEntry { t: number; kind: LogKind; text: string }

/** Rotary positions of the Fluke 789 ProcessMeter, clockwise from OFF. */
export type MeterMode = 'OFF' | 'VAC' | 'VDC' | 'OHM' | 'mA' | 'SOURCE' | 'SIM'
export const METER_MODES: MeterMode[] = ['OFF', 'VAC', 'VDC', 'OHM', 'mA', 'SOURCE', 'SIM']

export type RampMode = 'off' | 'slow' | 'fast' | 'step'

export type MeterKey =
  | 'RANGE' | 'HOLD' | 'LOOP_POWER' | 'HART_250'
  | 'ZERO' | 'HUNDRED' | 'SPAN_CHECK' | 'STEP' | 'RAMP'
  | 'COARSE_UP' | 'COARSE_DN' | 'FINE_UP' | 'FINE_DN'

export interface MeterState {
  mode: MeterMode
  probeA: NodeId | null
  probeB: NodeId | null
  /** Snapshot shown while HOLD is active. */
  held: string | null
  loopPower: boolean
  hart250: boolean
  /** Output set-point for SOURCE / SIM, mA. */
  outMa: number
  ramp: RampMode
  rampDir: 1 | -1
}

export interface HartScreen {
  tag: string
  pv: number
  ao: number
  lrv: number
  urv: number
  status: string[]
}

export interface HmiSample { t: number; eu: number; ma: number; quality: string }

export type InspectWhere = 'rtu' | 'jb' | 'xmtr' | 'manifold'

export interface SessionState {
  scenario: Scenario
  t: number
  log: LogEntry[]
  checklist: Record<string, boolean>
  fieldWorkStarted: boolean
  checklistDoneBeforeField: number
  faults: Fault[]
  fusePulled: boolean
  isolationOpen: boolean
  trappedPressure: number
  pumpPressure: number | null
  xmtr: { lrv: number; urv: number }
  hart: { connected: boolean; loopPower: boolean; loopTest: number | null; screen: HartScreen | null }
  meter: MeterState
  measurements: number
  ohmsOnLive: number
  sourceIntoLive: number
  pumpWithIsolationOpen: number
  inspections: Partial<Record<InspectWhere, string>>
  diagnosis: DiagnosisId | null
  repairs: RepairId[]
  hmiHistory: HmiSample[]
  finished: boolean
}
