import { describe, expect, it } from 'vitest'
import { createSession, reduce, type Action } from './session'
import { loopInService, resistanceBetween, solveLoop } from './loop'
import { meterReading } from './meter'
import { scoreSession } from './score'
import { PREWORK_CHECKLIST, type SessionState } from './types'
import { SCENARIOS } from '../scenarios'

function run(s: SessionState, ...actions: Action[]): SessionState {
  return actions.reduce(reduce, s)
}

function byId(id: string) {
  const s = SCENARIOS.find((x) => x.id === id)
  if (!s) throw new Error(`no scenario ${id}`)
  return s
}

const prework = (): Action[] => PREWORK_CHECKLIST.map((c) => ({ type: 'checklist', id: c.id }) as Action)
const reading = (s: SessionState) => meterReading(s, solveLoop(s))

describe('loop solver', () => {
  it('healthy loop tracks line pressure at the HMI', () => {
    const s = createSession(byId('jb-loose'))
    const healthy = { ...s, faults: [] }
    const sol = solveLoop(healthy)
    expect(sol.current).toBeGreaterThan(13)
    expect(sol.current).toBeLessThan(15)
    expect(sol.node.XMTR_PLUS - sol.node.XMTR_MINUS).toBeGreaterThan(18)
    expect(loopInService(healthy)).toBe(true)
  })

  it('loose JB (+) termination: 0 V across transmitter, 24 V across the bad joint', () => {
    const sol = solveLoop(createSession(byId('jb-loose')))
    expect(sol.current).toBe(0)
    expect(sol.node.XMTR_PLUS - sol.node.XMTR_MINUS).toBe(0)
    expect(sol.node.JB_1 - sol.node.XMTR_PLUS).toBe(24)
  })

  it('open (−) conductor: 0 V across the idle transmitter, full supply across the open', () => {
    const sol = solveLoop(createSession(byId('cable-open')))
    expect(sol.current).toBe(0)
    expect(sol.node.XMTR_PLUS - sol.node.XMTR_MINUS).toBe(0)
    expect(sol.node.JB_2 - sol.node.TB_2).toBe(24)
    expect(sol.node.TB_1 - sol.node.TB_2).toBe(24)
  })

  it('blown fuse: supply present at PS-1, nothing past F1', () => {
    const sol = solveLoop(createSession(byId('fuse')))
    expect(sol.node.PS_PLUS - sol.node.PS_MINUS).toBe(24)
    expect(sol.node.F1_OUT).toBe(0)
    expect(sol.node.TB_1 - sol.node.TB_2).toBe(0)
  })

  it('reversed polarity reads negative across the transmitter and HART cannot talk', () => {
    const s = run(createSession(byId('reversed')), { type: 'hartConnect' })
    const sol = solveLoop(s)
    expect(sol.node.XMTR_PLUS - sol.node.XMTR_MINUS).toBe(-24)
    expect(sol.hartReachable).toBe(false)
  })

  it('failed-high transmitter drives 21.6 mA and the HMI goes BAD over-range', () => {
    const s = createSession(byId('xmtr-high'))
    expect(solveLoop(s).current).toBe(21.6)
    expect(s.hmiHistory.at(-1)?.quality).toBe('BAD – OVER RANGE')
  })

  it('resistance: OL across an open conductor, ~4 Ω across a good one (dead loop)', () => {
    const s = run(createSession(byId('cable-open')), { type: 'fuse', pulled: true })
    expect(resistanceBetween(s, 'JB_2', 'TB_2')).toBe('OL')
    expect(resistanceBetween(s, 'TB_1', 'JB_1')).toBe('4.2 Ω')
  })
})

