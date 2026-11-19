import { useEffect, useMemo, useReducer, useState } from 'react'
import type { Scenario } from './engine/types'
import { createSession, reduce } from './engine/session'
import { solveLoop } from './engine/loop'
import { SCENARIOS, pickRandomScenario } from './scenarios'
import { SiteDiagram } from './components/SiteDiagram'
import { Toolbox } from './components/Toolbox'
import { WorkLog } from './components/WorkLog'
import { Results } from './components/Results'

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

function Menu({ onPick }: { onPick: (s: Scenario) => void }) {
  return (
    <div className="menu">
      <h1><span className="brand">MidstreamSim</span> · I&amp;E loop troubleshooting</h1>
      <p className="muted">
        A 4-20 mA pressure loop at a pipeline pump station. Each work order hides one fault. Do your pre-work,
        find it with the meter, communicator and manifold, repair it, and prove the point is back in service.
      </p>
      <div className="row"><button className="primary" onClick={() => onPick(pickRandomScenario())}>Random work order</button></div>
      <div className="cards">
        {SCENARIOS.map((s) => (
          <button key={s.id} className="card" onClick={() => onPick(s)}>
            <div className={`pill ${s.difficulty}`}>{s.difficulty}</div>
            <div className="card-title">{s.title}</div>
            <div className="muted small">{s.workOrder}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [runKey, setRunKey] = useState(0)
  if (!scenario) return <Menu onPick={(s) => { setScenario(s); setRunKey((k) => k + 1) }} />
  return <Sim key={runKey} scenario={scenario} onExit={() => setScenario(null)} />
}
