import type { MouseEvent as ReactMouseEvent } from 'react'
import { WorkLog } from './WorkLog'
import type { DockState } from './useLogDock'

interface Entry { t: number; kind: string; text: string }

/** Work log docked at the bottom: drag the bar to resize, click the button to collapse to one line. */
export function LogDock({ log, dock, setDock }: { log: Entry[]; dock: DockState; setDock: (d: DockState) => void }) {
  const last = log[log.length - 1]

  const onDown = (e: ReactMouseEvent) => {
    if (!dock.open) return
    e.preventDefault()
    const startY = e.clientY
    const startH = dock.h
    const clamp = (y: number) => Math.max(60, Math.min(window.innerHeight * 0.7, startH + (startY - y)))
    const move = (ev: MouseEvent) => setDock({ open: true, h: clamp(ev.clientY) })
    const up = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      setDock({ open: true, h: clamp(ev.clientY) })
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div className={`logdock ${dock.open ? '' : 'closed'}`}>
      <div className="logdock-bar" onMouseDown={onDown} title={dock.open ? 'Drag to resize' : undefined}>
        <span className="logdock-title">Work log · {log.length}</span>
        {!dock.open && last && <span className={`logdock-last log ${last.kind}`}>{last.text}</span>}
        <button onClick={() => setDock({ ...dock, open: !dock.open })} onMouseDown={(e) => e.stopPropagation()}>{dock.open ? 'Hide ▾' : 'Show ▴'}</button>
      </div>
      {dock.open && <WorkLog log={log} />}
    </div>
  )
}
