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

// Rotary positions, clockwise. Angle 0 = straight up.
const KNOB: { mode: MeterMode; label: string; sub?: string; angle: number }[] = [
  { mode: 'OFF', label: 'OFF', angle: -135 },
  { mode: 'VAC', label: 'V', sub: '~', angle: -90 },
  { mode: 'VDC', label: 'V', sub: '⎓', angle: -45 },
  { mode: 'OHM', label: 'Ω', sub: '·))) ⇥', angle: 0 },
  { mode: 'mA', label: 'mA', sub: '⎓', angle: 45 },
  { mode: 'SOURCE', label: 'mA', sub: 'SOURCE', angle: 90 },
  { mode: 'SIM', label: 'mA', sub: 'SIMULATE', angle: 135 },
]

export function Fluke789({ state, sol, dispatch }: Props) {
  const m = state.meter
  const r = meterReading(state, sol)
  const key = (k: MeterKey) => () => dispatch({ type: 'meterKey', key: k })
  const outputMode = m.mode === 'SOURCE' || m.mode === 'SIM'
  const holding = m.held != null
  const primary = holding ? m.held!.split(' ')[0] : r.primary
  const unit = holding ? m.held!.split(' ').slice(1).join(' ') : r.unit
  const ann = holding ? [...r.annunciators, 'HOLD'] : r.annunciators
  const current = KNOB.find((k) => k.mode === m.mode)!
  const redJack = m.mode === 'VAC' || m.mode === 'VDC' || m.mode === 'OHM' ? 'V' : m.mode === 'OFF' ? null : 'mA'

  const nextMode = () => {
    const i = METER_MODES.indexOf(m.mode)
    dispatch({ type: 'meterMode', mode: METER_MODES[(i + 1) % METER_MODES.length] })
  }

  return (
    <div className="f789">
      <div className="f789-face">
        <div className="f789-brand">
          <span className="f789-logo">FLUKE</span>
          <span className="f789-model">789 ProcessMeter</span>
        </div>

        <div className={`f789-lcd ${m.mode === 'OFF' ? 'off' : ''}`}>
          <div className="f789-ann">
            {ann.map((a) => <span key={a} className={a === '⚠' ? 'bad' : ''}>{a}</span>)}
          </div>
          <div className="f789-primary">
            <span className="f789-digits">{m.mode === 'OFF' ? '' : primary}</span>
            <span className="f789-unit">{m.mode === 'OFF' ? '' : unit}</span>
          </div>
          <div className="f789-secondary">
            <span>{m.mode === 'OFF' ? '' : r.secondary}</span>
            {r.bar != null && (
              <span className="f789-bar">
                {Array.from({ length: 24 }, (_, i) => <i key={i} className={i < Math.round(r.bar! * 24) ? 'on' : ''} />)}
              </span>
            )}
          </div>
        </div>

        <div className="f789-keys">
          <button onClick={key('RANGE')} title="Manual range">RANGE</button>
          <button className={holding ? 'lit' : ''} onClick={key('HOLD')}>HOLD</button>
          <button className={m.loopPower ? 'lit' : ''} disabled={m.mode !== 'mA'} onClick={key('LOOP_POWER')}>LOOP<br />POWER</button>
          <button className={m.hart250 ? 'lit' : ''} onClick={key('HART_250')}>250Ω<br />HART</button>
        </div>
        <div className="f789-keys out">
          <button disabled={!outputMode} onClick={key('ZERO')}>0%</button>
          <button disabled={!outputMode} onClick={key('HUNDRED')}>100%</button>
          <button disabled={!outputMode} onClick={key('SPAN_CHECK')}>SPAN<br />CHECK</button>
          <button disabled={!outputMode} onClick={key('STEP')}>STEP</button>
          <button className={m.ramp !== 'off' ? 'lit' : ''} disabled={!outputMode} onClick={key('RAMP')}>RAMP<br /><small>{m.ramp === 'off' ? '' : m.ramp}</small></button>
        </div>
        <div className="f789-keys adj">
          <span className="f789-keylabel">COARSE</span>
          <button disabled={!outputMode} onClick={key('COARSE_UP')}>▲</button>
          <button disabled={!outputMode} onClick={key('COARSE_DN')}>▼</button>
          <span className="f789-keylabel">FINE</span>
          <button disabled={!outputMode} onClick={key('FINE_UP')}>▲</button>
          <button disabled={!outputMode} onClick={key('FINE_DN')}>▼</button>
        </div>

        <div className="f789-knob-area">
          <div className="f789-knob-labels">
            {KNOB.map((k) => {
              const rad = (k.angle * Math.PI) / 180
              const x = 50 + 46 * Math.sin(rad)
              const y = 50 - 46 * Math.cos(rad)
              return (
                <button
                  key={k.mode}
                  className={`f789-pos ${k.mode === m.mode ? 'sel' : ''}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => dispatch({ type: 'meterMode', mode: k.mode })}
                >
                  <b>{k.label}</b>{k.sub && <small>{k.sub}</small>}
                </button>
              )
            })}
            <div className="f789-knob" onClick={nextMode} title="Turn knob clockwise">
              <div className="f789-pointer" style={{ transform: `rotate(${current.angle}deg)` }} />
            </div>
          </div>
        </div>

        <div className="f789-jacks">
          <div className={`f789-jack ${redJack === 'mA' ? 'red' : ''}`}><i />mA</div>
          <div className="f789-jack black"><i />COM</div>
          <div className={`f789-jack ${redJack === 'V' ? 'red' : ''}`}><i />V Ω</div>
        </div>
      </div>

      <div className="f789-leads">
        <div><span className="lead-a">Red</span> {m.probeA ? NODE_LABEL[m.probeA] : '—'}</div>
        {!(m.mode === 'mA' && !m.loopPower) && <div><span className="lead-b">Black</span> {m.probeB ? NODE_LABEL[m.probeB] : '—'}</div>}
        <button onClick={() => dispatch({ type: 'meterClear' })}>Lift leads</button>
      </div>
      <p className="muted small">
        {m.mode === 'OFF' && 'Turn the knob or tap a position.'}
        {(m.mode === 'VDC' || m.mode === 'VAC') && 'Tap two test points on the diagram: red first, black second.'}
        {m.mode === 'OHM' && 'Tap two points. Pull F1 on the diagram first: a live circuit reads OL and risks the meter.'}
        {m.mode === 'mA' && !m.loopPower && 'Tap one terminal to lift its wire and read in series. PT-101 TEST reads without breaking the loop. LOOP POWER lets the 789 power a lifted transmitter.'}
        {m.mode === 'mA' && m.loopPower && 'Clip red to PT-101 (+), black to PT-101 (−). The transmitter is lifted and powered from the meter; turn on 250 Ω to talk HART.'}
        {m.mode === 'SIM' && 'The 789 stands in for the transmitter: clip across PT-101 (+) and (−) and set an output. Proves wiring, RTU and SCADA scaling.'}
        {m.mode === 'SOURCE' && 'The 789 drives its own current. Pull F1, clip across AI-1 CH3 (+)/(−) or TB-1, and set an output.'}
      </p>
    </div>
  )
}
