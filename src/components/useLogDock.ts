import { useState } from 'react'
import type { CSSProperties } from 'react'

export interface DockState { h: number; open: boolean }

const KEY = 'sepsim.logdock'
export const DOCK_BAR = 30

function load(): DockState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<DockState>
      return { h: Math.max(60, Math.min(600, v.h ?? 150)), open: v.open ?? true }
    }
  } catch { /* storage unavailable */ }
  return { h: 150, open: true }
}

function save(v: DockState) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ }
}

/** Dock state lives in the sim so the grid row height stays definite; pass `simStyle` to the `.sim` element. */
export function useLogDock(): { dock: DockState; setDock: (d: DockState) => void; simStyle: CSSProperties } {
  const [dock, set] = useState(load)
  const setDock = (d: DockState) => { set(d); save(d) }
  const simStyle = { '--dock-h': `${dock.open ? dock.h : DOCK_BAR}px` } as CSSProperties
  return { dock, setDock, simStyle }
}
