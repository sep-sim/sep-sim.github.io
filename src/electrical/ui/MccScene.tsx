import type { Action } from '../engine'
import { chargeLampOn, keypadLit } from '../engine'
import type { SceneProps } from './common'
import { Hotspot, TP } from './common'

interface Props extends SceneProps {
  dispatch: (a: Action) => void
  onLabel: () => void
}

export function MccScene({ state, onProbe, dispatch, onLabel }: Props) {
  const s = state
  const lamp = chargeLampOn(s)
  const lit = keypadLit(s)
  return (
    <svg viewBox="0 0 960 600" className="scene">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe1dc" /><stop offset="1" stopColor="#c4c7c2" /></linearGradient>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d7070" /><stop offset="1" stopColor="#4a4c4c" /></linearGradient>
        <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b7bcc0" /><stop offset="0.5" stopColor="#d9dde0" /><stop offset="1" stopColor="#aeb3b7" /></linearGradient>
        <linearGradient id="steelDark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8f949a" /><stop offset="0.5" stopColor="#b2b7bc" /><stop offset="1" stopColor="#868b90" /></linearGradient>
      </defs>
      <rect width="960" height="470" fill="url(#wall)" />
      <rect y="470" width="960" height="130" fill="url(#floor)" />
      <line x1="0" y1="470" x2="960" y2="470" stroke="#3a3c3c" strokeWidth="3" />

      {/* MCC lineup */}
      <g>
        <rect x="30" y="50" width="380" height="440" fill="url(#steelDark)" stroke="#55595e" strokeWidth="3" />
        <text x="220" y="40" textAnchor="middle" className="scene-h">MCC-3 · 480 V 3Ø · STATION 4</text>
        {[0, 1].map((sec) => [0, 1, 2, 3].map((row) => {
          const x = 40 + sec * 190
          const y = 60 + row * 105
          const isTarget = sec === 1 && row === 1
          return (
            <g key={`${sec}-${row}`}>
              <rect x={x} y={y} width="180" height="98" fill="url(#steel)" stroke="#60656a" strokeWidth="1.5" rx="2" />
              <rect x={x + 8} y={y + 8} width="80" height="16" fill="#f4f4f0" stroke="#999" />
              <text x={x + 48} y={y + 20} textAnchor="middle" className="tiny-dark">{isTarget ? '3B · VFD-101 FEED' : `${sec + 3}${'ABCD'[row]}`}</text>
              {!isTarget && <circle cx={x + 150} cy={y + 55} r="14" fill="#2b2d2f" stroke="#111" />}
              {!isTarget && <rect x={x + 148} y={y + 41} width="4" height="28" fill="#ccc" />}
            </g>
          )
        }))}
        {/* bucket 3B handle, hasp, lock, tag */}
        {(() => {
          const x = 230; const y = 165
          const on = s.mccClosed
          return (
            <g>
              <rect x={x + 8} y={y + 30} width="120" height="22" fill="#111" rx="3" />
              <text x={x + 68} y={y + 46} textAnchor="middle" className="tiny-light">{on ? 'ON' : 'OFF'} · 200 A</text>
              <g className="hotspot-g" onClick={() => dispatch({ type: 'breaker', closed: !on })}>
                <circle cx={x + 150} cy={y + 55} r="16" fill="#2b2d2f" stroke="#111" strokeWidth="2" />
                <rect x={x + 148} y={y + 37} width="4" height="36" fill={on ? '#e03b3b' : '#ccc'} transform={on ? '' : `rotate(90 ${x + 150} ${y + 55})`} />
                <title>{on ? 'Open MCC-3 3B (handle to OFF)' : 'Close MCC-3 3B (handle to ON)'}</title>
              </g>
              <g className="hotspot-g" onClick={() => dispatch({ type: 'lock', target: 'mcc', on: !s.locks.mcc })}>
                <rect x={x + 142} y={y + 76} width="16" height="10" fill="#777" stroke="#333" />
                {s.locks.mcc && (
                  <g>
                    <rect x={x + 140} y={y + 86} width="20" height="16" rx="3" fill="#d62828" stroke="#5a0000" />
                    <path d={`M${x + 144} ${y + 86} v-6 a6 6 0 0 1 12 0 v6`} fill="none" stroke="#bbb" strokeWidth="2.5" />
                  </g>
                )}
                <title>{s.locks.mcc ? 'Remove lock' : 'Apply personal lock to hasp'}</title>
              </g>
              {s.tags.mcc && (
                <g>
                  <rect x={x + 100} y={y + 70} width="34" height="22" fill="#ffd100" stroke="#333" />
                  <text x={x + 117} y={y + 80} textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700, fontSize: 7 }}>DANGER</text>
                  <text x={x + 117} y={y + 88} textAnchor="middle" className="tiny-dark" style={{ fontSize: 5 }}>DO NOT OPERATE</text>
                </g>
              )}
            </g>
          )
        })()}
      </g>

      {/* VFD-101 cabinet */}
      <g>
        <rect x="440" y="40" width="270" height="450" fill="url(#steel)" stroke="#55595e" strokeWidth="3" rx="3" />
        <rect x="446" y="46" width="258" height="438" fill="none" stroke="#9aa0a5" strokeWidth="1" />
        <rect x="470" y="56" width="210" height="22" fill="#f4f4f0" stroke="#888" />
        <text x="575" y="71" textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700 }}>VFD-101 · P-101 PUMP · 100 HP · 480 V</text>
        {/* window */}
        <rect x="500" y="100" width="150" height="80" fill="#1b1d21" stroke="#444" strokeWidth="3" />
        <rect x="520" y="115" width="110" height="36" fill={lit ? '#0b2a1e' : '#101412'} stroke="#263" />
        <text x="575" y="141" textAnchor="middle" className="seg" fill={lit ? '#3ddc84' : '#1f2d26'}>{lit ? s.drive.display : ''}</text>
        <text x="575" y="168" textAnchor="middle" className="tiny-light">TOSHIBA VF-AS3</text>
        <circle cx="670" cy="140" r="6" fill={lamp ? '#ff2d2d' : '#4a1010'} stroke="#222" />
        {lamp && <circle cx="670" cy="140" r="10" fill="#ff2d2d" opacity="0.25" />}
        <text x="670" y="160" textAnchor="middle" className="tiny-dark">CHARGE</text>
        {/* arc flash label */}
        <g className="hotspot-g" onClick={onLabel}>
          <rect x="470" y="205" width="170" height="110" fill="#fff" stroke="#333" />
          <rect x="470" y="205" width="170" height="26" fill="#f26b00" />
          <text x="555" y="223" textAnchor="middle" style={{ fontSize: 12, fontWeight: 800, fill: '#000' }}>⚠ WARNING</text>
          <text x="555" y="246" textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700 }}>ARC FLASH AND SHOCK HAZARD</text>
          <text x="555" y="258" textAnchor="middle" className="tiny-dark">Appropriate PPE required</text>
          <text x="478" y="276" className="tiny-dark">{s.scenario.label.incidentEnergy} cal/cm² @ {s.scenario.label.workingDistance} in</text>
          <text x="478" y="288" className="tiny-dark">AFB {s.scenario.label.arcFlashBoundary} in · {s.scenario.label.voltage} V</text>
          <text x="478" y="300" className="tiny-dark">Glove class {s.scenario.label.gloveClass}</text>
          <text x="555" y="328" textAnchor="middle" className="hint">click to read label</text>
          <title>Read the arc flash label</title>
        </g>
        {/* door handle */}
        <g className="hotspot-g" onClick={() => { dispatch({ type: 'door', open: true }); dispatch({ type: 'goto', scene: 'drive' }) }}>
          <rect x="676" y="300" width="14" height="60" rx="4" fill="#2b2d2f" stroke="#111" />
          <title>Open the cabinet door</title>
        </g>
        <text x="683" y="378" textAnchor="middle" className="hint">door</text>
        <text x="575" y="420" textAnchor="middle" className="tiny-dark">Output isolation contactor 1M inside · control 120 V from LP-2 ckt 7</text>
      </g>

      {/* LP-2 panel */}
      <g>
        <rect x="760" y="80" width="130" height="230" fill="url(#steel)" stroke="#55595e" strokeWidth="2" />
        <rect x="770" y="88" width="110" height="16" fill="#f4f4f0" stroke="#888" />
        <text x="825" y="100" textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700 }}>LP-2 · 120/208 V</text>
        {[1, 3, 5, 7, 9, 11].map((n, i) => {
          const y = 118 + i * 30
          const isSeven = n === 7
          const on = isSeven ? s.lp2Closed : true
          return (
            <g key={n} className={isSeven ? 'hotspot-g' : ''} onClick={isSeven ? () => dispatch({ type: 'lp2', closed: !s.lp2Closed }) : undefined}>
              <text x="778" y={y + 13} className="tiny-dark">{n}</text>
              <rect x="792" y={y} width="40" height="18" fill="#222" rx="2" />
              <rect x={on ? 814 : 796} y={y + 3} width="14" height="12" fill={on ? '#e03b3b' : '#ccc'} rx="1" />
              <text x="840" y={y + 13} className="tiny-dark">{isSeven ? 'VFD-101 CTRL' : ['LTG', 'RECEPT', 'HTR', '', 'SPARE', 'SPARE'][i]}</text>
              {isSeven && <title>{s.lp2Closed ? 'Open LP-2 ckt 7' : 'Close LP-2 ckt 7'}</title>}
            </g>
          )
        })}
        {/* ckt 7 lockout */}
        <g className="hotspot-g" onClick={() => dispatch({ type: 'lock', target: 'lp2', on: !s.locks.lp2 })}>
          <rect x="792" y="232" width="40" height="10" fill="#777" stroke="#333" />
          {s.locks.lp2 && (
            <g>
              <rect x="802" y="242" width="20" height="16" rx="3" fill="#d62828" stroke="#5a0000" />
              <path d="M806 242 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke="#bbb" strokeWidth="2.5" />
            </g>
          )}
          <title>{s.locks.lp2 ? 'Remove lock from ckt 7 lockout' : 'Apply breaker lockout and lock to ckt 7'}</title>
        </g>
        {s.tags.lp2 && (
          <g>
            <rect x="836" y="238" width="34" height="22" fill="#ffd100" stroke="#333" />
            <text x="853" y="248" textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700, fontSize: 7 }}>DANGER</text>
          </g>
        )}
        <text x="825" y="296" textAnchor="middle" className="hint">ckt 7 lockout</text>
      </g>

      {/* receptacle: known live source */}
      <g>
        <rect x="900" y="380" width="40" height="70" fill="#f1efe6" stroke="#777" rx="3" />
        <text x="920" y="372" textAnchor="middle" className="hint">120 V recept.</text>
        <TP state={s} id="RECEPT_H" x={912} y={400} onProbe={onProbe} />
        <TP state={s} id="RECEPT_N" x={928} y={400} onProbe={onProbe} />
        <TP state={s} id="RECEPT_G" x={920} y={428} onProbe={onProbe} />
        <text x="912" y="392" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>H</text>
        <text x="928" y="392" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>N</text>
        <text x="920" y="447" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>G</text>
      </g>

      {/* walk */}
      <Hotspot x={760} y={500} w={170} h={36} label="Walk to P-101 motor →" onClick={() => dispatch({ type: 'goto', scene: 'motor' })} />
      <text x="60" y="520" className="scene-note">Arc flash boundary from the label is {s.scenario.label.arcFlashBoundary} in. Anyone inside it needs the PPE.</text>
    </svg>
  )
}
