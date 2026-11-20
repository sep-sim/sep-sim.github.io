import type { ArcLabel, ElecScenario } from './types'

/** JK-series MV controller, 4160 V, per the site study. */
const LABEL: ArcLabel = {
  equipment: 'VFD #2 · P-310 PUMP · TOSHIBA JK M12/M22/M32',
  fedFrom: '4160 V switchgear SWG-1, breaker 52-7',
  voltage: 4160,
  incidentEnergy: 22.4,
  workingDistance: 36,
  arcFlashBoundary: 134,
  limitedApproach: 60,
  restrictedApproach: 26,
  gloveClass: '2',
  gloveRank: 3,
  minArcRating: 25,
  studyDate: '2026-03-14',
}

const MOTOR = { tag: 'P-310M', hp: 4000, volts: 4160, fla: 480, rpm: 1790, frame: '8011', leads: 6 as const }
const DRIVE = { model: 'Toshiba T300MVi, JK-series controller, 4000 HP 4160 V', relay: 'MPR motor protection relay', faultCode: 'GND FAULT', faultText: '50G ground fault trip, 86 lockout' }
const MEG = { min: 2500 as const, max: 5000 as const }

export const ELEC_SCENARIOS: ElecScenario[] = [
  {
    id: 'term-fault',
    title: 'VFD #2 ground fault trip on P-310 after a wet week',
    difficulty: 'intermediate',
    workOrder: 'The MPR on VFD #2 tripped 50G ground fault at 04:12 and the 86 lockout is standing. P-320 is carrying the station. A week of rain, and the P-310 terminal box breather was reported clogged at the last inspection. Establish an electrically safe work condition on the 4160 V controller, find the fault, repair and return to service.',
    fault: 'termination',
    label: LABEL,
    motor: MOTOR,
    drive: DRIVE,
    megVolts: MEG,
    targetTests: 8,
  },
  {
    id: 'motor-winding',
    title: 'VFD #2 ground fault on P-310, motor ran hot last week',
    difficulty: 'advanced',
    workOrder: 'VFD #2 tripped 50G ground fault on the 02:00 start and trips on every reset. The MPR logged stator RTD high-temperature alarms on P-310M last week. Establish an electrically safe work condition, localize the fault, and advise.',
    fault: 'motor',
    label: LABEL,
    motor: MOTOR,
    drive: DRIVE,
    megVolts: MEG,
    targetTests: 10,
  },
  {
    id: 'cable-fault',
    title: 'VFD #2 ground fault on P-310 after excavation',
    difficulty: 'advanced',
    workOrder: 'VFD #2 tripped 50G ground fault at 15:40. A contractor was trenching near the P-310 duct bank this afternoon. Establish an electrically safe work condition, localize the fault, and advise.',
    fault: 'cable',
    label: LABEL,
    motor: MOTOR,
    drive: DRIVE,
    megVolts: MEG,
    targetTests: 10,
  },
]

export function pickRandomElecScenario(): ElecScenario {
  return ELEC_SCENARIOS[Math.floor(Math.random() * ELEC_SCENARIOS.length)]
}
