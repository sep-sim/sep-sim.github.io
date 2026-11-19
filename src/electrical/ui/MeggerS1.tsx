import type { Action } from '../engine'
import { absorption, insulationTest, leakageNa, meggerLive, MEGGER_AUTO_STOP } from '../engine'
import type { ElecState, MeggerMode, MeggerVolts } from '../types'
import { MEGGER_VOLTS, POINT_LABEL } from '../types'

interface Props { state: ElecState; dispatch: (a: Action) => void }

// Mode knob, lower left. Angle 0 = up, clockwise.
const MODES: { mode: MeggerMode; label: string; angle: number }[] = [
  { mode: 'IR', label: 'IR', angle: -95 },
  { mode: 'IRT', label: 'IR(t)', angle: -62 },
  { mode: 'DAR', label: 'DAR', angle: -30 },
  { mode: 'PI', label: 'PI', angle: 2 },
  { mode: 'DD', label: 'DD', angle: 34 },
  { mode: 'SV', label: 'SV', angle: 66 },
  { mode: 'RAMP', label: '◢', angle: 98 },
]

// Voltage knob, centre. OFF at top; orange arc clockwise; grey utility arc on the left.
const VOLTS: { v: MeggerVolts | 'OFF' | 'V' | 'USB' | 'DEL' | 'LOCK'; label: string; angle: number; cls: string }[] = [
  { v: 'OFF', label: 'OFF', angle: 0, cls: 'off' },
  { v: 250, label: '250V', angle: 38, cls: 'hv' },
  { v: 500, label: '500V', angle: 72, cls: 'hv' },
  { v: 1000, label: '1kV', angle: 106, cls: 'hv' },
  { v: 2500, label: '2.5kV', angle: 140, cls: 'hv' },
  { v: 5000, label: '5kV', angle: 172, cls: 'hv' },
  { v: 'LOCK', label: 'TΩ', angle: 206, cls: 'hv' },
  { v: 'DEL', label: '🗑', angle: -130, cls: 'util' },
  { v: 'USB', label: 'USB', angle: -96, cls: 'util' },
  { v: 'V', label: 'V ⚙', angle: -58, cls: 'util' },
]

function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function fmtNa(na: number): string {
  if (na <= 0) return '< 0.1 nA'
  if (na >= 1e6) return `${(na / 1e6).toFixed(2)} mA`
  if (na >= 1000) return `${(na / 1000).toFixed(1)} µA`
  return `${na.toFixed(1)} nA`
}

