import { useState } from 'react'
import type { Action } from '../engine/session'
import type { SessionState } from '../engine/types'
import type { LoopSolution } from '../engine/loop'
import { hasFault } from '../engine/loop'
import { pctOfSpan } from '../engine/meter'

interface Props {
  state: SessionState
  sol: LoopSolution
  dispatch: (a: Action) => void
}

type InputField = 'lrv' | 'urv' | 'loopTest'

interface Node {
  id: string
  label: string
  value?: string
  children?: Node[]
  action?: () => string
  input?: InputField
  bad?: boolean
  muted?: boolean
}

function statusFlags(s: SessionState, sol: LoopSolution): { label: string; detail: string }[] {
  const out: { label: string; detail: string }[] = []
  if (hasFault(s, 'xmtr_fail_high') || hasFault(s, 'xmtr_fail_low')) {
    out.push({ label: 'Sensor Failure', detail: 'The pressure sensor module has failed. Output is driven to the alarm level. Replace the transmitter or sensor module.' })
    out.push({ label: 'PV Out of Limits', detail: 'Primary variable is outside sensor limits.' })
  }
  if (s.hart.loopTest != null) out.push({ label: 'Loop Current Fixed', detail: 'Analog output is in loop test. End the test to return to PV.' })
  if (sol.pressureSeen > s.xmtr.urv || sol.pressureSeen < s.xmtr.lrv) out.push({ label: 'PV Out of Range', detail: 'Applied pressure is outside the configured LRV–URV. Output is saturated.' })
  return out
}

