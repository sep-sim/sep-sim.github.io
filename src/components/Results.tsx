import type { SessionState } from '../engine/types'
import { DIAGNOSES, REPAIRS } from '../engine/types'
import { scoreSession } from '../engine/score'
import { WorkLog } from './WorkLog'

interface Props { state: SessionState; onRestart: () => void; onMenu: () => void }

export function Results({ state, onRestart, onMenu }: Props) {
  const score = scoreSession(state)
  const ans = state.scenario.answer
  const diagLabel = (id: string | null) => DIAGNOSES.find((d) => d.id === id)?.label ?? '—'
  return (
    <div className="results">
      <div className="results-head">
        <div>
          <div className="muted">{state.scenario.title}</div>
          <h2>Score {score.total} / {score.max}  <span className={`grade g-${score.grade}`}>{score.grade}</span></h2>
        </div>
        <div className="row">
          <button onClick={onRestart}>Run again</button>
          <button className="primary" onClick={onMenu}>Scenario list</button>
        </div>
      </div>
      <table className="score">
        <tbody>
          {score.lines.map((l) => (
            <tr key={l.label}><td>{l.label}</td><td className="num">{l.points} / {l.max}</td><td className="muted">{l.note}</td></tr>
          ))}
          {score.penalties.map((l) => (
            <tr key={l.label} className="pen"><td>{l.label}</td><td className="num">{l.points}</td><td className="muted">{l.note}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="debrief">
        <h4>Debrief</h4>
        <p><b>Actual fault:</b> {diagLabel(ans.diagnosis)}</p>
        <p><b>Your diagnosis:</b> {diagLabel(state.diagnosis)}</p>
        <p><b>Required repair:</b> {ans.repairs.length ? ans.repairs.map((r) => REPAIRS.find((x) => x.id === r)?.label).join(', ') : 'None (configuration or valve position)'}</p>
      </div>
      <h4>Work log</h4>
      <WorkLog log={state.log} />
    </div>
  )
}
