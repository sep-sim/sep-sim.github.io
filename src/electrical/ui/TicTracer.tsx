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
      </div>
      <div className={`tic-readout ${flashing ? 'hot' : ''}`}>
        {!t.on && 'OFF'}
        {t.on && t.last == null && `ON · ${t.range} range${t.selfTestAt != null ? ' · self-tested' : ' · not self-tested'}`}
        {t.on && t.last != null && (t.last.detected ? `⚡ BEEP · ${POINT_LABEL[t.last.point]}` : `no indication · ${POINT_LABEL[t.last.point]}`)}
      </div>
      <p className="muted small">
        Non-contact AC detector, the verification instrument for the 4160 V side. Press TEST for the self-test, prove it on the live
        M42 window, then hold the tip at each 4160 V conductor on HIGH range: tap the point in the scene. LOW range inside an MV
        compartment picks up the adjacent live bus and proves nothing. Re-prove on the M42 window when done. The 480 V and 120 V
        points are the Fluke 789's job.
      </p>
    </div>
  )
}
