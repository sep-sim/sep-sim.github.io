import type { InspectWhere, NodeId, SessionState } from '../engine/types'
import type { LoopSolution } from '../engine/loop'

interface Props {
  state: SessionState
  sol: LoopSolution
  onProbe: (node: NodeId) => void
  onInspect: (where: InspectWhere) => void
  onValve: (open: boolean) => void
  onFuse: (pulled: boolean) => void
}

const NODE_POS: Record<NodeId, [number, number]> = {
  PS_PLUS: [60, 150], PS_MINUS: [140, 150], F1_OUT: [290, 100],
  TB_1: [240, 230], TB_2: [240, 290],
  AI_PLUS: [80, 440], AI_MINUS: [200, 440],
  JB_1: [480, 230], JB_2: [480, 290],
  XMTR_PLUS: [670, 250], XMTR_MINUS: [720, 250], XMTR_TEST: [770, 250],
}

const NODE_SHORT: Record<NodeId, string> = {
  PS_PLUS: '+', PS_MINUS: '−', F1_OUT: 'F1', TB_1: '1', TB_2: '2', AI_PLUS: '+', AI_MINUS: '−',
  JB_1: '1', JB_2: '2', XMTR_PLUS: '+', XMTR_MINUS: '−', XMTR_TEST: 'T',
}

function path(points: [number, number][]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
}