export function MeggerS1({ state, dispatch }: Props) {
  const m = state.megger
  const off = m.mode === 'OFF'
  const live = meggerLive(state)
  const placed = m.minus != null && m.plus != null
  const preview = placed && !off ? insulationTest(state) : null
  const liveV = preview && !preview.ok && preview.reading.startsWith('⚡') ? preview.reading : null
  const kv = m.volts >= 1000 ? `${m.volts / 1000} kV` : `${m.volts} V`
  const modeLabel = m.mode === 'IRT' ? 'IR(t)' : m.mode === 'RAMP' ? 'RAMP' : m.mode
  const autoStop = MEGGER_AUTO_STOP[m.mode]

  let big = '- - - -'
  let line2 = ''
  let line3 = ''
  if (!off) {
    if (live) {
      big = live.reading
      line2 = `${fmtNa(leakageNa(live.r, m.volts))}   ${fmtTime(live.seconds)}${autoStop ? ` / ${fmtTime(autoStop)}` : ''}`
      if (m.mode === 'DAR' && live.seconds >= 30) line3 = `R30 ${insulationTest(state).ok ? fmtR(absorption(insulationTest(state).r, 30)) : ''}`
      if (m.mode === 'PI' && live.seconds >= 60) line3 = `R1min ${fmtR(absorption(insulationTest(state).r, 60))}`
    } else if (m.result) {
      big = m.result.reading
      line2 = `${fmtNa(m.result.leakNa)}   ${fmtTime(m.result.seconds)}`
      line3 = [m.result.dar != null ? `DAR ${m.result.dar.toFixed(2)}` : '', m.result.pi != null ? `PI ${m.result.pi.toFixed(2)}` : ''].filter(Boolean).join('   ') || 'DISCHARGED'
    } else if (m.inhibit) {
      big = m.inhibit
      line2 = 'VOLTAGE PRESENT · TEST INHIBITED'
    } else if (liveV) {
      big = liveV
      line2 = 'VOLTAGE PRESENT'
    }
  }

  function fmtR(r: number): string {
    if (!Number.isFinite(r)) return '> 2 TΩ'
    if (r >= 1000) return `${(r / 1000).toFixed(2)} GΩ`
    return `${r >= 10 ? r.toFixed(0) : r.toFixed(2)} MΩ`
  }

  const vSel = VOLTS.find((x) => x.v === m.volts && !off) ?? VOLTS[0]
  const mSel = MODES.find((x) => x.mode === m.mode) ?? MODES[0]

  return (
    <div className="mg">
      <div className="mg-case">
        <div className="mg-panel">
          <div className="mg-terms">
            <span className="mg-warn">⚠</span>
            <div className={`mg-term red ${m.plus ? 'used' : ''}`}><i /><b>+</b></div>
            <div className="mg-term blue"><i /><b>GUARD</b></div>
            <div className="mg-term black" ><i /><b>−</b></div>
            <span className="mg-cat">CAT IV<br />600V</span>
            <span className="mg-warn">⚡</span>
          </div>

          <div className="mg-main">
            <div className="mg-side">
              <button className="mg-key" title="Graph">📈</button>
              <div className="mg-mains"><span>🔌</span><i className={state.scene === 'room' ? 'on' : ''} /></div>
            </div>
            <div className={`mg-lcd ${off ? 'off' : ''}`}>
              <div className="mg-lcd-top"><span>{off ? '' : `${modeLabel}  ${kv}`}</span><span>{live ? 'TESTING' : m.result ? 'COMPLETE' : ''}</span></div>
              <div className="mg-lcd-big">{off ? '' : big}</div>
              <div className="mg-lcd-l2">{off ? '' : line2}</div>
              <div className="mg-lcd-l3">{off ? '' : line3}</div>
              <div className="mg-lcd-leads">{off ? '' : `− ${m.minus ? POINT_LABEL[m.minus] : '…'}   + ${m.plus ? POINT_LABEL[m.plus] : '…'}`}</div>
            </div>
            <div className="mg-arrows">
              <button>▲</button>
              <div><button>◀</button><button className="ok">OK</button><button>▶</button></div>
              <button>▼</button>
            </div>
          </div>

          <div className="mg-lower">
            <div className="mg-knobwrap mode">
              {MODES.map((k) => {
                const rad = (k.angle * Math.PI) / 180
                return (
                  <button key={k.mode} className={`mg-pos ${k.mode === m.mode ? 'sel' : ''}`} style={{ left: `${50 + 46 * Math.sin(rad)}%`, top: `${50 - 46 * Math.cos(rad)}%` }} onClick={() => dispatch({ type: 'meggerMode', mode: k.mode })}>{k.label}</button>
                )
              })}
              <div className="mg-knob" onClick={() => { const i = MODES.findIndex((k) => k.mode === m.mode); dispatch({ type: 'meggerMode', mode: MODES[(i + 1) % MODES.length].mode }) }}>
                <div className="mg-pointer" style={{ transform: `rotate(${mSel.angle}deg)` }} />
              </div>
            </div>
            <button className="mg-key save" title="Store result">💾</button>
            <div className="mg-knobwrap volts">
              <div className="mg-arc hv" />
              <div className="mg-arc util" />
              {VOLTS.map((k) => {
                const rad = (k.angle * Math.PI) / 180
                const isSel = k === vSel
                const onClick = () => {
                  if (k.v === 'OFF') dispatch({ type: 'meggerMode', mode: 'OFF' })
                  else if (typeof k.v === 'number') {
                    if (off) dispatch({ type: 'meggerMode', mode: 'IR' })
                    dispatch({ type: 'meggerVolts', volts: k.v })
                  }
                }
                return (
                  <button key={String(k.v)} className={`mg-pos ${k.cls} ${isSel ? 'sel' : ''}`} style={{ left: `${50 + 47 * Math.sin(rad)}%`, top: `${50 - 47 * Math.cos(rad)}%` }} onClick={onClick}>{k.label}</button>
                )
              })}
              <div className="mg-knob" onClick={() => {
                const order = MEGGER_VOLTS
                if (off) { dispatch({ type: 'meggerMode', mode: 'IR' }); dispatch({ type: 'meggerVolts', volts: 250 }); return }
                const i = order.indexOf(m.volts)
                if (i === order.length - 1) dispatch({ type: 'meggerMode', mode: 'OFF' })
                else dispatch({ type: 'meggerVolts', volts: order[i + 1] })
              }}>
                <div className="mg-pointer" style={{ transform: `rotate(${vSel.angle}deg)` }} />
              </div>
            </div>
            <div className="mg-right">
              <button className="mg-key" title="Backlight">☼</button>
              <div className="mg-testwrap">
                <i className={`mg-led ${live ? 'on' : ''}`} />
                <button className={`mg-test ${live ? 'on' : ''}`} disabled={off || !placed} onClick={() => dispatch({ type: 'meggerTest' })}>TEST</button>
                <span className="mg-warn">⚠</span>
              </div>
              <button className="mg-key" title="Lock test on">≡</button>
              <div className="mg-logo"><b>Megger</b><small>S1-568</small><em>5kV INSULATION TESTER</em></div>
            </div>
          </div>
        </div>
      </div>

      <div className="f789-leads">
        <div><span className="lead-b">− black</span> {m.minus ? POINT_LABEL[m.minus] : '—'}</div>
        <div><span className="lead-a">+ red</span> {m.plus ? POINT_LABEL[m.plus] : '—'}</div>
        <button onClick={() => dispatch({ type: 'meggerClear' })}>Lift leads</button>
        {live && <button onClick={() => dispatch({ type: 'wait', minutes: 1 })}>⏩ 1 min</button>}
      </div>
      <p className="muted small">
        {off && 'Turn the voltage knob to a test voltage. IEEE 43: 2.5 kV for a 4160 V winding; 5 kV is the ceiling.'}
        {!off && 'With the Megger tab open, tapping a point in the scene connects the − lead (conductor under test) first, then the + lead (earth). TEST starts and stops. IR runs until stopped; IR(t) and DAR run 60 s; PI runs 10 min and reports R10min/R1min. Good insulation climbs during the test; wet or faulted insulation stays flat.'}
      </p>
    </div>
  )
}
