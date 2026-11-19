import type { Action } from '../engine'
import { busVolts, chargeLampOn, keypadLit, ppeCheck, REQUIRED_DEAD, deadTestDone, provedBefore, provedAfter, lockedOut } from '../engine'
import type { ElecState } from '../types'
import { CHECKLIST, DIAGNOSES, POINT_LABEL, PPE_ITEMS, REPAIRS } from '../types'

interface P { state: ElecState; dispatch: (a: Action) => void }

export function Prework({ state, dispatch }: P) {
  const l = state.scenario.label
  return (
    <div>
      <p className="muted">Complete before approaching the equipment.</p>
      {CHECKLIST.map((c) => (
        <label key={c.id} className="check">
          <input type="checkbox" checked={state.checklist[c.id]} onChange={() => dispatch({ type: 'checklist', id: c.id })} />
          <span>{c.label}</span>
        </label>
      ))}
      <h4>Work order</h4>
      <p>{state.scenario.workOrder}</p>
      <h4>One-line E-401 (excerpt)</h4>
      <table className="kv">
        <tbody>
          <tr><td>Power</td><td>MCC-3 bucket 3B, 480 V 3Ø, 200 A breaker → VFD-101 → 1M isolation contactor → P-101M</td></tr>
          <tr><td>Control</td><td>LP-2 ckt 7, 120 V → VFD-101 X1 → 1M coil, drive enable</td></tr>
          <tr><td>Stored energy</td><td>VFD DC bus capacitors, up to 800 V DC. CHARGE lamp on the drive. Wait ≥ 15 min after power off (Toshiba).</td></tr>
          <tr><td>Motor</td><td>{state.scenario.motor.tag}: {state.scenario.motor.hp} HP, {state.scenario.motor.volts} V, {state.scenario.motor.fla} A, 6-lead wye</td></tr>
          <tr><td>Label</td><td>{state.labelRead ? `${l.incidentEnergy} cal/cm², AFB ${l.arcFlashBoundary} in, glove class ${l.gloveClass}` : 'not read yet'}</td></tr>
        </tbody>
      </table>
    </div>
  )
}

