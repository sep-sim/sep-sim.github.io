import type { ReactNode } from 'react'
import type { MeterKey, MeterMode } from '../engine/types'
import { METER_MODES } from '../engine/types'

/** Rotary positions laid out as on the real unit. Angle 0 = straight up, clockwise positive. */
const KNOB_789: { mode: MeterMode; top?: string; main: string; sub?: string; angle: number; big?: boolean }[] = [
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

export interface Fluke789FaceProps {
  mode: MeterMode
  primary: string
  units: string[]
  secondary: string
  range: string
  manualRange: boolean
  annunciators: string[]
  held: boolean
  backlight: boolean
  /** OUTPUT positions light the orange secondary key functions */
  outputMode: boolean
  rampLabel?: string
  hart250?: boolean
  onMode: (mode: MeterMode) => void
  onKey: (key: MeterKey) => void
  /** which jack the red lead is in */
  redJack: 'A' | 'mA' | 'V' | null
  leads: ReactNode
  hint: ReactNode
}

/** The Fluke 789 ProcessMeter face: knob, dual LCD, keys and jacks. Pure presentation, shared by every module. */
export function Fluke789Face(p: Fluke789FaceProps) {
  const off = p.mode === 'OFF'
  const current = KNOB_789.find((k) => k.mode === p.mode)!
  const key = (k: MeterKey) => () => p.onKey(k)
  const nextMode = () => {
    const i = METER_MODES.indexOf(p.mode)
    p.onMode(METER_MODES[(i + 1) % METER_MODES.length])
  }
  return (
    <div className="f789">
      <div className="f789-body">
        <div className="f789-face">
          <div className="f789-brand">
            <span className="f789-logo">FLUKE</span>
            <span className="f789-model"><b>789</b> PROCESSMETER</span>
          </div>

          <div className={`f789-lcd ${off ? 'off' : ''} ${p.backlight ? 'lit' : ''}`}>
            <div className="f789-units">{!off && p.units.map((u) => <span key={u}>{u}</span>)}</div>
            <div className="f789-digits">{off ? '' : p.primary}</div>
            <div className="f789-rangeline">
              <span>{!off && p.manualRange ? 'Manual Range' : ''}</span>
              <span>{off ? '' : p.range}</span>
            </div>
            <div className="f789-lower">
              <span className="f789-secondary">{off ? '' : p.secondary}</span>
              <span className="f789-ann">
                {p.held && <b>HOLD</b>}
                {!off && p.annunciators.map((a) => <b key={a} className={a === '⚠' ? 'bad' : ''}>{a}</b>)}
              </span>
            </div>
          </div>

          <div className="f789-keys">
            <button onClick={key('HUNDRED')} disabled={off}>100%</button>
            <button onClick={key('MINMAX')} disabled={off}>MIN MAX</button>
            <button onClick={key('RANGE')} disabled={off}>RANGE</button>
            <button onClick={key('HOLD')} disabled={off} className="blue">HOLD</button>
          </div>
          <div className={`f789-orange ${p.outputMode ? 'active' : ''}`}>
            <span>SpanCheck</span><span>%STEP</span><span>COARSE</span><span>FINE</span>
          </div>
          <div className="f789-keys">
            <button onClick={key('ZERO')} disabled={off}>0%</button>
            <button onClick={key('BEEPER')} disabled={off}>·)))</button>
            <button onClick={key('REL')} disabled={off}>REL Δ</button>
            <button onClick={key('HZ')} disabled={off}>Hz</button>
          </div>
          <div className={`f789-tri ${p.outputMode ? 'active' : ''}`}><span>▼</span><span>▼</span><span>▼</span><span>▼</span></div>

          <div className="f789-knob-area">
            <button className="f789-round light" onClick={key('BACKLIGHT')} title="Backlight">☼</button>
            <button className="f789-round blue" onClick={key('BLUE')} title={p.mode === 'LOOP' ? '250 Ω HART in/out' : p.mode === 'OUT_AUTO' ? 'Ramp type' : 'Function'} />
            <div className="f789-knob-labels">
              {KNOB_789.map((k) => {
                const rad = (k.angle * Math.PI) / 180
                const x = 50 + 45 * Math.sin(rad)
                const y = 50 - 45 * Math.cos(rad)
                return (
                  <button
                    key={k.mode}
                    className={`f789-pos ${k.mode === p.mode ? 'sel' : ''} ${k.big ? 'big' : ''}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => p.onMode(k.mode)}
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
            <div className={`f789-jack ${p.redJack === 'A' ? 'red' : ''}`}><span className="j">A ~⎓</span><i /><small className="orange">LOOP<br />POWER</small></div>
            <div className={`f789-jack ${p.redJack === 'mA' ? 'red' : ''}`}><span className="j">mA ⎓</span><i /><small>48V<br />MAX</small></div>
            <div className="f789-jack black"><span className="j">COM</span><i /><small>⏚</small></div>
            <div className={`f789-jack ${p.redJack === 'V' ? 'red' : ''}`}><span className="j">Ω V</span><i /><small>⚠</small></div>
          </div>
        </div>
      </div>

      <div className="f789-leads">{p.leads}</div>
      <p className="muted small">{p.hint}</p>
    </div>
  )
}
