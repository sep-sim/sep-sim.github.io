import type { SessionState } from './types'
import { PREWORK_CHECKLIST } from './types'
import { loopInService } from './loop'

export interface ScoreLine { label: string; points: number; max: number; note: string }
export interface Score { total: number; max: number; grade: string; lines: ScoreLine[]; penalties: ScoreLine[] }

export function scoreSession(s: SessionState): Score {
  const lines: ScoreLine[] = []
  const penalties: ScoreLine[] = []
  const ans = s.scenario.answer

  // Pre-work: checklist items completed before the first hands-on action.
  const prework = s.fieldWorkStarted ? s.checklistDoneBeforeField : Object.values(s.checklist).filter(Boolean).length
  const preworkPts = Math.round((prework / PREWORK_CHECKLIST.length) * 25)
  lines.push({
    label: 'Pre-work and safety',
    points: preworkPts,
    max: 25,
    note: `${prework} of ${PREWORK_CHECKLIST.length} checklist items done before the first field action`,
  })

  // Diagnosis
  const diagOk = s.diagnosis === ans.diagnosis
  lines.push({
    label: 'Root cause diagnosis',
    points: diagOk ? 30 : 0,
    max: 30,
    note: s.diagnosis == null ? 'No diagnosis recorded' : diagOk ? 'Correct' : 'Incorrect root cause',
  })

  // Repair and return to service
  const inService = loopInService(s)
  const requiredDone = ans.repairs.every((r) => s.repairs.includes(r))
  const repairPts = inService ? 25 : requiredDone ? 10 : 0
  lines.push({
    label: 'Repair and return to service',
    points: repairPts,
    max: 25,
    note: inService
      ? 'HMI tracks line pressure, loop left in a normal state'
      : requiredDone
        ? 'Fault cleared but loop not verified back in service (check isolation, pump, loop test, fuse, range)'
        : 'Fault still present',
  })

  // Efficiency
  const wrongRepairs = s.repairs.filter((r) => !ans.repairs.includes(r)).length
  const extra = Math.max(0, s.measurements - s.scenario.targetMeasurements)
  const effPts = Math.max(0, 20 - extra * 2 - wrongRepairs * 5)
  lines.push({
    label: 'Efficiency',
    points: effPts,
    max: 20,
    note: `${s.measurements} measurements (target ${s.scenario.targetMeasurements}), ${wrongRepairs} unnecessary repair${wrongRepairs === 1 ? '' : 's'}`,
  })

  if (s.ohmsOnLive > 0) penalties.push({ label: 'Resistance measured on a live loop', points: -Math.min(15, 5 * s.ohmsOnLive), max: 0, note: `${s.ohmsOnLive}×` })
  if (s.sourceIntoLive > 0) penalties.push({ label: 'Sourced current into a powered loop', points: -5, max: 0, note: `${s.sourceIntoLive}×` })
  if (s.pumpWithIsolationOpen > 0) penalties.push({ label: 'Test pressure applied with isolation open', points: -10, max: 0, note: `${s.pumpWithIsolationOpen}×` })
  if (!s.checklist.notify && s.fieldWorkStarted) penalties.push({ label: 'Worked on a live SCADA point without notifying the controller', points: -10, max: 0, note: '' })

  const raw = lines.reduce((a, l) => a + l.points, 0) + penalties.reduce((a, l) => a + l.points, 0)
  const total = Math.max(0, raw)
  const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F'
  return { total, max: 100, grade, lines, penalties }
}