export function SiteDiagram({ state, sol, onProbe, onInspect, onValve, onFuse }: Props) {
  const live = sol.current >= 3.5
  const wire = live ? 'var(--wire-live)' : 'var(--wire-dead)'
  const m = state.meter

  const node = (id: NodeId) => {
    const [x, y] = NODE_POS[id]
    const isA = m.probeA === id
    const isB = m.probeB === id
    const cls = `tp${isA ? ' tp-a' : ''}${isB ? ' tp-b' : ''}`
    return (
      <g key={id} className={cls} onClick={() => onProbe(id)}>
        <circle cx={x} cy={y} r={9} />
        <text x={x} y={y + 4} textAnchor="middle">{NODE_SHORT[id]}</text>
      </g>
    )
  }

  const box = (x: number, y: number, w: number, h: number, title: string, where: InspectWhere | null, sub?: string) => (
    <g className={where ? 'box clickable' : 'box'} onClick={where ? () => onInspect(where) : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={6} />
      <text x={x + 10} y={y + 20} className="box-title">{title}</text>
      {sub && <text x={x + 10} y={y + 36} className="box-sub">{sub}</text>}
      {where && <text x={x + w - 10} y={y + 20} textAnchor="end" className="box-hint">inspect ⌕</text>}
    </g>
  )

  return (
    <svg viewBox="0 0 960 540" className="site">
      {/* RTU cabinet */}
      {box(20, 40, 300, 470, 'RTU CABINET  (unclassified)', 'rtu', 'Station 4 control building')}
      {box(40, 70, 120, 100, 'PS-1  24 VDC', null)}
      {box(190, 75, 120, 50, 'F1  1 A', null)}
      {box(180, 200, 120, 120, 'TB-1', null)}
      {box(40, 360, 200, 110, 'AI-1  CH3', null, '250 Ω input')}
      {/* fuse symbol: click to pull / re-seat */}
      <g className={`fuse clickable ${state.fusePulled ? 'pulled' : ''}`} onClick={() => onFuse(!state.fusePulled)}>
        <rect x={225} y={95} width={40} height={10} />
        <text x={245} y={118} textAnchor="middle" className="tiny">{state.fusePulled ? 'PULLED · click to seat' : 'click to pull'}</text>
      </g>

      {/* cabinet wiring */}
      <path d={path([[60, 150], [60, 185], [170, 185], [170, 100], [225, 100]])} className="wire" stroke={sol.supplyVolts > 0 ? 'var(--wire-live)' : 'var(--wire-dead)'} />
      <path d={path([[265, 100], [290, 100]])} className="wire" stroke={wire} />
      <path d={path([[290, 100], [290, 170], [240, 170], [240, 230]])} className="wire" stroke={wire} />
      <path d={path([[240, 290], [240, 335], [80, 335], [80, 440]])} className="wire" stroke={wire} />
      <path d={path([[200, 440], [200, 485], [140, 485], [140, 150]])} className="wire" stroke={wire} />
      <rect x={120} y={434} width={40} height={12} className="resistor" />
      <path d={path([[80, 440], [120, 440]])} className="wire" stroke={wire} />
      <path d={path([[160, 440], [200, 440]])} className="wire" stroke={wire} />

      {/* field cable to JB */}
      <path d={path([[240, 230], [480, 230]])} className="wire" stroke={wire} />
      <path d={path([[240, 290], [480, 290]])} className="wire" stroke={wire} />
      <rect x={330} y={215} width={80} height={90} rx={10} className="cable-shield" />
      <text x={370} y={212} textAnchor="middle" className="tiny">field cable  1 pr  #16  shielded</text>

      {/* JB */}
      {box(420, 190, 120, 130, 'JB-1', 'jb', 'Class I Div 2')}

      {/* JB to transmitter */}
      <path d={path([[480, 230], [600, 230], [600, 275], [670, 275], [670, 250]])} className="wire" stroke={wire} />
      <path d={path([[480, 290], [720, 290], [720, 250]])} className="wire" stroke={wire} />

      {/* transmitter */}
      {box(640, 120, 150, 110, state.scenario.loop.tag, 'xmtr', '2-wire HART pressure xmtr')}
      <rect x={655} y={165} width={120} height={40} rx={3} className="lcd" />
      <text x={715} y={190} textAnchor="middle" className="lcd-text">
        {sol.current < 3 ? '' : sol.xmtrDemand > 21 || sol.xmtrDemand < 3.7 ? 'SENSOR FAIL' : `${sol.pressureSeen.toFixed(1)} ${state.scenario.loop.unit}`}
      </text>
      <text x={715} y={268} textAnchor="middle" className="tiny">terminal compartment</text>

      {/* impulse line and manifold */}
      <path d={path([[790, 170], [900, 170]])} className="pipe-small" />
      <g className={`valve ${state.isolationOpen ? 'open' : 'closed'} clickable`} onClick={() => onValve(!state.isolationOpen)}>
        <polygon points="835,160 855,170 835,180" />
        <polygon points="875,160 855,170 875,180" />
        <line x1={855} y1={170} x2={855} y2={state.isolationOpen ? 150 : 170} />
        <line x1={state.isolationOpen ? 845 : 855} y1={150} x2={state.isolationOpen ? 865 : 855} y2={150} />
        <text x={855} y={196} textAnchor="middle" className="tiny">{state.isolationOpen ? 'ISO OPEN' : 'ISO CLOSED'}</text>
      </g>
      <circle cx={812} cy={170} r={6} className={state.pumpPressure != null ? 'port active' : 'port'} />
      <text x={812} y={158} textAnchor="middle" className="tiny">test port</text>

      {/* pipeline and gauge */}
      <rect x={895} y={60} width={30} height={450} className="pipe" />
      <text x={910} y={530} textAnchor="middle" className="tiny">12" discharge</text>
      <g className="clickable" onClick={() => onInspect('manifold')}>
        <circle cx={850} cy={330} r={30} className="gauge" />
        <line x1={880} y1={330} x2={895} y2={330} className="pipe-small" />
        <text x={850} y={326} textAnchor="middle" className="gauge-text">{sol.processPressure.toFixed(0)}</text>
        <text x={850} y={340} textAnchor="middle" className="tiny">PG-101</text>
        <text x={850} y={372} textAnchor="middle" className="box-hint">inspect ⌕</text>
      </g>

      {/* test points */}
      {(Object.keys(NODE_POS) as NodeId[]).map(node)}
    </svg>
  )
}
