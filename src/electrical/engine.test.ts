import { describe, expect, it } from 'vitest'
import {
  chargeLampOn, createElecSession, eswc, insulationTest, linkVolts, lockedOut, ppeCheck, reduceElec, relayLit, verifiedDead, voltageBetween, type Action, provedBeforeFor, provedAfterFor,
} from './engine'
import { scoreElec } from './score'
import { CHECKLIST, type ElecState, type Point } from './types'
import { ELEC_SCENARIOS } from './scenarios'

const byId = (id: string) => ELEC_SCENARIOS.find((s) => s.id === id)!
const run = (s: ElecState, ...acts: Action[]) => acts.reduce(reduceElec, s)

const wear = (ids: readonly string[]): Action[] => ids.map((id) => ({ type: 'ppe', id: id as never, on: true }))
const FULL_PPE: Action[] = [...wear(['hardhat', 'glasses', 'hearing', 'suit40', 'gloves2', 'boots']), { type: 'ppeConfirm' }]
const prework = (): Action[] => [{ type: 'readLabel' }, ...CHECKLIST.map((c) => ({ type: 'checklist', id: c.id }) as Action)]
const vac = (a: Point, b: Point): Action[] => [{ type: 'meterMode', mode: 'VAC' }, { type: 'probe', point: a }, { type: 'probe', point: b }]
const tic = (...pts: Point[]): Action[] => pts.map((p) => ({ type: 'ticCheck', point: p }) as Action)
/** Megger IR spot test at 2.5 kV: − on the conductor, + to earth, read at one minute. */
const meg = (a: Point, b: Point): Action[] => [
  { type: 'meggerMode', mode: 'IR' }, { type: 'meggerVolts', volts: 2500 }, { type: 'meggerLead', lead: 'minus', point: a }, { type: 'meggerLead', lead: 'plus', point: b },
  { type: 'meggerTest' }, { type: 'wait', minutes: 1 }, { type: 'meggerTest' },
]
const ir = (s: ElecState, a: Point, b: Point) => insulationTest(s, a, b, 2500)
const PLUG_V: Action[] = [{ type: 'meterJack', jack: 'COM', on: true }, { type: 'meterJack', jack: 'V', on: true }]
const LOCK_ALL: Action[] = (['mv', 'bypass', 'aux', 'ctrl'] as const).flatMap((t) => [{ type: 'lock', target: t, on: true } as Action, { type: 'tag', target: t, on: true } as Action])
const OPEN_ALL: Action[] = (['mv', 'bypass', 'aux', 'ctrl'] as const).map((t) => ({ type: 'switch', target: t, closed: false }) as Action)

/** The textbook path to an electrically safe work condition with the motor leads lifted in the M12 compartment. */
function toEswc(s: ElecState): ElecState {
  return run(s,
    ...prework(), ...FULL_PPE,
    // live: the TIC on LOW and the 789 by contact, both on the 120 V receptacle, before anything is opened
    { type: 'ticPower', on: true }, { type: 'ticSelfTest' }, { type: 'ticHotStick', on: true }, { type: 'ticRange', range: 'LOW' }, ...tic('RECEPT_H'),
    ...vac('RECEPT_H', 'RECEPT_N'),
    ...OPEN_ALL, ...LOCK_ALL, { type: 'tryStart' }, { type: 'wait', minutes: 15 },
    // low voltage checks with the 789
    { type: 'auxDoor', open: true }, ...vac('AUX_T1', 'AUX_G'), ...vac('AUX_T2', 'AUX_G'), ...vac('AUX_T3', 'AUX_G'), ...vac('CTRL_H', 'CTRL_N'),
    // dead: medium voltage checks with the TIC on HIGH, on the hot stick
    { type: 'goto', scene: 'compartment' }, { type: 'door', open: true }, { type: 'ticRange', range: 'HIGH' }, ...tic('BP_L1', 'BP_L2', 'BP_L3', 'VO_1', 'VO_2', 'VO_3', 'U', 'V', 'W'),
    // live again: both instruments back on the receptacle
    { type: 'goto', scene: 'room' }, { type: 'ticRange', range: 'LOW' }, ...tic('RECEPT_H'), ...vac('RECEPT_H', 'RECEPT_N'),
    { type: 'goto', scene: 'compartment' }, { type: 'liftLeads', lifted: true },
  )
}

