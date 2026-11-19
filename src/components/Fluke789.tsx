import type { Action } from '../engine/session'
import type { MeterKey, MeterMode, SessionState } from '../engine/types'
import { METER_MODES, NODE_LABEL } from '../engine/types'
import type { LoopSolution } from '../engine/loop'
import { meterReading } from '../engine/meter'

interface Props {
  state: SessionState
  sol: LoopSolution
  dispatch: (a: Action) => void
}

// Rotary positions laid out as on the real unit. Angle 0 = straight up, clockwise positive.
const KNOB: { mode: MeterMode; top?: string; main: string; sub?: string; angle: number; big?: boolean }[] = [
  { mode: 'OFF', main: 'OFF', angle: -128, big: true },
  { mode: 'VAC', top: '~', main: 'V', angle: -96 },
  { mode: 'VDC', top: '⎓', main: 'V', angle: -63 },
  { mode: 'mVDC', top: '⎓', main: 'mV', angle: -30 },
  { mode: 'OHM', top: '·))) →|–', main: 'Ω', angle: 10 },
  { mode: 'mA', top: '~⎓', main: 'mA A', angle: 47 },
  { mode: 'OUT', main: 'mA', top: '⇕', sub: 'OUTPUT', angle: 80 },
  { mode: 'OUT_AUTO', main: 'mA', top: '∧∧ ⌐┐', angle: 108 },
  { mode: 'LOOP', main: 'mA', sub: '250Ω HART · LOOP POWER', angle: 140 },
]

