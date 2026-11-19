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
  const redJack = off ? null : m.mode === 'LOOP' ? 'A' : m.mode === 'mA' || out ? 'mA' : 'V'

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
      redJack={redJack}
      leads={
        <>
          <div><span className="lead-a">Red</span> {m.probeA ? POINT_LABEL[m.probeA] : '—'}</div>
          <div><span className="lead-b">Black</span> {m.probeB ? POINT_LABEL[m.probeB] : '—'}</div>
          <button onClick={() => dispatch({ type: 'meterClear' })}>Lift leads</button>
        </>
      }
      hint={
        <>
          {off && 'Turn the knob. With this tab open, tapping two points in the scene places red then black.'}
          {(m.mode === 'VAC' || m.mode === 'VDC') && 'Prove the meter on the 120 V receptacle before and after testing for absence of voltage. The DC bus must be checked on V DC: on V AC it reads near zero even at 650 V. The 789 is CAT III 1000 V.'}
          {m.mode === 'mVDC' && 'Millivolt range. Anything over 300 mV reads OL here; use V DC for the bus.'}
          {m.mode === 'OHM' && 'Continuity and resistance. Not an insulation test; use the Megger.'}
          {(m.mode === 'mA' || out || m.mode === 'LOOP') && 'No 4-20 mA loop on this job. The current positions have nothing to read.'}
        </>
      }
    />
  )
}
