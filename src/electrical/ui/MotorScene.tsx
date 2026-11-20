import type { Action } from '../engine'
import type { SceneProps } from './common'
import { Hotspot, TP } from './common'
import { LeadLayer } from '../../components/LeadLayer'

interface Props extends SceneProps {
  dispatch: (a: Action) => void
}

function Exterior({ state, dispatch, leads, onDrop }: Props) {
  const s = state
  return (
    <svg viewBox="0 0 960 600" className="scene">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fc2e6" /><stop offset="1" stopColor="#d9e6f2" /></linearGradient>
        <linearGradient id="pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9b9b95" /><stop offset="1" stopColor="#6f6f6a" /></linearGradient>
        <linearGradient id="motorBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5f7fa6" /><stop offset="0.5" stopColor="#2f4f78" /><stop offset="1" stopColor="#1d3250" /></linearGradient>
        <linearGradient id="boxg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6b88ad" /><stop offset="1" stopColor="#2e4a6e" /></linearGradient>
      </defs>
      <rect width="960" height="380" fill="url(#sky)" />
      <rect y="380" width="960" height="220" fill="url(#pad)" />
      <rect x="120" y="400" width="720" height="40" fill="#7d7d78" stroke="#55554f" />
      <text x="480" y="470" textAnchor="middle" className="scene-h">P-101 PUMP PAD · OUTDOORS · {s.scenario.motor.hp} HP {s.scenario.motor.volts} V</text>

      {/* motor */}
      <rect x="180" y="250" width="400" height="150" rx="40" fill="url(#motorBody)" stroke="#172a44" strokeWidth="3" />
      {Array.from({ length: 16 }, (_, i) => <line key={i} x1={210 + i * 22} y1="262" x2={210 + i * 22} y2="388" stroke="#1c3351" strokeWidth="3" opacity="0.6" />)}
      <rect x="140" y="270" width="50" height="110" rx="10" fill="#3a4e68" stroke="#172a44" strokeWidth="2" />
      <circle cx="165" cy="325" r="38" fill="#2d3f55" stroke="#172a44" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1="165" y1="325" x2={165 + 34 * Math.cos((i * Math.PI) / 4)} y2={325 + 34 * Math.sin((i * Math.PI) / 4)} stroke="#1a2a3c" strokeWidth="3" />)}
      <rect x="580" y="310" width="60" height="26" fill="#8a8f96" stroke="#444" />
      <rect x="640" y="260" width="180" height="140" rx="20" fill="#5c6670" stroke="#2f3740" strokeWidth="3" />
      <text x="730" y="335" textAnchor="middle" className="tiny-light">P-101 PUMP</text>
      <rect x="200" y="400" width="360" height="14" fill="#2a3a50" />
      <rect x="300" y="300" width="120" height="40" fill="#e8e6dc" stroke="#555" />
      <text x="360" y="316" textAnchor="middle" className="tiny-dark" style={{ fontWeight: 700 }}>{s.scenario.motor.tag} · {s.scenario.motor.hp} HP</text>
      <text x="360" y="328" textAnchor="middle" className="tiny-dark">{s.scenario.motor.volts} V · {s.scenario.motor.fla} A · {s.scenario.motor.rpm} RPM · {s.scenario.motor.frame}</text>
      <text x="360" y="337" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>6 LEADS · WYE · WPII · FORM-WOUND</text>

      {/* terminal box */}
      <g className="hotspot-g" onClick={() => dispatch({ type: 'cover', off: true })}>
        <rect x="330" y="130" width="190" height="130" rx="8" fill="url(#boxg)" stroke="#172a44" strokeWidth="3" />
        {[0, 1, 2, 3].map((i) => <circle key={i} cx={345 + (i % 2) * 160} cy={145 + Math.floor(i / 2) * 100} r="5" fill="#9aa5b1" stroke="#333" />)}
        <rect x="400" y="100" width="50" height="30" fill="#4a5a6c" stroke="#222" />
        {Array.from({ length: 5 }, (_, i) => <line key={i} x1="406" y1={106 + i * 5} x2="444" y2={106 + i * 5} stroke="#222" />)}
        <text x="425" y="95" textAnchor="middle" className="hint">breather</text>
        <text x="425" y="200" textAnchor="middle" className="tiny-light" style={{ fontWeight: 700 }}>TERMINAL BOX</text>
        <text x="425" y="214" textAnchor="middle" className="hint">click to remove cover (8 bolts)</text>
        <title>Remove the terminal box cover</title>
      </g>
      {/* conduit */}
      <rect x="505" y="150" width="22" height="250" fill="#8a8f96" stroke="#444" />
      <rect x="500" y="150" width="32" height="22" fill="#5c6670" stroke="#333" />
      <text x="545" y="300" className="hint">4" RGS · 3 × 500 kcmil 5 kV shielded + G</text>

      <Hotspot x={30} y={520} w={220} h={36} label="← Back to the electrical room" onClick={() => dispatch({ type: 'goto', scene: 'room' })} />
      <Hotspot x={270} y={520} w={220} h={36} label="← M12 compartment" onClick={() => dispatch({ type: 'goto', scene: 'compartment' })} />
      <LeadLayer leads={leads} height={600} onDrop={onDrop} />
    </svg>
  )
}

