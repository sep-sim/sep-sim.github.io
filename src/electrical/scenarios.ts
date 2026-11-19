import type { ArcLabel, ElecScenario } from './types'

const LABEL: ArcLabel = {
  equipment: 'VFD-101 · P-101 PUMP · MCC-3 BUCKET 3B',
  fedFrom: 'MCC-3 main, 480 V 3Ø, 200 A breaker 3B',
  voltage: 480,
  incidentEnergy: 10.4,
  workingDistance: 18,
  arcFlashBoundary: 62,
  limitedApproach: 42,
  restrictedApproach: 12,
  gloveClass: '00',
  minArcRating: 12,
  studyDate: '2026-03-14',
}

const MOTOR = { tag: 'P-101M', hp: 100, volts: 460, fla: 124, rpm: 1785, frame: '405T', leads: 6 as const }
const DRIVE = { model: 'Toshiba VF-AS3 (TOSVERT) 100 HP', faultCode: 'EF2', faultText: 'Ground fault (hardware detect)' }

export const ELEC_SCENARIOS: ElecScenario[] = [
  {
    id: 'term-fault',
    title: 'VFD-101 EF2 ground fault after a wet week',
    difficulty: 'intermediate',
    workOrder: 'VFD-101 tripped EF2 (ground fault) at 04:12 and will not reset. P-102 is carrying the station. A week of rain, and the P-101 terminal box breather was reported clogged last inspection. Establish an electrically safe work condition, find the fault, repair and return to service.',
    fault: 'termination',
    label: LABEL,
    motor: MOTOR,
    drive: DRIVE,
    targetTests: 8,
  },
  {
    id: 'motor-winding',
    title: 'VFD-101 EF2 ground fault, motor ran hot last week',
    difficulty: 'advanced',
    workOrder: 'VFD-101 tripped EF2 (ground fault) during the 02:00 pump start and trips again on every reset attempt. Operations logged high winding temperature alarms on P-101M last week. Establish an electrically safe work condition, localize the fault, and advise.',
    fault: 'motor',
    label: LABEL,
    motor: MOTOR,
    drive: DRIVE,
    targetTests: 10,
  },
  {
    id: 'cable-fault',
    title: 'VFD-101 EF2 ground fault after excavation',
    difficulty: 'advanced',
    workOrder: 'VFD-101 tripped EF2 (ground fault) at 15:40. A contractor was trenching near the P-101 duct bank this afternoon. Establish an electrically safe work condition, localize the fault, and advise.',
    fault: 'cable',
    label: LABEL,
    motor: MOTOR,
    drive: DRIVE,
    targetTests: 10,
  },
]

export function pickRandomElecScenario(): ElecScenario {
  return ELEC_SCENARIOS[Math.floor(Math.random() * ELEC_SCENARIOS.length)]
}
