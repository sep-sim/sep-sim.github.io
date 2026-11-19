import { describe, expect, it } from 'vitest'
import {
  busVolts, chargeLampOn, createElecSession, eswc, insulationTest, ppeCheck, reduceElec, verifiedDead, voltageBetween, type Action,
} from './engine'
import { scoreElec } from './score'
import { CHECKLIST, type ElecState, type Point } from './types'
import { ELEC_SCENARIOS } from './scenarios'

const byId = (id: string) => ELEC_SCENARIOS.find((s) => s.id === id)!
const run = (s: ElecState, ...acts: Action[]) => acts.reduce(reduceElec, s)

const FULL_PPE: Action[] = [...(['hardhat', 'glasses', 'hearing', 'ar12', 'faceshield', 'gloves00', 'boots'] as const).map((id) => ({ type: 'ppe', id, on: true }) as Action), { type: 'ppeConfirm' }]
const prework = (): Action[] => [{ type: 'readLabel' }, ...CHECKLIST.map((c) => ({ type: 'checklist', id: c.id }) as Action)]
const vac = (a: Point, b: Point): Action[] => [{ type: 'meterMode', mode: 'VAC' }, { type: 'probe', point: a }, { type: 'probe', point: b }]
const vdc = (a: Point, b: Point): Action[] => [{ type: 'meterMode', mode: 'VDC' }, { type: 'probe', point: a }, { type: 'probe', point: b }]
/** Megger IR spot test: − on the conductor, + to earth, read at one minute. */
const meg = (a: Point, b: Point): Action[] => [
  { type: 'meggerMode', mode: 'IR' }, { type: 'meggerLead', lead: 'minus', point: a }, { type: 'meggerLead', lead: 'plus', point: b },
  { type: 'meggerTest' }, { type: 'wait', minutes: 1 }, { type: 'meggerTest' },
]
const ir = (s: ElecState, a: Point, b: Point) => insulationTest(s, a, b)

/** The textbook path to an electrically safe work condition with the leads lifted at 1M. */
function toEswc(s: ElecState): ElecState {
  return run(s,
    ...prework(), ...FULL_PPE,
    { type: 'breaker', closed: false }, { type: 'lp2', closed: false },
    { type: 'lock', target: 'mcc', on: true }, { type: 'tag', target: 'mcc', on: true },
    { type: 'lock', target: 'lp2', on: true }, { type: 'tag', target: 'lp2', on: true },
    { type: 'tryStart' },
    { type: 'wait', minutes: 15 },
    ...vac('RECEPT_H', 'RECEPT_N'),
    { type: 'goto', scene: 'drive' }, { type: 'door', open: true },
    ...vac('L1', 'L2'), ...vac('L2', 'L3'), ...vac('L1', 'L3'), ...vac('L1', 'GND'), ...vac('L2', 'GND'), ...vac('L3', 'GND'),
    ...vdc('DC_P', 'DC_N'), ...vac('CTRL_H', 'CTRL_N'),
    { type: 'goto', scene: 'mcc' }, ...vac('RECEPT_H', 'RECEPT_N'),
    { type: 'goto', scene: 'drive' }, { type: 'liftLeads', lifted: true },
  )
}

describe('energy state', () => {
  it('starts energized with the drive faulted and a charged bus', () => {
    const s = createElecSession(byId('term-fault'))
    expect(busVolts(s)).toBe(648)
    expect(voltageBetween(s, 'L1', 'L2').ac).toBeCloseTo(480, 0)
    expect(voltageBetween(s, 'L1', 'GND').ac).toBeCloseTo(277, 0)
    expect(voltageBetween(s, 'DC_P', 'DC_N').dc).toBe(648)
    expect(voltageBetween(s, 'DC_P', 'DC_N').ac).toBeLessThan(5)
    expect(voltageBetween(s, 'CTRL_H', 'CTRL_N').ac).toBe(120)
    expect(s.drive.display).toBe('EF2')
  })

  it('bus decays after the breaker opens; control power stays live until LP-2 is opened', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'breaker', closed: false })
    expect(voltageBetween(s, 'L1', 'L2').ac).toBe(0)
    expect(chargeLampOn(s)).toBe(true)
    expect(voltageBetween(s, 'CTRL_H', 'CTRL_N').ac).toBe(120)
    const later = run(s, { type: 'wait', minutes: 10 })
    expect(busVolts(later)).toBeLessThan(50)
    expect(chargeLampOn(later)).toBe(false)
    const off = run(later, { type: 'lp2', closed: false })
    expect(voltageBetween(off, 'CTRL_H', 'CTRL_N').ac).toBe(0)
  })
})

