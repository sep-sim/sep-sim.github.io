import type { ElecState } from './types'
import { CHECKLIST, DIAGNOSES } from './types'
import { PENALTY, provedAfter, provedBefore, restored, verifiedDead, deadTestDone, REQUIRED_DEAD } from './engine'

export interface ScoreLine { label: string; points: number; max: number; note: string }
export interface ElecScore { total: number; max: number; grade: string; lines: ScoreLine[]; penalties: ScoreLine[] }

const ANSWER: Record<string, { diagnosis: string; repairs: string[] }> = {
  termination: { diagnosis: 'termination_fault', repairs: ['remake_terminations', 'clean_dry_box'] },
  motor: { diagnosis: 'motor_winding', repairs: ['replace_motor'] },
  cable: { diagnosis: 'cable_fault', repairs: ['replace_cable'] },
}

export function elecAnswer(s: ElecState): { diagnosis: string; repairs: string[] } {
  return ANSWER[s.scenario.fault]
}

export function scoreElec(s: ElecState): ElecScore {
  const lines: ScoreLine[] = []
  const penalties: ScoreLine[] = []
  const ans = elecAnswer(s)

  // Hazard assessment and PPE (20)
  const checks = CHECKLIST.filter((c) => s.checklist[c.id]).length
  const hazardPts = (s.labelRead ? 5 : 0) + Math.round((checks / CHECKLIST.length) * 5)
  const ppeViolations = s.violations.filter((v) => v.id.startsWith('ppe_')).length
  const confirmed = s.ppeConfirmed != null && s.ppeConfirmed.adequate
  const ppePts = ppeViolations > 0 ? 0 : confirmed ? 10 : 6
  const ppeNote = ppeViolations > 0 ? `${ppeViolations} PPE violation${ppeViolations === 1 ? '' : 's'}` : confirmed ? 'PPE confirmed against the label' : 'PPE adequate but never confirmed against the label'
  lines.push({ label: 'Hazard assessment and PPE', points: hazardPts + ppePts, max: 20, note: `${s.labelRead ? 'label read' : 'label not read'}, ${checks}/${CHECKLIST.length} pre-work items, ${ppeNote}` })

  // LOTO and verification (35)
  let loto = 0
  const notes: string[] = []
  if (s.done.breakerOpened) loto += 3; else notes.push('breaker never opened')
  if (s.done.mccLocked && s.done.mccTagged) loto += 4; else notes.push('MCC lock/tag incomplete')
  if (s.done.lp2Opened) loto += 4; else notes.push('control power not isolated')
  if (s.done.lp2Locked && s.done.lp2Tagged) loto += 4; else notes.push('LP-2 lock/tag incomplete')
  if (s.tryStepDone) loto += 5; else notes.push('no try-step')
  const busOk = !s.violations.some((v) => v.id === 'bus_charged')
  if (busOk) loto += 5; else notes.push('worked with bus charged')
  const dead = verifiedDead(s)
  const ldl = provedBefore(s) && provedAfter(s)
  if (dead) loto += 6; else notes.push(`${REQUIRED_DEAD.filter((r) => deadTestDone(s, r)).length}/${REQUIRED_DEAD.length} required absence-of-voltage checks`)
  if (dead && ldl) loto += 4; else if (dead) notes.push('live-dead-live incomplete')
  lines.push({ label: 'Lockout, tagout and verification', points: loto, max: 35, note: notes.length ? notes.join('; ') : 'complete' })

  // Testing and diagnosis (25)
  let test = 0
  const tnotes: string[] = []
  const megged = s.insTests.length > 0
  if (megged && !s.violations.some((v) => v.id === 'meg_into_drive' || v.id === 'meg_through_contactor')) test += 5; else tnotes.push('motor leads not isolated for insulation test')
  if (megged && s.insTests.every((t) => t.volts >= 500 && t.volts <= 1000)) test += 4; else tnotes.push('wrong test voltage')
  const localized = s.insTests.some((t) => t.t >= 0 && (t.a.startsWith('T') || t.b.startsWith('T') || t.a.startsWith('CBL') || t.b.startsWith('CBL')))
  if (localized) test += 3; else tnotes.push('fault not localized at the motor box')
  if (s.scenario.fault === 'motor' && !s.log.some((l) => l.text.includes('Removed the T4-T5-T6 wye bar'))) tnotes.push('winding not isolated at the wye point')
  if (s.jbox.inspected) test += 3; else tnotes.push('box not inspected')
  const diagOk = s.diagnosis === ans.diagnosis
  if (diagOk) test += 10; else tnotes.push(s.diagnosis ? 'wrong root cause' : 'no diagnosis')
  lines.push({ label: 'Testing and diagnosis', points: test, max: 25, note: tnotes.length ? tnotes.join('; ') : 'complete' })

  // Restoration (10)
  const repairsOk = ans.repairs.every((r) => s.repairs.includes(r as never))
  const back = restored(s) && s.faultCleared && !s.drive.damaged
  const locksOff = !s.locks.mcc && !s.locks.lp2 && s.mccClosed
  const running = s.drive.running
  const rest = (repairsOk ? 3 : 0) + (back ? 3 : 0) + (locksOff ? 2 : 0) + (running ? 2 : 0)
  lines.push({ label: 'Repair and return to service', points: rest, max: 10, note: running ? 'P-101 running, no fault' : back ? 'repaired and reassembled, not restarted' : repairsOk ? 'repaired, not reassembled' : 'fault not repaired' })

  // Efficiency (10)
  const wrong = s.repairs.filter((r) => !ans.repairs.includes(r) && !(r === 'replace_vfd' && s.violations.some((v) => v.id === 'meg_into_drive'))).length
  const extra = Math.max(0, s.insTests.length - s.scenario.targetTests)
  const eff = Math.max(0, 10 - wrong * 5 - extra)
  lines.push({ label: 'Efficiency', points: eff, max: 10, note: `${s.insTests.length} insulation tests (target ${s.scenario.targetTests}), ${wrong} unnecessary repair${wrong === 1 ? '' : 's'}` })

  // Penalties, once per id with a count
  const counts = new Map<string, number>()
  for (const v of s.violations) counts.set(v.id, (counts.get(v.id) ?? 0) + 1)
  for (const [id, n] of counts) {
    const p = PENALTY[id]
    penalties.push({ label: p.label, points: p.points, max: 0, note: n > 1 ? `${n}× (charged once)` : '' })
  }
  if (!s.violations.some((v) => v.id === 'no_prove_before') && s.deadTests.length > 0 && !provedBefore(s)) penalties.push({ label: PENALTY.no_prove_before.label, points: PENALTY.no_prove_before.points, max: 0, note: '' })
  if (dead && !provedAfter(s)) penalties.push({ label: PENALTY.no_prove_after.label, points: PENALTY.no_prove_after.points, max: 0, note: '' })
  const busVdc = s.deadTests.some((d) => [d.a, d.b].includes('DC_P') && d.mode === 'VDC' && d.instrument === 'dmm')
  const busAcOnly = s.deadTests.some((d) => [d.a, d.b].includes('DC_P') && d.mode === 'VAC' && d.instrument === 'dmm') && !busVdc
  if (busAcOnly) penalties.push({ label: PENALTY.bus_ac_only.label, points: PENALTY.bus_ac_only.points, max: 0, note: '' })
  if (s.tic.busChecked && !busVdc) penalties.push({ label: PENALTY.bus_tic_only.label, points: PENALTY.bus_tic_only.points, max: 0, note: '' })

  const raw = lines.reduce((a, l) => a + l.points, 0) + penalties.reduce((a, l) => a + l.points, 0)
  const total = Math.max(0, raw)
  const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F'
  return { total, max: 100, grade, lines, penalties }
}

export function diagnosisLabel(id: string | null): string {
  return DIAGNOSES.find((d) => d.id === id)?.label ?? '—'
}