function buildTree(s: SessionState, sol: LoopSolution, dispatch: (a: Action) => void): Node[] {
  const u = s.scenario.loop.unit
  const pv = sol.pressureSeen
  const ao = sol.xmtrDemand
  const flags = statusFlags(s, sol)
  const good = flags.length === 0
  const v = (id: string, label: string, value: string, extra?: Partial<Node>): Node => ({ id, label, value, ...extra })

  return [
    {
      id: 'overview', label: 'Overview', children: [
        {
          id: 'status', label: 'Device Status', value: good ? 'Good' : 'Failed', bad: !good,
          children: good ? [v('ok', 'No active alerts', '')] : flags.map((f, i) => ({ id: `f${i}`, label: f.label, bad: true, children: [v('d', f.detail, '', { muted: true })] })),
        },
        v('pv', 'Primary Variable', `${pv.toFixed(1)} ${u}`),
        {
          id: 'ao', label: 'Analog Output', value: `${ao.toFixed(2)} mA`, children: [
            v('ma', 'Analog Output', `${ao.toFixed(2)} mA`),
            v('pct', 'Percent of Range', `${pctOfSpan(ao).toFixed(1)} %`),
            v('mode', 'Loop Current Mode', s.hart.loopTest != null ? 'Fixed (loop test)' : 'Enabled'),
          ],
        },
        {
          id: 'range', label: 'Range Values', value: `${s.xmtr.lrv} – ${s.xmtr.urv} ${u}`, children: [
            v('urv', 'Upper Range Value', `${s.xmtr.urv} ${u}`),
            v('lrv', 'Lower Range Value', `${s.xmtr.lrv} ${u}`),
            v('usl', 'Upper Sensor Limit', `2000 ${u}`),
            v('lsl', 'Lower Sensor Limit', `-14.7 ${u}`),
            v('span', 'Minimum Span', `2 ${u}`),
          ],
        },
        {
          id: 'info', label: 'Device Information', children: [
            v('tag', 'Tag', s.scenario.loop.tag),
            v('ltag', 'Long Tag', 'STN4 PUMP1 DISCH PRESS'),
            v('model', 'Model', '3051C'),
            v('type', 'Device Type', 'Pressure Transmitter'),
            v('sn', 'Serial Number', '1024387'),
            v('hrev', 'HART Universal Revision', '7'),
            v('srev', 'Software Revision', '1.1.2'),
            v('poll', 'Polling Address', '0'),
          ],
        },
      ],
    },
    {
      id: 'configure', label: 'Configure', children: [
        {
          id: 'guided', label: 'Guided Setup', children: [
            {
              id: 'basic', label: 'Basic Setup', children: [
                v('tag', 'Tag', s.scenario.loop.tag),
                v('units', 'PV Units', u),
                { id: 'rv', label: 'Range Values', children: [
                  { id: 'lrv', label: 'Lower Range Value', value: `${s.xmtr.lrv} ${u}`, input: 'lrv' },
                  { id: 'urv', label: 'Upper Range Value', value: `${s.xmtr.urv} ${u}`, input: 'urv' },
                ] },
                v('damp', 'Damping', '0.40 s'),
              ],
            },
          ],
        },
        {
          id: 'manual', label: 'Manual Setup', children: [
            { id: 'pvs', label: 'Process Variable', children: [v('units', 'Units', u), v('damp', 'Damping', '0.40 s'), v('xfer', 'Transfer Function', 'Linear')] },
            {
              id: 'aos', label: 'Analog Output', children: [
                { id: 'lrv', label: 'Lower Range Value', value: `${s.xmtr.lrv} ${u}`, input: 'lrv' },
                { id: 'urv', label: 'Upper Range Value', value: `${s.xmtr.urv} ${u}`, input: 'urv' },
                v('alarm', 'Alarm Direction', 'High (≥ 21.6 mA)'),
                v('sat', 'Saturation Levels', '3.8 / 20.5 mA'),
              ],
            },
            { id: 'disp', label: 'Display', children: [v('d1', 'Display Parameter 1', 'PV'), v('d2', 'Display Parameter 2', 'Analog Output')] },
            { id: 'hart', label: 'HART', children: [v('tag', 'Tag', s.scenario.loop.tag), v('ltag', 'Long Tag', 'STN4 PUMP1 DISCH PRESS'), v('poll', 'Polling Address', '0'), v('lcm', 'Loop Current Mode', 'Enabled')] },
            { id: 'sec', label: 'Security', children: [v('wp', 'Write Protect', 'Off')] },
          ],
        },
        { id: 'alerts', label: 'Alert Setup', children: [v('hi', 'Pressure High Alert', 'Not configured'), v('lo', 'Pressure Low Alert', 'Not configured')] },
      ],
    },
    {
      id: 'service', label: 'Service Tools', children: [
        {
          id: 'alerts', label: 'Alerts', value: good ? 'None' : `${flags.length} active`, bad: !good,
          children: good ? [v('none', 'No active alerts', '')] : flags.map((f, i) => ({ id: `a${i}`, label: f.label, bad: true, children: [v('d', f.detail, '', { muted: true })] })),
        },
        {
          id: 'vars', label: 'Variables', children: [
            v('pv', 'Pressure', `${pv.toFixed(1)} ${u}`),
            v('st', 'Sensor Temperature', '68.2 °F'),
            v('ao', 'Analog Output', `${ao.toFixed(2)} mA`),
            v('pct', 'Percent of Range', `${pctOfSpan(ao).toFixed(1)} %`),
          ],
        },
        { id: 'trends', label: 'Trends', children: [v('pv', 'Pressure (live)', `${pv.toFixed(1)} ${u}`)] },
        {
          id: 'maint', label: 'Maintenance', children: [
            {
              id: 'routine', label: 'Routine Maintenance', children: [
                {
                  id: 'loop', label: 'Loop Test', value: s.hart.loopTest != null ? `${s.hart.loopTest} mA` : '', children: [
                    { id: '4', label: 'Set 4 mA', action: () => { dispatch({ type: 'hartLoopTest', ma: 4 }); return 'Output fixed at 4 mA' } },
                    { id: '20', label: 'Set 20 mA', action: () => { dispatch({ type: 'hartLoopTest', ma: 20 }); return 'Output fixed at 20 mA' } },
                    { id: 'other', label: 'Other value…', input: 'loopTest' },
                    { id: 'end', label: 'End Loop Test', action: () => { dispatch({ type: 'hartLoopTest', ma: null }); return 'Output returned to PV' } },
                  ],
                },
                {
                  id: 'setrange', label: 'Set Range Values', children: [
                    { id: 'enter', label: 'Enter Values', children: [
                      { id: 'lrv', label: 'Lower Range Value', value: `${s.xmtr.lrv} ${u}`, input: 'lrv' },
                      { id: 'urv', label: 'Upper Range Value', value: `${s.xmtr.urv} ${u}`, input: 'urv' },
                    ] },
                    { id: 'apply', label: 'Apply Values', children: [
                      v('now', 'Applied pressure', `${pv.toFixed(1)} ${u}`, { muted: true }),
                      { id: 'lrv', label: 'Set LRV to applied pressure', action: () => { dispatch({ type: 'hartApply', which: 'lrv' }); return 'LRV set' } },
                      { id: 'urv', label: 'Set URV to applied pressure', action: () => { dispatch({ type: 'hartApply', which: 'urv' }); return 'URV set' } },
                    ] },
                  ],
                },
              ],
            },
            {
              id: 'cal', label: 'Calibration', children: [
                { id: 'aotrim', label: 'Analog Output Trim', children: [v('n', 'D/A trim requires a reference meter in series. Not modeled in this scenario.', '', { muted: true })] },
                { id: 'sensor', label: 'Sensor Trim', children: [
                  { id: 'zero', label: 'Zero Trim', action: () => { dispatch({ type: 'hartZeroTrim' }); return 'Zero trim requested' } },
                  v('lower', 'Lower Sensor Trim', 'Reference required', { muted: true }),
                  v('upper', 'Upper Sensor Trim', 'Reference required', { muted: true }),
                ] },
              ],
            },
            v('restore', 'Restore Factory Defaults', 'Locked', { muted: true }),
          ],
        },
        { id: 'sim', label: 'Simulate', children: [v('n', 'Simulation not supported by this device revision.', '', { muted: true })] },
      ],
    },
  ]
}

