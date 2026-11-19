import { useState } from 'react'
import type { Action } from '../engine/session'
import type { SessionState } from '../engine/types'
import { DIAGNOSES, PREWORK_CHECKLIST, REPAIRS } from '../engine/types'
import type { LoopSolution } from '../engine/loop'
import { hmiReading } from '../engine/loop'
import { Fluke789 } from './Fluke789'
import { Trex } from './Trex'

type Tab = 'hmi' | 'meter' | 'hart' | 'manifold' | 'prework' | 'closeout'

interface Props {
  state: SessionState
  sol: LoopSolution
  dispatch: (a: Action) => void
}

export function Toolbox({ state, sol, dispatch }: Props) {
  const [tab, setTab] = useState<Tab>('prework')
  const tabs: { id: Tab; label: string }[] = [
    { id: 'prework', label: 'Pre-work' },
    { id: 'hmi', label: 'HMI' },
    { id: 'meter', label: 'Fluke 789' },
    { id: 'hart', label: 'Trex' },
    { id: 'manifold', label: 'Manifold' },
    { id: 'closeout', label: 'Close-out' },
  ]
  return (
    <div className="toolbox">
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="tab-body">
        {tab === 'prework' && <Prework state={state} dispatch={dispatch} />}
        {tab === 'hmi' && <Hmi state={state} sol={sol} />}
        {tab === 'meter' && <Fluke789 state={state} sol={sol} dispatch={dispatch} />}
        {tab === 'hart' && <Trex state={state} sol={sol} dispatch={dispatch} />}
        {tab === 'manifold' && <Manifold state={state} dispatch={dispatch} />}
        {tab === 'closeout' && <Closeout state={state} dispatch={dispatch} />}
      </div>
    </div>
  )
}

function Prework({ state, dispatch }: { state: SessionState; dispatch: (a: Action) => void }) {
  return (
    <div>
      <p className="muted">Complete before the first hands-on action. Order does not matter.</p>
      {PREWORK_CHECKLIST.map((c) => (
        <label key={c.id} className="check">
          <input type="checkbox" checked={state.checklist[c.id]} onChange={() => dispatch({ type: 'checklist', id: c.id })} />
          <span>{c.label}</span>
        </label>
      ))}
      <h4>Work order</h4>
      <p>{state.scenario.workOrder}</p>
      <h4>Loop data</h4>
      <table className="kv">
        <tbody>
          <tr><td>Tag</td><td>{state.scenario.loop.tag} – {state.scenario.loop.description}</td></tr>
          <tr><td>SCADA scaling</td><td>{state.scenario.loop.lrv} – {state.scenario.loop.urv} {state.scenario.loop.unit}</td></tr>
          <tr><td>Loop supply</td><td>{state.scenario.loop.supplyVolts} VDC, F1 1 A, AI load {state.scenario.loop.loadOhms} Ω</td></tr>
        </tbody>
      </table>
    </div>
  )
}

function Hmi({ state, sol }: { state: SessionState; sol: LoopSolution }) {
  const r = hmiReading(state, sol)
  const hist = state.hmiHistory
  const span = state.scenario.loop.urv - state.scenario.loop.lrv
  const w = 320
  const h = 90
  const pts = hist.map((s, i) => {
    const x = (i / Math.max(1, hist.length - 1)) * w
    const y = h - Math.max(0, Math.min(1, (s.eu - state.scenario.loop.lrv) / span)) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const bad = r.quality !== 'GOOD'
  return (
    <div className="hmi">
      <div className="hmi-head">SCADA · STATION 4 · PUMP UNIT 1</div>
      <div className={`hmi-value ${bad ? 'bad' : ''}`}>
        <div className="hmi-tag">{state.scenario.loop.tag}</div>
        <div className="hmi-eu">{r.eu.toFixed(1)} <small>{state.scenario.loop.unit}</small></div>
        <div className="hmi-q">{r.quality} · {r.ma.toFixed(2)} mA</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="trend">
        <line x1={0} y1={h * 0.5} x2={w} y2={h * 0.5} className="grid" />
        <polyline points={pts.join(' ')} />
      </svg>
      <div className="muted">Trend: last {hist.length} s, 0–{state.scenario.loop.urv} {state.scenario.loop.unit}</div>
      <div className="alarm-list">
        {r.ma < 3.7 && <div className="alarm">PT-101 LL  BAD QUALITY</div>}
        {r.ma > 20.6 && <div className="alarm">PT-101 HH  BAD QUALITY</div>}
        {!bad && r.eu < 50 && <div className="alarm">PT-101 LL  LOW-LOW PRESSURE</div>}
        {!bad && r.eu > 480 && <div className="alarm">PT-101 HH  HIGH-HIGH PRESSURE</div>}
      </div>
    </div>
  )
}

function Manifold({ state, dispatch }: { state: SessionState; dispatch: (a: Action) => void }) {
  const [psi, setPsi] = useState('250')
  return (
    <div>
      <h4>Isolation valve</h4>
      <div className="row">
        <span className={state.isolationOpen ? 'pill ok' : 'pill bad'}>{state.isolationOpen ? 'OPEN' : 'CLOSED'}</span>
        <button onClick={() => dispatch({ type: 'valve', open: !state.isolationOpen })}>{state.isolationOpen ? 'Close' : 'Open'}</button>
      </div>
      <h4>Hand pump at test port</h4>
      <div className="row">
        <input value={psi} onChange={(e) => setPsi(e.target.value)} style={{ width: 70 }} /> {state.scenario.loop.unit}
        <button onClick={() => dispatch({ type: 'pump', psi: Number(psi) })}>Apply</button>
        <button disabled={state.pumpPressure == null} onClick={() => dispatch({ type: 'pump', psi: null })}>Vent and remove</button>
      </div>
      {state.pumpPressure != null && <div className="warn-inline">Pump applying {state.pumpPressure} {state.scenario.loop.unit}</div>}
      <p className="muted">A test pressure proves the transmitter and its range without trusting the process. Isolate first, vent, then pump.</p>
      <h4>Impulse line</h4>
      <div className="row">
        <button onClick={() => dispatch({ type: 'repair', id: 'blowdown_impulse' })}>Blow down / rod out</button>
      </div>
      <p className="muted">Counts as a repair. Close isolation, open the drain, clear the line, then reopen.</p>
    </div>
  )
}

function Closeout({ state, dispatch }: { state: SessionState; dispatch: (a: Action) => void }) {
  return (
    <div>
      <h4>Root cause</h4>
      <select value={state.diagnosis ?? ''} onChange={(e) => dispatch({ type: 'diagnose', id: e.target.value as never })}>
        <option value="" disabled>Select the root cause…</option>
        {DIAGNOSES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
      </select>
      <h4>Repairs</h4>
      <div className="repairs">
        {REPAIRS.map((r) => (
          <button key={r.id} disabled={state.repairs.includes(r.id)} onClick={() => dispatch({ type: 'repair', id: r.id })}>
            {state.repairs.includes(r.id) ? '✓ ' : ''}{r.label}
          </button>
        ))}
      </div>
      <p className="muted">Every repair counts. Wrong ones cost efficiency points, like parts-swapping in the field.</p>
      <button className="primary" disabled={state.diagnosis == null} onClick={() => dispatch({ type: 'finish' })}>
        Close work order
      </button>
    </div>
  )
}
