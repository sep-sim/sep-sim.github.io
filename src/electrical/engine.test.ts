import { describe, expect, it } from 'vitest'
import {
  busVolts, chargeLampOn, createElecSession, eswc, insulationTest, ppeCheck, reduceElec, verifiedDead, voltageBetween, type Action,
} from './engine'
import { scoreElec } from './score'
import { CHECKLIST, type ElecState, type Point } from './types'
import { ELEC_SCENARIOS } from './scenarios'

const byId = (id: string) => ELEC_SCENARIOS.find((s) => s.id === id)!
const run = (s: ElecState, ...acts: Action[]) => acts.reduce(reduceElec, s)

const FULL_PPE: Action[] = (['hardhat', 'glasses', 'hearing', 'ar12', 'faceshield', 'gloves00', 'boots'] as const).map((id) => ({ type: 'ppe', id, on: true }))
const prework = (): Action[] => [{ type: 'readLabel' }, ...CHECKLIST.map((c) => ({ type: 'checklist', id: c.id }) as Action)]
const vac = (a: Point, b: Point): Action[] => [{ type: 'meterMode', mode: 'VAC' }, { type: 'probe', point: a }, { type: 'probe', point: b }]
const vdc = (a: Point, b: Point): Action[] => [{ type: 'meterMode', mode: 'VDC' }, { type: 'probe', point: a }, { type: 'probe', point: b }]
const meg = (a: Point, b: Point): Action[] => [{ type: 'meterMode', mode: 'INS' }, { type: 'probe', point: a }, { type: 'probe', point: b }, { type: 'insTest' }]

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
  })

  it('operating the breaker without PPE is a violation', () => {
    const s = run(createElecSession(byId('term-fault')), { type: 'breaker', closed: false })
    expect(s.violations.map((v) => v.id)).toContain('ppe_breaker')
    expect(s.mccClosed).toBe(false)
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

  it('touching conductors before verification is a violation', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'breaker', closed: false }, { type: 'goto', scene: 'drive' }, { type: 'door', open: true }, { type: 'liftLeads', lifted: true })
    const ids = s.violations.map((v) => v.id)
    expect(ids).toContain('work_not_locked')
    expect(ids).toContain('bus_charged')
    expect(ids).toContain('ctrl_live_touch')
  })
})

describe('insulation testing', () => {
  it('is inhibited on a live circuit', () => {
    const s = run(createElecSession(byId('term-fault')), { type: 'goto', scene: 'drive' }, ...meg('L1', 'GND'))
    expect(s.insTests).toHaveLength(0)
    expect(s.log.at(-1)?.text).toContain('inhibited')
  })

  it('megging into the drive output with 1M closed destroys the IGBTs', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'breaker', closed: false }, { type: 'wait', minutes: 15 },
      { type: 'goto', scene: 'drive' }, { type: 'door', open: true }, ...meg('C_T2', 'GND'))
    expect(s.drive.damaged).toBe(true)
    expect(s.violations.map((v) => v.id)).toContain('meg_into_drive')
  })

  it('with the wye point intact a winding fault shows on all three lifted leads', () => {
    const s = toEswc(createElecSession(byId('motor-winding')))
    for (const p of ['C_T1', 'C_T2', 'C_T3'] as const) {
      const r = insulationTest({ ...s, meter: { ...s.meter, mode: 'INS', probeA: p, probeB: 'GND' } })
      expect(r.reading).toBe('0.30 MΩ')
    }
    // phase to phase through the windings is continuity, not insulation
    const pp = insulationTest({ ...s, meter: { ...s.meter, mode: 'INS', probeA: 'C_T1', probeB: 'C_T2' } })
    expect(pp.reading).toBe('0.00 MΩ')
  })

  it('unbolting the feeders separates motor from cable; opening the wye point finds the winding', () => {
    const s0 = run(toEswc(createElecSession(byId('motor-winding'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true })
    expect(s0.violations).toEqual([])
    const cable = insulationTest({ ...s0, meter: { ...s0.meter, mode: 'INS', probeA: 'CBL_2', probeB: 'FRAME' } })
    expect(cable.reading).toContain('OL')
    const motorAll = insulationTest({ ...s0, meter: { ...s0.meter, mode: 'INS', probeA: 'T1', probeB: 'FRAME' } })
    expect(motorAll.reading).toBe('0.30 MΩ')
    const s1 = run(s0, { type: 'wye', open: true })
    expect(insulationTest({ ...s1, meter: { ...s1.meter, mode: 'INS', probeA: 'T1', probeB: 'FRAME' } }).reading).toBe('140 MΩ')
    expect(insulationTest({ ...s1, meter: { ...s1.meter, mode: 'INS', probeA: 'T2', probeB: 'FRAME' } }).reading).toBe('0.30 MΩ')
    expect(insulationTest({ ...s1, meter: { ...s1.meter, mode: 'INS', probeA: 'T5', probeB: 'FRAME' } }).reading).toBe('0.30 MΩ')
    // winding to winding with the wye open is a real insulation reading
    expect(insulationTest({ ...s1, meter: { ...s1.meter, mode: 'INS', probeA: 'T1', probeB: 'T3' } }).reading).toBe('300 MΩ')
  })

  it('termination fault: low at the cable lug until the lug is supported clear of the box', () => {
    const s0 = run(toEswc(createElecSession(byId('term-fault'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true })
    expect(s0.log.find((l) => l.kind === 'inspect' && l.text.includes('arc mark'))).toBeTruthy()
    expect(insulationTest({ ...s0, meter: { ...s0.meter, mode: 'INS', probeA: 'CBL_2', probeB: 'FRAME' } }).reading).toBe('0.05 MΩ')
    // wye point intact: one bushing to frame reads all three windings in parallel
    expect(insulationTest({ ...s0, meter: { ...s0.meter, mode: 'INS', probeA: 'T2', probeB: 'FRAME' } }).reading).toBe('47 MΩ')
    const s1 = run(s0, { type: 'clearLugs' })
    expect(insulationTest({ ...s1, meter: { ...s1.meter, mode: 'INS', probeA: 'CBL_2', probeB: 'FRAME' } }).reading).toContain('OL')
  })

  it('cable fault: cable low from both ends, motor good', () => {
    const s0 = run(toEswc(createElecSession(byId('cable-fault'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'unboltFeeders', unbolted: true }, { type: 'clearLugs' })
    expect(insulationTest({ ...s0, meter: { ...s0.meter, mode: 'INS', probeA: 'CBL_2', probeB: 'FRAME' } }).reading).toBe('0.02 MΩ')
    expect(insulationTest({ ...s0, meter: { ...s0.meter, mode: 'INS', probeA: 'T2', probeB: 'FRAME' } }).reading).toBe('47 MΩ')
    const back = run(s0, { type: 'goto', scene: 'drive' })
    expect(insulationTest({ ...back, meter: { ...back.meter, mode: 'INS', probeA: 'C_T2', probeB: 'GND' } }).reading).toBe('0.02 MΩ')
    expect(insulationTest({ ...back, meter: { ...back.meter, mode: 'INS', probeA: 'C_T1', probeB: 'GND' } }).reading).toContain('OL')
  })

  it('250 V is flagged as too low for a 460 V motor', () => {
    const s = run(toEswc(createElecSession(byId('term-fault'))), { type: 'meterVolts', volts: 250 }, ...meg('C_T2', 'GND'))
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
