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
        Non-contact AC detector for systems over 1,000 V. Press TEST for the self-test, prove it on a known live source, then hold the
        tip at each conductor: tap the point in the scene. HIGH is the range above 1,500 V; LOW below. It cannot see DC. On 480 V
        equipment like this job it is not the verification instrument: use the Fluke 789 by contact, live-dead-live.
      </p>
    </div>
  )
}
