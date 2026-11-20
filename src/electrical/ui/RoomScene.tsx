import type { Action } from '../engine'
import { chargeLampOn, relayLit } from '../engine'
import type { ElecState, LockTarget } from '../types'
import type { SceneProps } from './common'
import { Hotspot, TP } from './common'
import { LeadLayer } from '../../components/LeadLayer'
import bucketImg from './assets/bucket480.jpg'

interface Props extends SceneProps {
  dispatch: (a: Action) => void
  onLabel: () => void
}

/** A JK-style isolation switch handle with hasp, lock and tag. */
function Handle({ s, x, y, target, dispatch, big }: { s: ElecState; x: number; y: number; target: LockTarget; dispatch: (a: Action) => void; big?: boolean }) {
  const on = s.closed[target]
  const r = big ? 15 : 11
  return (
    <g>
      <g className="hotspot-g" onClick={() => dispatch({ type: 'switch', target, closed: !on })}>
        <rect x={x - 14} y={y - 34} width="28" height="68" rx="4" fill="#2b2d2f" stroke="#111" />
        <text x={x} y={y - 22} textAnchor="middle" className="tiny-light" style={{ fontSize: 6 }}>ON</text>
        <text x={x} y={y + 30} textAnchor="middle" className="tiny-light" style={{ fontSize: 6 }}>OFF</text>
        <circle cx={x} cy={y} r={r} fill="#202224" stroke="#000" strokeWidth="2" />
        <rect x={x - 3} y={y - r - 4} width="6" height={2 * r + 8} rx="2" fill={on ? '#d62828' : '#cfd3d6'} transform={on ? '' : `rotate(90 ${x} ${y})`} />
        <title>{on ? 'Open (handle to OFF)' : 'Close (handle to ON)'}</title>
      </g>
      <g className="hotspot-g" onClick={() => dispatch({ type: 'lock', target, on: !s.locks[target] })}>
        <rect x={x - 8} y={y + 38} width="16" height="8" fill="#777" stroke="#333" />
        {s.locks[target] && (
          <g>
            <rect x={x - 10} y={y + 46} width="20" height="16" rx="3" fill="#d62828" stroke="#5a0000" />
            <path d={`M${x - 6} ${y + 46} v-6 a6 6 0 0 1 12 0 v6`} fill="none" stroke="#bbb" strokeWidth="2.5" />
          </g>
        )}
        <title>{s.locks[target] ? 'Remove lock' : 'Apply personal lock to hasp'}</title>
      </g>
      {s.tags[target] && (
        <g>
          <rect x={x + 12} y={y + 44} width="30" height="20" fill="#ffd100" stroke="#333" />
          <text x={x + 27} y={y + 53} textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700, fontSize: 6 }}>DANGER</text>
          <text x={x + 27} y={y + 60} textAnchor="middle" className="tiny-dark" style={{ fontSize: 4.5 }}>DO NOT OPERATE</text>
        </g>
      )}
    </g>
  )
}

function Danger({ x, y, w = 34, h = 44, volts }: { x: number; y: number; w?: number; h?: number; volts?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#999" />
      <rect x={x} y={y} width={w} height={h * 0.22} fill="#c8102e" />
      <text x={x + w / 2} y={y + h * 0.16} textAnchor="middle" style={{ fontSize: 4.5, fontWeight: 800, fill: '#fff' }}>⚠ DANGER</text>
      <path d={`M${x + w / 2 - 2} ${y + h * 0.32} l4 0 l-3 6 l4 0 l-6 9 l2 -6 l-4 0 z`} fill="#111" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={x + 3} y={y + h * 0.66 + i * 4} width={w - 6} height="1.5" fill="#bbb" />)}
      {volts && <g><rect x={x} y={y + h + 2} width={w} height="10" fill="#f28a1f" /><text x={x + w / 2} y={y + h + 9.5} textAnchor="middle" style={{ fontSize: 6, fontWeight: 800, fill: '#111' }}>{volts}</text></g>}
    </g>
  )
}

