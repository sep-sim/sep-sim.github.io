import type { Action } from '../engine'
import { chargeLampOn, linkVolts, lockedOut, ppeCheck, relayLit, suitedUp, REQUIRED_DEAD, deadTestDone, provedBeforeFor, provedAfterFor } from '../engine'
import type { ElecState } from '../types'
import { CHECKLIST, DIAGNOSES, LOCK_TARGETS, POINT_LABEL, PPE_ITEMS, REPAIRS } from '../types'
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
      <h4>One-line E-310 (excerpt)</h4>
      <table className="kv">
        <tbody>
          <tr><td>4160 V to VFD</td><td>SWG-1 52-7 → M22 power isolation switch → VFD #2 → M32 isolation contactor → connection bus → P-310M</td></tr>
          <tr><td>4160 V bypass</td><td>SWG-1 52-7 → M12 bypass isolation switch → bypass contactor 42B → connection bus</td></tr>
          <tr><td>480 V aux</td><td>CENTERLINE 2100 bucket 3B → drive cooling fans, control power transformer</td></tr>
          <tr><td>120 V control</td><td>LP-1 ckt 7 → Multilin 469, M32 coil, drive enable</td></tr>
          <tr><td>Stored energy</td><td>Drive cell capacitors. CHARGE lamps on the cell cabinet. Toshiba: wait 15 min after the isolation switch opens.</td></tr>
          <tr><td>Motor</td><td>{state.scenario.motor.tag}: {state.scenario.motor.hp} HP, {state.scenario.motor.volts} V, {state.scenario.motor.fla} A, 6-lead wye, form-wound</td></tr>
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
          <b>Label on M12 / M22</b>
          {state.labelRead ? (
            <ul>
              <li><b>{l.incidentEnergy} cal/cm²</b> at {l.workingDistance} in</li>
              <li>Arc rating ≥ <b>{l.minArcRating} cal/cm²</b>, arc flash hood</li>
              <li>Class <b>{l.gloveClass}</b> gloves + leather protectors</li>
              <li>Hard hat, glasses, hearing, leather boots</li>
              <li>AFB {l.arcFlashBoundary} in · limited {l.limitedApproach} in · restricted {l.restrictedApproach} in</li>
            </ul>
          ) : <div className="small muted">Read the label on the M12 door first.</div>}
          <div className={`ppe-status ${chk.adequate ? 'ok' : 'bad'}`}>
            <b>{chk.adequate ? 'Kit meets the label' : 'Kit short of the label'}</b>
            {chk.issues.map((i) => <div key={i} className="small">• {i}</div>)}
          </div>
          <button className="primary" onClick={() => dispatch({ type: 'ppeConfirm' })} disabled={suited}>{suited ? 'Suited up ✓' : 'Suit up for this task'}</button>
        </div>
      </div>
      <p className="muted small">Dress him before touching a switch, lock or tag. Tap gear on the rack to put it on or take it off.</p>
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
          The label on this controller was written by the incident energy method, so the rule is arc rating ≥ {l.incidentEnergy} cal/cm², not the category table.
          The table applies when a label states a PPE category instead of a cal/cm² figure. Never mix the two on one piece of equipment.
        </p>
      </details>
    </div>
  )
}

