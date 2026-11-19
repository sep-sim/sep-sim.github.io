import { useEffect, useMemo, useReducer, useState } from 'react'
import type { Scenario } from './engine/types'
import { createSession, reduce } from './engine/session'
import { solveLoop } from './engine/loop'
import { SCENARIOS, pickRandomScenario } from './scenarios'
import { SiteDiagram } from './components/SiteDiagram'
import { Toolbox } from './components/Toolbox'
import { WorkLog } from './components/WorkLog'
import { Results } from './components/Results'
import type { ElecScenario } from './electrical/types'
import { ELEC_SCENARIOS, pickRandomElecScenario } from './electrical/scenarios'
import { ElecSim } from './electrical/ui/ElecSim'

function Sim({ scenario, onExit }: { scenario: Scenario; onExit: () => void }) {
  const [state, dispatch] = useReducer(reduce, scenario, createSession)
  const sol = useMemo(() => solveLoop(state), [state])

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [])

  if (state.finished) {
    return <Results state={state} onRestart={() => window.location.reload()} onMenu={onExit} />
  }

  return (
    <div className="sim">
      <header>
        <div>
          <span className="brand">MidstreamSim</span>
          <span className="muted"> · {scenario.title}</span>
        </div>
        <div className="muted">{scenario.difficulty} · t+{Math.floor(state.t / 60)}m{String(state.t % 60).padStart(2, '0')}s</div>
        <button onClick={onExit}>Abandon</button>
      </header>
      <main>
        <section className="diagram">
          <SiteDiagram
            state={state}
            sol={sol}
            onProbe={(node) => dispatch({ type: 'probe', node })}
            onInspect={(where) => dispatch({ type: 'inspect', where })}
            onValve={(open) => dispatch({ type: 'valve', open })}
            onFuse={(pulled) => dispatch({ type: 'fuse', pulled })}
          />
        </section>
        <aside>
          <Toolbox state={state} sol={sol} dispatch={dispatch} />
        </aside>
      </main>
      <footer>
        <WorkLog log={state.log} />
      </footer>
    </div>
  )
}

type Pick = { kind: 'loop'; s: Scenario } | { kind: 'elec'; s: ElecScenario }

function Menu({ onPick }: { onPick: (p: Pick) => void }) {
  return (
    <div className="menu">
      <h1><span className="brand">MidstreamSim</span> · I&amp;E field training</h1>
      <div className="menu-section">
        <h2>Electrical · VFD ground fault, lockout, verification, insulation testing</h2>
        <p className="muted">
          Toshiba VF-AS3 on a 100 HP pump. Read the label, dress for it, isolate both sources, prove zero energy, lift the leads, meg,
          then open the terminal box and find out whether it is the termination, the cable, or a winding.
        </p>
        <div className="row"><button className="primary" onClick={() => onPick({ kind: 'elec', s: pickRandomElecScenario() })}>Random work order</button></div>
        <div className="cards">
          {ELEC_SCENARIOS.map((s) => (
            <button key={s.id} className="card" onClick={() => onPick({ kind: 'elec', s })}>
              <div className={`pill ${s.difficulty}`}>{s.difficulty}</div>
              <div className="card-title">{s.title}</div>
              <div className="muted small">{s.workOrder}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="menu-section">
        <h2>Instrumentation · 4-20 mA loop troubleshooting</h2>
        <p className="muted">
          A pressure loop at a pump station. Each work order hides one fault. Pre-work, Fluke 789, AMS Trex, manifold, repair, prove it back in service.
        </p>
        <div className="row"><button className="primary" onClick={() => onPick({ kind: 'loop', s: pickRandomScenario() })}>Random work order</button></div>
        <div className="cards">
          {SCENARIOS.map((s) => (
            <button key={s.id} className="card" onClick={() => onPick({ kind: 'loop', s })}>
              <div className={`pill ${s.difficulty}`}>{s.difficulty}</div>
              <div className="card-title">{s.title}</div>
              <div className="muted small">{s.workOrder}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [pick, setPick] = useState<Pick | null>(null)
  const [runKey, setRunKey] = useState(0)
  if (!pick) return <Menu onPick={(p) => { setPick(p); setRunKey((k) => k + 1) }} />
  if (pick.kind === 'elec') return <ElecSim key={runKey} scenario={pick.s} onExit={() => setPick(null)} />
  return <Sim key={runKey} scenario={pick.s} onExit={() => setPick(null)} />
}
