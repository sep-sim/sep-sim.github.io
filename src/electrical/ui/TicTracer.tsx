import type { Action } from '../engine'
import type { ElecState } from '../types'
import { POINT_LABEL } from '../types'

interface Props { state: ElecState; dispatch: (a: Action) => void }

export function TicTracer({ state, dispatch }: Props) {
  const t = state.tic
  const flashing = t.on && t.last != null && t.last.detected && state.t - t.last.t < 4
  return (
    <div className="tic">
      <div className="tic-unit">
        <div className={`tic-tip ${flashing ? 'flash' : ''}`} />
        <div className="tic-collar" />
        <div className="tic-body">
          <div className="tic-brand">▲ AMPROBE</div>
          <div className="tic-model">TIC 300 PRO<br /><small>AC Voltage Detector</small></div>
          <button className="tic-btn test" onClick={() => dispatch({ type: 'ticSelfTest' })}>TEST</button>
          <button className={`tic-btn onoff ${t.on ? 'on' : ''}`} onClick={() => dispatch({ type: 'ticPower', on: !t.on })}>ON<br />OFF</button>
          <div className="tic-ranges">
            <div>
              <small>30 VAC – 1500 VAC</small>
              <button className={`tic-btn range ${t.range === 'LOW' && t.on ? 'sel' : ''}`} onClick={() => dispatch({ type: 'ticRange', range: 'LOW' })}>LOW</button>
            </div>
            <div>
              <small>1500 VAC – 122 kVAC</small>
              <button className={`tic-btn range ${t.range === 'HIGH' && t.on ? 'sel' : ''}`} onClick={() => dispatch({ type: 'ticRange', range: 'HIGH' })}>HIGH</button>
            </div>
          </div>
          <div className={`tic-led ${t.on ? 'on' : ''}`} />
        </div>
        <div className="tic-handle"><span /></div>
        {t.hotStick && <div className="tic-stick" title="hot stick" />}
      </div>
      <button className={t.hotStick ? 'primary' : ''} onClick={() => dispatch({ type: 'ticHotStick', on: !t.hotStick })}>{t.hotStick ? 'On the hot stick · take it off' : 'Clip onto the hot stick'}</button>
      <div className={`tic-readout ${flashing ? 'hot' : ''}`}>
        {!t.on && 'OFF'}
        {t.on && t.last == null && `ON · ${t.range} range${t.selfTestAt != null ? ' · self-tested' : ' · not self-tested'}${t.hotStick ? ' · hot stick' : ''}`}
        {t.on && t.last != null && (t.last.detected ? `⚡ BEEP · ${POINT_LABEL[t.last.point]}` : `no indication · ${POINT_LABEL[t.last.point]}`)}
      </div>
      <p className="muted small">
        Non-contact AC detector, the verification instrument for the 4160 V side. Live-dead-live: press TEST for the self-test, clip
        the tracer to the hot stick, and on LOW range tap the 120 V receptacle in the electrical room so it lights. Go to the motor
        connection compartment, switch to HIGH and tap every connection: bypass stabs, VFD output and U, V, W, with no indication at
        any of them. Come back, switch to LOW and tap the receptacle again so it lights. LOW inside the MV compartment picks up the
        adjacent live bus and proves nothing; the receptacle will not light HIGH. The 480 V and 120 V checks are the Fluke 789's job.
      </p>
    </div>
  )
}
