import type { Action } from '../engine'
import { chargeLampOn, contactorClosed, keypadLit } from '../engine'
import type { SceneProps } from './common'
import { Hotspot, TP } from './common'

interface Props extends SceneProps {
  dispatch: (a: Action) => void
}

export function DriveScene({ state, onProbe, dispatch }: Props) {
  const s = state
  const lamp = chargeLampOn(s)
  const lit = keypadLit(s)
  const closed = contactorClosed(s)
  const term = (i: number) => 350 + i * 40
  return (
    <svg viewBox="0 0 960 600" className="scene">
      <defs>
        <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9ebe6" /><stop offset="1" stopColor="#cfd2cc" /></linearGradient>
        <linearGradient id="drive" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2a2c30" /><stop offset="0.5" stopColor="#3c3f45" /><stop offset="1" stopColor="#24262a" /></linearGradient>
        <linearGradient id="fins" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7d8288" /><stop offset="1" stopColor="#4a4e54" /></linearGradient>
      </defs>
      {/* enclosure interior */}
      <rect width="960" height="600" fill="#9ea3a8" />
      <rect x="60" y="20" width="840" height="560" fill="url(#panel)" stroke="#6b7076" strokeWidth="4" />
      <text x="480" y="16" textAnchor="middle" className="scene-h">VFD-101 CABINET · DOOR OPEN · {s.mccClosed ? '480 V PRESENT' : 'MAIN OPEN'} · {s.lp2Closed ? '120 V CONTROL LIVE' : 'CONTROL DEAD'}</text>

      {/* incoming power conduit */}
      <rect x="100" y="20" width="36" height="120" fill="#777" stroke="#444" />
      <text x="118" y="152" textAnchor="middle" className="hint">from MCC-3 3B</text>
      {[0, 1, 2].map((i) => <path key={i} d={`M${108 + i * 10} 140 C ${108 + i * 10} 260, ${term(i)} 300, ${term(i)} 380`} fill="none" stroke="#111" strokeWidth="6" />)}

      {/* drive unit */}
      <rect x="320" y="60" width="330" height="330" fill="url(#drive)" stroke="#111" strokeWidth="2" rx="6" />
      <rect x="330" y="68" width="310" height="36" fill="url(#fins)" />
      {Array.from({ length: 28 }, (_, i) => <line key={i} x1={336 + i * 11} y1="68" x2={336 + i * 11} y2="104" stroke="#2c2f33" strokeWidth="2" />)}
      <text x="485" y="130" textAnchor="middle" className="brand-light">TOSHIBA</text>
      <text x="485" y="146" textAnchor="middle" className="tiny-light">TOSVERT VF-AS3 · 100 HP · 480 V</text>
      {/* keypad on the unit */}
      <rect x="400" y="160" width="170" height="110" fill="#15171a" stroke="#000" rx="4" />
      <rect x="412" y="170" width="146" height="40" fill={lit ? '#0b2a1e' : '#0d100f'} stroke="#263" />
      <text x="485" y="199" textAnchor="middle" className="seg" fill={lit ? '#3ddc84' : '#1f2d26'}>{lit ? s.drive.display : ''}</text>
      <circle cx="420" cy="230" r="7" fill={s.drive.running ? '#3ddc84' : '#143a26'} /><text x="432" y="234" className="tiny-light">RUN</text>
      <circle cx="470" cy="230" r="7" fill={s.drive.faulted && lit ? '#ff2d2d' : '#3a1414'} /><text x="482" y="234" className="tiny-light">TRIP</text>
      <text x="485" y="262" textAnchor="middle" className="hint">use the Keypad tab</text>
      <circle cx="620" cy="300" r="7" fill={lamp ? '#ff2d2d' : '#4a1010'} stroke="#000" />
      {lamp && <circle cx="620" cy="300" r="12" fill="#ff2d2d" opacity="0.25" />}
      <text x="620" y="322" textAnchor="middle" className="tiny-light">CHARGE</text>
      <text x="485" y="350" textAnchor="middle" className="tiny-light">⚠ WAIT 15 MIN AFTER POWER OFF · CHECK CHARGE LAMP · DC BUS UP TO 800 V</text>

      {/* terminal strip */}
      <rect x="330" y="372" width="330" height="30" fill="#5a5f66" stroke="#222" />
      {(['L1', 'L2', 'L3', 'DC_P', 'DC_N', 'U', 'V', 'W'] as const).map((id, i) => (
        <TP key={id} state={s} id={id} x={term(i)} y={387} label={['R/L1', 'S/L2', 'T/L3', 'PA/+', 'PC/−', 'U/T1', 'V/T2', 'W/T3'][i]} side="bottom" onProbe={onProbe} />
      ))}

      {/* output wiring to 1M */}
      {[5, 6, 7].map((i, k) => <path key={i} d={`M${term(i)} 395 C ${term(i)} 440, ${735 + k * 30} 410, ${735 + k * 30} 440`} fill="none" stroke="#111" strokeWidth="5" />)}
      {/* contactor 1M */}
      <rect x="700" y="440" width="150" height="90" fill="#3b3f46" stroke="#111" rx="4" />
      <text x="775" y="472" textAnchor="middle" className="brand-light" style={{ fontSize: 16 }}>1M</text>
      <text x="775" y="488" textAnchor="middle" className="tiny-light">{closed ? 'PULLED IN' : 'DROPPED OUT'}</text>
      <text x="775" y="500" textAnchor="middle" className="tiny-light">coil 120 V from X1</text>
      {[0, 1, 2].map((k) => <rect key={k} x={728 + k * 30} y="436" width="14" height="8" fill="#c9a44a" />)}
      {[0, 1, 2].map((k) => <rect key={k} x={728 + k * 30} y="526" width="14" height="8" fill="#c9a44a" />)}
      {/* motor leads from 1M load side */}
      {[0, 1, 2].map((k) => {
        const x = 735 + k * 30
        return s.leadsLifted
          ? <path key={k} d={`M${x} 534 C ${x} 560, ${x + 60} 545, ${x + 70} 575`} fill="none" stroke="#c8102e" strokeWidth="6" />
          : <path key={k} d={`M${x} 534 L ${x} 580`} fill="none" stroke="#c8102e" strokeWidth="6" />
      })}
      {s.leadsLifted && (
        <g>
          {[0, 1, 2].map((k) => <rect key={k} x={800 + k * 30} y="566" width="12" height="16" fill="#111" />)}
          <rect x="860" y="540" width="34" height="22" fill="#ffd100" stroke="#333" />
          <text x="877" y="554" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6, fontWeight: 700 }}>LIFTED</text>
        </g>
      )}
      {(['C_T1', 'C_T2', 'C_T3'] as const).map((id, k) => (
        <TP key={id} state={s} id={id} x={s.leadsLifted ? 805 + k * 30 : 735 + k * 30} y={s.leadsLifted ? 560 : 548} label={`T${k + 1}`} side={s.leadsLifted ? 'top' : 'right'} onProbe={onProbe} />
      ))}
      <rect x="700" y="578" width="150" height="8" fill="#777" />
      <text x="775" y="596" textAnchor="middle" className="hint">to P-101M · 3 × 2/0 AWG + G</text>
      <g className="hotspot" onClick={() => dispatch({ type: 'liftLeads', lifted: !s.leadsLifted })}>
        <rect x="860" y="440" width="34" height="90" rx="6" />
        <text x="877" y="480" textAnchor="middle" transform="rotate(90 877 480)">{s.leadsLifted ? 're-land leads' : 'lift leads'}</text>
      </g>

      {/* control terminals X1 */}
      <rect x="120" y="420" width="150" height="30" fill="#5a5f66" stroke="#222" />
      <text x="195" y="412" textAnchor="middle" className="tiny-dark">X1 · 120 V CONTROL · from LP-2 ckt 7</text>
      <TP state={s} id="CTRL_H" x={160} y={435} label="1 (120 V)" side="bottom" onProbe={onProbe} />
      <TP state={s} id="CTRL_N" x={230} y={435} label="2 (N)" side="bottom" onProbe={onProbe} />
      <path d="M160 427 C 160 300, 90 300, 90 200" fill="none" stroke="#222" strokeWidth="3" />
      <path d="M230 427 C 230 310, 100 310, 100 200" fill="none" stroke="#eee" strokeWidth="3" />
      <rect x="80" y="180" width="30" height="24" fill="#777" stroke="#444" />
      <text x="95" y="174" textAnchor="middle" className="hint">LP-2</text>
      <path d="M230 450 C 300 480, 650 470, 760 440" fill="none" stroke="#222" strokeWidth="2" strokeDasharray="4 3" />
      <text x="500" y="462" textAnchor="middle" className="hint">coil circuit to 1M</text>

      {/* ground bar */}
      <rect x="120" y="520" width="180" height="12" fill="#b08d3c" stroke="#5c4a1e" />
      <TP state={s} id="GND" x={210} y={526} label="ground bar" side="bottom" onProbe={onProbe} />
      <path d="M140 526 C 140 500, 100 500, 100 470" fill="none" stroke="#1d8f3b" strokeWidth="4" />

      <Hotspot x={700} y={30} w={190} h={34} label="Close door, back to MCC room" onClick={() => { dispatch({ type: 'door', open: false }); dispatch({ type: 'goto', scene: 'mcc' }) }} />
    </svg>
  )
}