export function PpeLocker({ state, dispatch }: P) {
  const chk = ppeCheck(state)
  const slots: { slot: string; label: string }[] = [
    { slot: 'head', label: 'Head' }, { slot: 'eyes', label: 'Eyes' }, { slot: 'ears', label: 'Hearing' },
    { slot: 'body', label: 'Body (arc rating must be ≥ incident energy)' }, { slot: 'face', label: 'Face' }, { slot: 'hands', label: 'Hands' }, { slot: 'feet', label: 'Feet' },
  ]
  return (
    <div>
      <div className={`ppe-status ${chk.adequate ? 'ok' : 'bad'}`}>
        <b>{chk.adequate ? 'Adequate for the label' : 'Not adequate'}</b>
        <div className="small">Body rating {chk.bodyRating} cal/cm² vs {state.scenario.label.incidentEnergy} cal/cm² on the label{state.labelRead ? '' : ' (read it)'}</div>
        {chk.issues.map((i) => <div key={i} className="small">• {i}</div>)}
      </div>
      {slots.map((sl) => (
        <div key={sl.slot}>
          <h4>{sl.label}</h4>
          {PPE_ITEMS.filter((p) => p.slot === sl.slot).map((p) => (
            <label key={p.id} className="check">
              <input type="checkbox" checked={state.ppe.includes(p.id)} onChange={(e) => dispatch({ type: 'ppe', id: p.id, on: e.target.checked })} />
              <span>{p.label}{p.arcRating != null && p.arcRating > 0 ? ` · ${p.arcRating} cal` : ''}<br /><span className="muted small">{p.note}</span></span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

export function Loto({ state, dispatch }: P) {
  const s = state
  const bus = busVolts(s)
  return (
    <div>
      <h4>Sources</h4>
      <table className="kv">
        <tbody>
          <tr><td>MCC-3 3B</td><td>
            <span className={`pill ${s.mccClosed ? 'bad' : 'ok'}`}>{s.mccClosed ? 'CLOSED' : 'OPEN'}</span>{' '}
            <button onClick={() => dispatch({ type: 'breaker', closed: !s.mccClosed })}>{s.mccClosed ? 'Open' : 'Close'}</button>{' '}
            <button onClick={() => dispatch({ type: 'lock', target: 'mcc', on: !s.locks.mcc })}>{s.locks.mcc ? 'Unlock' : 'Lock'}</button>{' '}
            <button onClick={() => dispatch({ type: 'tag', target: 'mcc', on: !s.tags.mcc })}>{s.tags.mcc ? 'Remove tag' : 'Tag'}</button>
          </td></tr>
          <tr><td>LP-2 ckt 7</td><td>
            <span className={`pill ${s.lp2Closed ? 'bad' : 'ok'}`}>{s.lp2Closed ? 'CLOSED' : 'OPEN'}</span>{' '}
            <button onClick={() => dispatch({ type: 'lp2', closed: !s.lp2Closed })}>{s.lp2Closed ? 'Open' : 'Close'}</button>{' '}
            <button onClick={() => dispatch({ type: 'lock', target: 'lp2', on: !s.locks.lp2 })}>{s.locks.lp2 ? 'Unlock' : 'Lock'}</button>{' '}
            <button onClick={() => dispatch({ type: 'tag', target: 'lp2', on: !s.tags.lp2 })}>{s.tags.lp2 ? 'Remove tag' : 'Tag'}</button>
          </td></tr>
          <tr><td>DC bus</td><td>CHARGE lamp {chargeLampOn(s) ? <span className="pill bad">LIT</span> : <span className="pill ok">OFF</span>} · <button onClick={() => dispatch({ type: 'wait', minutes: 5 })}>Wait 5 min</button></td></tr>
        </tbody>
      </table>
      <p className="muted small">The lamp tells you the bus is above about 50 V. Only a V DC measurement at PA/+ to PC/− proves it is safe.{bus > 50 && !s.mccClosed ? '' : ''}</p>
      <h4>Try-step</h4>
      <button onClick={() => dispatch({ type: 'tryStart' })} disabled={!lockedOut(s)}>Attempt restart with locks on</button>
      {s.tryStepDone && <span className="pill ok" style={{ marginLeft: 8 }}>DONE</span>}
      <h4>Absence of voltage</h4>
      <div className="small">Prove before: {provedBefore(s) ? '✓' : '—'} · Re-prove after: {provedAfter(s) ? '✓' : '—'}</div>
      <table className="kv">
        <tbody>
          {REQUIRED_DEAD.map((r) => (
            <tr key={`${r.a}${r.b}`}><td>{POINT_LABEL[r.a]} → {POINT_LABEL[r.b]}</td><td>{r.mode === 'VDC' ? 'V DC ' : 'V AC '}{deadTestDone(s, r) ? '✓' : '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Keypad({ state, dispatch }: P) {
  const lit = keypadLit(state)
  return (
    <div className="tkp">
      <div className="tkp-head">TOSHIBA · VF-AS3</div>
      <div className={`tkp-lcd ${lit ? '' : 'off'}`}>
        <div className="tkp-big">{lit ? state.drive.display : ''}</div>
        <div className="tkp-sub">{lit ? (state.drive.faulted ? `${state.scenario.drive.faultCode} ${state.scenario.drive.faultText}` : state.drive.running ? 'RUN · Hz' : 'READY · Hz') : ''}</div>
      </div>
      <div className="tkp-leds">
        <span className={state.drive.running && lit ? 'on' : ''}>RUN</span>
        <span className={state.drive.faulted && lit ? 'trip' : ''}>TRIP</span>
        <span className={chargeLampOn(state) ? 'trip' : ''}>CHARGE</span>
      </div>
      <div className="tkp-keys">
        <button onClick={() => dispatch({ type: 'keypad', key: 'STOP' })} className="stop" title="STOP; press when tripped to RESET">STOP<br /><small>RESET</small></button>
        <button onClick={() => dispatch({ type: 'keypad', key: 'RESET' })}>RESET</button>
        <button onClick={() => dispatch({ type: 'keypad', key: 'RUN' })} className="run">RUN</button>
        <button disabled>MODE</button><button disabled>▲</button><button disabled>▼</button>
      </div>
      <p className="muted small">The keypad is lit while the bus is charged. A dark keypad is not proof of anything.</p>
    </div>
  )
}

export function Closeout({ state, dispatch }: P) {
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
      <h4>Insulation test record</h4>
      <table className="kv">
        <tbody>
          {state.insTests.map((t, i) => <tr key={i}><td>{POINT_LABEL[t.a]} → {POINT_LABEL[t.b]} @ {t.volts} V</td><td>{t.reading}</td></tr>)}
          {state.insTests.length === 0 && <tr><td colSpan={2} className="muted">none yet</td></tr>}
        </tbody>
      </table>
      <p className="muted small">Restore in order: wye bar, feeder lugs, cover, leads on 1M, door, then remove your own locks, close LP-2 then 3B, reset and run.</p>
      <button className="primary" disabled={state.diagnosis == null} onClick={() => dispatch({ type: 'finish' })}>Close work order</button>
    </div>
  )
}