describe('energy state', () => {
  it('starts with 4160 V on the bypass stabs, 480 V aux, 120 V control, cells charged and the relay tripped', () => {
    const s = createElecSession(byId('term-fault'))
    expect(voltageBetween(s, 'BP_L1', 'GND').ac).toBeCloseTo(2400, 0)
    expect(voltageBetween(s, 'BP_L1', 'BP_L2').ac).toBeCloseTo(4157, 0)
    expect(voltageBetween(s, 'AUX_T1', 'AUX_G').ac).toBeCloseTo(277, 0)
    expect(voltageBetween(s, 'CTRL_H', 'CTRL_N').ac).toBe(120)
    expect(voltageBetween(s, 'U', 'GND').ac).toBe(0)
    expect(linkVolts(s)).toBe(5600)
    expect(s.drive.display).toBe('GND FAULT')
    expect(relayLit(s)).toBe(true)
  })

  it('cells bleed down after the isolation switch opens; control power stays until LP-1 is opened', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'switch', target: 'mv', closed: false })
    expect(chargeLampOn(s)).toBe(true)
    expect(voltageBetween(s, 'BP_L1', 'GND').ac).toBeCloseTo(2400, 0)
    const later = run(s, { type: 'wait', minutes: 20 })
    expect(linkVolts(later)).toBeLessThan(50)
    expect(relayLit(later)).toBe(true)
    const off = run(later, { type: 'switch', target: 'ctrl', closed: false })
    expect(relayLit(off)).toBe(false)
  })
})

describe('PPE at 22.4 cal/cm² and 4160 V', () => {
  it('needs the 40 cal suit and class 2 gloves; 12 cal with a shield and class 1 fail', () => {
    const base = createElecSession(byId('term-fault'))
    const twelve = run(base, ...wear(['hardhat', 'glasses', 'hearing', 'ar12', 'faceshield', 'gloves2', 'boots']))
    expect(ppeCheck(twelve).adequate).toBe(false)
    expect(ppeCheck(twelve).issues[0]).toContain('below')
    const class1 = run(base, ...wear(['hardhat', 'glasses', 'hearing', 'suit40', 'gloves1', 'boots']))
    expect(ppeCheck(class1).adequate).toBe(false)
    expect(ppeCheck(class1).issues[0]).toContain('class 2')
    const good = run(base, ...FULL_PPE)
    expect(ppeCheck(good).adequate).toBe(true)
    expect(good.ppeConfirmed?.adequate).toBe(true)
    const class3 = run(base, ...wear(['hardhat', 'glasses', 'hearing', 'suit40', 'gloves3', 'boots']), { type: 'ppeConfirm' })
    expect(ppeCheck(class3).adequate).toBe(true)
    expect(class3.log.at(-1)?.text).toContain('over-rated')
  })

  it('any lockout action before a confirmed suit-up is a violation', () => {
    const bare = run(createElecSession(byId('term-fault')), { type: 'switch', target: 'mv', closed: false })
    expect(bare.violations.map((v) => v.id)).toContain('ppe_before_loto')
    const suited = run(createElecSession(byId('term-fault')), ...FULL_PPE, ...OPEN_ALL, ...LOCK_ALL)
    expect(suited.violations).toEqual([])
  })
})