export function Loto({ state, dispatch }: P) {
  const s = state
  return (
    <div>
      <h4>Four sources</h4>
      <table className="kv loto">
        <tbody>
          {LOCK_TARGETS.map((t) => (
            <tr key={t.id}>
              <td>{t.volts}<br /><span className="muted small">{t.label}</span></td>
              <td>
                <span className={`pill ${s.closed[t.id] ? 'bad' : 'ok'}`}>{s.closed[t.id] ? 'CLOSED' : 'OPEN'}</span>{' '}
                <button onClick={() => dispatch({ type: 'switch', target: t.id, closed: !s.closed[t.id] })}>{s.closed[t.id] ? 'Open' : 'Close'}</button>{' '}
                <button onClick={() => dispatch({ type: 'lock', target: t.id, on: !s.locks[t.id] })}>{s.locks[t.id] ? 'Unlock' : 'Lock'}</button>{' '}
                <button onClick={() => dispatch({ type: 'tag', target: t.id, on: !s.tags[t.id] })}>{s.tags[t.id] ? 'Remove tag' : 'Tag'}</button>
              </td>
            </tr>
          ))}
          <tr><td>Drive cells</td><td>CHARGE lamps {chargeLampOn(s) ? <span className="pill bad">LIT</span> : <span className="pill ok">OFF</span>} · {linkVolts(s) > 50 ? 'wait' : 'discharged'} · <button onClick={() => dispatch({ type: 'wait', minutes: 5 })}>Wait 5 min</button></td></tr>
        </tbody>
      </table>
      <p className="muted small">Toshiba calls for 15 minutes after the power isolation switch opens before any compartment is entered. The lamps confirm it; there is no hand-meter check of the cells.</p>
      <h4>Try-step</h4>
      <button onClick={() => dispatch({ type: 'tryStart' })} disabled={!lockedOut(s)}>Attempt restart with all four locks on</button>
      {s.tryStepDone && <span className="pill ok" style={{ marginLeft: 8 }}>DONE</span>}
      <h4>Absence of voltage</h4>
      <div className="small">Live-dead-live · TIC on the receptacle (LOW): before {provedBeforeFor(s, 'tic') ? '✓' : '—'} · after {provedAfterFor(s, 'tic') ? '✓' : '—'} · self-test {s.tic.selfTestAt != null ? '✓' : '—'} · hot stick {s.tic.hotStick ? '✓' : '—'}</div>
      <div className="small">789 on the receptacle: before {provedBeforeFor(s, 'dmm') ? '✓' : '—'} · after {provedAfterFor(s, 'dmm') ? '✓' : '—'}</div>
      <table className="kv">
        <tbody>
          {REQUIRED_DEAD.map((r) => (
            <tr key={`${r.a}${r.b}`}><td>{r.label}</td><td>{r.instrument === 'tic' ? 'TIC 300 HIGH, hot stick' : '789 V AC'} {deadTestDone(s, r) ? '✓' : '—'}</td></tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">4160 V conductors: TIC 300 PRO on HIGH range, proved on the live M42 window before and after. 480 V and 120 V: Fluke 789 by contact, proved on the receptacle. The 789 never goes near the 4160 V bus.</p>
    </div>
  )
}

export function Relay({ state, dispatch }: P) {
  const lit = relayLit(state)
  return (
    <div className="tkp relay">
      <div className="tkp-head">GE MULTILIN 469 · MOTOR PROTECTION · M22 DOOR</div>
      <div className={`tkp-lcd ${lit ? '' : 'off'}`}>
        <div className="tkp-big">{lit ? state.drive.display : ''}</div>
        <div className="tkp-sub">{lit ? (state.drive.faulted ? state.scenario.drive.faultText : state.drive.running ? `P-310 RUNNING · ${(state.scenario.motor.fla * 0.82).toFixed(0)} A · 60.0 Hz` : 'READY · 0 A') : ''}</div>
      </div>
      <div className="tkp-leds">
        <span className={state.drive.running && lit ? 'on' : ''}>RUNNING</span>
        <span className={state.drive.faulted && lit ? 'trip' : ''}>TRIP · 86</span>
        <span className={chargeLampOn(state) ? 'trip' : ''}>CELL CHARGE</span>
      </div>
      <div className="tkp-keys">
        <button onClick={() => dispatch({ type: 'relay', key: 'STOP' })} className="stop">STOP</button>
        <button onClick={() => dispatch({ type: 'relay', key: 'RESET' })}>RESET</button>
        <button onClick={() => dispatch({ type: 'relay', key: 'START' })} className="run">START</button>
      </div>
      <p className="muted small">The relay and pushbuttons live on 120 V control. Dark means no control power, not a dead drive: the cells and the 4160 V bus are separate questions.</p>
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
          {state.insTests.map((t, i) => <tr key={i}><td>{POINT_LABEL[t.a]} → {POINT_LABEL[t.b]} @ {t.volts >= 1000 ? `${t.volts / 1000} kV` : `${t.volts} V`}</td><td>{t.reading}{t.pi != null ? ` · PI ${t.pi.toFixed(2)}` : ''}{t.dar != null ? ` · DAR ${t.dar.toFixed(2)}` : ''}</td></tr>)}
          {state.insTests.length === 0 && <tr><td colSpan={2} className="muted">none yet</td></tr>}
        </tbody>
      </table>
      <p className="muted small">Restore in order: wye bar, feeder terminations, box cover, U-V-W on the bus, compartment door, aux bucket, then remove your own locks, close control, aux, bypass, MV incoming, reset the 86 and start.</p>
      <button className="primary" disabled={state.diagnosis == null} onClick={() => dispatch({ type: 'finish' })}>Close work order</button>
    </div>
  )
}