describe('PPE', () => {
  it('8 cal daily wear is not enough for 10.4 cal/cm²; 12 cal coverall with shield or 40 cal suit is', () => {
    const base = createElecSession(byId('term-fault'))
    const eight = run(base, ...(['hardhat', 'glasses', 'hearing', 'ar8', 'faceshield', 'gloves00', 'boots'] as const).map((id) => ({ type: 'ppe', id, on: true }) as Action))
    expect(ppeCheck(eight).adequate).toBe(false)
    expect(ppeCheck(eight).issues[0]).toContain('below')
    const twelve = run(base, ...FULL_PPE)
    expect(ppeCheck(twelve).adequate).toBe(true)
    const suit = run(base, ...(['hardhat', 'glasses', 'hearing', 'suit40', 'gloves00', 'boots'] as const).map((id) => ({ type: 'ppe', id, on: true }) as Action))
    expect(ppeCheck(suit).adequate).toBe(true)
    const leather = run(twelve, { type: 'ppe', id: 'gloves_leather', on: true })
    expect(ppeCheck(leather).adequate).toBe(false)
    expect(leather.ppe).not.toContain('gloves00')
    // any insulating class at or above the label's class passes for shock; only one pair at a time
    const class0 = run(twelve, { type: 'ppe', id: 'gloves0', on: true })
    expect(ppeCheck(class0).adequate).toBe(true)
    expect(class0.ppe.filter((p) => p.startsWith('gloves'))).toEqual(['gloves0'])
    const class4 = run(twelve, { type: 'ppe', id: 'gloves4', on: true }, { type: 'ppeConfirm' })
    expect(ppeCheck(class4).adequate).toBe(true)
    expect(class4.log.at(-1)?.text).toContain('over-rated')
  })

  it('confirming PPE against the label is logged and scored', () => {
    const base = createElecSession(byId('term-fault'))
    const bad = run(base, { type: 'ppe', id: 'ar8', on: true }, { type: 'ppeConfirm' })
    expect(bad.ppeConfirmed?.adequate).toBe(false)
    expect(bad.log.at(-1)?.kind).toBe('warn')
    const good = run(base, ...FULL_PPE)
    expect(good.ppeConfirmed?.adequate).toBe(true)
    expect(good.log.at(-1)?.text).toContain('12 cal/cm²')
    const unconfirmed = run(base, ...FULL_PPE.slice(0, -1), { type: 'readLabel' }, { type: 'finish' })
    expect(scoreElec(unconfirmed).lines[0].points).toBe(11)
    expect(scoreElec(run(base, ...FULL_PPE, { type: 'readLabel' }, { type: 'finish' })).lines[0].points).toBe(15)
  })

  it('any lockout action before a confirmed suit-up is a violation, even with the right gear on', () => {
    const bare = run(createElecSession(byId('term-fault')), { type: 'breaker', closed: false })
    expect(bare.violations.map((v) => v.id)).toContain('ppe_before_loto')
    expect(bare.mccClosed).toBe(false)
    const dressedNotConfirmed = run(createElecSession(byId('term-fault')), ...FULL_PPE.slice(0, -1), { type: 'lp2', closed: false })
    expect(dressedNotConfirmed.violations.map((v) => v.id)).toContain('ppe_before_loto')
    const suited = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'lp2', closed: false }, { type: 'lock', target: 'lp2', on: true }, { type: 'tag', target: 'lp2', on: true })
    expect(suited.violations).toEqual([])
    // taking the gloves off after confirming voids the suit-up
    const undone = run(suited, { type: 'ppe', id: 'gloves00', on: false }, { type: 'breaker', closed: false })
    expect(undone.violations.map((v) => v.id)).toContain('ppe_before_loto')
    expect(scoreElec(run(undone, { type: 'finish' })).lines[0].points).toBeLessThanOrEqual(10)
  })
})

