import type { PpeId } from '../types'

/**
 * The technician, drawn front-on at about seven heads tall with whatever gear is on.
 * Layers go on in the order a real kit does: base clothes, body garment, boots, gloves, balaclava,
 * glasses, ear plugs, hard hat, shield, and the 40 cal hood over everything.
 */
export function Worker({ ppe, adequate }: { ppe: PpeId[]; adequate: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('ar12') ? 'ar12' : on('ar8') ? 'ar8' : 'cotton'
  const hood = body === 'suit40'
  const tag = { cotton: '', ar8: 'AR 8 cal', ar12: 'AR 12 cal', suit40: 'AR 40 cal' }[body]
  const shirtGrad = { cotton: 'url(#wShirtCotton)', ar8: 'url(#wShirtNavy)', ar12: 'url(#wShirtHiVis)', suit40: 'url(#wShirtOlive)' }[body]
  const pantGrad = { cotton: 'url(#wPantDenim)', ar8: 'url(#wShirtNavy)', ar12: 'url(#wShirtHiVis)', suit40: 'url(#wShirtOlive)' }[body]
  const skin = 'url(#wSkin)'
  const handFill = on('gloves00') ? 'url(#wRubber)' : on('gloves_leather') ? 'url(#wLeather)' : skin

  return (
    <svg viewBox="0 0 300 640" className={`worker ${adequate ? 'ok' : ''}`}>
      <defs>
        <radialGradient id="wSkin" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#f0c9a6" /><stop offset="1" stopColor="#c48f66" /></radialGradient>
        <linearGradient id="wShirtCotton" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8aa3c4" /><stop offset="0.5" stopColor="#6f8bb0" /><stop offset="1" stopColor="#4f678a" /></linearGradient>
        <linearGradient id="wPantDenim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4d5f86" /><stop offset="0.5" stopColor="#3c4b6d" /><stop offset="1" stopColor="#2b3650" /></linearGradient>
        <linearGradient id="wShirtNavy" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2f4c75" /><stop offset="0.5" stopColor="#1f3657" /><stop offset="1" stopColor="#142540" /></linearGradient>
        <linearGradient id="wShirtHiVis" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffa040" /><stop offset="0.5" stopColor="#f07a1c" /><stop offset="1" stopColor="#c45f10" /></linearGradient>
        <linearGradient id="wShirtOlive" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7b8a4a" /><stop offset="0.5" stopColor="#5c6b2f" /><stop offset="1" stopColor="#3f4b1f" /></linearGradient>
        <linearGradient id="wReflect" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f4f4f4" /><stop offset="0.5" stopColor="#b9bec4" /><stop offset="1" stopColor="#eeeeee" /></linearGradient>
        <linearGradient id="wHat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="0.6" stopColor="#e6e6e0" /><stop offset="1" stopColor="#b8b8b0" /></linearGradient>
        <linearGradient id="wRubber" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a3a3a" /><stop offset="1" stopColor="#111" /></linearGradient>
        <linearGradient id="wLeather" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c89a6a" /><stop offset="1" stopColor="#8a6239" /></linearGradient>
        <linearGradient id="wBoot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a4e2a" /><stop offset="1" stopColor="#3f2611" /></linearGradient>
        <linearGradient id="wVisor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9f3e4" stopOpacity="0.55" /><stop offset="1" stopColor="#7fb8a0" stopOpacity="0.35" /></linearGradient>
        <linearGradient id="wHoodWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3d98a" stopOpacity="0.7" /><stop offset="1" stopColor="#c99a2e" stopOpacity="0.55" /></linearGradient>
        <linearGradient id="wBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a3340" /><stop offset="1" stopColor="#151b22" /></linearGradient>
      </defs>

      <rect width="300" height="640" rx="14" fill="url(#wBg)" />
      <ellipse cx="150" cy="612" rx="88" ry="12" fill="#000" opacity="0.45" />

      {/* legs */}
      <path d="M104 318 L146 318 L142 548 L98 548 Z" fill={pantGrad} />
      <path d="M154 318 L196 318 L202 548 L158 548 Z" fill={pantGrad} />
      <path d="M125 330 L120 540" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      <path d="M175 330 L180 540" stroke="#000" strokeOpacity="0.18" strokeWidth="2" />
      {body === 'cotton' && <g stroke="#9bb0d1" strokeOpacity="0.5" strokeWidth="1.5" fill="none"><path d="M108 322 L104 546" /><path d="M192 322 L196 546" /></g>}
      {body === 'ar12' && <g><rect x="99" y="470" width="44" height="12" fill="url(#wReflect)" /><rect x="157" y="470" width="45" height="12" fill="url(#wReflect)" /></g>}
      {body === 'suit40' && <g><rect x="99" y="440" width="44" height="10" fill="url(#wReflect)" opacity="0.8" /><rect x="157" y="440" width="45" height="10" fill="url(#wReflect)" opacity="0.8" /></g>}

      {/* boots or sneakers */}
      {on('boots') ? (
        <g>
          <path d="M96 540 L144 540 L146 580 Q150 596 122 596 L88 596 Q84 584 92 576 Z" fill="url(#wBoot)" />
          <path d="M204 540 L156 540 L154 580 Q150 596 178 596 L212 596 Q216 584 208 576 Z" fill="url(#wBoot)" />
          <path d="M86 592 L150 592 L150 600 L86 600 Z" fill="#1d1d1d" />
          <path d="M150 592 L214 592 L214 600 L150 600 Z" fill="#1d1d1d" />
          <g stroke="#e6d2b0" strokeWidth="1.5" fill="none"><path d="M106 548 L132 554 M106 556 L132 562 M106 564 L132 570" /><path d="M168 554 L194 548 M168 562 L194 556 M168 570 L194 564" /></g>
          <ellipse cx="104" cy="586" rx="12" ry="6" fill="#000" opacity="0.25" /><ellipse cx="196" cy="586" rx="12" ry="6" fill="#000" opacity="0.25" />
        </g>
      ) : (
        <g>
          <path d="M98 546 L142 546 L142 580 Q140 592 118 592 L94 592 Q90 580 96 568 Z" fill="#8d9398" />
          <path d="M202 546 L158 546 L158 580 Q160 592 182 592 L206 592 Q210 580 204 568 Z" fill="#8d9398" />
          <path d="M92 588 L148 588 L148 596 L92 596 Z M152 588 L208 588 L208 596 L152 596 Z" fill="#f2f2f2" />
          <text x="150" y="616" textAnchor="middle" style={{ fontSize: 11, fill: '#ff5a5f', fontWeight: 700 }}>no leather footwear</text>
        </g>
      )}

      {/* torso */}
      <path d="M92 150 Q150 128 208 150 L214 322 L86 322 Z" fill={shirtGrad} />
      <path d="M150 150 L150 322" stroke="#000" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M96 160 Q104 240 100 318" stroke="#000" strokeOpacity="0.12" strokeWidth="6" fill="none" />
      {body === 'cotton' && (
        <g>
          <path d="M134 134 L150 160 L166 134 L160 128 L150 146 L140 128 Z" fill="#5a7398" />
          {[185, 215, 245, 275].map((y) => <circle key={y} cx="150" cy={y} r="2.2" fill="#dfe6f0" />)}
          <rect x="104" y="176" width="30" height="26" rx="2" fill="none" stroke="#dfe6f0" strokeOpacity="0.55" />
        </g>
      )}
      {body === 'ar8' && (
        <g>
          <path d="M136 134 L150 158 L164 134 L158 128 L150 144 L142 128 Z" fill="#294364" />
          {[185, 215, 245, 275].map((y) => <circle key={y} cx="150" cy={y} r="2.2" fill="#9fb3cc" />)}
          <rect x="104" y="176" width="30" height="26" rx="2" fill="none" stroke="#9fb3cc" strokeOpacity="0.6" />
          <rect x="166" y="176" width="30" height="26" rx="2" fill="none" stroke="#9fb3cc" strokeOpacity="0.6" />
        </g>
      )}
      {body === 'ar12' && (
        <g>
          <path d="M150 150 L150 322" stroke="#5a3a10" strokeWidth="3" />
          <rect x="86" y="196" width="128" height="12" fill="url(#wReflect)" />
          <rect x="86" y="262" width="128" height="12" fill="url(#wReflect)" />
          <path d="M104 176 h30 v24 h-30 z M166 176 h30 v24 h-30 z" fill="none" stroke="#000" strokeOpacity="0.25" />
        </g>
      )}
      {body === 'suit40' && (
        <g>
          <path d="M112 150 L112 322 L188 322 L188 150 Q150 138 112 150 Z" fill="#4a5626" />
          <path d="M112 150 L100 322 M188 150 L200 322" stroke="#2f3815" strokeWidth="3" />
          <rect x="86" y="236" width="128" height="10" fill="url(#wReflect)" opacity="0.85" />
          <rect x="120" y="150" width="60" height="16" fill="#2f3815" />
          <path d="M150 166 L150 322" stroke="#c9b45a" strokeWidth="3" />
        </g>
      )}

      {/* arms */}
      <path d="M100 156 Q76 236 70 316" stroke={shirtGrad} strokeWidth="34" strokeLinecap="round" fill="none" />
      <path d="M200 156 Q224 236 230 316" stroke={shirtGrad} strokeWidth="34" strokeLinecap="round" fill="none" />
      <path d="M92 170 Q74 240 70 300" stroke="#000" strokeOpacity="0.15" strokeWidth="6" fill="none" />
      <path d="M208 170 Q226 240 230 300" stroke="#000" strokeOpacity="0.15" strokeWidth="6" fill="none" />
      {(body === 'ar12' || body === 'suit40') && <g><rect x="60" y="250" width="30" height="11" fill="url(#wReflect)" transform="rotate(8 75 255)" /><rect x="210" y="250" width="30" height="11" fill="url(#wReflect)" transform="rotate(-8 225 255)" /></g>}

      {/* glove cuffs then hands */}
      {on('gloves00') && <g><path d="M52 304 Q70 298 90 304 L92 322 Q70 328 50 322 Z" fill="url(#wRubber)" /><path d="M210 304 Q230 298 248 304 L250 322 Q230 328 208 322 Z" fill="url(#wRubber)" /></g>}
      {on('gloves_leather') && <g><path d="M52 304 Q70 298 90 304 L92 320 Q70 326 50 320 Z" fill="#6b4a2a" /><path d="M210 304 Q230 298 248 304 L250 320 Q230 326 208 320 Z" fill="#6b4a2a" /></g>}
      <ellipse cx="70" cy="340" rx="17" ry="22" fill={handFill} />
      <ellipse cx="230" cy="340" rx="17" ry="22" fill={handFill} />
      <ellipse cx="86" cy="334" rx="6" ry="10" fill={handFill} transform="rotate(-25 86 334)" />
      <ellipse cx="214" cy="334" rx="6" ry="10" fill={handFill} transform="rotate(25 214 334)" />
      {on('gloves00') && <g><path d="M54 332 Q70 324 86 332 L88 358 Q70 366 52 358 Z" fill="url(#wLeather)" opacity="0.95" /><path d="M214 332 Q230 324 246 332 L248 358 Q230 366 212 358 Z" fill="url(#wLeather)" opacity="0.95" /></g>}
      {!on('gloves00') && !on('gloves_leather') && <g stroke="#a0744a" strokeOpacity="0.6" strokeWidth="1.2" fill="none"><path d="M62 344 L62 358 M70 346 L70 360 M78 344 L78 358" /><path d="M222 344 L222 358 M230 346 L230 360 M238 344 L238 358" /></g>}

      {/* neck and head */}
      <path d="M136 112 L164 112 L166 142 L134 142 Z" fill={skin} />
      <path d="M136 112 L164 112 L162 128 L138 128 Z" fill="#000" opacity="0.18" />
      <ellipse cx="150" cy="78" rx="34" ry="40" fill={skin} />
      <ellipse cx="116" cy="82" rx="6" ry="9" fill={skin} />
      <ellipse cx="184" cy="82" rx="6" ry="9" fill={skin} />
      {/* hair */}
      <path d="M116 70 Q118 36 150 36 Q182 36 184 70 Q178 52 150 50 Q122 52 116 70 Z" fill="#3b2a1e" />
      {/* face */}
      <path d="M136 66 Q142 62 149 66" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M151 66 Q158 62 164 66" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="141" cy="76" rx="5.5" ry="3.5" fill="#fff" /><ellipse cx="159" cy="76" rx="5.5" ry="3.5" fill="#fff" />
      <circle cx="141" cy="76" r="2.4" fill="#4a3a2a" /><circle cx="159" cy="76" r="2.4" fill="#4a3a2a" />
      <path d="M150 80 L146 92 L153 92" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M140 102 Q150 108 160 102" stroke="#8a4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* balaclava: knit over head and neck, eye opening left clear */}
      {!hood && on('faceshield') && (
        <g>
          <path d="M116 60 Q116 34 150 34 Q184 34 184 60 L184 96 Q184 122 164 126 L166 142 L134 142 L136 126 Q116 122 116 96 Z" fill="#23262a" />
          <path d="M128 68 Q150 62 172 68 L172 84 Q150 90 128 84 Z" fill={skin} />
          <ellipse cx="141" cy="76" rx="5.5" ry="3.5" fill="#fff" /><ellipse cx="159" cy="76" rx="5.5" ry="3.5" fill="#fff" />
          <circle cx="141" cy="76" r="2.4" fill="#4a3a2a" /><circle cx="159" cy="76" r="2.4" fill="#4a3a2a" />
        </g>
      )}

      {/* safety glasses */}
      {on('glasses') && !hood && (
        <g>
          <path d="M126 70 Q141 66 149 72 L149 82 Q141 86 130 82 Q124 78 126 70 Z" fill="#9fd6ff" opacity="0.55" stroke="#222" strokeWidth="1.5" />
          <path d="M174 70 Q159 66 151 72 L151 82 Q159 86 170 82 Q176 78 174 70 Z" fill="#9fd6ff" opacity="0.55" stroke="#222" strokeWidth="1.5" />
          <path d="M149 74 L151 74" stroke="#222" strokeWidth="2" />
          <path d="M126 72 L116 76 M174 72 L184 76" stroke="#222" strokeWidth="2.5" />
        </g>
      )}

      {/* ear plugs */}
      {on('hearing') && !hood && (
        <g>
          <circle cx="114" cy="84" r="4.5" fill="#ff8a1f" stroke="#b35a00" /><circle cx="186" cy="84" r="4.5" fill="#ff8a1f" stroke="#b35a00" />
          <path d="M114 88 Q110 130 150 150 Q190 130 186 88" stroke="#3aa0e0" strokeWidth="1.5" fill="none" />
        </g>
      )}

      {/* hard hat */}
      {on('hardhat') && (
        <g>
          <path d="M108 64 Q112 22 150 22 Q188 22 192 64 Z" fill="url(#wHat)" stroke="#9a9a92" strokeWidth="1.5" />
          <path d="M150 24 L150 62" stroke="#c9c9c0" strokeWidth="4" />
          <path d="M98 64 Q150 54 202 64 L202 72 Q150 82 98 72 Z" fill="url(#wHat)" stroke="#9a9a92" strokeWidth="1.5" />
          <path d="M98 68 Q150 60 202 68" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" fill="none" />
          <text x="150" y="50" textAnchor="middle" style={{ fontSize: 7, fill: '#555', fontWeight: 700 }}>CLASS E</text>
        </g>
      )}

      {/* hat-mounted face shield with chin guard */}
      {!hood && on('faceshield') && (
        <g>
          <path d="M100 74 L100 122 Q150 150 200 122 L200 74 Z" fill="url(#wVisor)" stroke="#5f8f7a" strokeWidth="1.5" />
          <path d="M100 122 Q150 150 200 122 L200 134 Q150 160 100 134 Z" fill="#2f4a3e" opacity="0.9" />
          <path d="M104 78 L108 118" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
        </g>
      )}

      {/* 40 cal hood over everything */}
      {hood && (
        <g>
          <path d="M96 170 L96 60 Q100 14 150 14 Q200 14 204 60 L204 170 Q150 186 96 170 Z" fill="url(#wShirtOlive)" stroke="#2f3815" strokeWidth="2" />
          <path d="M118 48 Q150 40 182 48 L182 104 Q150 112 118 104 Z" fill="url(#wHoodWin)" stroke="#2f3815" strokeWidth="2" />
          <path d="M122 52 L126 100" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
          <ellipse cx="141" cy="76" rx="5" ry="3" fill="#fff" opacity="0.8" /><ellipse cx="159" cy="76" rx="5" ry="3" fill="#fff" opacity="0.8" />
          <circle cx="141" cy="76" r="2" fill="#4a3a2a" /><circle cx="159" cy="76" r="2" fill="#4a3a2a" />
          <path d="M96 150 Q150 166 204 150" stroke="#2f3815" strokeWidth="3" fill="none" />
          <rect x="140" y="116" width="20" height="8" rx="2" fill="#2f3815" />
        </g>
      )}

      {/* arc rating tag */}
      {tag && <g><rect x="92" y="280" width="46" height="16" rx="3" fill="#f4f4f0" stroke="#333" /><text x="115" y="291" textAnchor="middle" style={{ fontSize: 8.5, fontWeight: 700, fill: '#111' }}>{tag}</text></g>}
      {body === 'cotton' && <text x="150" y="340" textAnchor="middle" style={{ fontSize: 11, fill: '#ff5a5f', fontWeight: 700 }}>cotton, no arc rating</text>}
    </svg>
  )
}