describe('LOTO and verification', () => {
  it('cannot lock a closed switch; try-step without a lock re-energizes the drive', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'lock', target: 'mv', on: true })
    expect(s.locks.mv).toBe(false)
    const opened = run(s, { type: 'switch', target: 'mv', closed: false }, { type: 'tryStart' })
    expect(opened.closed.mv).toBe(true)
    expect(opened.violations.map((v) => v.id)).toContain('reenergized')
  })

  it('the 789 is refused on 4160 V conductors', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'goto', scene: 'compartment' }, { type: 'door', open: true }, ...vac('U', 'GND'))
    expect(s.violations.map((v) => v.id)).toContain('dmm_on_mv')
    expect(s.deadTests).toHaveLength(0)
  })

  it('TIC on LOW inside the MV compartment picks up the live bus; HIGH reads the conductor', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'ticPower', on: true }, { type: 'ticSelfTest' }, { type: 'ticHotStick', on: true }, { type: 'goto', scene: 'compartment' }, { type: 'door', open: true })
    const low = run(s, ...tic('U'))
    expect(low.tic.last?.detected).toBe(true)
    expect(low.deadTests).toHaveLength(0)
    expect(low.violations.map((v) => v.id)).toContain('tic_low_range_mv')
    const high = run(s, { type: 'ticRange', range: 'HIGH' }, ...tic('U'))
    expect(high.tic.last?.detected).toBe(false)
    expect(high.deadTests).toHaveLength(1)
    const bus = run(s, { type: 'ticRange', range: 'HIGH' }, ...tic('BP_L1'))
    expect(bus.tic.last?.detected).toBe(true)
    expect(bus.proofs).toHaveLength(0)
  })

  it('live-dead-live with the TIC: receptacle on LOW lights and proves, HIGH on the receptacle does not, hand-held at MV is a violation', () => {
    const on = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'ticPower', on: true }, { type: 'ticSelfTest' })
    const high = run(on, { type: 'ticRange', range: 'HIGH' }, ...tic('RECEPT_H'))
    expect(high.tic.last?.detected).toBe(false)
    expect(high.proofs).toHaveLength(0)
    const low = run(on, { type: 'ticRange', range: 'LOW' }, ...tic('RECEPT_H'))
    expect(low.tic.last?.detected).toBe(true)
    expect(low.proofs).toEqual([{ t: low.t, n: low.tests, instrument: 'tic' }])
    const handHeld = run(low, { type: 'goto', scene: 'compartment' }, { type: 'door', open: true }, { type: 'ticRange', range: 'HIGH' }, ...tic('U'))
    expect(handHeld.violations.map((v) => v.id)).toContain('tic_no_hotstick')
    const stick = run(low, { type: 'ticHotStick', on: true }, { type: 'goto', scene: 'compartment' }, { type: 'door', open: true }, { type: 'ticRange', range: 'HIGH' }, ...tic('U'))
    expect(stick.violations.map((v) => v.id)).not.toContain('tic_no_hotstick')
    expect(stick.deadTests).toHaveLength(1)
    expect(provedBeforeFor(stick, 'tic')).toBe(true)
    expect(provedAfterFor(stick, 'tic')).toBe(false)
    const again = run(stick, { type: 'goto', scene: 'room' }, { type: 'ticRange', range: 'LOW' }, ...tic('RECEPT_H'))
    expect(provedAfterFor(again, 'tic')).toBe(true)
  })

  it('TIC on a 480 V point records nothing and states the rule once', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'ticPower', on: true }, { type: 'switch', target: 'aux', closed: false }, { type: 'auxDoor', open: true }, ...tic('AUX_T1', 'AUX_T2'))
    expect(s.deadTests).toHaveLength(0)
    expect(s.log.filter((l) => l.text.includes('over 1,000 V'))).toHaveLength(1)
  })

  it('bucket 3B door interlock: no door with the handle ON, no handle ON with the door open', () => {
    const shut = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'auxDoor', open: true })
    expect(shut.auxDoorOpen).toBe(false)
    expect(shut.log.at(-1)?.text).toContain('interlock')
    const open = run(shut, { type: 'switch', target: 'aux', closed: false }, { type: 'auxDoor', open: true })
    expect(open.auxDoorOpen).toBe(true)
    const stillOff = run(open, { type: 'switch', target: 'aux', closed: true })
    expect(stillOff.closed.aux).toBe(false)
    expect(stillOff.log.at(-1)?.text).toContain('interlock')
    expect(run(open, { type: 'auxDoor', open: false }, { type: 'switch', target: 'aux', closed: true }).closed.aux).toBe(true)
  })

  it('the textbook path reaches an electrically safe work condition with both instruments proved', () => {
    const s = toEswc(createElecSession(byId('term-fault')))
    expect(lockedOut(s)).toBe(true)
    expect(verifiedDead(s)).toBe(true)
    expect(eswc(s)).toBe(true)
    expect(s.violations).toEqual([])
    expect(s.leadsLifted).toBe(true)
  })

  it('hands on conductors before verification is a violation', () => {
    const s = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'switch', target: 'mv', closed: false }, { type: 'goto', scene: 'compartment' }, { type: 'door', open: true }, { type: 'liftLeads', lifted: true })
    const ids = s.violations.map((v) => v.id)
    expect(ids).toContain('work_not_locked')
    expect(ids).toContain('cells_charged')
    expect(ids).toContain('ctrl_live_touch')
  })
})

