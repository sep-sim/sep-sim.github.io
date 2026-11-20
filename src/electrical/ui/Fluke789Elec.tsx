import type { Action } from '../engine'
import { voltageBetween } from '../engine'
import type { ElecState } from '../types'
import { POINT_LABEL } from '../types'
import { Fluke789Face } from '../../components/Fluke789Face'

interface Props { state: ElecState; dispatch: (a: Action) => void }

/** The 789 wired to the electrical module: V AC, V DC, mV DC and ohms. The current positions have no loop to read here. */
export function Fluke789Elec({ state, dispatch }: Props) {
  const m = state.meter
  const off = m.mode === 'OFF'
  const placed = m.probeA != null && m.probeB != null
  const v = placed ? voltageBetween(state, m.probeA!, m.probeB!) : null
  const liveWarn = v != null && (v.ac > 30 || Math.abs(v.dc) > 30)
  const out = m.mode === 'OUT' || m.mode === 'OUT_AUTO'

  let primary = '- - - -'
  let units: string[] = []
  let range = ''
  const ann: string[] = []
  if (m.rel != null) ann.push('REL Δ')
  switch (m.mode) {
    case 'VAC':
      units = ['V', 'AC']; range = m.manualRange ? '1000' : ''
      if (v) primary = (v.ac - (m.rel ?? 0)).toFixed(1)
      break
    case 'VDC':
      units = ['V', 'DC']; range = m.manualRange ? '1000' : ''
      if (v) primary = (v.dc - (m.rel ?? 0)).toFixed(1)
      break
    case 'mVDC':
      units = ['mV', 'DC']; range = m.manualRange ? '300' : ''
      if (v) primary = Math.abs(v.dc) > 0.3 || v.ac > 0.3 ? 'OL' : (v.dc * 1000).toFixed(1)
      break
    case 'OHM':
      units = ['Ω']
      primary = placed ? (liveWarn ? 'OL' : 'OL') : 'OL'
      if (liveWarn) ann.push('⚠')
      break
    case 'mA': case 'OUT': case 'OUT_AUTO': case 'LOOP':
      units = ['mA', 'DC']; primary = '0.000'
      break
  }
  if (liveWarn && (m.mode === 'VAC' || m.mode === 'VDC')) ann.push('⚡ LIVE')
  const held = m.held != null
  if (held) primary = m.held!.split(' ')[0]

  return (
    <Fluke789Face
      mode={m.mode}
      primary={primary}
      units={units}
      secondary=""
      range={range}
      manualRange={m.manualRange}
      annunciators={ann}
      held={held}
      backlight={m.backlight}
      outputMode={out}
      onMode={(mode) => dispatch({ type: 'meterMode', mode })}
      onKey={(key) => dispatch({ type: 'meterKey', key })}
      jacks={m.jacks}
      onJack={(jack, on) => dispatch({ type: 'meterJack', jack, on })}
      leads={
        <>
          <div><span className="lead-a">Red</span> {m.jacks.red == null ? 'not plugged in' : m.probeA ? POINT_LABEL[m.probeA] : 'free'}</div>
          <div><span className="lead-b">Black</span> {!m.jacks.black ? 'not plugged in' : m.probeB ? POINT_LABEL[m.probeB] : 'free'}</div>
          <button onClick={() => dispatch({ type: 'meterClear' })}>Lift leads</button>
        </>
      }
      hint={
        <>
          {off && 'Turn the knob. Plug the black lead into COM and the red lead into Ω V, then drag the probe tips from the bottom left of the scene onto the test points.'}
          {(m.mode === 'VAC' || m.mode === 'VDC') && 'Prove the meter on the 120 V receptacle before and after testing. It is for the 480 V aux bucket and the 120 V control strip only: CAT III 1000 V has no business on the 4160 V side, that is the TIC 300 PRO.'}
          {m.mode === 'mVDC' && 'Millivolt range. Anything over 300 mV reads OL here.'}
          {m.mode === 'OHM' && 'Continuity and resistance. Not an insulation test; use the Megger.'}
          {(m.mode === 'mA' || out || m.mode === 'LOOP') && 'No 4-20 mA loop on this job. The current positions have nothing to read.'}
        </>
      }
    />
  )
}
