import { useEffect, useReducer, useState } from 'react'
import type { LeadSpec } from '../../components/LeadLayer'
import { TicLayer } from './TicLayer'
import type { LeadId } from '../../engine/types'
import type { ElecScenario, Point, Scene, MeggerLeadId } from '../types'
import { createElecSession, ppeCheck, reduceElec } from '../engine'
import { scoreElec, elecAnswer, diagnosisLabel } from '../score'
import { REPAIRS } from '../types'
import { RoomScene } from './RoomScene'
import { CompartmentScene } from './CompartmentScene'
import { MotorScene } from './MotorScene'
import { Fluke789Elec } from './Fluke789Elec'
import { MeggerS1 } from './MeggerS1'
import { TicTracer } from './TicTracer'
import { ArcLabelModal } from './ArcLabel'
import { Closeout, Jsa, Loto, PpeLocker, Relay, Scenario } from './Panels'
import { WorkLog } from '../../components/WorkLog'
import { LogDock } from '../../components/LogDock'
import { useLogDock } from '../../components/useLogDock'

type Tab = 'scenario' | 'jsa' | 'ppe' | 'loto' | 'tic' | 'dmm' | 'megger' | 'relay' | 'closeout'

export function ElecSim({ scenario, onExit }: { scenario: ElecScenario; onExit: () => void }) {
  const [state, dispatch] = useReducer(reduceElec, scenario, createElecSession)
  const [tab, setTab] = useState<Tab>('scenario')
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
          {state.drive.damaged && <p><b>Collateral:</b> VFD #2 output cells destroyed by the insulation tester.</p>}
        </div>
        <h4>Work log</h4>
        <WorkLog log={state.log} />
      </div>
    )
  }

  const ppe = ppeCheck(state)
  const scenes: { id: Scene; label: string }[] = [{ id: 'room', label: 'Electrical room' }, { id: 'compartment', label: 'M12 compartment' }, { id: 'motor', label: 'P-310 motor' }]
  const tabs: { id: Tab; label: string }[] = [
    { id: 'scenario', label: 'Scenario' }, { id: 'jsa', label: 'JSA' }, { id: 'ppe', label: 'PPE' }, { id: 'loto', label: 'LOTO' },
    { id: 'tic', label: 'TIC 300' }, { id: 'dmm', label: 'Fluke 789' }, { id: 'megger', label: 'Megger' }, { id: 'relay', label: 'Relay' }, { id: 'closeout', label: 'Close-out' },
  ]

  /** Every instrument is dragged onto the points now; a bare tap on a point does nothing. */
  const onProbe = (_p: Point) => {}
  const overlay = tab === 'tic' ? <TicLayer state={state} dispatch={dispatch} park={state.scene === 'room' ? [905, 300] : state.scene === 'compartment' ? [905, 400] : [905, 330]} /> : null
  const mt = state.meter
  const mg = state.megger
  const leads: LeadSpec[] = tab === 'dmm'
    ? [
        ...(mt.jacks.red ? [{ id: 'red', color: '#e8321f', label: 'red', point: mt.probeA }] : []),
        ...(mt.jacks.black ? [{ id: 'black', color: '#1b1b1b', label: 'black', point: mt.probeB }] : []),
      ]
    : tab === 'megger'
      ? [
          ...(mg.leads.minus ? [{ id: 'minus', color: '#1b1b1b', label: '−', point: mg.minus }] : []),
          ...(mg.leads.plus ? [{ id: 'plus', color: '#e02020', label: '+', point: mg.plus }] : []),
        ]
      : []
  const onDrop = (lead: string, target: string | null) => {
    if (tab === 'dmm') {
      if (target) dispatch({ type: 'probe', point: target as Point, lead: lead as LeadId })
      else dispatch({ type: 'meterLift', lead: lead as LeadId })
    } else if (tab === 'megger') {
      if (target) dispatch({ type: 'meggerLead', lead: lead as MeggerLeadId, point: target as Point, drag: true })
      else dispatch({ type: 'meggerLift', lead: lead as MeggerLeadId })
    }
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
              if (sc.id === 'compartment' && !state.doorOpen) dispatch({ type: 'door', open: true })
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
          {state.scene === 'room' && <RoomScene state={state} onProbe={onProbe} leads={leads} onDrop={onDrop} overlay={overlay} dispatch={dispatch} onLabel={() => { dispatch({ type: 'readLabel' }); setLabel(true) }} />}
          {state.scene === 'compartment' && <CompartmentScene state={state} onProbe={onProbe} leads={leads} onDrop={onDrop} overlay={overlay} dispatch={dispatch} />}
          {state.scene === 'motor' && <MotorScene state={state} onProbe={onProbe} leads={leads} onDrop={onDrop} overlay={overlay} dispatch={dispatch} />}
        </section>
        <aside>
          <div className="toolbox">
            <div className="tabs">
              {tabs.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <div className="tab-body">
              {tab === 'scenario' && <Scenario state={state} dispatch={dispatch} />}
              {tab === 'jsa' && <Jsa state={state} dispatch={dispatch} />}
              {tab === 'ppe' && <PpeLocker state={state} dispatch={dispatch} />}
              {tab === 'loto' && <Loto state={state} dispatch={dispatch} />}
              {tab === 'tic' && <TicTracer state={state} dispatch={dispatch} />}
              {tab === 'dmm' && <Fluke789Elec state={state} dispatch={dispatch} />}
              {tab === 'megger' && <MeggerS1 state={state} dispatch={dispatch} />}
              {tab === 'relay' && <Relay state={state} dispatch={dispatch} />}
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
