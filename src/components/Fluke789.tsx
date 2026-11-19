import type { Action } from '../engine/session'
import type { SessionState } from '../engine/types'
import { NODE_LABEL } from '../engine/types'
import type { LoopSolution } from '../engine/loop'
import { meterReading } from '../engine/meter'
import { Fluke789Face } from './Fluke789Face'

interface Props {
  state: SessionState
  sol: LoopSolution
  dispatch: (a: Action) => void
}

/** The 789 wired to the 4-20 mA loop engine. */
export function Fluke789({ state, sol, dispatch }: Props) {
  const m = state.meter
  const r = meterReading(state, sol)
  const off = m.mode === 'OFF'
  const out = m.mode === 'OUT' || m.mode === 'OUT_AUTO'
  const holding = m.held != null
  const primary = holding ? m.held!.split(' ')[0] : r.primary
  const units = holding ? m.held!.split(' ').slice(1) : r.units
  const redJack = off ? null : m.mode === 'LOOP' ? 'A' : m.mode === 'mA' || out ? 'mA' : 'V'

  return (
    <Fluke789Face
      mode={m.mode}
      primary={primary}
      units={units}
      secondary={r.secondary}
      range={r.range}
      manualRange={m.manualRange}
      annunciators={r.annunciators}
      held={holding}
      backlight={m.backlight}
      outputMode={out}
      onMode={(mode) => dispatch({ type: 'meterMode', mode })}
      onKey={(key) => dispatch({ type: 'meterKey', key })}
      redJack={redJack}
      leads={
        <>
          <div><span className="lead-a">Red</span> {m.probeA ? NODE_LABEL[m.probeA] : '—'}</div>
          {m.mode !== 'mA' && <div><span className="lead-b">Black</span> {m.probeB ? NODE_LABEL[m.probeB] : '—'}</div>}
          <button onClick={() => dispatch({ type: 'meterClear' })}>Lift leads</button>
        </>
      }
      hint={
        <>
          {off && 'Turn the knob or tap a position.'}
          {(m.mode === 'VDC' || m.mode === 'VAC' || m.mode === 'mVDC') && 'Tap two test points on the diagram: red first, black second. RANGE locks the range, REL Δ zeros the display, HOLD freezes it.'}
          {m.mode === 'OHM' && 'Tap two points. Pull F1 on the diagram first: a live circuit reads OL and risks the meter. The beeper sounds under 30 Ω.'}
          {m.mode === 'mA' && 'Tap one terminal to lift its wire and read in series. PT-101 TEST reads without breaking the loop.'}
          {m.mode === 'LOOP' && 'Lift PT-101 and clip red to (+), black to (−): the 789 powers the transmitter and reads its output. Blue key switches the 250 Ω HART resistor in so the Trex can talk.'}
          {m.mode === 'OUT' && 'Manual output. Across PT-101\'s loop wires with the loop live the 789 detects the loop voltage and SIMULATES a transmitter. Across a de-energized input (F1 pulled) it SOURCES. 100% / 0% span check, MIN MAX and ·))) step 25 %, RANGE / REL Δ coarse, HOLD / Hz fine.'}
          {m.mode === 'OUT_AUTO' && 'Auto output: the 789 ramps 4–20 mA on its own. Blue key cycles slow ramp, fast ramp, 25 % step. Same lead rules as manual output.'}
        </>
      }
    />
  )
}
