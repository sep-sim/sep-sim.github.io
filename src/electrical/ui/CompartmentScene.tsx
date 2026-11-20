import type { Action } from '../engine'
import { chargeLampOn, contactorClosed } from '../engine'
import type { SceneProps } from './common'
import { Hotspot, TP } from './common'
import { LeadLayer } from '../../components/LeadLayer'

interface Props extends SceneProps {
  dispatch: (a: Action) => void
}

/** Inside the M12 lower door: bypass stabs, VFD output terminations and the P-310 motor cable terminations on a common bus. */
export function CompartmentScene({ state, onProbe, dispatch, leads, onDrop, overlay }: Props) {
  const s = state
  const lamp = chargeLampOn(s)
  const closed = contactorClosed(s)
  const stab = (i: number) => 150 + i * 70
  const busX = (i: number) => 420 + i * 110
  return (
    <svg viewBox="0 0 960 600" className="scene">
      <defs>
        <linearGradient id="cPanel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe2dd" /><stop offset="1" stopColor="#bfc3bd" /></linearGradient>
        <linearGradient id="cCopper" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c58a4a" /><stop offset="0.5" stopColor="#f0b36a" /><stop offset="1" stopColor="#a86f33" /></linearGradient>
        <linearGradient id="cShrink" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8f1020" /><stop offset="0.5" stopColor="#d5203a" /><stop offset="1" stopColor="#8f1020" /></linearGradient>
        <linearGradient id="cCone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a3a3a" /><stop offset="0.5" stopColor="#6a6a6a" /><stop offset="1" stopColor="#2a2a2a" /></linearGradient>
        <linearGradient id="cSilver" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9c9fa3" /><stop offset="0.5" stopColor="#e0e3e6" /><stop offset="1" stopColor="#8e9195" /></linearGradient>
      </defs>
      <rect width="960" height="600" fill="#6d7276" />
      <rect x="40" y="20" width="880" height="560" fill="url(#cPanel)" stroke="#4b5054" strokeWidth="5" />
      <text x="480" y="16" textAnchor="middle" className="scene-h">M12 MOTOR CONNECTION COMPARTMENT · DOOR OPEN · {s.closed.bypass ? 'BYPASS BUS LIVE 4160 V' : 'BYPASS OPEN'} · {s.closed.mv ? 'VFD INCOMING LIVE' : 'VFD INCOMING OPEN'}</text>

      {/* bypass contactor stabs on the left */}
      <rect x="110" y="60" width="230" height="200" fill="#9ea4a2" stroke="#4b5054" strokeWidth="2" />
      <text x="225" y="78" textAnchor="middle" className="tiny-dark" style={{ fontSize: 7, fontWeight: 700 }}>BYPASS CONTACTOR 42B · LINE STABS</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={stab(i) - 10} y="90" width="20" height="90" rx="3" fill="url(#cSilver)" stroke="#555" />
          <rect x={stab(i) - 16} y="178" width="32" height="14" fill="#2b2d2f" />
          <TP state={s} id={(['BP_L1', 'BP_L2', 'BP_L3'] as const)[i]} x={stab(i)} y={112} label={`L${i + 1}`} side="bottom" onProbe={onProbe} />
        </g>
      ))}
      <rect x="124" y="206" width="200" height="12" fill="#f28a1f" /><text x="224" y="215" textAnchor="middle" style={{ fontSize: 7, fontWeight: 800, fill: '#111' }}>4160 VOLTS · {s.closed.bypass ? 'LIVE' : 'DEAD'}</text>
      <text x="225" y="240" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>contactor open · stabs stay live until the M12 isolation switch is open</text>

      {/* VFD output terminations on the right */}
      <rect x="640" y="60" width="270" height="200" fill="#9ea4a2" stroke="#4b5054" strokeWidth="2" />
      <text x="775" y="78" textAnchor="middle" className="tiny-dark" style={{ fontSize: 7, fontWeight: 700 }}>VFD #2 OUTPUT · from M32 ISOLATION CONTACTOR</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <path d={`M${700 + i * 70} 250 L${700 + i * 70} 150`} stroke="#1b1b1b" strokeWidth="14" strokeLinecap="round" />
          <path d={`M${700 + i * 70} 150 L${700 + i * 70} 110`} stroke="#4a4e52" strokeWidth="18" />
          <rect x={700 + i * 70 - 10} y="96" width="20" height="18" fill="url(#cSilver)" stroke="#555" />
          <TP state={s} id={(['VO_1', 'VO_2', 'VO_3'] as const)[i]} x={700 + i * 70} y={100} label={`${i + 1}`} side="right" onProbe={onProbe} />
        </g>
      ))}
      <text x="775" y="240" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>M32 contactor {closed ? 'HELD IN by 120 V control' : 'dropped out'} · cells {lamp ? 'CHARGED' : 'discharged'}</text>
      <circle cx="896" cy="72" r="5" fill={lamp ? '#ff2d2d' : '#4a1010'} stroke="#222" /><text x="896" y="88" textAnchor="middle" style={{ fontSize: 5, fill: '#222' }}>CHARGE</text>

      {/* connection bus U V W with the motor cable terminations */}
      <rect x="380" y="290" width="360" height="22" fill="url(#cCopper)" stroke="#6b4a1e" />
      <text x="560" y="284" textAnchor="middle" className="tiny-dark" style={{ fontSize: 7, fontWeight: 700 }}>MOTOR CONNECTION BUS · P-310 (U, V, W)</text>
      {[0, 1, 2].map((i) => {
        const x = busX(i)
        const lifted = s.leadsLifted
        return (
          <g key={i}>
            <rect x={x - 22} y="312" width="44" height="14" fill="url(#cSilver)" stroke="#555" />
            <text x={x} y="306" textAnchor="middle" style={{ fontSize: 8, fontWeight: 800, fill: '#3a2a10' }}>{'UVW'[i]}</text>
            {lifted ? (
              <g>
                <path d={`M${x} 326 C ${x - 10} 380, ${x - 60} 400, ${x - 70} 470`} stroke="#1b1b1b" strokeWidth="16" strokeLinecap="round" fill="none" />
                <rect x={x - 90} y="462" width="40" height="22" rx="3" fill="#e6e0cf" stroke="#555" />
                <text x={x - 70} y="476" textAnchor="middle" style={{ fontSize: 5, fill: '#222' }}>insulated stand</text>
                <path d={`M${x - 78} 430 l16 0`} stroke="#111" strokeWidth="6" />
                <TP state={s} id={(['U', 'V', 'W'] as const)[i]} x={x - 64} y={412} label={'UVW'[i]} side="right" onProbe={onProbe} />
              </g>
            ) : (
              <g>
                <path d={`M${x} 326 L${x} 380`} stroke="#4a4e52" strokeWidth="20" />
                <path d={`M${x} 380 L${x} 540`} stroke="#b5122b" strokeWidth="16" strokeLinecap="round" />
                <path d={`M${x - 5} 384 L${x - 5} 536`} stroke="#e04a5f" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
                <path d={`M${x} 540 L${x} 570`} stroke="#1b1b1b" strokeWidth="16" />
                <rect x={x - 12} y="400" width="24" height="8" fill={['#7a4a1e', '#f58220', '#f2d21b'][i]} />
                <TP state={s} id={(['U', 'V', 'W'] as const)[i]} x={x} y={352} label={'UVW'[i]} side="right" onProbe={onProbe} />
              </g>
            )}
          </g>
        )
      })}
      <text x="560" y="590" textAnchor="middle" className="tiny-dark" style={{ fontSize: 6 }}>3 × 500 kcmil 5 kV shielded, stress cones, to P-310M terminal box</text>

      {/* ground bus */}
      <rect x="110" y="520" width="200" height="12" fill="#b08d3c" stroke="#5c4a1e" />
      <TP state={s} id="GND" x={210} y={526} label="ground bus" side="bottom" onProbe={onProbe} />

      <g className="hotspot" onClick={() => dispatch({ type: 'liftLeads', lifted: !s.leadsLifted })}>
        <rect x="770" y="330" width="150" height="34" rx="6" />
        <text x="845" y="352" textAnchor="middle">{s.leadsLifted ? 're-land U, V, W' : 'lift motor leads U, V, W'}</text>
      </g>
      <text x="845" y="382" textAnchor="middle" className="hint">unbolt terminations, support on stands, wrap</text>

      <Hotspot x={700} y={28} w={210} h={28} label="Close door, back to the room" onClick={() => { dispatch({ type: 'door', open: false }); dispatch({ type: 'goto', scene: 'room' }) }} />
      <LeadLayer leads={leads} height={600} onDrop={onDrop} />
      {overlay}
    </svg>
  )
}