export function Fluke789({ state, sol, dispatch }: Props) {
  const m = state.meter
  const r = meterReading(state, sol)
  const key = (k: MeterKey) => () => dispatch({ type: 'meterKey', key: k })
  const off = m.mode === 'OFF'
  const out = m.mode === 'OUT' || m.mode === 'OUT_AUTO'
  const holding = m.held != null
  const primary = holding ? m.held!.split(' ')[0] : r.primary
  const units = holding ? m.held!.split(' ').slice(1) : r.units
  const current = KNOB.find((k) => k.mode === m.mode)!
  const redJack = off ? null : m.mode === 'LOOP' ? 'A' : m.mode === 'mA' || out ? 'mA' : 'V'

  const nextMode = () => {
    const i = METER_MODES.indexOf(m.mode)
    dispatch({ type: 'meterMode', mode: METER_MODES[(i + 1) % METER_MODES.length] })
  }

  return (
    <div className="f789">
      <div className="f789-body">
        <div className="f789-face">
          <div className="f789-brand">
            <span className="f789-logo">FLUKE</span>
            <span className="f789-model"><b>789</b> PROCESSMETER</span>
          </div>

          <div className={`f789-lcd ${off ? 'off' : ''} ${m.backlight ? 'lit' : ''}`}>
            <div className="f789-units">{!off && units.map((u) => <span key={u}>{u}</span>)}</div>
            <div className="f789-digits">{off ? '' : primary}</div>
            <div className="f789-rangeline">
              <span>{!off && m.manualRange ? 'Manual Range' : ''}</span>
              <span>{off ? '' : r.range}</span>
            </div>
            <div className="f789-lower">
              <span className="f789-secondary">{off ? '' : r.secondary}</span>
              <span className="f789-ann">
                {holding && <b>HOLD</b>}
                {!off && r.annunciators.map((a) => <b key={a} className={a === '⚠' ? 'bad' : ''}>{a}</b>)}
              </span>
            </div>
          </div>

          <div className="f789-keys">
            <button onClick={key('HUNDRED')} disabled={off}>100%</button>
            <button onClick={key('MINMAX')} disabled={off}>MIN MAX</button>
            <button onClick={key('RANGE')} disabled={off}>RANGE</button>
            <button onClick={key('HOLD')} disabled={off} className="blue">HOLD</button>
          </div>
          <div className={`f789-orange ${out ? 'active' : ''}`}>
            <span>SpanCheck</span><span>%STEP</span><span>COARSE</span><span>FINE</span>
          </div>
          <div className="f789-keys">
            <button onClick={key('ZERO')} disabled={off}>0%</button>
            <button onClick={key('BEEPER')} disabled={off}>·)))</button>
            <button onClick={key('REL')} disabled={off}>REL Δ</button>
            <button onClick={key('HZ')} disabled={off}>Hz</button>
          </div>
          <div className={`f789-tri ${out ? 'active' : ''}`}><span>▼</span><span>▼</span><span>▼</span><span>▼</span></div>

          <div className="f789-knob-area">
            <button className="f789-round light" onClick={key('BACKLIGHT')} title="Backlight">☼</button>
            <button className="f789-round blue" onClick={key('BLUE')} title={m.mode === 'LOOP' ? '250 Ω HART in/out' : m.mode === 'OUT_AUTO' ? 'Ramp type' : 'Function'} />
            <div className="f789-knob-labels">
              {KNOB.map((k) => {
                const rad = (k.angle * Math.PI) / 180
                const x = 50 + 45 * Math.sin(rad)
                const y = 50 - 45 * Math.cos(rad)
                return (
                  <button
                    key={k.mode}
                    className={`f789-pos ${k.mode === m.mode ? 'sel' : ''} ${k.big ? 'big' : ''}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => dispatch({ type: 'meterMode', mode: k.mode })}
                  >
                    {k.top && <small>{k.top}</small>}
                    <b>{k.main}</b>
                    {k.sub && <small className="orange">{k.sub}</small>}
                  </button>
                )
              })}
              <div className="f789-output-brace">OUTPUT</div>
              <div className="f789-knob" onClick={nextMode} title="Turn knob clockwise">
                <div className="f789-pointer" style={{ transform: `rotate(${current.angle}deg)` }} />
              </div>
            </div>
          </div>

          <div className="f789-jacklabels">
            <span>OUTPUT 0–24 mA</span>
            <span><b>+</b> SOURCE &nbsp; <b>−</b> SIMULATE</span>
          </div>
          <div className="f789-ratings">
            <span>1A<br />30 sec</span>
            <span>0.44A<br />FUSED</span>
            <span>30mA<br />FUSED</span>
            <span>CAT III 1000V<br />CAT IV 600V</span>
          </div>
          <div className="f789-jacks">
            <div className={`f789-jack ${redJack === 'A' ? 'red' : ''}`}><span className="j">A ~⎓</span><i /><small className="orange">LOOP<br />POWER</small></div>
            <div className={`f789-jack ${redJack === 'mA' ? 'red' : ''}`}><span className="j">mA ⎓</span><i /><small>48V<br />MAX</small></div>
            <div className="f789-jack black"><span className="j">COM</span><i /><small>⏚</small></div>
            <div className={`f789-jack ${redJack === 'V' ? 'red' : ''}`}><span className="j">Ω V</span><i /><small>⚠</small></div>
          </div>
        </div>
      </div>

      <div className="f789-leads">
        <div><span className="lead-a">Red</span> {m.probeA ? NODE_LABEL[m.probeA] : '—'}</div>
        {m.mode !== 'mA' && <div><span className="lead-b">Black</span> {m.probeB ? NODE_LABEL[m.probeB] : '—'}</div>}
        <button onClick={() => dispatch({ type: 'meterClear' })}>Lift leads</button>
      </div>
      <p className="muted small">
        {off && 'Turn the knob or tap a position.'}
        {(m.mode === 'VDC' || m.mode === 'VAC' || m.mode === 'mVDC') && 'Tap two test points on the diagram: red first, black second. RANGE locks the range, REL Δ zeros the display, HOLD freezes it.'}
        {m.mode === 'OHM' && 'Tap two points. Pull F1 on the diagram first: a live circuit reads OL and risks the meter. The beeper sounds under 30 Ω.'}
        {m.mode === 'mA' && 'Tap one terminal to lift its wire and read in series. PT-101 TEST reads without breaking the loop.'}
        {m.mode === 'LOOP' && 'Lift PT-101 and clip red to (+), black to (−): the 789 powers the transmitter and reads its output. Blue key switches the 250 Ω HART resistor in so the Trex can talk.'}
        {m.mode === 'OUT' && 'Manual output. Across PT-101\'s loop wires with the loop live the 789 detects the loop voltage and SIMULATES a transmitter. Across a de-energized input (F1 pulled) it SOURCES. 100% / 0% span check, MIN MAX and ·))) step 25 %, RANGE / REL Δ coarse, HOLD / Hz fine.'}
        {m.mode === 'OUT_AUTO' && 'Auto output: the 789 ramps 4–20 mA on its own. Blue key cycles slow ramp, fast ramp, 25 % step. Same lead rules as manual output.'}
      </p>
    </div>
  )
}
