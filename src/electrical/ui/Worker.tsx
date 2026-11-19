import type { PpeId } from '../types'

/** The technician, drawn with whatever gear is on. Layers go on in the order a real kit does. */
export function Worker({ ppe, adequate }: { ppe: PpeId[]; adequate: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('ar12') ? 'ar12' : on('ar8') ? 'ar8' : 'cotton'
  const hood = body === 'suit40'
  const shirt = { cotton: '#6b7f99', ar8: '#1f3a5f', ar12: '#d9822b', suit40: '#5c6b2f' }[body]
  const pants = { cotton: '#3b4a6b', ar8: '#1f3a5f', ar12: '#d9822b', suit40: '#5c6b2f' }[body]
  const hands = on('gloves00') ? '#1b1b1b' : on('gloves_leather') ? '#a0744a' : '#e0b894'
  const boots = on('boots') ? '#5a3a1e' : '#8a8f96'
  const tag = { cotton: '', ar8: '8 cal', ar12: '12 cal', suit40: '40 cal' }[body]

  return (
    <svg viewBox="0 0 220 440" className={`worker ${adequate ? 'ok' : ''}`}>
      <ellipse cx="110" cy="425" rx="70" ry="9" fill="#000" opacity="0.25" />
      {/* legs */}
      <rect x="84" y="235" width="22" height="140" rx="6" fill={pants} />
      <rect x="114" y="235" width="22" height="140" rx="6" fill={pants} />
      {body === 'ar12' && <g><rect x="84" y="330" width="22" height="6" fill="#e8e8e8" /><rect x="114" y="330" width="22" height="6" fill="#e8e8e8" /></g>}
      {/* boots */}
      <rect x="76" y="368" width="34" height="24" rx="7" fill={boots} />
      <rect x="110" y="368" width="34" height="24" rx="7" fill={boots} />
      {on('boots') && <g><rect x="76" y="384" width="34" height="8" rx="3" fill="#2b2b2b" /><rect x="110" y="384" width="34" height="8" rx="3" fill="#2b2b2b" /></g>}
      {/* torso */}
      <rect x="68" y="100" width="84" height="140" rx="16" fill={shirt} />
      {body === 'suit40' && <rect x="86" y="100" width="48" height="140" fill="#4a5626" />}
      {body === 'ar12' && <rect x="68" y="150" width="84" height="7" fill="#e8e8e8" />}
      {body === 'cotton' && <g><line x1="110" y1="106" x2="110" y2="236" stroke="#55677f" strokeWidth="2" /><rect x="78" y="112" width="18" height="14" fill="#55677f" opacity="0.6" /></g>}
      {/* arms */}
      <rect x="40" y="104" width="24" height="120" rx="10" fill={shirt} transform="rotate(10 52 104)" />
      <rect x="156" y="104" width="24" height="120" rx="10" fill={shirt} transform="rotate(-10 168 104)" />
      {/* hands / gloves */}
      <circle cx="36" cy="232" r="13" fill={hands} />
      <circle cx="184" cy="232" r="13" fill={hands} />
      {on('gloves00') && <g><rect x="24" y="212" width="24" height="9" fill="#c9a06a" /><rect x="172" y="212" width="24" height="9" fill="#c9a06a" /></g>}
      {/* neck and head */}
      <rect x="100" y="84" width="20" height="20" fill="#e0b894" />
      <circle cx="110" cy="58" r="30" fill="#e0b894" />
      {/* balaclava + face shield (not with the hood) */}
      {!hood && on('faceshield') && (
        <g>
          <path d="M80 58 a30 30 0 1 0 60 0 v30 h-60 z" fill="#1f2326" />
          <rect x="86" y="46" width="48" height="16" rx="4" fill="#e0b894" />
        </g>
      )}
      {/* eyes, glasses */}
      <circle cx="98" cy="54" r="3" fill="#2b2b2b" />
      <circle cx="122" cy="54" r="3" fill="#2b2b2b" />
      {on('glasses') && <g><rect x="88" y="47" width="20" height="12" rx="4" fill="#9fc8ff" opacity="0.6" stroke="#333" /><rect x="112" y="47" width="20" height="12" rx="4" fill="#9fc8ff" opacity="0.6" stroke="#333" /><line x1="108" y1="52" x2="112" y2="52" stroke="#333" strokeWidth="2" /></g>}
      {/* hearing protection */}
      {on('hearing') && <g><circle cx="80" cy="60" r="4" fill="#f58220" /><circle cx="140" cy="60" r="4" fill="#f58220" /><path d="M80 64 q0 30 30 36 q30 -6 30 -36" fill="none" stroke="#f58220" strokeWidth="1.5" /></g>}
      {/* hard hat */}
      {on('hardhat') && <g><path d="M78 50 a32 32 0 0 1 64 0 z" fill="#f4f4f0" stroke="#999" /><rect x="72" y="46" width="76" height="8" rx="4" fill="#f4f4f0" stroke="#999" /></g>}
      {/* face shield visor */}
      {!hood && on('faceshield') && <path d="M78 52 v40 a32 24 0 0 0 64 0 v-40 z" fill="#8fb3c9" opacity="0.4" stroke="#44606e" />}
      {/* 40 cal hood over everything */}
      {hood && (
        <g>
          <path d="M70 110 v-50 a40 40 0 0 1 80 0 v50 z" fill="#5c6b2f" stroke="#3f4a20" strokeWidth="2" />
          <rect x="84" y="40" width="52" height="44" rx="6" fill="#d9b44a" opacity="0.55" stroke="#3f4a20" />
          <rect x="60" y="104" width="100" height="14" rx="4" fill="#4a5626" />
        </g>
      )}
      {tag && <g><rect x="92" y="190" width="36" height="14" rx="3" fill="#fff" stroke="#333" /><text x="110" y="200" textAnchor="middle" style={{ fontSize: 9, fontWeight: 700, fill: '#111' }}>{tag}</text></g>}
      {body === 'cotton' && <text x="110" y="262" textAnchor="middle" style={{ fontSize: 10, fill: '#ff5a5f', fontWeight: 700 }}>cotton, no arc rating</text>}
    </svg>
  )
}
