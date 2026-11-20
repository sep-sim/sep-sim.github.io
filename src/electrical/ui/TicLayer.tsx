import type { PointerEvent } from 'react'
import { useRef, useState } from 'react'
import type { Action } from '../engine'
import type { ElecState, Point } from '../types'
import { POINT_LABEL } from '../types'
import { nearestTarget, scanTargets, svgPoint } from '../../components/sceneTargets'
import type { XY } from '../../components/sceneTargets'

interface Props {
  state: ElecState
  dispatch: (a: Action) => void
  /** where the assembly leans when nothing has been tested yet: the tip position */
  park: XY
}

/**
 * The TIC 300 PRO in the scene, on its hot stick when clipped on. Drag it so the tip lands on a conductor or the receptacle;
 * ON/OFF, TEST and the LOW/HIGH range buttons work on the unit itself.
 */
export function TicLayer({ state, dispatch, park }: Props) {
  const g = useRef<SVGGElement>(null)
  const t = state.tic
  const [pos, setPos] = useState<XY | null>(null)
  const [drag, setDrag] = useState<{ at: XY; grab: XY } | null>(null)
  const flashing = t.on && t.last != null && t.last.detected && state.t - t.last.t < 4
  const [tx, ty] = drag ? drag.at : pos ?? park
  const stop = (e: PointerEvent<SVGGElement>) => e.stopPropagation()
  const btn = (cls: string, x: number, y: number, w: number, h: number, label: string, title: string, onClick: () => void, sel = false) => (
    <g className={`tic-scene-btn ${cls}${sel ? ' sel' : ''}`} onPointerDown={stop} onClick={(e) => { e.stopPropagation(); onClick() }}>
      <title>{title}</title>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} />
      <text x={x + w / 2} y={y + h / 2 + 1.6} textAnchor="middle">{label}</text>
    </g>
  )
  const last = t.last ? t.last.point : null

  return (
    <g ref={g} className={`tic-scene${t.hotStick ? ' stick' : ' hand'}`}>
      <g
        className={`tic-drag${drag ? ' dragging' : ''}`}
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          const at = svgPoint(g.current!, e)
          setDrag({ at: [tx, ty], grab: [at[0] - tx, at[1] - ty] })
        }}
        onPointerMove={(e) => {
          if (!drag) return
          const at = svgPoint(g.current!, e)
          setDrag({ ...drag, at: [at[0] - drag.grab[0], at[1] - drag.grab[1]] })
        }}
        onPointerUp={(e) => {
          if (!drag) return
          // read the pointer here rather than trusting the last move's state, which may not have committed yet
          const p = svgPoint(g.current!, e)
          const at: XY = [p[0] - drag.grab[0], p[1] - drag.grab[1]]
          const targets = scanTargets(g.current!)
          const best = nearestTarget(targets, at)
          setDrag(null)
          if (best) {
            setPos(targets[best])
            dispatch({ type: 'ticCheck', point: best as Point })
          } else {
            setPos(at)
          }
        }}
      >
        <title>{t.hotStick ? 'TIC 300 PRO on the hot stick: drag the tip onto a conductor' : 'TIC 300 PRO hand-held: clip it to the hot stick before the 4160 V side'}</title>
        {/* hot stick */}
        {t.hotStick && (
          <g>
            <rect x={tx - 6} y={ty + 136} width="12" height="200" rx="3" fill="#f28a1f" stroke="#8a4a0a" />
            {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={tx - 6} y={ty + 150 + i * 36} width="12" height="10" fill="#e0761a" />)}
            <rect x={tx - 8} y={ty + 132} width="16" height="8" rx="2" fill="#333" stroke="#111" />
          </g>
        )}
        {/* handle, body, collar, tip */}
        <rect x={tx - 8} y={ty + 96} width="16" height="42" rx="4" fill="#2f2f2f" stroke="#111" />
        <rect x={tx - 15} y={ty + 40} width="30" height="58" rx="7" fill="#d4222a" stroke="#1a1a1a" strokeWidth="1.5" />
        <text x={tx} y={ty + 48} textAnchor="middle" style={{ fontSize: 3.6, fontWeight: 900, fill: '#fff' }}>AMPROBE</text>
        <text x={tx} y={ty + 53} textAnchor="middle" style={{ fontSize: 3.4, fontWeight: 800, fill: '#fff' }}>TIC 300 PRO</text>
        <circle cx={tx} cy={ty + 94} r="1.6" fill={t.on ? '#3ddc84' : '#3a1414'} />
        <rect x={tx - 10} y={ty + 34} width="20" height="7" rx="2" fill="#d89a14" />
        <polygon points={`${tx},${ty} ${tx - 9},${ty + 35} ${tx + 9},${ty + 35}`} className={`tic-scene-tip${flashing ? ' flash' : ''}`} />
        {/* invisible grab area over the whole unit */}
        <rect x={tx - 16} y={ty - 4} width="32" height={t.hotStick ? 344 : 146} fill="transparent" />
      </g>
      {/* controls sit on top of the drag area */}
      {btn('test', tx + 4, ty + 42, 9, 6, 'TEST', 'Self-test', () => dispatch({ type: 'ticSelfTest' }))}
      {btn(`onoff${t.on ? ' on' : ''}`, tx - 6, ty + 57, 12, 8, t.on ? 'ON' : 'OFF', t.on ? 'Switch off' : 'Switch on', () => dispatch({ type: 'ticPower', on: !t.on }))}
      {btn('range', tx - 13, ty + 70, 12, 7, 'LOW', '30 V to 1500 V AC', () => dispatch({ type: 'ticRange', range: 'LOW' }), t.on && t.range === 'LOW')}
      {btn('range', tx + 1, ty + 70, 12, 7, 'HIGH', '1500 V to 122 kV AC', () => dispatch({ type: 'ticRange', range: 'HIGH' }), t.on && t.range === 'HIGH')}
      {btn('stick', tx - 13, ty + 82, 26, 7, t.hotStick ? 'UNCLIP' : 'HOT STICK', t.hotStick ? 'Take the tracer off the hot stick' : 'Clip the tracer to the hot stick', () => dispatch({ type: 'ticHotStick', on: !t.hotStick }))}
      {/* readout beside the tip */}
      <text x={tx + 14} y={ty + 14} className={`tic-scene-read${flashing ? ' hot' : ''}`}>
        {!t.on ? 'OFF' : flashing ? `⚡ BEEP · ${last ? POINT_LABEL[last] : ''}` : `${t.range}${t.selfTestAt != null ? '' : ' · no self-test'}${t.last && !t.last.detected && last ? ` · no indication at ${POINT_LABEL[last]}` : ''}`}
      </text>
      {!pos && !drag && <text x={tx} y={ty - 10} textAnchor="middle" className="lead-tag">drag the tip to a point</text>}
    </g>
  )
}