export function Trex({ state, sol, dispatch }: Props) {
  const [path, setPath] = useState<string[]>(['overview'])
  const [app, setApp] = useState<'home' | 'hart'>('home')
  const [entry, setEntry] = useState<{ field: InputField; title: string; buf: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const connected = state.hart.connected
  const reachable = sol.hartReachable
  const tree = buildTree(state, sol, dispatch)

  // resolve current node list
  let nodes: Node[] = tree
  let title = 'Field Communicator'
  for (const id of path) {
    const n = nodes.find((x) => x.id === id)
    if (!n) break
    title = n.label
    nodes = n.children ?? []
  }
  const atRoot = path.length <= 1
  const tab = path[0]

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 1800)
  }

  const open = (n: Node) => {
    if (n.input) {
      setEntry({ field: n.input, title: n.label, buf: '' })
      return
    }
    if (n.action) {
      flash(n.action())
      return
    }
    if (n.children) setPath([...path, n.id])
  }

  const commitEntry = () => {
    if (!entry) return
    const val = Number(entry.buf)
    if (!Number.isFinite(val) || entry.buf === '') { setEntry(null); return }
    if (entry.field === 'lrv') dispatch({ type: 'hartSetRange', lrv: val, urv: state.xmtr.urv })
    else if (entry.field === 'urv') dispatch({ type: 'hartSetRange', lrv: state.xmtr.lrv, urv: val })
    else dispatch({ type: 'hartLoopTest', ma: val })
    setEntry(null)
    flash('Sent to device')
  }

  const clock = `${String(8 + Math.floor(state.t / 3600)).padStart(2, '0')}:${String(Math.floor(state.t / 60) % 60).padStart(2, '0')}`

  let screen: React.ReactNode
  if (!connected && app === 'home') {
    screen = (
      <div className="trex-home">
        <div className="trex-apptitle">Field Communicator</div>
        <button className="trex-big" onClick={() => setApp('hart')}>HART</button>
        <button className="trex-big" disabled>FOUNDATION Fieldbus</button>
        <div className="trex-note">Connect the HART leads across the loop at the device, a junction box, or the terminal block.</div>
      </div>
    )
  } else if (!connected) {
    screen = (
      <div className="trex-home">
        <div className="trex-apptitle">HART</div>
        <label className="trex-switch">
          <span>Power the device from Trex</span>
          <input type="checkbox" checked={state.hart.loopPower} onChange={(e) => dispatch({ type: 'hartLoopPower', on: e.target.checked })} />
        </label>
        <div className="trex-note">Loop power is for a device that is disconnected from its loop. Never into a live loop.</div>
        <button className="trex-big primary" onClick={() => { dispatch({ type: 'hartConnect' }); setPath(['overview']) }}>Connect</button>
        <button className="trex-link" onClick={() => setApp('home')}>‹ Back</button>
      </div>
    )
  } else if (!reachable) {
    screen = (
      <div className="trex-home">
        <div className="trex-apptitle">HART</div>
        <div className="trex-nodev">No device found</div>
        <div className="trex-note">{sol.hartBlocked}</div>
        <button className="trex-big" onClick={() => dispatch({ type: 'hartRead' })}>Search again</button>
        <button className="trex-big" onClick={() => { dispatch({ type: 'hartDisconnect' }); setApp('hart') }}>Disconnect</button>
      </div>
    )
  } else if (entry) {
    const kp = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', '.']
    screen = (
      <div className="trex-entry">
        <div className="trex-entrytitle">{entry.title}</div>
        <div className="trex-entryval">{entry.buf || <span className="muted">enter value</span>}</div>
        <div className="trex-keypad">
          {kp.map((k) => <button key={k} onClick={() => setEntry({ ...entry, buf: entry.buf + k })}>{k}</button>)}
          <button onClick={() => setEntry({ ...entry, buf: entry.buf.slice(0, -1) })}>⌫</button>
          <button className="cancel" onClick={() => setEntry(null)}>Cancel</button>
          <button className="ok" onClick={commitEntry}>Enter</button>
        </div>
      </div>
    )
  } else {
    screen = (
      <>
        <div className="trex-list">
          {nodes.map((n) => (
            <button key={n.id} className={`trex-row ${n.bad ? 'bad' : ''} ${n.muted ? 'muted' : ''}`} onClick={() => open(n)} disabled={!n.children && !n.action && !n.input}>
              <span className="trex-rowlabel">{n.label}</span>
              {n.value && <span className="trex-rowval">{n.value}</span>}
              {(n.children || n.input) && <span className="trex-chev">›</span>}
            </button>
          ))}
        </div>
        <div className="trex-tabs">
          {tree.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setPath([t.id])}>{t.label}</button>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="trex">
      <div className="trex-screen">
        <div className="trex-status">
          <span>{connected && reachable ? `● ${state.scenario.loop.tag}` : connected ? '○ HART' : 'AMS Trex'}</span>
          <span>{clock} ▮▮▮▯</span>
        </div>
        {connected && reachable && !entry && (
          <div className="trex-header">
            <button className="trex-back" disabled={atRoot} onClick={() => setPath(path.slice(0, -1))}>‹</button>
            <span className="trex-title">{atRoot ? `${state.scenario.loop.tag} · 3051C` : title}</span>
            <button className="trex-back" title="Disconnect" onClick={() => { dispatch({ type: 'hartDisconnect' }); setApp('hart'); setPath(['overview']) }}>⏏</button>
          </div>
        )}
        {screen}
        {toast && <div className="trex-toast">{toast}</div>}
      </div>
      <div className="trex-chin"><span /></div>
    </div>
  )
}