describe('Fluke 789', () => {
  it('V DC across the bad JB joint reads the supply', () => {
    const s = run(createSession(byId('jb-loose')), { type: 'meterMode', mode: 'VDC' }, { type: 'probe', node: 'JB_1' }, { type: 'probe', node: 'XMTR_PLUS' })
    expect(reading(s).primary).toBe('24.00')
    expect(s.measurements).toBe(1)
    expect(s.log.at(-1)?.text).toContain('24.00 V DC')
  })

  it('ohms on a live circuit is OL, logged as a warning and penalised', () => {
    const s = run(createSession(byId('jb-loose')), { type: 'meterMode', mode: 'OHM' }, { type: 'probe', node: 'TB_1' }, { type: 'probe', node: 'JB_1' })
    expect(reading(s).primary).toBe('OL')
    expect(s.ohmsOnLive).toBe(1)
    expect(s.log.at(-1)?.kind).toBe('warn')
    // Downstream of a blown fuse the field side is dead, so an ohms check there is legitimate.
    const dead = run(createSession(byId('fuse')), { type: 'meterMode', mode: 'OHM' }, { type: 'probe', node: 'TB_1' }, { type: 'probe', node: 'JB_1' })
    expect(dead.ohmsOnLive).toBe(0)
    expect(reading(dead).primary).toBe('4.2')
    expect(reading(dead).beep).toBe(true)
  })

  it('mA in series reads loop current; TEST terminals do not break the loop', () => {
    const s = run(createSession(byId('range')), { type: 'meterMode', mode: 'mA' }, { type: 'probe', node: 'XMTR_TEST' })
    expect(Number(reading(s).primary)).toBeGreaterThan(8)
    expect(Number(reading(s).primary)).toBeLessThan(10)
    expect(s.log.at(-1)?.text).toContain('TEST terminals')
  })

  it('LOOP POWER across a lifted transmitter reads its output even with the fuse blown', () => {
    const s = run(createSession(byId('fuse')),
      { type: 'meterMode', mode: 'mA' }, { type: 'meterKey', key: 'LOOP_POWER' },
      { type: 'probe', node: 'XMTR_PLUS' }, { type: 'probe', node: 'XMTR_MINUS' })
    const sol = solveLoop(s)
    expect(sol.meterCurrent).toBeGreaterThan(13)
    expect(sol.current).toBe(0)
    expect(Number(reading(s).primary)).toBeCloseTo(sol.meterCurrent, 1)
    // Trex needs the 789's 250 Ω to talk while the meter powers the device.
    const noR = run(s, { type: 'hartConnect' })
    expect(solveLoop(noR).hartReachable).toBe(false)
    expect(solveLoop(noR).hartBlocked).toContain('250')
    const withR = run(noR, { type: 'meterKey', key: 'HART_250' }, { type: 'hartRead' })
    expect(solveLoop(withR).hartReachable).toBe(true)
    expect(withR.hart.screen?.tag).toBe('PT-101')
  })

  it('SIMULATE in the transmitter\'s place drives the HMI; loop is not in service while it does', () => {
    const base = { ...createSession(byId('jb-loose')), faults: [] } as SessionState
    const s = run(base, { type: 'meterMode', mode: 'SIM' }, { type: 'meterKey', key: 'HUNDRED' },
      { type: 'probe', node: 'XMTR_PLUS' }, { type: 'probe', node: 'XMTR_MINUS' }, { type: 'tick' })
    expect(solveLoop(s).current).toBe(20)
    expect(s.hmiHistory.at(-1)?.eu).toBeCloseTo(500, 5)
    expect(loopInService(s)).toBe(false)
    const lifted = run(s, { type: 'meterClear' })
    expect(loopInService(lifted)).toBe(true)
  })

  it('SOURCE into the RTU input works only with F1 pulled; into a live loop it is penalised', () => {
    const s0 = run(createSession(byId('cable-open')), { type: 'meterMode', mode: 'SOURCE' }, { type: 'meterKey', key: 'STEP' }, { type: 'meterKey', key: 'STEP' })
    expect(s0.meter.outMa).toBe(12)
    const live = run(s0, { type: 'probe', node: 'AI_PLUS' }, { type: 'probe', node: 'AI_MINUS' })
    expect(live.sourceIntoLive).toBe(1)
    expect(reading(live).primary).toBe('OL')
    const dead = run(live, { type: 'fuse', pulled: true }, { type: 'tick' })
    expect(solveLoop(dead).aiCurrent).toBe(12)
    expect(dead.hmiHistory.at(-1)?.eu).toBeCloseTo(250, 5)
    expect(scoreSession(live).penalties.some((p) => p.label.includes('Sourced'))).toBe(true)
  })

  it('ramp advances the output on tick and turns around at 20 mA', () => {
    let s = run(createSession(byId('range')), { type: 'meterMode', mode: 'SOURCE' }, { type: 'meterKey', key: 'RAMP' })
    expect(s.meter.ramp).toBe('slow')
    for (let i = 0; i < 45; i++) s = reduce(s, { type: 'tick' })
    expect(s.meter.outMa).toBeLessThan(20)
    expect(s.meter.rampDir).toBe(-1)
  })

  it('HOLD freezes the display', () => {
    const s = run(createSession(byId('jb-loose')), { type: 'meterMode', mode: 'VDC' }, { type: 'probe', node: 'TB_1' }, { type: 'probe', node: 'TB_2' }, { type: 'meterKey', key: 'HOLD' })
    expect(s.meter.held).toBe('24.00 V DC')
  })
})

