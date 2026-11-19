import type { Action } from '../engine'
import { busVolts, chargeLampOn, keypadLit, ppeCheck, suitedUp, REQUIRED_DEAD, deadTestDone, provedBefore, provedAfter, lockedOut } from '../engine'
import type { ElecState } from '../types'
import { CHECKLIST, DIAGNOSES, POINT_LABEL, PPE_ITEMS, REPAIRS } from '../types'
import { Worker } from './Worker'
import { GearIcon } from './Gear'
import { PPE_CATEGORIES } from './ppeCategories'

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
  const l = state.scenario.label
  const slots: { slot: string; label: string }[] = [
    { slot: 'head', label: 'Head' }, { slot: 'eyes', label: 'Eyes' }, { slot: 'ears', label: 'Hearing' },
    { slot: 'body', label: 'Body' }, { slot: 'face', label: 'Face' }, { slot: 'hands', label: 'Hands' }, { slot: 'feet', label: 'Feet' },
  ]
  const confirmed = state.ppeConfirmed
  const suited = suitedUp(state)
  return (
    <div className="suitup">
      <div className="suitup-top">
        <div className="suitup-figure">
          <Worker ppe={state.ppe} />
          <div className={`suit-state ${suited ? 'ok' : ''}`}>{suited ? 'Suited up' : confirmed ? 'Kit changed since confirming' : 'Not suited up'}</div>
        </div>
        <div className="suitup-label">
          <b>Label on VFD-101</b>
          {state.labelRead ? (
            <ul>
              <li><b>{l.incidentEnergy} cal/cm²</b> at {l.workingDistance} in</li>
              <li>Arc rating ≥ <b>{l.minArcRating} cal/cm²</b></li>
              <li>AR hood, or shield + balaclava</li>
              <li>Class <b>{l.gloveClass}</b> gloves + leather protectors</li>
              <li>Hard hat, glasses, hearing, leather boots</li>
              <li>AFB {l.arcFlashBoundary} in</li>
            </ul>
          ) : <div className="small muted">Read the label on the cabinet door first.</div>}
          <div className={`ppe-status ${chk.adequate ? 'ok' : 'bad'}`}>
            <b>{chk.adequate ? 'Kit meets the label' : 'Kit short of the label'}</b>
            {chk.issues.map((i) => <div key={i} className="small">• {i}</div>)}
          </div>
          <button className="primary" onClick={() => dispatch({ type: 'ppeConfirm' })} disabled={suited}>{suited ? 'Suited up ✓' : 'Suit up for this task'}</button>
        </div>
      </div>
      <p className="muted small">Dress him before touching a breaker, lock or tag. Tap gear on the rack to put it on or take it off.</p>
      {slots.map((sl) => (
        <div key={sl.slot} className="rack-row">
          <span className="rack-slot">{sl.label}</span>
          <div className="rack-items">
            {PPE_ITEMS.filter((p) => p.slot === sl.slot).map((p) => {
              const worn = state.ppe.includes(p.id)
              return (
                <button key={p.id} className={`rack-item ${worn ? 'worn' : ''}`} title={p.note} onClick={() => dispatch({ type: 'ppe', id: p.id, on: !worn })}>
                  <span className="gear-icon"><GearIcon id={p.id} /></span>
                  <span className="gear-text">{p.label}{p.arcRating != null && p.arcRating > 0 ? <b> · {p.arcRating} cal/cm²</b> : ''}<small>{p.note}</small></span>
                  <span className={`gear-state ${worn ? 'on' : ''}`}>{worn ? 'ON' : 'rack'}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <details className="ppe-chart">
        <summary>Arc flash PPE category guidelines (NFPA 70E)</summary>
        <table className="cat-table">
          <thead><tr><th>Cat</th><th>cal/cm²</th><th>Min rating</th><th>PPE</th></tr></thead>
          <tbody>
            {PPE_CATEGORIES.map((c) => (
              <tr key={c.cat}><td><span className="cat-badge" style={{ background: c.color }}>{c.cat}</span></td><td>{c.range}</td><td>{c.minRating}</td><td>{c.items}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          The label on VFD-101 was written by the incident energy method, so the rule is arc rating ≥ {l.incidentEnergy} cal/cm², not the category table.
          The table applies when a label states a PPE category instead of a cal/cm² figure. Never mix the two on one piece of equipment.
        </p>
      </details>
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
      <div className="small">Proved on the live receptacle before: {provedBefore(s) ? '✓' : '—'} · re-proved after: {provedAfter(s) ? '✓' : '—'} · TIC self-test: {s.tic.selfTestAt != null ? '✓' : '—'}</div>
      <table className="kv">
        <tbody>
          {REQUIRED_DEAD.map((r) => (
            <tr key={`${r.a}${r.b}`}><td>{r.label}</td><td>{r.tic ? 'TIC 300 or 87V' : '87V V DC'} {deadTestDone(s, r) ? '✓' : '—'}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">The TIC 300 PRO proves the AC conductors. It cannot see the DC bus; that one takes the 87V on V DC.</p>
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
