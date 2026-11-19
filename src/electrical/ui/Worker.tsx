import type { PpeId } from '../types'

/**
 * The technician, drawn in the style of an arc flash PPE chart: front-on, arms slightly out, navy arc-rated kit,
 * orange hard hat, green-tinted shield. Layers go on in the order a real kit does: base clothes, body garment,
 * boots, gloves, balaclava, glasses, ear plugs, hard hat, shield, and the hood over everything.
 */
export function Worker({ ppe, adequate }: { ppe: PpeId[]; adequate: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('ar12') ? 'ar12' : on('ar8') ? 'ar8' : 'cotton'
  const hood = body === 'suit40'
  const tag = { cotton: '', ar8: 'ATPV 8', ar12: 'ATPV 12', suit40: 'ATPV 40' }[body]
  const shirt = { cotton: 'url(#wCotton)', ar8: 'url(#wNavy)', ar12: 'url(#wNavy)', suit40: 'url(#wNavy)' }[body]
  const pants = { cotton: 'url(#wDenim)', ar8: 'url(#wNavyDark)', ar12: 'url(#wNavy)', suit40: 'url(#wNavyDark)' }[body]
  const skin = 'url(#wSkin)'
  const hand = on('gloves00') ? 'url(#wGloveGrey)' : on('gloves_leather') ? 'url(#wLeather)' : skin

  return (
    <svg viewBox="0 0 300 640" className={`worker ${adequate ? 'ok' : ''}`}>
      <defs>
        <radialGradient id="wSkin" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#f0c9a6" /><stop offset="1" stopColor="#c48f66" /></radialGradient>
        <linearGradient id="wCotton" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9fb4cf" /><stop offset="0.5" stopColor="#7d95b8" /><stop offset="1" stopColor="#5b7194" /></linearGradient>
        <linearGradient id="wDenim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#546a95" /><stop offset="0.5" stopColor="#3f5279" /><stop offset="1" stopColor="#2c3a57" /></linearGradient>
        <linearGradient id="wNavy" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3a5fa3" /><stop offset="0.5" stopColor="#24427c" /><stop offset="1" stopColor="#15294f" /></linearGradient>
        <linearGradient id="wNavyDark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#2b4a84" /><stop offset="0.5" stopColor="#1b3261" /><stop offset="1" stopColor="#101f3e" /></linearGradient>
        <linearGradient id="wPanel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4d74b8" /><stop offset="1" stopColor="#30528f" /></linearGradient>
        <linearGradient id="wReflect" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f4f4f4" /><stop offset="0.5" stopColor="#b9bec4" /><stop offset="1" stopColor="#eeeeee" /></linearGradient>
        <linearGradient id="wHat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffb257" /><stop offset="0.55" stopColor="#f58a1f" /><stop offset="1" stopColor="#c45f0a" /></linearGradient>
        <linearGradient id="wGloveGrey" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6e737b" /><stop offset="1" stopColor="#3b3f46" /></linearGradient>
        <linearGradient id="wCuff" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9c2a38" /><stop offset="1" stopColor="#5e1420" /></linearGradient>
        <linearGradient id="wLeather" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c89a6a" /><stop offset="1" stopColor="#8a6239" /></linearGradient>
        <linearGradient id="wBoot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a3d44" /><stop offset="1" stopColor="#0f1114" /></linearGradient>
        <linearGradient id="wVisor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b7e58a" stopOpacity="0.7" /><stop offset="1" stopColor="#4f8a3a" stopOpacity="0.55" /></linearGradient>
        <linearGradient id="wBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3f6fb" /><stop offset="1" stopColor="#d7dfeb" /></linearGradient>
      </defs>

      <rect width="300" height="640" rx="14" fill="url(#wBg)" />
      <ellipse cx="150" cy="616" rx="96" ry="12" fill="#000" opacity="0.18" />

      {/* legs, slightly apart */}
      <path d="M104 318 L146 318 L138 552 L88 552 Z" fill={pants} />
      <path d="M154 318 L196 318 L212 552 L162 552 Z" fill={pants} />
      <path d="M126 330 L116 548" stroke="#000" strokeOpacity="0.2" strokeWidth="2" />
      <path d="M174 330 L184 548" stroke="#000" strokeOpacity="0.2" strokeWidth="2" />
      {body === 'cotton' && <g stroke="#b8c7de" strokeOpacity="0.6" strokeWidth="1.5" fill="none"><path d="M108 322 L94 550" /><path d="M192 322 L206 550" /></g>}
      {(body === 'ar12' || body === 'suit40') && <g><path d="M92 486 L138 486 L137 498 L91 498 Z" fill="url(#wReflect)" /><path d="M162 486 L208 486 L209 498 L163 498 Z" fill="url(#wReflect)" /></g>}
      {body === 'suit40' && <g><path d="M96 352 L142 352 L142 362 L96 362 Z M158 352 L204 352 L204 362 L158 362 Z" fill="#000" opacity="0.15" /></g>}

      {/* boots or sneakers */}
      {on('boots') ? (
        <g>
          <path d="M86 544 L140 544 L142 584 Q146 600 118 600 L78 600 Q74 588 84 580 Z" fill="url(#wBoot)" />
          <path d="M214 544 L160 544 L158 584 Q154 600 182 600 L222 600 Q226 588 216 580 Z" fill="url(#wBoot)" />
          <path d="M76 596 L148 596 L148 606 L76 606 Z M152 596 L224 596 L224 606 L152 606 Z" fill="#050505" />
          <path d="M80 594 L146 594 M154 594 L220 594" stroke="#555" strokeWidth="2" />
          <g stroke="#9aa0a8" strokeWidth="1.6" fill="none">
            <path d="M98 552 L128 558 M98 560 L128 566 M98 568 L128 574 M98 576 L128 582" />
            <path d="M172 558 L202 552 M172 566 L202 560 M172 574 L202 568 M172 582 L202 576" />
          </g>
          <path d="M84 580 Q92 572 100 580 M200 580 Q208 572 216 580" stroke="#2a2d33" strokeWidth="2" fill="none" />
        </g>
      ) : (
        <g>
          <path d="M90 548 L140 548 L140 584 Q138 596 114 596 L84 596 Q80 584 88 572 Z" fill="#8d9398" />
          <path d="M210 548 L160 548 L160 584 Q162 596 186 596 L216 596 Q220 584 212 572 Z" fill="#8d9398" />
          <path d="M80 592 L148 592 L148 600 L80 600 Z M152 592 L220 592 L220 600 L152 600 Z" fill="#f2f2f2" />
          <text x="150" y="626" textAnchor="middle" style={{ fontSize: 11, fill: '#c0252b', fontWeight: 700 }}>no leather safety boots</text>
        </g>
      )}

      {/* torso */}
      <path d="M90 150 Q150 128 210 150 L216 322 L84 322 Z" fill={shirt} />
      <path d="M94 160 Q104 240 100 318" stroke="#000" strokeOpacity="0.14" strokeWidth="6" fill="none" />
      {body === 'cotton' && (
        <g>
          <path d="M134 134 L150 160 L166 134 L160 128 L150 146 L140 128 Z" fill="#5f7aa3" />
          {[185, 215, 245, 275].map((y) => <circle key={y} cx="150" cy={y} r="2.2" fill="#e9eef5" />)}
          <rect x="104" y="176" width="30" height="26" rx="2" fill="none" stroke="#e9eef5" strokeOpacity="0.6" />
        </g>
      )}
      {body === 'ar8' && (
        <g>
          <path d="M136 134 L150 158 L164 134 L158 128 L150 144 L142 128 Z" fill="#1b3261" />
          {[185, 215, 245, 275].map((y) => <circle key={y} cx="150" cy={y} r="2.2" fill="#9fb3cc" />)}
          <path d="M104 176 h30 v26 h-30 z M166 176 h30 v26 h-30 z" fill="none" stroke="#9fb3cc" strokeOpacity="0.7" />
          <path d="M104 176 h30 l-15 8 z M166 176 h30 l-15 8 z" fill="#9fb3cc" opacity="0.5" />
        </g>
      )}
      {body === 'ar12' && (
        <g>
          <path d="M136 134 L150 160 L164 134 L158 128 L150 146 L142 128 Z" fill="#1b3261" />
          <path d="M150 150 L150 322" stroke="#c9ced6" strokeWidth="3" />
          <path d="M84 200 L216 200 L216 212 L84 212 Z" fill="url(#wReflect)" />
          <path d="M84 262 L216 262 L216 274 L84 274 Z" fill="url(#wReflect)" />
          <path d="M104 176 h30 v22 h-30 z M166 176 h30 v22 h-30 z" fill="none" stroke="#000" strokeOpacity="0.25" />
        </g>
      )}
      {body === 'suit40' && (
        <g>
          <path d="M110 150 L110 322 L190 322 L190 150 Q150 138 110 150 Z" fill="url(#wPanel)" />
          <path d="M150 150 L150 322" stroke="#0f1f3e" strokeWidth="3" />
          <path d="M116 190 h28 v26 h-28 z M156 190 h28 v26 h-28 z" fill="#1b3261" stroke="#0f1f3e" />
          <path d="M116 190 h28 l-14 8 z M156 190 h28 l-14 8 z" fill="#2b4a84" />
          <path d="M116 262 h28 v30 h-28 z M156 262 h28 v30 h-28 z" fill="#1b3261" stroke="#0f1f3e" />
          <path d="M84 300 L216 300 L216 322 L84 322 Z" fill="#101f3e" />
          <path d="M126 322 L130 346 L170 346 L174 322" fill="none" stroke="#0f1f3e" strokeWidth="3" />
        </g>
      )}

      {/* arms, out at a slight angle */}
      <path d="M98 158 Q66 236 58 318" stroke={shirt} strokeWidth="36" strokeLinecap="round" fill="none" />
      <path d="M202 158 Q234 236 242 318" stroke={shirt} strokeWidth="36" strokeLinecap="round" fill="none" />
      <path d="M90 174 Q64 240 60 300" stroke="#000" strokeOpacity="0.16" strokeWidth="6" fill="none" />
      <path d="M210 174 Q236 240 240 300" stroke="#000" strokeOpacity="0.16" strokeWidth="6" fill="none" />
      {(body === 'ar12' || body === 'suit40') && <g><rect x="50" y="252" width="34" height="11" fill="url(#wReflect)" transform="rotate(10 67 257)" /><rect x="216" y="252" width="34" height="11" fill="url(#wReflect)" transform="rotate(-10 233 257)" /></g>}

      {/* glove cuffs then hands */}
      {on('gloves00') && <g><path d="M36 300 Q58 292 82 300 L84 330 Q58 338 34 330 Z" fill="url(#wCuff)" /><path d="M218 300 Q242 292 264 300 L266 330 Q242 338 216 330 Z" fill="url(#wCuff)" /></g>}
      {on('gloves_leather') && <g><path d="M38 302 Q58 296 80 302 L82 322 Q58 328 36 322 Z" fill="#6b4a2a" /><path d="M220 302 Q242 296 262 302 L264 322 Q242 328 218 322 Z" fill="#6b4a2a" /></g>}
      <ellipse cx="58" cy="346" rx="18" ry="24" fill={hand} />
      <ellipse cx="242" cy="346" rx="18" ry="24" fill={hand} />
      <ellipse cx="76" cy="338" rx="6" ry="11" fill={hand} transform="rotate(-28 76 338)" />
      <ellipse cx="224" cy="338" rx="6" ry="11" fill={hand} transform="rotate(28 224 338)" />
      {on('gloves00') && <g stroke="#1d2024" strokeOpacity="0.5" strokeWidth="1.4" fill="none"><path d="M48 350 L48 366 M58 352 L58 368 M68 350 L68 366" /><path d="M232 350 L232 366 M242 352 L242 368 M252 350 L252 366" /></g>}
      {!on('gloves00') && !on('gloves_leather') && <g stroke="#a0744a" strokeOpacity="0.6" strokeWidth="1.2" fill="none"><path d="M50 350 L50 364 M58 352 L58 366 M66 350 L66 364" /><path d="M234 350 L234 364 M242 352 L242 366 M250 350 L250 364" /></g>}

      {/* neck and head */}
      <path d="M136 112 L164 112 L166 142 L134 142 Z" fill={skin} />
      <path d="M136 112 L164 112 L162 128 L138 128 Z" fill="#000" opacity="0.18" />
      <ellipse cx="150" cy="78" rx="34" ry="40" fill={skin} />
      <ellipse cx="116" cy="82" rx="6" ry="9" fill={skin} />
      <ellipse cx="184" cy="82" rx="6" ry="9" fill={skin} />
      <path d="M116 70 Q118 36 150 36 Q182 36 184 70 Q178 52 150 50 Q122 52 116 70 Z" fill="#3b2a1e" />
      <path d="M136 66 Q142 62 149 66" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M151 66 Q158 62 164 66" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="141" cy="76" rx="5.5" ry="3.5" fill="#fff" /><ellipse cx="159" cy="76" rx="5.5" ry="3.5" fill="#fff" />
      <circle cx="141" cy="76" r="2.4" fill="#4a3a2a" /><circle cx="159" cy="76" r="2.4" fill="#4a3a2a" />
      <path d="M150 80 L146 92 L153 92" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M140 102 Q150 108 160 102" stroke="#8a4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* balaclava under a shield */}
      {!hood && on('faceshield') && (
        <g>
          <path d="M116 60 Q116 34 150 34 Q184 34 184 60 L184 96 Q184 122 164 126 L166 142 L134 142 L136 126 Q116 122 116 96 Z" fill="#1b3261" />
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

      {/* hood: navy shroud over head and shoulders, under the hat brim */}
      {hood && (
        <g>
          <path d="M92 178 L94 70 Q100 20 150 20 Q200 20 206 70 L208 178 Q150 196 92 178 Z" fill="url(#wNavy)" stroke="#0f1f3e" strokeWidth="2" />
          <path d="M112 150 Q150 142 188 150 L190 178 Q150 188 110 178 Z" fill="#101f3e" opacity="0.6" />
          <path d="M150 20 L150 60" stroke="#0f1f3e" strokeOpacity="0.4" strokeWidth="3" />
        </g>
      )}

      {/* hard hat */}
      {on('hardhat') && (
        <g>
          <path d="M106 66 Q110 20 150 20 Q190 20 194 66 Z" fill="url(#wHat)" stroke="#9a4d08" strokeWidth="1.5" />
          <path d="M150 22 L150 64" stroke="#ffd39a" strokeOpacity="0.8" strokeWidth="4" />
          <path d="M126 32 Q150 24 174 32" stroke="#ffe0b8" strokeOpacity="0.7" strokeWidth="2" fill="none" />
          <path d="M96 66 Q150 56 204 66 L204 74 Q150 84 96 74 Z" fill="url(#wHat)" stroke="#9a4d08" strokeWidth="1.5" />
          <path d="M96 70 Q150 62 204 70" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
        </g>
      )}

      {/* green-tinted shield: hat-mounted over a balaclava, or the hood window */}
      {(on('faceshield') || hood) && (
        <g>
          <path d="M100 76 L100 124 Q150 152 200 124 L200 76 Z" fill="url(#wVisor)" stroke="#2f5a26" strokeWidth="2" />
          <path d="M100 124 Q150 152 200 124 L200 136 Q150 162 100 136 Z" fill="#17331a" opacity="0.85" />
          <path d="M106 80 L110 118" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.5" />
          <ellipse cx="141" cy="78" rx="5" ry="3" fill="#fff" opacity="0.35" /><ellipse cx="159" cy="78" rx="5" ry="3" fill="#fff" opacity="0.35" />
        </g>
      )}

      {/* arc rating patch */}
      {tag && <g><rect x="166" y="232" width="34" height="18" rx="3" fill="#f4f4f0" stroke="#333" /><text x="183" y="240" textAnchor="middle" style={{ fontSize: 6, fontWeight: 700, fill: '#111' }}>{tag}</text><text x="183" y="247" textAnchor="middle" style={{ fontSize: 5.5, fill: '#333' }}>cal/cm²</text></g>}
      {body === 'cotton' && <text x="150" y="342" textAnchor="middle" style={{ fontSize: 11, fill: '#c0252b', fontWeight: 700 }}>cotton, no arc rating</text>}
    </svg>
  )
}