describe('Trex', () => {
  it('loop power lets the communicator reach a device on a dead loop', () => {
    const s = run(createSession(byId('fuse')), { type: 'hartConnect' })
    expect(solveLoop(s).hartReachable).toBe(false)
    const lp = run(s, { type: 'hartLoopPower', on: true }, { type: 'hartRead' })
    expect(solveLoop(lp).hartReachable).toBe(true)
  })

  it('apply values sets the range from a pumped pressure', () => {
    const s = run(createSession(byId('range')), { type: 'valve', open: false }, { type: 'pump', psi: 500 }, { type: 'hartConnect' }, { type: 'hartApply', which: 'urv' })
    expect(s.xmtr.urv).toBe(500)
  })

  it('zero trim is refused with pressure on the sensor', () => {
    const s = run(createSession(byId('range')), { type: 'hartConnect' }, { type: 'hartZeroTrim' })
    expect(s.log.at(-1)?.kind).toBe('warn')
  })
})

describe('scenarios can each be solved to a perfect score', () => {
  const solutions: Record<string, Action[]> = {
    'jb-loose': [{ type: 'diagnose', id: 'loose_jb' }, { type: 'repair', id: 're_terminate_jb' }],
    fuse: [{ type: 'diagnose', id: 'blown_fuse' }, { type: 'repair', id: 'replace_fuse' }],
    'cable-open': [{ type: 'diagnose', id: 'open_cable_minus' }, { type: 'repair', id: 'replace_cable_pair' }],
    'xmtr-high': [
      { type: 'diagnose', id: 'xmtr_fail_high' },
      { type: 'repair', id: 'replace_transmitter' },
      { type: 'hartConnect' },
      { type: 'hartSetRange', lrv: 0, urv: 500 },
      { type: 'hartDisconnect' },
    ],
    range: [
      { type: 'diagnose', id: 'range_mismatch' },
      { type: 'hartConnect' },
      { type: 'hartSetRange', lrv: 0, urv: 500 },
      { type: 'hartDisconnect' },
    ],
    isolation: [{ type: 'diagnose', id: 'isolation_closed' }, { type: 'valve', open: true }],
    plugged: [{ type: 'diagnose', id: 'impulse_plugged' }, { type: 'repair', id: 'blowdown_impulse' }],
    reversed: [{ type: 'diagnose', id: 'reversed_polarity' }, { type: 'repair', id: 'correct_polarity' }],
  }

  for (const sc of SCENARIOS) {
    it(sc.id, () => {
      const start = createSession(sc)
      expect(loopInService(start)).toBe(false)
      const done = run(start, ...prework(), ...solutions[sc.id], { type: 'finish' })
      expect(loopInService(done)).toBe(true)
      const score = scoreSession(done)
      expect(score.total).toBe(100)
    })
  }

  it('a replaced transmitter left at factory range is not in service', () => {
    const s = run(createSession(byId('xmtr-high')), { type: 'repair', id: 'replace_transmitter' })
    expect(s.xmtr.urv).toBe(1000)
    expect(loopInService(s)).toBe(false)
  })

  it('a wrong repair and skipped pre-work cost points', () => {
    const s = run(
      createSession(byId('fuse')),
      { type: 'repair', id: 'replace_transmitter' },
      { type: 'repair', id: 'replace_fuse' },
      { type: 'hartConnect' },
      { type: 'hartSetRange', lrv: 0, urv: 500 },
      { type: 'hartDisconnect' },
      { type: 'diagnose', id: 'blown_fuse' },
      { type: 'finish' },
    )
    const score = scoreSession(s)
    expect(score.lines[0].points).toBe(0)
    expect(score.lines[3].points).toBe(15)
    expect(score.penalties.some((p) => p.label.includes('notifying'))).toBe(true)
  })

  it('pump with isolation open is refused and penalised; with isolation closed it drives the transmitter', () => {
    const s0 = createSession(byId('range'))
    const bad = run(s0, { type: 'pump', psi: 250 })
    expect(bad.pumpPressure).toBeNull()
    expect(bad.pumpWithIsolationOpen).toBe(1)
    const good = run(s0, { type: 'valve', open: false }, { type: 'pump', psi: 250 })
    const sol = solveLoop(good)
    expect(sol.pressureSeen).toBe(250)
    // device ranged 0–1000, so 250 psig → 8 mA, and the HMI (0–500) shows 125
    expect(sol.current).toBeCloseTo(8, 5)
  })
})