function Volts({ x, y, text, w = 46 }: { x: number; y: number; text: string; w?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="11" fill="#f28a1f" stroke="#b45f0a" />
      <text x={x + w / 2} y={y + 8.5} textAnchor="middle" style={{ fontSize: 6.5, fontWeight: 800, fill: '#111' }}>{text}</text>
    </g>
  )
}

export function RoomScene({ state, onProbe, dispatch, onLabel, leads, onDrop, overlay }: Props) {
  const s = state
  const lit = relayLit(s)
  return (
    <svg viewBox="0 0 960 600" className="scene">
      <defs>
        <linearGradient id="rWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#eceee9" /><stop offset="1" stopColor="#cfd2cc" /></linearGradient>
        <linearGradient id="rFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f2124" /><stop offset="1" stopColor="#0a0b0c" /></linearGradient>
        <linearGradient id="rCab" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a9b0ae" /><stop offset="0.5" stopColor="#c3c9c6" /><stop offset="1" stopColor="#9aa19f" /></linearGradient>
        <linearGradient id="rCabDark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8d9593" /><stop offset="0.5" stopColor="#aab1ae" /><stop offset="1" stopColor="#7f8785" /></linearGradient>
        <pattern id="rPlate" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="url(#rFloor)" /><path d="M2 6 l3 -3 M6 10 l3 -3" stroke="#33373b" strokeWidth="1.2" /></pattern>
      </defs>
      <rect width="960" height="470" fill="url(#rWall)" />
      <rect y="470" width="960" height="130" fill="url(#rPlate)" />
      <line x1="0" y1="470" x2="960" y2="470" stroke="#3a3d41" strokeWidth="3" />

      {/* ---------- Allen-Bradley CENTERLINE 2100, 480 V ---------- */}
      <g>
        <rect x="20" y="40" width="420" height="440" fill="url(#rCabDark)" stroke="#5e6563" strokeWidth="3" />
        <rect x="20" y="40" width="420" height="30" fill="#2f3b52" />
        <rect x="28" y="46" width="30" height="18" fill="#1d4f9a" /><text x="43" y="59" textAnchor="middle" style={{ fontSize: 8, fontWeight: 900, fill: '#fff' }}>AB</text>
        <text x="66" y="60" style={{ fontSize: 11, fontWeight: 800, fill: '#fff' }}>Allen-Bradley</text>
        <text x="300" y="59" style={{ fontSize: 7, fontWeight: 700, fill: '#cfd8e8' }}>CENTERLINE® 2100</text>
        {/* main section */}
        <rect x="26" y="76" width="120" height="398" fill="url(#rCab)" stroke="#6b7270" />
        <Volts x={34} y={84} text="480 VOLTS" />
        <Danger x={36} y={150} volts="480 V" />
        <g className="hotspot-g"><rect x="96" y="300" width="28" height="80" rx="4" fill="#2b2d2f" stroke="#111" /><circle cx="110" cy="340" r="12" fill="#202224" stroke="#000" strokeWidth="2" /><rect x="107" y="320" width="6" height="40" rx="2" fill="#d62828" /><title>MCC main: not part of this lockout</title></g>
        <text x="86" y="400" textAnchor="middle" className="tiny-dark">MAIN</text>
        <text x="86" y="410" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>not in this lockout</text>
        {/* bucket column */}
        {[0, 1, 2, 3].map((row) => {
          const y = 76 + row * 100
          const isAux = row === 1
          return (
            <g key={row}>
              <rect x="150" y={y} width="140" height="96" fill="url(#rCab)" stroke="#6b7270" />
              <rect x="158" y={y + 6} width="56" height="12" fill="#f4f4f0" stroke="#999" />
              <text x="186" y={y + 15} textAnchor="middle" style={{ fontSize: 5, fill: '#222' }}>{isAux ? '3B · VFD-2 AUX' : ['MTR-702 OIL COOLER FAN', '3C · SPARE', 'HVAC-2'][row === 0 ? 0 : row - 1]}</text>
              <Volts x={158} y={y + 22} text="480 VOLTS" w={52} />
              <circle cx="230" cy={y + 36} r="5" fill={isAux && !s.closed.aux ? '#5a1b1b' : '#e03b3b'} stroke="#333" />
              <circle cx="230" cy={y + 56} r="5" fill={isAux && s.closed.aux ? '#1f8f3e' : '#114d22'} stroke="#333" />
              <text x="246" y={y + 39} className="tiny-dark" style={{ fontSize: 5 }}>RUNNING</text>
              <text x="246" y={y + 59} className="tiny-dark" style={{ fontSize: 5 }}>STOPPED</text>
              {isAux ? <Handle s={s} x={272} y={y + 44} target="aux" dispatch={dispatch} /> : <g><rect x="258" y={y + 10} width="28" height="68" rx="4" fill="#2b2d2f" stroke="#111" /><circle cx="272" cy={y + 44} r="11" fill="#202224" stroke="#000" strokeWidth="2" /><rect x="269" y={y + 29} width="6" height="30" rx="2" fill="#d62828" /></g>}
              {isAux && (
                <g className="hotspot" onClick={() => dispatch({ type: 'auxDoor', open: !s.auxDoorOpen })}>
                  <rect x="156" y={y + 70} width="92" height="20" rx="4" />
                  <text x="202" y={y + 84} textAnchor="middle">{s.auxDoorOpen ? 'close bucket' : 'open bucket'}</text>
                  <title>{s.closed.aux && !s.auxDoorOpen ? 'Door interlock: handle must be OFF before the door opens' : s.auxDoorOpen ? 'Close and latch the door' : 'Release the latches and open the door'}</title>
                </g>
              )}
            </g>
          )
        })}
        {/* panelboard LP-1 */}
        <rect x="300" y="290" width="132" height="184" fill="url(#rCab)" stroke="#6b7270" />
        <rect x="308" y="296" width="80" height="12" fill="#f4f4f0" stroke="#999" />
        <text x="348" y="305" textAnchor="middle" style={{ fontSize: 5.5, fill: '#222', fontWeight: 700 }}>PANELBOARD LP-1</text>
        <Volts x={308} y={312} text="240 VOLTS" w={52} />
        {[1, 3, 5, 7, 9, 11].map((n, i) => {
          const y = 332 + i * 20
          const isSeven = n === 7
          const on = isSeven ? s.closed.ctrl : true
          return (
            <g key={n} className={isSeven ? 'hotspot-g' : ''} onClick={isSeven ? () => dispatch({ type: 'switch', target: 'ctrl', closed: !s.closed.ctrl }) : undefined}>
              <text x="314" y={y + 10} className="tiny-dark">{n}</text>
              <rect x="326" y={y} width="32" height="14" fill="#222" rx="2" />
              <rect x={on ? 344 : 329} y={y + 2} width="11" height="10" fill={on ? '#e03b3b' : '#ccc'} rx="1" />
              <text x="364" y={y + 10} className="tiny-dark" style={{ fontSize: 5 }}>{isSeven ? 'VFD-2 CTRL 120V' : ['LTG', 'RECEPT', 'HTR', '', 'SPARE', 'SPARE'][i]}</text>
              {isSeven && <title>{s.closed.ctrl ? 'Open LP-1 ckt 7' : 'Close LP-1 ckt 7'}</title>}
            </g>
          )
        })}
        <g className="hotspot-g" onClick={() => dispatch({ type: 'lock', target: 'ctrl', on: !s.locks.ctrl })}>
          <rect x="326" y="456" width="32" height="8" fill="#777" stroke="#333" />
          {s.locks.ctrl && <g><rect x="332" y="464" width="20" height="12" rx="3" fill="#d62828" stroke="#5a0000" /><path d="M336 464 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="#bbb" strokeWidth="2.5" /></g>}
          <title>{s.locks.ctrl ? 'Remove lock from ckt 7 lockout' : 'Apply breaker lockout and lock to ckt 7'}</title>
        </g>
        {s.tags.ctrl && <g><rect x="364" y="452" width="30" height="20" fill="#ffd100" stroke="#333" /><text x="379" y="461" textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700, fontSize: 6 }}>DANGER</text></g>}
      </g>

      {/* ---------- bucket 3B open: combination starter photo with the 789 points and the handle mapped on it ---------- */}
      {s.auxDoorOpen && (
        <g>
          <rect x="24" y="100" width="412" height="372" rx="6" fill="#2b2f33" stroke="#f5a524" strokeWidth="2" />
          <text x="230" y="116" textAnchor="middle" className="tiny-light" style={{ fontSize: 8, fontWeight: 700 }}>CENTERLINE 2100 · BUCKET 3B · VFD-2 AUX · DOOR OPEN · {s.closed.aux ? '480 V LIVE' : 'HANDLE OFF'}</text>
          <image href={bucketImg} x="30" y="122" width="400" height="330" preserveAspectRatio="xMidYMid meet" />
          {/* rotary disconnect handle on the right flange operates the bucket */}
          <g className="hotspot-g" onClick={() => dispatch({ type: 'switch', target: 'aux', closed: !s.closed.aux })}>
            <rect x="364" y="250" width="62" height="160" fill="#fff" fillOpacity="0.02" stroke="#f5a524" strokeDasharray="4 3" />
            <title>{s.closed.aux ? 'Rotate the disconnect handle to OFF' : 'Door interlock: handle stays OFF until the door is closed'}</title>
          </g>
          <text x="395" y="420" textAnchor="middle" className="hint">handle · {s.closed.aux ? 'ON' : 'OFF'}</text>
          <g className="hotspot-g" onClick={() => dispatch({ type: 'lock', target: 'aux', on: !s.locks.aux })}>
            <rect x="386" y="426" width="16" height="8" fill="#777" stroke="#333" />
            {s.locks.aux && <g><rect x="384" y="434" width="20" height="14" rx="3" fill="#d62828" stroke="#5a0000" /><path d="M388 434 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="#bbb" strokeWidth="2.5" /></g>}
            <title>{s.locks.aux ? 'Remove lock' : 'Apply personal lock to the handle hasp'}</title>
          </g>
          {s.tags.aux && <g><rect x="408" y="430" width="24" height="16" fill="#ffd100" stroke="#333" /><text x="420" y="440" textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700, fontSize: 5 }}>DANGER</text></g>}
          {/* load terminals T1 T2 T3 and the enclosure ground */}
          <TP state={s} id="AUX_T1" x={289} y={399} label="T1" side="bottom" onProbe={onProbe} />
          <TP state={s} id="AUX_T2" x={311} y={399} label="T2" side="bottom" onProbe={onProbe} />
          <TP state={s} id="AUX_T3" x={332} y={399} label="T3" side="bottom" onProbe={onProbe} />
          <TP state={s} id="AUX_G" x={66} y={428} label="G" side="right" onProbe={onProbe} />
          <text x="110" y="446" className="tiny-light" style={{ fontSize: 6 }}>HMCP breaker · NEMA contactor + overload · control terminals left · load terminals T1 T2 T3 right</text>
          <g className="hotspot" onClick={() => dispatch({ type: 'auxDoor', open: false })}>
            <rect x="30" y="458" width="110" height="12" rx="3" />
            <text x="85" y="467" textAnchor="middle" style={{ fontSize: 8 }}>close bucket door</text>
          </g>
        </g>
      )}

      {/* ---------- Toshiba JK series MV controller, 4160 V ---------- */}
      <g transform="translate(22 0)">
        <rect x="462" y="30" width="456" height="450" fill="url(#rCabDark)" stroke="#5e6563" strokeWidth="3" />
        <rect x="462" y="30" width="456" height="26" fill="#3a4044" />
        <text x="480" y="48" style={{ fontSize: 11, fontWeight: 900, fill: '#e03b3b', letterSpacing: 2 }}>TOSHIBA</text>
        <text x="560" y="47" style={{ fontSize: 6, fill: '#ddd' }}>MEDIUM VOLTAGE CONTROLLER</text>
        <text x="900" y="48" textAnchor="end" style={{ fontSize: 10, fontWeight: 800, fill: '#fff' }}>JK SERIES</text>

        {/* M12 bypass section */}
        <rect x="468" y="62" width="150" height="412" fill="url(#rCab)" stroke="#6b7270" />
        <rect x="476" y="68" width="70" height="14" fill="#f4f4f0" stroke="#999" />
        <text x="511" y="78" textAnchor="middle" style={{ fontSize: 5, fill: '#222', fontWeight: 700 }}>M12 BYPASS MOTOR #2</text>
        <Danger x={556} y={72} volts="4160 V" />
        <Handle s={s} x={520} y={140} target="bypass" dispatch={dispatch} big />
        <text x="520" y="214" textAnchor="middle" className="tiny-dark" style={{ fontSize: 5.5 }}>BYPASS ISOLATION SWITCH</text>
        <rect x="474" y="230" width="138" height="2" fill="#6b7270" />
        <g className="hotspot-g" onClick={onLabel}>
          <rect x="478" y="240" width="76" height="54" fill="#fff" stroke="#333" />
          <rect x="478" y="240" width="76" height="12" fill="#f26b00" />
          <text x="516" y="249" textAnchor="middle" style={{ fontSize: 6, fontWeight: 800, fill: '#000' }}>⚠ WARNING</text>
          <text x="516" y="261" textAnchor="middle" style={{ fontSize: 4.5, fill: '#111', fontWeight: 700 }}>ARC FLASH AND SHOCK HAZARD</text>
          <text x="482" y="271" style={{ fontSize: 4.3, fill: '#111' }}>{s.scenario.label.incidentEnergy} cal/cm² @ {s.scenario.label.workingDistance} in</text>
          <text x="482" y="279" style={{ fontSize: 4.3, fill: '#111' }}>AFB {s.scenario.label.arcFlashBoundary} in · {s.scenario.label.voltage} V</text>
          <text x="482" y="287" style={{ fontSize: 4.3, fill: '#111' }}>Glove class {s.scenario.label.gloveClass}</text>
          <text x="516" y="304" textAnchor="middle" className="hint">click to read label</text>
          <title>Read the arc flash label</title>
        </g>
        <rect x="562" y="240" width="50" height="40" fill="#fff" stroke="#999" />
        <rect x="562" y="240" width="50" height="9" fill="#f28a1f" /><text x="587" y="247" textAnchor="middle" style={{ fontSize: 4.5, fontWeight: 800 }}>⚠ WARNING</text>
        <text x="587" y="258" textAnchor="middle" style={{ fontSize: 4, fill: '#111', fontWeight: 700 }}>CONNECTION MOTOR</text>
        <text x="587" y="265" textAnchor="middle" style={{ fontSize: 4, fill: '#111' }}>P-310 (U, V, W)</text>
        <text x="587" y="273" textAnchor="middle" style={{ fontSize: 4, fill: '#111' }}>4,160 Vac</text>
        <Volts x={476} y={310} text="4160 VOLTS" />
        <rect x="474" y="330" width="138" height="138" fill="url(#rCab)" stroke="#6b7270" />
        {Array.from({ length: 12 }, (_, i) => <rect key={i} x="494" y={420 + i * 3.6} width="90" height="1.6" fill="#6b7270" />)}
        <g className="hotspot" onClick={() => { dispatch({ type: 'door', open: true }); dispatch({ type: 'goto', scene: 'compartment' }) }}>
          <rect x="480" y="346" width="126" height="26" rx="4" />
          <text x="543" y="363" textAnchor="middle">motor connection compartment</text>
        </g>
        <text x="543" y="396" textAnchor="middle" className="tiny-dark" style={{ fontSize: 5.5 }}>M12 BYPASS · 4000 HP · lower door</text>

        {/* M22 VFD section with the power isolation switch and the relay door */}
        <rect x="622" y="62" width="160" height="412" fill="url(#rCab)" stroke="#6b7270" />
        <rect x="630" y="68" width="76" height="14" fill="#f4f4f0" stroke="#999" />
        <text x="668" y="78" textAnchor="middle" style={{ fontSize: 5, fill: '#222', fontWeight: 700 }}>M22 VFD OUTPUT MOTOR #2</text>
        <Danger x={720} y={72} volts="4160 V" />
        <Handle s={s} x={660} y={140} target="mv" dispatch={dispatch} big />
        <text x="660" y="214" textAnchor="middle" className="tiny-dark" style={{ fontSize: 5.5 }}>POWER ISOLATION SWITCH</text>
        {/* relay door */}
        <rect x="628" y="236" width="148" height="150" fill="url(#rCab)" stroke="#6b7270" />
        <Volts x={722} y={242} text="120 VOLTS" w={48} />
        <g className="hotspot-g" onClick={() => dispatch({ type: 'relay', key: 'RESET' })}>
          <rect x="636" y="250" width="56" height="78" fill="#1b1d21" stroke="#000" rx="3" />
          <rect x="641" y="256" width="46" height="34" fill={lit ? '#dfe7cf' : '#2a2d33'} stroke="#444" />
          <text x="664" y="270" textAnchor="middle" style={{ fontSize: 5, fontWeight: 800, fill: lit ? '#1c2a1c' : '#444' }}>{lit ? s.drive.display : ''}</text>
          <text x="664" y="280" textAnchor="middle" style={{ fontSize: 3.8, fill: lit ? '#2f4a2f' : '#444' }}>{lit ? (s.drive.faulted ? s.scenario.drive.faultText : 'P-310 · 4160 V · ' + (s.drive.running ? '394 A' : '0 A')) : ''}</text>
          {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={644 + (i % 4) * 11} cy={300 + Math.floor(i / 4) * 10} r="2.2" fill={lit ? (i === 0 ? '#3ddc84' : i === 1 && s.drive.faulted ? '#ff2d2d' : '#3a3d42') : '#2a2d33'} />)}
          <text x="664" y="324" textAnchor="middle" style={{ fontSize: 4, fill: '#aaa' }}>MPR</text>
          <title>Motor protection relay. Use the Relay tab to START, STOP and RESET.</title>
        </g>
        <circle cx="712" cy="262" r="6" fill="#e03b3b" stroke="#333" /><circle cx="736" cy="262" r="6" fill={s.drive.running ? '#2fd36d' : '#1f8f3e'} stroke="#333" />
        <circle cx="724" cy="290" r="9" fill="#d62828" stroke="#5a0000" strokeWidth="2" /><circle cx="724" cy="290" r="13" fill="none" stroke="#f2d21b" strokeWidth="2" />
        <circle cx="712" cy="318" r="6" fill="#e03b3b" stroke="#333" /><circle cx="736" cy="318" r="6" fill="#1f8f3e" stroke="#333" />
        <text x="724" y="306" textAnchor="middle" style={{ fontSize: 3.5, fill: '#222' }}>E-STOP</text>
        {/* control terminal strip behind the relay door */}
        <rect x="636" y="340" width="100" height="22" fill="#5a5f66" stroke="#222" />
        <text x="686" y="337" textAnchor="middle" className="tiny-dark" style={{ fontSize: 5 }}>X1 · 120 V CONTROL · from LP-1 ckt 7</text>
        <TP state={s} id="CTRL_H" x={660} y={351} label="1" side="bottom" onProbe={onProbe} />
        <TP state={s} id="CTRL_N" x={712} y={351} label="2 (N)" side="bottom" onProbe={onProbe} />
        <rect x="628" y="394" width="148" height="74" fill="url(#rCab)" stroke="#6b7270" />
        {Array.from({ length: 10 }, (_, i) => <rect key={i} x="648" y={420 + i * 4} width="100" height="1.6" fill="#6b7270" />)}
        <text x="702" y="412" textAnchor="middle" className="tiny-dark" style={{ fontSize: 5.5 }}>cell cabinet · CHARGE {chargeLampOn(s) ? '●' : '○'}</text>
        <circle cx="760" cy="410" r="4" fill={chargeLampOn(s) ? '#ff2d2d' : '#4a1010'} stroke="#222" />

        {/* M32 isolation contactor section */}
        <rect x="786" y="62" width="148" height="412" fill="url(#rCab)" stroke="#6b7270" />
        <rect x="794" y="68" width="74" height="14" fill="#f4f4f0" stroke="#999" />
        <text x="831" y="78" textAnchor="middle" style={{ fontSize: 5, fill: '#222', fontWeight: 700 }}>M32 VFD #2 ISOLATION CONTACTOR</text>
        <Danger x={880} y={72} volts="4160 V" />
        <rect x="794" y="236" width="132" height="150" fill="url(#rCab)" stroke="#6b7270" />
        <circle cx="820" cy="262" r="6" fill="#e03b3b" stroke="#333" /><circle cx="844" cy="262" r="6" fill="#1f8f3e" stroke="#333" />
        <Volts x={864} y={244} text="120 VOLTS" w={48} />
        <text x="860" y="300" textAnchor="middle" className="tiny-dark" style={{ fontSize: 5.5 }}>M32 contactor {s.closed.ctrl ? 'held in by 120 V control' : 'dropped out'}</text>
        {/* adjacent live feeder for proving the TIC */}
        <rect x="794" y="394" width="132" height="74" fill="url(#rCab)" stroke="#6b7270" />
        <rect x="804" y="402" width="60" height="30" fill="#1b1d21" stroke="#000" />
        <rect x="808" y="406" width="52" height="22" fill="#3b4a66" opacity="0.8" />
        <TP state={s} id="PROVE_MV" x={834} y={417} onProbe={onProbe} />
        <text x="834" y="446" textAnchor="middle" className="tiny-dark" style={{ fontSize: 5.5 }}>M42 FEEDER · LIVE · viewing window</text>
        <text x="834" y="455" textAnchor="middle" className="hint">live 4160 V · HIGH range check</text>
      </g>

      {/* GFCI receptacle on the wall between the lineups: known live 120 V source for the 789 */}
      <g>
        <text x="462" y="218" textAnchor="middle" className="hint">120 V GFCI</text>
        <rect x="443" y="226" width="38" height="64" rx="3" fill="#f3f1ea" stroke="#9a9a94" />
        <rect x="449" y="231" width="26" height="54" rx="2" fill="#e9e7df" stroke="#b5b3ab" />
        <circle cx="462" cy="229" r="1" fill="#777" /><circle cx="462" cy="287" r="1" fill="#777" />
        {/* top outlet: neutral slot (wide) left, hot slot right, ground below */}
        <rect x="452.5" y="236" width="2.2" height="7" fill="#222" /><rect x="468" y="237" width="1.8" height="6" fill="#222" />
        <path d="M459.5 252 a2.5 2.5 0 0 1 5 0 v1.5 h-5 z" fill="#222" />
        {/* RESET and TEST */}
        <rect x="453" y="257" width="8" height="6" rx="1" fill="#2a2a2a" stroke="#111" /><text x="457" y="261.6" textAnchor="middle" style={{ fontSize: 2.6, fontWeight: 700, fill: '#fff' }}>RESET</text>
        <rect x="463" y="257" width="8" height="6" rx="1" fill="#e4e4e0" stroke="#999" /><text x="467" y="261.6" textAnchor="middle" style={{ fontSize: 2.6, fontWeight: 700, fill: '#222' }}>TEST</text>
        <circle cx="457" cy="266.5" r="1.2" fill="#3ddc84" />
        {/* bottom outlet */}
        <rect x="452.5" y="269" width="2.2" height="7" fill="#222" /><rect x="468" y="270" width="1.8" height="6" fill="#222" />
        <path d="M459.5 282 a2.5 2.5 0 0 1 5 0 v1.5 h-5 z" fill="#222" />
        <TP state={s} id="RECEPT_N" x={453} y={272} onProbe={onProbe} ghost />
        <TP state={s} id="RECEPT_H" x={469} y={272} onProbe={onProbe} ghost />
        <TP state={s} id="RECEPT_G" x={462} y={285} onProbe={onProbe} ghost />
      </g>

      <Hotspot x={760} y={510} w={170} h={36} label="Walk to P-310 motor →" onClick={() => dispatch({ type: 'goto', scene: 'motor' })} />
      <text x="40" y="520" className="scene-note" style={{ fill: '#d8dbdf' }}>Arc flash boundary from the label is {s.scenario.label.arcFlashBoundary} in. Anyone inside it needs the PPE.</text>
      <LeadLayer leads={leads} height={600} onDrop={onDrop} />
      {overlay}
    </svg>
  )
}
