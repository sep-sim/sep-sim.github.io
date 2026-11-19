import type { Action } from '../engine'
import { insulationTest, meterReadingText, voltageBetween } from '../engine'
import type { ElecState, InsVolts, MeterMode } from '../types'
import { INS_VOLTS, POINT_LABEL } from '../types'

interface Props { state: ElecState; dispatch: (a: Action) => void }

const KNOB: { mode: MeterMode; label: string; sub?: string; angle: number }[] = [
  { mode: 'OFF', label: 'OFF', angle: -120 },
  { mode: 'VAC', label: 'V', sub: '~', angle: -70 },
  { mode: 'VDC', label: 'V', sub: '⎓', angle: -25 },
  { mode: 'OHM', label: 'Ω', sub: '·)))', angle: 25 },
  { mode: 'INS', label: 'MΩ', sub: 'INSULATION', angle: 85 },
]

export function Fluke1587({ state, dispatch }: Props) {
  const m = state.meter
  const off = m.mode === 'OFF'
  const placed = m.probeA != null && m.probeB != null
  const live = placed ? voltageBetween(state, m.probeA!, m.probeB!) : null
  const liveWarn = live != null && (live.ac > 30 || Math.abs(live.dc) > 30)
  const text = meterReadingText(state)
  const current = KNOB.find((k) => k.mode === m.mode)!
  const preview = m.mode === 'INS' && placed ? insulationTest(state) : null

  let primary = ''
  let unit = ''
  if (!off) {
    if (m.mode === 'INS') {
      primary = m.lastTest ?? (placed ? (preview && !preview.ok ? preview.reading : '- - - -') : '- - - -')
      unit = ''
    } else if (text) {
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
          <div className="f1587-brand"><span className="f789-logo">FLUKE</span><span className="f1587-model"><b>1587 FC</b> INSULATION MULTIMETER</span></div>
          <div className={`f1587-lcd ${off ? 'off' : ''}`}>
            <div className="f1587-top">
              <span>{!off && m.mode === 'INS' ? `TEST ${m.insVolts} V` : ''}</span>
              <span className={liveWarn ? 'bad' : ''}>{liveWarn ? '⚡ LIVE' : ''}</span>
            </div>
            <div className="f1587-digits">{primary}</div>
            <div className="f1587-bottom">
              <span>{unit}{m.mode === 'INS' && m.lastTest && !m.lastTest.startsWith('⚡') ? 'insulation' : ''}</span>
              <span className="f1587-ann">{m.mode === 'INS' && m.lastTest && !m.lastTest.startsWith('⚡') ? 'DISCHARGED' : ''}</span>
            </div>
          </div>
          <div className="f1587-keys">
            <button className="test" disabled={m.mode !== 'INS' || !placed} onClick={() => dispatch({ type: 'insTest' })}>INSULATION TEST</button>
            <button disabled={m.mode !== 'INS'} onClick={() => {
              const i = INS_VOLTS.indexOf(m.insVolts)
              dispatch({ type: 'meterVolts', volts: INS_VOLTS[(i + 1) % INS_VOLTS.length] as InsVolts })
            }}>{m.insVolts} V ▸</button>
            <button disabled={off} onClick={() => dispatch({ type: 'meterClear' })}>LIFT LEADS</button>
          </div>
          <div className="f789-knob-area">
            <div className="f789-knob-labels small">
              {KNOB.map((k) => {
                const rad = (k.angle * Math.PI) / 180
                const x = 50 + 44 * Math.sin(rad)
                const y = 50 - 44 * Math.cos(rad)
                return (
                  <button key={k.mode} className={`f789-pos ${k.mode === m.mode ? 'sel' : ''}`} style={{ left: `${x}%`, top: `${y}%` }} onClick={() => dispatch({ type: 'meterMode', mode: k.mode })}>
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
            <div className={`f789-jack ${off ? '' : 'red'}`}><span className="j">V Ω MΩ</span><i /><small>CAT III 1000 V</small></div>
          </div>
        </div>
      </div>
      <div className="f789-leads">
        <div><span className="lead-a">Red</span> {m.probeA ? POINT_LABEL[m.probeA] : '—'}</div>
        <div><span className="lead-b">Black</span> {m.probeB ? POINT_LABEL[m.probeB] : '—'}</div>
      </div>
      <p className="muted small">
        {off && 'Turn the knob. Tap two points in the scene, red then black.'}
        {(m.mode === 'VAC' || m.mode === 'VDC') && 'Prove the meter on the 120 V receptacle before and after testing for absence of voltage. The DC bus must be checked on V DC: on V AC it reads near zero even at 650 V.'}
        {m.mode === 'OHM' && 'Continuity and resistance. Not an insulation test.'}
        {m.mode === 'INS' && 'Place both leads, pick the test voltage (500 V for a 460 V motor), then press INSULATION TEST. The 1587 refuses to test if it sees more than 30 V, and discharges the circuit afterwards. Never test a circuit still connected to the drive.'}
      </p>
    </div>
  )
}