function Interior({ state, onProbe, dispatch, leads, onDrop }: Props) {
  const s = state
  const f = s.scenario.fault
  const termFault = f === 'termination' && !s.faultCleared
  const unb = s.jbox.feedersUnbolted
  const cleared = s.jbox.lugsCleared
  const bx = [420, 580, 740]
  const tape = ['#7a4a1e', '#f58220', '#f2d21b']
  return (
    <svg viewBox="0 0 960 600" className="scene">
      <defs>
        <linearGradient id="boxin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9ccc7" /><stop offset="1" stopColor="#a6aaa5" /></linearGradient>
        <linearGradient id="bush" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8b8f93" /><stop offset="0.5" stopColor="#c3c7cb" /><stop offset="1" stopColor="#7f8387" /></linearGradient>
        <linearGradient id="lug" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9c9fa3" /><stop offset="0.5" stopColor="#e0e3e6" /><stop offset="1" stopColor="#8e9195" /></linearGradient>
        <linearGradient id="red" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8f1020" /><stop offset="0.5" stopColor="#d5203a" /><stop offset="1" stopColor="#8f1020" /></linearGradient>
        <linearGradient id="shrink" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6e6f72" /><stop offset="0.5" stopColor="#a7a8ab" /><stop offset="1" stopColor="#66676a" /></linearGradient>
        <linearGradient id="phen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a8231f" /><stop offset="0.5" stopColor="#d1352d" /><stop offset="1" stopColor="#8f1d1a" /></linearGradient>
      </defs>
      <rect width="960" height="600" fill="#5b6066" />
      <rect x="60" y="30" width="840" height="540" fill="url(#boxin)" stroke="#3f4347" strokeWidth="6" />
      <text x="480" y="22" textAnchor="middle" className="scene-h">P-101M TERMINAL BOX · COVER OFF · 6-LEAD WYE</text>
      {termFault && <rect x="66" y="540" width="828" height="24" fill="#6f7f8a" opacity="0.45" />}
      {termFault && <text x="480" y="556" textAnchor="middle" className="hint">water line</text>}

      {/* breather grille */}
      <rect x="800" y="60" width="80" height="150" fill="#9b9ea2" stroke="#444" />
      {Array.from({ length: 14 }, (_, i) => <line key={i} x1="806" y1={68 + i * 10} x2="874" y2={68 + i * 10} stroke="#3b3e42" strokeWidth="3" />)}
      {termFault && <rect x="800" y="60" width="80" height="150" fill="#7a6a4a" opacity="0.45" />}

      {/* bushings, lug blocks, leads */}
      {bx.map((x, i) => {
        const phaseFault = termFault && i === 1
        const feederX = unb ? x - 70 : x - 14
        const feederTop = unb ? 250 : 215
        return (
          <g key={i}>
            {/* bushing through the top */}
            {[0, 1, 2].map((r) => <ellipse key={r} cx={x} cy={60 + r * 22} rx={34 - r * 3} ry="10" fill="url(#bush)" stroke="#555" />)}
            <rect x={x - 26} y="104" width="52" height="26" fill="url(#bush)" stroke="#555" />
            {/* 2-hole lug block */}
            <rect x={x - 40} y="128" width="80" height="88" rx="4" fill="url(#lug)" stroke="#5a5d61" strokeWidth="2" />
            {[0, 1, 2, 3].map((b) => <circle key={b} cx={x - 20 + (b % 2) * 40} cy={148 + Math.floor(b / 2) * 42} r="9" fill="#d5d8db" stroke="#55585c" strokeWidth="2" />)}
            {[0, 1, 2, 3].map((b) => <polygon key={b} points={`${x - 20 + (b % 2) * 40 - 6},${148 + Math.floor(b / 2) * 42 - 3} ${x - 20 + (b % 2) * 40 + 6},${148 + Math.floor(b / 2) * 42 - 3} ${x - 20 + (b % 2) * 40},${148 + Math.floor(b / 2) * 42 + 7}`} fill="#9a9da1" />)}
            <text x={x} y="226" textAnchor="middle" className="tiny-dark" style={{ fontSize: 7 }}>500 kcmil · 5 kV</text>
            {/* motor lead from the lug block: red with grey shrink, into the motor side */}
            <rect x={x + 10} y="216" width="16" height="40" fill="url(#shrink)" />
            <path d={`M${x + 18} 256 C ${x + 18} 330, ${x + 70} 360, ${x + 90} 560`} fill="none" stroke="url(#red)" strokeWidth="16" strokeLinecap="round" />
            <rect x={x + 20} y="300" width="30" height="14" fill="#f4f4f0" stroke="#999" transform={`rotate(70 ${x + 35} 307)`} />
            <text x={x + 44} y="285" className="tiny-dark" style={{ fontSize: 8, fontWeight: 700 }}>T{i + 1}</text>
            {/* feeder from the conduit hub up to the lug block */}
            {!unb && <rect x={x - 22} y="216" width="16" height="44" fill="url(#shrink)" />}
            {unb && (
              <g>
                {/* separated feeder lug hanging to the left */}
                <rect x={feederX - 18} y={feederTop - 60} width="36" height="60" rx="3" fill="url(#lug)" stroke="#5a5d61" strokeWidth="2" />
                <circle cx={feederX} cy={feederTop - 44} r="7" fill="#bfc3c7" stroke="#55585c" />
                <circle cx={feederX} cy={feederTop - 16} r="7" fill="#bfc3c7" stroke="#55585c" />
                <rect x={feederX - 8} y={feederTop} width="16" height="40" fill={cleared ? '#111' : 'url(#shrink)'} />
                {cleared && <path d={`M${feederX - 14} ${feederTop - 66} h28`} stroke="#111" strokeWidth="6" />}
              </g>
            )}
            <path d={`M${unb ? feederX : x - 14} ${feederTop + 40} C ${unb ? feederX : x - 14} 400, ${500 + (i - 1) * 24} 440, ${500 + (i - 1) * 24} 545`} fill="none" stroke="url(#red)" strokeWidth="16" strokeLinecap="round" />
            <path d={`M${unb ? feederX : x - 14} ${feederTop + 40} C ${unb ? feederX : x - 14} 400, ${500 + (i - 1) * 24} 440, ${500 + (i - 1) * 24} 545`} fill="none" stroke="#3a2a2a" strokeWidth="16" strokeLinecap="round" opacity="0.15" />
            <circle cx={unb ? feederX : x - 14} cy={feederTop + 75} r="10" fill={tape[i]} stroke="#333" />
            <text x={(unb ? feederX : x - 14) - 14} y={feederTop + 110} className="tiny-dark" style={{ fontSize: 7 }}>L{i + 1}</text>
            {/* fault visuals on the T2 feeder termination */}
            {phaseFault && !cleared && (
              <g>
                <path d={`M${feederX - 8} ${feederTop + 6} l-12 8 l-10 14`} stroke="#c9a06a" strokeWidth="3" fill="none" />
                <path d={`M${feederX - 8} ${feederTop + 12} l-14 2 l-12 12`} stroke="#c9a06a" strokeWidth="2" fill="none" />
                <ellipse cx={feederX - 34} cy={feederTop + 30} rx="14" ry="9" fill="#2b2b2b" opacity="0.6" />
                <text x={feederX - 34} y={feederTop + 52} textAnchor="middle" className="hint">arc mark</text>
              </g>
            )}
            {/* test points */}
            <TP state={s} id={(['T1', 'T2', 'T3'] as const)[i]} x={x + 30} y={134} label={`T${i + 1}`} side="right" onProbe={onProbe} />
            {unb && <TP state={s} id={(['CBL_1', 'CBL_2', 'CBL_3'] as const)[i]} x={feederX} y={feederTop - 30} label={`L${i + 1}`} side="left" onProbe={onProbe} />}
          </g>
        )
      })}

      {/* phenolic wye board */}
      <rect x="100" y="80" width="200" height="220" rx="4" fill="url(#phen)" stroke="#5a0f0f" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="120" y={110 + i * 60} width="100" height="12" fill="#d6b35a" stroke="#6b5420" />
          <circle cx="140" cy={116 + i * 60} r="9" fill="#cfd3d6" stroke="#444" strokeWidth="2" />
          <text x="236" y={122 + i * 60} className="tiny-light" style={{ fontWeight: 700, fontSize: 14 }}>T{i + 4}</text>
          <rect x="128" y={128 + i * 60} width="14" height="26" fill="url(#shrink)" />
          <path d={`M135 ${154 + i * 60} C 135 ${220 + i * 40}, 90 ${300 + i * 30}, 80 560`} fill="none" stroke="url(#red)" strokeWidth="12" strokeLinecap="round" />
        </g>
      ))}
      {!s.jbox.wyeOpen && <rect x="132" y="104" width="16" height="136" fill="#b87333" stroke="#5a3a1a" strokeWidth="2" />}
      {!s.jbox.wyeOpen && <text x="140" y="262" textAnchor="middle" className="tiny-light" style={{ fontSize: 7 }}>WYE BAR</text>}
      {(['T4', 'T5', 'T6'] as const).map((id, i) => <TP key={id} state={s} id={id} x={190} y={116 + i * 60} onProbe={onProbe} />)}

      {/* RTD leads */}
      <path d="M240 300 C 240 380, 420 420, 470 545" fill="none" stroke="#f2d21b" strokeWidth="4" />
      <path d="M248 300 C 248 384, 426 426, 478 545" fill="none" stroke="#f2d21b" strokeWidth="4" />
      {/* ground stud */}
      <circle cx="160" cy="470" r="11" fill="#cfd3d6" stroke="#444" strokeWidth="2" />
      <path d="M160 470 C 240 470, 420 500, 450 545" fill="none" stroke="#1d8f3b" strokeWidth="6" />
      <TP state={s} id="FRAME" x={160} y={470} label="frame ground" side="bottom" onProbe={onProbe} />

      {/* conduit hub */}
      <ellipse cx="500" cy="548" rx="70" ry="18" fill="#1c1e21" stroke="#000" strokeWidth="3" />
      <text x="500" y="576" textAnchor="middle" className="hint">4" hub · 5 kV feeders + ground + RTD</text>

      {/* actions */}
      <Hotspot x={70} y={520} w={110} h={30} label="Inspect box" onClick={() => dispatch({ type: 'inspectBox' })} />
      <Hotspot x={190} y={520} w={160} h={30} label={unb ? 'Bolt feeders back on' : 'Unbolt feeder lugs'} onClick={() => dispatch({ type: 'unboltFeeders', unbolted: !unb })} />
      <Hotspot x={600} y={520} w={150} h={30} label={unb && !cleared ? 'Support lugs clear' : s.jbox.wyeOpen ? 'Reinstall wye bar' : 'Remove wye bar'} onClick={() => (unb && !cleared ? dispatch({ type: 'clearLugs' }) : dispatch({ type: 'wye', open: !s.jbox.wyeOpen }))} />
      <Hotspot x={760} y={520} w={130} h={30} label="Reinstall cover" onClick={() => dispatch({ type: 'cover', off: false })} />
      <LeadLayer leads={leads} height={600} onDrop={onDrop} />
    </svg>
  )
}

export function MotorScene(props: Props) {
  return props.state.jbox.coverOff ? <Interior {...props} /> : <Exterior {...props} />
}