describe('Megger S1-568 at 2.5 kV', () => {
  it('500 V is too low for a 4160 V winding; 2.5 kV and 5 kV are accepted', () => {
    const base = toEswc(createElecSession(byId('term-fault')))
    const low = run(base, { type: 'meggerMode', mode: 'IR' }, { type: 'meggerVolts', volts: 500 }, { type: 'meggerLead', lead: 'minus', point: 'U' }, { type: 'meggerLead', lead: 'plus', point: 'GND' }, { type: 'meggerTest' }, { type: 'wait', minutes: 1 }, { type: 'meggerTest' })
    expect(low.violations.map((v) => v.id)).toContain('meg_low_volts')
    const five = run(base, { type: 'meggerMode', mode: 'IR' }, { type: 'meggerVolts', volts: 5000 }, { type: 'meggerLead', lead: 'minus', point: 'U' }, { type: 'meggerLead', lead: 'plus', point: 'GND' }, { type: 'meggerTest' }, { type: 'wait', minutes: 1 }, { type: 'meggerTest' })
    expect(five.violations).toEqual([])
  })

  it('megging the VFD output terminations destroys cells; a live bypass stab inhibits the test', () => {
    const s = run(toEswc(createElecSession(byId('term-fault'))), ...meg('VO_1', 'GND'))
    expect(s.drive.damaged).toBe(true)
    expect(s.violations.map((v) => v.id)).toContain('meg_into_drive')
    const live = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'goto', scene: 'compartment' }, { type: 'door', open: true }, ...meg('BP_L1', 'GND'))
    expect(live.insTests).toHaveLength(0)
    expect(live.megger.inhibit).toContain('⚡')
  })

  it('with the wye point intact a winding fault shows on all three lifted leads', () => {
    const s = toEswc(createElecSession(byId('motor-winding')))
    for (const p of ['U', 'V', 'W'] as const) expect(ir(s, p, 'GND').reading).toBe('0.30 MΩ')
    expect(ir(s, 'U', 'V').reading).toBe('0.00 MΩ')
  })

  it('unbolting the feeders separates motor from cable; the wye point finds the winding', () => {
    const s0 = run(toEswc(createElecSession(byId('motor-winding'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true })
    expect(s0.violations).toEqual([])
    expect(ir(s0, 'CBL_2', 'FRAME').reading).toContain('OL')
    expect(ir(s0, 'T1', 'FRAME').reading).toBe('0.30 MΩ')
    const s1 = run(s0, { type: 'wye', open: true })
    expect(ir(s1, 'T1', 'FRAME').reading).toBe('2.40 GΩ')
    expect(ir(s1, 'T2', 'FRAME').reading).toBe('0.30 MΩ')
    expect(ir(s1, 'T5', 'FRAME').reading).toBe('0.30 MΩ')
    expect(ir(s1, 'T1', 'T3').reading).toBe('5.10 GΩ')
  })

  it('termination fault: low at the feeder termination until it is supported clear of the box', () => {
    const s0 = run(toEswc(createElecSession(byId('term-fault'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'inspectBox' }, { type: 'unboltFeeders', unbolted: true })
    expect(s0.log.find((l) => l.kind === 'inspect' && l.text.includes('carbon track'))).toBeTruthy()
    expect(ir(s0, 'CBL_2', 'FRAME').reading).toBe('0.05 MΩ')
    expect(ir(s0, 'T2', 'FRAME').reading).toBe('792 MΩ')
    const s1 = run(s0, { type: 'clearLugs' })
    expect(ir(s1, 'CBL_2', 'FRAME').reading).toContain('OL')
  })

  it('DAR and PI: form-wound insulation climbs, a faulted winding stays flat', () => {
    const good = run(toEswc(createElecSession(byId('term-fault'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'unboltFeeders', unbolted: true }, { type: 'clearLugs' },
      { type: 'meggerMode', mode: 'PI' }, { type: 'meggerVolts', volts: 2500 }, { type: 'meggerLead', lead: 'minus', point: 'T1' }, { type: 'meggerLead', lead: 'plus', point: 'FRAME' }, { type: 'meggerTest' }, { type: 'wait', minutes: 10 })
    expect(good.megger.result?.pi).toBeCloseTo(1.98, 1)
    const bad = run(toEswc(createElecSession(byId('motor-winding'))), { type: 'goto', scene: 'motor' }, { type: 'cover', off: true }, { type: 'unboltFeeders', unbolted: true },
      { type: 'meggerMode', mode: 'DAR' }, { type: 'meggerVolts', volts: 2500 }, { type: 'meggerLead', lead: 'minus', point: 'T2' }, { type: 'meggerLead', lead: 'plus', point: 'FRAME' }, { type: 'meggerTest' }, { type: 'wait', minutes: 1 })
    expect(bad.megger.result?.dar).toBe(1)
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
    { type: 'cover', off: false }, { type: 'goto', scene: 'compartment' }, { type: 'liftLeads', lifted: false }, { type: 'door', open: false },
    { type: 'goto', scene: 'room' }, { type: 'auxDoor', open: false },
    ...(['ctrl', 'aux', 'bypass', 'mv'] as const).flatMap((t) => [{ type: 'lock', target: t, on: false } as Action, { type: 'tag', target: t, on: false } as Action, { type: 'switch', target: t, closed: true } as Action]),
    { type: 'relay', key: 'RESET' }, { type: 'relay', key: 'START' }, { type: 'finish' },
  ]

  for (const sc of ELEC_SCENARIOS) {
    it(`${sc.id} scores 100 on the textbook path`, () => {
      const s = run(toEswc(createElecSession(sc)), ...meg('U', 'GND'), ...meg('V', 'GND'), ...meg('W', 'GND'), ...finishers[sc.id], ...restore)
      expect(s.violations).toEqual([])
      expect(s.drive.running).toBe(true)
      const score = scoreElec(s)
      expect(score.penalties).toEqual([])
      expect(score.total).toBe(100)
    })
  }

  it('removing locks before reassembly and starting with leads lifted are penalised', () => {
    const s = run(toEswc(createElecSession(byId('term-fault'))), { type: 'goto', scene: 'room' },
      ...(['ctrl', 'aux', 'bypass', 'mv'] as const).flatMap((t) => [{ type: 'lock', target: t, on: false } as Action, { type: 'switch', target: t, closed: true } as Action]),
      { type: 'relay', key: 'RESET' }, { type: 'relay', key: 'START' })
    const ids = s.violations.map((v) => v.id)
    expect(ids).toContain('locks_early')
    expect(ids).toContain('run_not_restored')
    expect(s.drive.display).toBe('OPEN CIRCUIT')
  })

  describe('dragged leads', () => {
    it('a dragged 789 lead needs both leads plugged in and the red lead in the jack the position uses', () => {
      const base = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'meterMode', mode: 'VAC' })
      const unplugged = run(base, { type: 'probe', point: 'RECEPT_H', lead: 'red' })
      expect(unplugged.meter.probeA).toBeNull()
      expect(unplugged.log.at(-1)?.text).toContain('Plug both leads')
      const wrong = run(base, { type: 'meterJack', jack: 'COM', on: true }, { type: 'meterJack', jack: 'mA', on: true }, { type: 'probe', point: 'RECEPT_H', lead: 'red' })
      expect(wrong.meter.probeA).toBeNull()
      expect(wrong.log.at(-1)?.text).toContain('LEAd')
      const ok = run(base, ...PLUG_V, { type: 'probe', point: 'RECEPT_H', lead: 'red' }, { type: 'probe', point: 'RECEPT_N', lead: 'black' })
      expect(ok.proofs).toHaveLength(1)
      const lifted = run(ok, { type: 'meterLift', lead: 'black' })
      expect(lifted.meter.probeA).toBe('RECEPT_H')
      expect(lifted.meter.probeB).toBeNull()
    })

    it('a dragged Megger lead must be connected at the terminal first', () => {
      const base = run(createElecSession(byId('term-fault')), ...FULL_PPE, { type: 'goto', scene: 'compartment' }, { type: 'door', open: true }, { type: 'meggerMode', mode: 'IR' })
      const loose = run(base, { type: 'meggerLead', lead: 'minus', point: 'U', drag: true })
      expect(loose.megger.minus).toBeNull()
      expect(loose.log.at(-1)?.text).toContain('Connect the − lead')
      const on = run(base, { type: 'meggerJack', term: 'minus', on: true }, { type: 'meggerLead', lead: 'minus', point: 'U', drag: true })
      expect(on.megger.minus).toBe('U')
      expect(run(on, { type: 'meggerLift', lead: 'minus' }).megger.minus).toBeNull()
    })
  })
})
