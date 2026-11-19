import { useEffect, useReducer, useState } from 'react'
import type { ElecScenario, Point, Scene } from '../types'
import { createElecSession, ppeCheck, reduceElec } from '../engine'
import { scoreElec, elecAnswer, diagnosisLabel } from '../score'
import { REPAIRS } from '../types'
import { MccScene } from './MccScene'
import { DriveScene } from './DriveScene'
import { MotorScene } from './MotorScene'
import { Fluke789Elec } from './Fluke789Elec'
import { MeggerS1 } from './MeggerS1'
import { TicTracer } from './TicTracer'
import { ArcLabelModal } from './ArcLabel'
import { Closeout, Keypad, Loto, PpeLocker, Prework } from './Panels'
import { WorkLog } from '../../components/WorkLog'
import { LogDock } from '../../components/LogDock'
import { useLogDock } from '../../components/useLogDock'

type Tab = 'prework' | 'ppe' | 'loto' | 'tic' | 'dmm' | 'megger' | 'keypad' | 'closeout'

export function ElecSim({ scenario, onExit }: { scenario: ElecScenario; onExit: () => void }) {
  const [state, dispatch] = useReducer(reduceElec, scenario, createElecSession)
  const [tab, setTab] = useState<Tab>('prework')
  const [label, setLabel] = useState(false)
  const { dock, setDock, simStyle } = useLogDock()

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [])

  if (state.finished) {
    const score = scoreElec(state)
    const ans = elecAnswer(state)
    return (
      <div className="results">
        <div className="results-head">
          <div>
            <div className="muted">{scenario.title}</div>
            <h2>Score {score.total} / {score.max} <span className={`grade g-${score.grade}`}>{score.grade}</span></h2>
          </div>
          <div className="row"><button className="primary" onClick={onExit}>Scenario list</button></div>
        </div>
        <table className="score">
          <tbody>
            {score.lines.map((l) => <tr key={l.label}><td>{l.label}</td><td className="num">{l.points} / {l.max}</td><td className="muted">{l.note}</td></tr>)}
            {score.penalties.map((l) => <tr key={l.label} className="pen"><td>{l.label}</td><td className="num">{l.points}</td><td className="muted">{l.note}</td></tr>)}
          </tbody>
        </table>
        <div className="debrief">
          <h4>Debrief</h4>
          <p><b>Actual fault:</b> {diagnosisLabel(ans.diagnosis)}</p>
          <p><b>Your diagnosis:</b> {diagnosisLabel(state.diagnosis)}</p>
          <p><b>Required repair:</b> {ans.repairs.map((r) => REPAIRS.find((x) => x.id === r)?.label).join('; ')}</p>
          {state.drive.damaged && <p><b>Collateral:</b> VFD-101 output stage destroyed by the insulation tester.</p>}
        </div>
        <h4>Work log</h4>
        <WorkLog log={state.log} />
      </div>
    )
  }

  const ppe = ppeCheck(state)
  const scenes: { id: Scene; label: string }[] = [{ id: 'mcc', label: 'MCC room' }, { id: 'drive', label: 'VFD-101 cabinet' }, { id: 'motor', label: 'P-101 motor' }]
  const tabs: { id: Tab; label: string }[] = [
    { id: 'prework', label: 'Pre-work' }, { id: 'ppe', label: 'PPE' }, { id: 'loto', label: 'LOTO' },
    { id: 'tic', label: 'TIC 300' }, { id: 'dmm', label: 'Fluke 789' }, { id: 'megger', label: 'Megger' }, { id: 'keypad', label: 'Keypad' }, { id: 'closeout', label: 'Close-out' },
  ]

  /** Scene taps go to whichever instrument is in hand: TIC tip, DMM leads (red then black), or Megger (− then +). */
  const onProbe = (p: Point) => {
    if (tab === 'tic') {
      dispatch({ type: 'ticCheck', point: p })
      return
    }
    if (tab === 'megger') {
      const m = state.megger
      const lead = m.minus == null || m.plus != null ? 'minus' : 'plus'
      if (lead === 'minus' && m.plus != null) dispatch({ type: 'meggerClear' })
      dispatch({ type: 'meggerLead', lead, point: p })
      return
    }
    if (tab !== 'dmm') setTab('dmm')
    dispatch({ type: 'probe', point: p })
  }

  return (
    <div className="sim" style={simStyle}>
      <header>
        <div>
          <span className="brand">SEPSim</span>
          <span className="muted"> · {scenario.title}</span>
        </div>
        <div className="scene-nav">
          {scenes.map((sc) => (
            <button key={sc.id} className={state.scene === sc.id ? 'active' : ''} onClick={() => {
              if (sc.id === 'drive' && !state.doorOpen) dispatch({ type: 'door', open: true })
              dispatch({ type: 'goto', scene: sc.id })
            }}>{sc.label}</button>
          ))}
        </div>
        <div className={`ppe-chip ${ppe.adequate ? 'ok' : 'bad'}`} title={ppe.issues.join('\n')}>
          PPE {ppe.adequate ? 'OK' : 'INADEQUATE'} · {ppe.bodyRating} cal
        </div>
        <div className="muted">t+{Math.floor(state.t / 60)}m{String(state.t % 60).padStart(2, '0')}s</div>
        <button onClick={onExit}>Abandon</button>
      </header>
      <main>
        <section className="diagram">
          {state.scene === 'mcc' && <MccScene state={state} onProbe={onProbe} dispatch={dispatch} onLabel={() => { dispatch({ type: 'readLabel' }); setLabel(true) }} />}
          {state.scene === 'drive' && <DriveScene state={state} onProbe={onProbe} dispatch={dispatch} />}
          {state.scene === 'motor' && <MotorScene state={state} onProbe={onProbe} dispatch={dispatch} />}
        </section>
        <aside>
          <div className="toolbox">
            <div className="tabs">
              {tabs.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="tab-body">
              {tab === 'prework' && <Prework state={state} dispatch={dispatch} />}
              {tab === 'ppe' && <PpeLocker state={state} dispatch={dispatch} />}
              {tab === 'loto' && <Loto state={state} dispatch={dispatch} />}
              {tab === 'tic' && <TicTracer state={state} dispatch={dispatch} />}
              {tab === 'dmm' && <Fluke789Elec state={state} dispatch={dispatch} />}
              {tab === 'megger' && <MeggerS1 state={state} dispatch={dispatch} />}
              {tab === 'keypad' && <Keypad state={state} dispatch={dispatch} />}
              {tab === 'closeout' && <Closeout state={state} dispatch={dispatch} />}
            </div>
          </div>
        </aside>
      </main>
      <footer>
        <LogDock log={state.log} dock={dock} setDock={setDock} />
      </footer>
      {label && <ArcLabelModal label={scenario.label} onClose={() => setLabel(false)} onDress={() => { setLabel(false); setTab('ppe') }} />}
    </div>
  )
}