describe('LOTO and verification', () => {
  it('cannot lock a closed breaker; try-step without a lock re-energizes', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'lock', target: 'mcc', on: true })
    expect(s.locks.mcc).toBe(false)
    const opened = run(s, { type: 'breaker', closed: false }, { type: 'tryStart' })
    expect(opened.mccClosed).toBe(true)
    expect(opened.violations.map((v) => v.id)).toContain('reenergized')
  })

  it('DC bus on an AC range reads near zero: a trap, flagged in scoring', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'breaker', closed: false }, { type: 'lp2', closed: false },
      { type: 'lock', target: 'mcc', on: true }, { type: 'lock', target: 'lp2', on: true },
      { type: 'goto', scene: 'drive' }, { type: 'door', open: true }, ...vac('DC_P', 'DC_N'))
    expect(s.deadTests.at(-1)?.mode).toBe('VAC')
    expect(voltageBetween(s, 'DC_P', 'DC_N').dc).toBeGreaterThan(600)
    const score = scoreElec(run(s, { type: 'finish' }))
    expect(score.penalties.some((p) => p.label.includes('AC volts only'))).toBe(true)
  })

  it('the textbook path reaches an electrically safe work condition with live-dead-live', () => {
    const s = toEswc(createElecSession(byId('term-fault')))
    expect(verifiedDead(s)).toBe(true)
    expect(eswc(s)).toBe(true)
    expect(s.violations).toEqual([])
    expect(s.leadsLifted).toBe(true)
  })

  it('at 480 V the TIC 300 PRO does not count as verification; the 789 does', () => {
    const s = run(createElecSession(byId('term-fault')),
      ...prework(), ...FULL_PPE,
      { type: 'breaker', closed: false }, { type: 'lp2', closed: false },
      { type: 'lock', target: 'mcc', on: true }, { type: 'tag', target: 'mcc', on: true },
      { type: 'lock', target: 'lp2', on: true }, { type: 'tag', target: 'lp2', on: true },
      { type: 'tryStart' }, { type: 'wait', minutes: 15 },
      { type: 'ticPower', on: true }, { type: 'ticSelfTest' }, { type: 'ticCheck', point: 'RECEPT_H' },
      { type: 'goto', scene: 'drive' }, { type: 'door', open: true },
      { type: 'ticCheck', point: 'L1' }, { type: 'ticCheck', point: 'L2' }, { type: 'ticCheck', point: 'L3' }, { type: 'ticCheck', point: 'CTRL_H' },
      ...vdc('DC_P', 'DC_N'),
      { type: 'goto', scene: 'mcc' }, { type: 'ticCheck', point: 'RECEPT_H' },
    )
    expect(s.proofs).toHaveLength(0)
    expect(verifiedDead(s)).toBe(false)
    expect(s.log.some((l) => l.text.includes('over 1,000 V'))).toBe(true)
    expect(s.violations).toEqual([])
    const done = run(s, ...vac('RECEPT_H', 'RECEPT_N'), { type: 'goto', scene: 'drive' },
      ...vac('L1', 'GND'), ...vac('L2', 'GND'), ...vac('L3', 'GND'), ...vac('CTRL_H', 'CTRL_N'),
      { type: 'goto', scene: 'mcc' }, ...vac('RECEPT_H', 'RECEPT_N'))
    expect(verifiedDead(done)).toBe(true)
    expect(eswc(done)).toBe(true)
  })

  it('TIC detects live AC on LOW, misses it on HIGH, and sees nothing on the DC bus', () => {
    const live = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'ticPower', on: true }, { type: 'ticSelfTest' }, { type: 'goto', scene: 'drive' }, { type: 'door', open: true }, { type: 'ticCheck', point: 'L1' })
    expect(live.tic.last?.detected).toBe(true)
    expect(live.deadTests).toHaveLength(0)
    const high = run(live, { type: 'ticRange', range: 'HIGH' }, { type: 'ticCheck', point: 'L2' })
    expect(high.tic.last?.detected).toBe(false)
    expect(high.deadTests).toHaveLength(0)
    const bus = run(live, { type: 'ticCheck', point: 'DC_P' })
    expect(bus.tic.last?.detected).toBe(false)
    expect(bus.tic.busChecked).toBe(true)
    expect(bus.deadTests).toHaveLength(0)
    const score = scoreElec(run(bus, { type: 'finish' }))
    expect(score.penalties.some((p) => p.label.includes('cannot see DC'))).toBe(true)
  })

  it('TIC checks on 480 V equipment record nothing and remind the technician of the rule once', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'breaker', closed: false }, { type: 'ticPower', on: true }, { type: 'goto', scene: 'drive' }, { type: 'door', open: true }, { type: 'ticCheck', point: 'L1' }, { type: 'ticCheck', point: 'L2' })
    expect(s.deadTests).toHaveLength(0)
    expect(s.log.filter((l) => l.text.includes('over 1,000 V'))).toHaveLength(1)
  })

  it('touching conductors before verification is a violation', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'breaker', closed: false }, { type: 'goto', scene: 'drive' }, { type: 'door', open: true }, { type: 'liftLeads', lifted: true })
    const ids = s.violations.map((v) => v.id)
    expect(ids).toContain('work_not_locked')
    expect(ids).toContain('bus_charged')
    expect(ids).toContain('ctrl_live_touch')
  })
})

