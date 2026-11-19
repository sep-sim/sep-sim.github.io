import type { Action } from '../engine'
import { meterReadingText, voltageBetween } from '../engine'
import type { ElecState, MeterMode } from '../types'
import { POINT_LABEL } from '../types'

interface Props { state: ElecState; dispatch: (a: Action) => void }

const KNOB: { mode: MeterMode; label: string; sub?: string; angle: number }[] = [
  { mode: 'OFF', label: 'OFF', angle: -110 },
  { mode: 'VAC', label: 'V', sub: '~', angle: -45 },
  { mode: 'VDC', label: 'V', sub: '⎓', angle: 20 },
  { mode: 'OHM', label: 'Ω', sub: '·))) →|–', angle: 85 },
]

export function Fluke87V({ state, dispatch }: Props) {
  const m = state.meter
  const off = m.mode === 'OFF'
  const placed = m.probeA != null && m.probeB != null
  const live = placed ? voltageBetween(state, m.probeA!, m.probeB!) : null
  const liveWarn = live != null && (live.ac > 30 || Math.abs(live.dc) > 30)
  const text = meterReadingText(state)
  const current = KNOB.find((k) => k.mode === m.mode)!

  let primary = ''
  let unit = ''
  if (!off) {
    if (text) {
      const parts = text.split(' ')
      primary = parts[0]
      unit = parts.slice(1).join(' ')
    } else {
      primary = m.mode === 'OHM' ? 'OL' : '- - - -'
      unit = m.mode === 'OHM' ? 'Ω' : m.mode === 'VAC' ? 'V AC' : 'V DC'
    }
  }

  return (
    <div className="f1587">
      <div className="f1587-body">
        <div className="f1587-face">
          <div className="f1587-brand"><span className="f789-logo">FLUKE</span><span className="f1587-model"><b>87V</b> TRUE RMS MULTIMETER</span></div>
          <div className={`f1587-lcd ${off ? 'off' : ''}`}>
            <div className="f1587-top">
              <span>{off ? '' : 'AUTO'}</span>
              <span className={liveWarn ? 'bad' : ''}>{liveWarn ? '⚡ LIVE' : ''}</span>
            </div>
            <div className="f1587-digits">{primary}</div>
            <div className="f1587-bottom"><span>{unit}</span><span /></div>
          </div>
          <div className="f1587-keys three">
            <button disabled={off}>HOLD</button>
            <button disabled={off}>MIN MAX</button>
            <button disabled={off} onClick={() => dispatch({ type: 'meterClear' })}>LIFT LEADS</button>
          </div>
          <div className="f789-knob-area">
            <div className="f789-knob-labels small">
              {KNOB.map((k) => {
                const rad = (k.angle * Math.PI) / 180
                return (
                  <button key={k.mode} className={`f789-pos ${k.mode === m.mode ? 'sel' : ''}`} style={{ left: `${50 + 44 * Math.sin(rad)}%`, top: `${50 - 44 * Math.cos(rad)}%` }} onClick={() => dispatch({ type: 'meterMode', mode: k.mode })}>
                    {k.sub && <small>{k.sub}</small>}<b>{k.label}</b>
                  </button>
                )
              })}
              <div className="f789-knob small" onClick={() => {
                const i = KNOB.findIndex((k) => k.mode === m.mode)
                dispatch({ type: 'meterMode', mode: KNOB[(i + 1) % KNOB.length].mode })
              }}>
                <div className="f789-pointer" style={{ transform: `rotate(${current.angle}deg)` }} />
              </div>
            </div>
          </div>
          <div className="f789-jacks">
            <div className="f789-jack black"><span className="j">COM</span><i /></div>
            <div className={`f789-jack ${off ? '' : 'red'}`}><span className="j">V Ω</span><i /><small>CAT III 1000 V<br />CAT IV 600 V</small></div>
          </div>
        </div>
      </div>
      <div className="f789-leads">
        <div><span className="lead-a">Red</span> {m.probeA ? POINT_LABEL[m.probeA] : '—'}</div>
        <div><span className="lead-b">Black</span> {m.probeB ? POINT_LABEL[m.probeB] : '—'}</div>
      </div>
      <p className="muted small">
        {off && 'Turn the knob. With this tab open, tapping two points in the scene places red then black.'}
        {(m.mode === 'VAC' || m.mode === 'VDC') && 'Prove the meter on the 120 V receptacle before and after testing for absence of voltage. The DC bus must be checked on V DC: on V AC it reads near zero even at 650 V.'}
        {m.mode === 'OHM' && 'Continuity and resistance. Not an insulation test; use the Megger.'}
      </p>
    </div>
  )
}
