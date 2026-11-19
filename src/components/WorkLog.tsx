import { useEffect, useRef } from 'react'

interface Entry { t: number; kind: string; text: string }

function fmt(t: number): string {
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function WorkLog({ log }: { log: Entry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log.length])
  return (
    <div className="worklog" ref={ref}>
      {log.map((e, i) => (
        <div key={i} className={`log ${e.kind}`}>
          <span className="t">{fmt(e.t)}</span>
          <span className="k">{e.kind}</span>
          <span>{e.text}</span>
        </div>
      ))}
    </div>
  )
}