describe('Megger S1-568 insulation testing', () => {
  it('is inhibited on a live circuit', () => {
    const s = run(createElecSession(byId('term-fault')), { type: 'goto', scene: 'drive' }, ...meg('L1', 'GND'))
    expect(s.insTests).toHaveLength(0)
    expect(s.megger.testing).toBe(false)
    expect(s.megger.inhibit).toContain('⚡')
    expect(s.log.some((l) => l.text.includes('inhibited'))).toBe(true)
  })

  it('megging into the drive output with 1M closed destroys the IGBTs', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'breaker', closed: false }, { type: 'wait', minutes: 15 },
      { type: 'goto', scene: 'drive' }, { type: 'door', open: true }, ...meg('C_T2', 'GND'))
    expect(s.drive.damaged).toBe(true)
    expect(s.violations.map((v) => v.id)).toContain('meg_into_drive')
  })

  it('with the wye point intact a winding fault shows on all three lifted leads', () => {
    const s = toEswc(createElecSession(byId('motor-winding')))
    for (const p of ['C_T1', 'C_T2', 'C_T3'] as const) expect(ir(s, p, 'GND').reading).toBe('0.30 MΩ')
    // phase to phase through the windings is continuity, not insulation
    expect(ir(s, 'C_T1', 'C_T2').reading).toBe('0.00 MΩ')
  })

  it('unbolting the feeders separates motor from cable; opening the wye point finds the winding', () => {
    const s0 = run(toEswc(createElecSession(byId('motor-winding'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true })
    expect(s0.violations).toEqual([])
    expect(ir(s0, 'CBL_2', 'FRAME').reading).toContain('OL')
    expect(ir(s0, 'T1', 'FRAME').reading).toBe('0.30 MΩ')
    const s1 = run(s0, { type: 'wye', open: true })
    expect(ir(s1, 'T1', 'FRAME').reading).toBe('140 MΩ')
    expect(ir(s1, 'T2', 'FRAME').reading).toBe('0.30 MΩ')
    expect(ir(s1, 'T5', 'FRAME').reading).toBe('0.30 MΩ')
    // winding to winding with the wye open is a real insulation reading
    expect(ir(s1, 'T1', 'T3').reading).toBe('300 MΩ')
  })

  it('termination fault: low at the cable lug until the lug is supported clear of the box', () => {
    const s0 = run(toEswc(createElecSession(byId('term-fault'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true })
    expect(s0.log.find((l) => l.kind === 'inspect' && l.text.includes('arc mark'))).toBeTruthy()
    expect(ir(s0, 'CBL_2', 'FRAME').reading).toBe('0.05 MΩ')
    // wye point intact: one bushing to frame reads all three windings in parallel
    expect(ir(s0, 'T2', 'FRAME').reading).toBe('47 MΩ')
    const s1 = run(s0, { type: 'clearLugs' })
    expect(ir(s1, 'CBL_2', 'FRAME').reading).toContain('OL')
  })

  it('cable fault: cable low from both ends, motor good', () => {
    const s0 = run(toEswc(createElecSession(byId('cable-fault'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'unboltFeeders', unbolted: true }, { type: 'clearLugs' })
    expect(ir(s0, 'CBL_2', 'FRAME').reading).toBe('0.02 MΩ')
    expect(ir(s0, 'T2', 'FRAME').reading).toBe('47 MΩ')
    const back = run(s0, { type: 'goto', scene: 'drive' })
    expect(ir(back, 'C_T2', 'GND').reading).toBe('0.02 MΩ')
    expect(ir(back, 'C_T1', 'GND').reading).toContain('OL')
  })

  it('a timed IR spot test records the one-minute value in the log and the test record', () => {
    const s = run(toEswc(createElecSession(byId('motor-winding'))), ...meg('C_T2', 'GND'))
    expect(s.insTests).toHaveLength(1)
    expect(s.insTests[0].reading).toBe('0.30 MΩ')
    expect(s.insTests[0].mode).toBe('IR')
    expect(s.megger.result?.seconds).toBe(60)
    expect(s.log.some((l) => l.text.includes('discharging'))).toBe(true)
  })

  it('DAR and PI: good insulation climbs, a faulted winding stays flat', () => {
    const good = run(toEswc(createElecSession(byId('term-fault'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'unboltFeeders', unbolted: true }, { type: 'clearLugs' },
      { type: 'meggerMode', mode: 'DAR' }, { type: 'meggerLead', lead: 'minus', point: 'T1' }, { type: 'meggerLead', lead: 'plus', point: 'FRAME' }, { type: 'meggerTest' })
    expect(good.megger.testing).toBe(true)
    const done = run(good, { type: 'wait', minutes: 1 })
    expect(done.megger.testing).toBe(false)
    expect(done.megger.result?.dar).toBeCloseTo(1.29, 1)
    const pi = run(done, { type: 'meggerMode', mode: 'PI' }, { type: 'meggerTest' }, { type: 'wait', minutes: 10 })
    expect(pi.megger.result?.pi).toBeCloseTo(1.98, 1)
    expect(pi.megger.result?.r).toBeGreaterThan(80)
    const bad = run(toEswc(createElecSession(byId('motor-winding'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'unboltFeeders', unbolted: true },
      { type: 'meggerMode', mode: 'DAR' }, { type: 'meggerLead', lead: 'minus', point: 'T2' }, { type: 'meggerLead', lead: 'plus', point: 'FRAME' }, { type: 'meggerTest' }, { type: 'wait', minutes: 1 })
    expect(bad.megger.result?.dar).toBe(1)
    expect(bad.megger.result?.reading).toBe('0.30 MΩ')
  })

  it('2.5 kV on a 460 V winding is flagged; reversed leads get a note, not a penalty', () => {
    const s = run(toEswc(createElecSession(byId('term-fault'))), { type: 'meggerVolts', volts: 2500 }, ...meg('C_T1', 'GND'))
    expect(s.violations.map((v) => v.id)).toContain('meg_high_volts')
    const rev = run(toEswc(createElecSession(byId('term-fault'))), ...meg('GND', 'C_T1'))
    expect(rev.violations.map((v) => v.id)).not.toContain('meg_polarity')
    expect(rev.log.some((l) => l.text.includes('leads reversed'))).toBe(true)
    expect(rev.insTests).toHaveLength(1)
  })

  it('250 V is flagged as too low for a 460 V motor', () => {
    const s = run(toEswc(createElecSession(byId('term-fault'))), { type: 'meggerVolts', volts: 250 }, ...meg('C_T2', 'GND'))
    expect(s.violations.map((v) => v.id)).toContain('meg_low_volts')
  })
})

describe('full work orders', () => {
  const finishers: Record<string, Action[]> = {
    'term-fault': [
      { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true },
      ...meg('CBL_2', 'FRAME'), ...meg('T2', 'FRAME'), { type: 'clearLugs' }, ...meg('CBL_2', 'FRAME'),
      { type: 'diagnose', id: 'termination_fault' }, { type: 'repair', id: 'remake_terminations' }, { type: 'repair', id: 'clean_dry_box' },
    ],
    'motor-winding': [
      { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true },
      ...meg('T1', 'FRAME'), ...meg('CBL_2', 'FRAME'), { type: 'wye', open: true }, ...meg('T1', 'FRAME'), ...meg('T2', 'FRAME'), ...meg('T3', 'FRAME'),
      { type: 'diagnose', id: 'motor_winding' }, { type: 'repair', id: 'replace_motor' },
    ],
    'cable-fault': [
      { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true }, { type: 'clearLugs' },
      ...meg('CBL_1', 'FRAME'), ...meg('CBL_2', 'FRAME'), ...meg('CBL_3', 'FRAME'), ...meg('T2', 'FRAME'),
      { type: 'diagnose', id: 'cable_fault' }, { type: 'repair', id: 'replace_cable' },
    ],
  }
  const restore: Action[] = [
    { type: 'cover', off: false }, { type: 'goto', scene: 'drive' }, { type: 'liftLeads', lifted: false }, { type: 'door', open: false },
    { type: 'goto', scene: 'mcc' }, { type: 'lock', target: 'lp2', on: false }, { type: 'tag', target: 'lp2', on: false }, { type: 'lp2', closed: true },
    { type: 'lock', target: 'mcc', on: false }, { type: 'tag', target: 'mcc', on: false }, { type: 'breaker', closed: true },
    { type: 'keypad', key: 'RESET' }, { type: 'keypad', key: 'RUN' }, { type: 'finish' },
  ]

  for (const sc of ELEC_SCENARIOS) {
    it(`${sc.id} scores 100 on the textbook path`, () => {
      const s = run(toEswc(createElecSession(sc)), ...meg('C_T1', 'GND'), ...meg('C_T2', 'GND'), ...meg('C_T3', 'GND'), ...finishers[sc.id], ...restore)
      expect(s.violations).toEqual([])
      expect(s.drive.running).toBe(true)
      const score = scoreElec(s)
      expect(score.penalties).toEqual([])
      expect(score.total).toBe(100)
    })
  }

  it('removing locks before reassembly and running with leads lifted are penalised', () => {
    const s = run(toEswc(createElecSession(byId('term-fault'))), { type: 'goto', scene: 'mcc' }, { type: 'lock', target: 'mcc', on: false }, { type: 'breaker', closed: true }, { type: 'keypad', key: 'RESET' }, { type: 'keypad', key: 'RUN' })
    const ids = s.violations.map((v) => v.id)
    expect(ids).toContain('locks_early')
    expect(ids).toContain('run_not_restored')
    expect(s.drive.display).toBe('EPHO')
  })
})
