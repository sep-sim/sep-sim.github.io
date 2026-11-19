import type { PpeId } from '../types'
import { PPE_ITEMS } from '../types'

/**
 * The technician, traced after a standard arc flash PPE chart: orange hard hat with a dark brim band, green visor
 * in a dark frame, navy hood draped over the shoulders, navy jacket with lighter placket and flapped chest pockets,
 * gauntlet cuffs with grey leather protector gloves, bib pants, black lace-up boots. Lit from the left.
 * Layers go on in the order a real kit does and lower kits reuse the same body.
 */
export function Worker({ ppe, adequate }: { ppe: PpeId[]; adequate: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('ar12') ? 'ar12' : on('ar8') ? 'ar8' : 'cotton'
  const hood = body === 'suit40'
  const navy = body !== 'cotton'
  const tag = { cotton: '', ar8: 'ATPV 8', ar12: 'ATPV 12', suit40: 'ATPV 40' }[body]
  const coat = navy ? 'url(#cNavy)' : 'url(#cCotton)'
  const placket = navy ? 'url(#cPlacket)' : 'url(#cCottonLight)'
  const pant = navy ? 'url(#cNavyPant)' : 'url(#cDenim)'
  const skin = 'url(#cSkin)'
  const rubber = PPE_ITEMS.find((p) => p.slot === 'hands' && p.shockOk && on(p.id))
  const handFill = rubber ? 'url(#cProtector)' : on('gloves_leather') ? 'url(#cLeather)' : skin
  const cuff = rubber?.cuff ?? '#8f1f2b'
  const cuffText = rubber && (rubber.gloveClass === '1' || rubber.gloveClass === '00') ? '#222' : '#fff'

  return (
    <svg viewBox="0 0 300 640" className={`worker ${adequate ? 'ok' : ''}`}>
      <defs>
        <radialGradient id="cSkin" cx="38%" cy="32%" r="72%"><stop offset="0" stopColor="#f2cfae" /><stop offset="1" stopColor="#c58e63" /></radialGradient>
        <linearGradient id="cNavy" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stopColor="#3d5f9e" /><stop offset="0.45" stopColor="#213d74" /><stop offset="1" stopColor="#101f44" /></linearGradient>
        <linearGradient id="cNavyPant" x1="0" y1="0" x2="1" y2="0.1"><stop offset="0" stopColor="#35548f" /><stop offset="0.5" stopColor="#1d366a" /><stop offset="1" stopColor="#0e1b3c" /></linearGradient>
        <linearGradient id="cPlacket" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5577bd" /><stop offset="1" stopColor="#2f4f8f" /></linearGradient>
        <linearGradient id="cHood" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stopColor="#4a6cae" /><stop offset="0.4" stopColor="#24427c" /><stop offset="1" stopColor="#0f1d42" /></linearGradient>
        <linearGradient id="cCotton" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a9bbd3" /><stop offset="0.5" stopColor="#7f97b9" /><stop offset="1" stopColor="#5a7196" /></linearGradient>
        <linearGradient id="cCottonLight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3d1e4" /><stop offset="1" stopColor="#96abc8" /></linearGradient>
        <linearGradient id="cDenim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#56709c" /><stop offset="0.5" stopColor="#3d5280" /><stop offset="1" stopColor="#28375a" /></linearGradient>
        <linearGradient id="cHat" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stopColor="#ffb75c" /><stop offset="0.45" stopColor="#f78a1e" /><stop offset="1" stopColor="#c45c08" /></linearGradient>
        <linearGradient id="cBrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f28a24" /><stop offset="1" stopColor="#b8560a" /></linearGradient>
        <linearGradient id="cVisor" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor="#b6dd84" /><stop offset="0.5" stopColor="#6fae4b" /><stop offset="1" stopColor="#2f6b2a" /></linearGradient>
        <linearGradient id="cProtector" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8d9299" /><stop offset="0.5" stopColor="#5f646b" /><stop offset="1" stopColor="#3a3e45" /></linearGradient>
        <linearGradient id="cLeather" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#cfa373" /><stop offset="1" stopColor="#8a6239" /></linearGradient>
        <linearGradient id="cBoot" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stopColor="#4a4e55" /><stop offset="0.5" stopColor="#1f2227" /><stop offset="1" stopColor="#0a0b0d" /></linearGradient>
        <linearGradient id="cReflect" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f4f4f4" /><stop offset="0.5" stopColor="#b9bec4" /><stop offset="1" stopColor="#eeeeee" /></linearGradient>
        <radialGradient id="cShade" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#000" stopOpacity="0.28" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      </defs>

      <rect width="300" height="640" rx="14" fill="#ffffff" />
      <ellipse cx="150" cy="618" rx="104" ry="11" fill="#000" opacity="0.14" />

      {/* ---------- pants: legs apart, toes out ---------- */}
      <path d="M96 318 L150 318 L146 420 L138 548 L84 548 L88 420 Z" fill={pant} />
      <path d="M150 318 L204 318 L212 420 L216 548 L162 548 L154 420 Z" fill={pant} />
      <path d="M118 330 C 112 400, 112 470, 110 546" stroke="#000" strokeOpacity="0.22" strokeWidth="2.5" fill="none" />
      <path d="M182 330 C 188 400, 188 470, 190 546" stroke="#000" strokeOpacity="0.22" strokeWidth="2.5" fill="none" />
      <ellipse cx="118" cy="430" rx="22" ry="20" fill="url(#cShade)" />
      <ellipse cx="184" cy="430" rx="22" ry="20" fill="url(#cShade)" />
      <path d="M150 318 L150 420" stroke="#000" strokeOpacity="0.3" strokeWidth="3" />
      {body === 'cotton' && <g stroke="#c6d3e6" strokeOpacity="0.7" strokeWidth="1.6" fill="none"><path d="M100 326 L90 546" /><path d="M200 326 L210 546" /></g>}
      {body === 'ar12' && <g><path d="M86 480 L138 480 L138 492 L85 492 Z M162 480 L214 480 L215 492 L162 492 Z" fill="url(#cReflect)" /></g>}

      {/* ---------- boots or sneakers ---------- */}
      {on('boots') ? (
        <g>
          {/* left boot: shaft, toe box out to the left, sole */}
          <path d="M82 540 L140 540 L142 578 Q148 598 118 598 L70 598 Q60 598 60 586 Q60 574 74 570 L80 560 Z" fill="url(#cBoot)" />
          <path d="M218 540 L160 540 L158 578 Q152 598 182 598 L230 598 Q240 598 240 586 Q240 574 226 570 L220 560 Z" fill="url(#cBoot)" />
          <path d="M58 594 L150 594 L150 606 Q150 610 144 610 L62 610 Q56 610 56 604 Z M150 594 L242 594 L242 604 Q242 610 236 610 L156 610 Q150 610 150 606 Z" fill="#101114" />
          <path d="M60 598 L148 598 M152 598 L240 598" stroke="#6b6f76" strokeWidth="1.5" />
          <path d="M84 542 L138 542 L138 548 L84 548 Z M162 542 L216 542 L216 548 L162 548 Z" fill="#000" opacity="0.35" />
          <g stroke="#a7acb4" strokeWidth="1.6" fill="none">
            <path d="M96 552 L126 558 M96 560 L126 566 M96 568 L126 574 M96 576 L126 582" />
            <path d="M174 558 L204 552 M174 566 L204 560 M174 574 L204 568 M174 582 L204 576" />
          </g>
          <path d="M70 574 Q84 566 96 576" stroke="#2c3036" strokeWidth="2" fill="none" />
          <path d="M230 574 Q216 566 204 576" stroke="#2c3036" strokeWidth="2" fill="none" />
          <ellipse cx="100" cy="590" rx="30" ry="5" fill="#fff" opacity="0.08" />
        </g>
      ) : (
        <g>
          <path d="M86 544 L140 544 L140 584 Q138 596 112 596 L78 596 Q72 584 82 572 Z" fill="#8d9398" />
          <path d="M214 544 L160 544 L160 584 Q162 596 188 596 L222 596 Q228 584 218 572 Z" fill="#8d9398" />
          <path d="M74 592 L148 592 L148 602 L74 602 Z M152 592 L226 592 L226 602 L152 602 Z" fill="#f2f2f2" />
          <text x="150" y="630" textAnchor="middle" style={{ fontSize: 11, fill: '#c0252b', fontWeight: 700 }}>no leather safety boots</text>
        </g>
      )}

      {/* ---------- jacket body ---------- */}
      <path d="M78 186 Q150 170 222 186 L228 260 Q230 300 222 334 L78 334 Q70 300 72 260 Z" fill={coat} />
      <path d="M80 200 C 86 260, 84 300, 90 332" stroke="#000" strokeOpacity="0.14" strokeWidth="8" fill="none" />
      <path d="M220 200 C 214 260, 216 300, 212 332" stroke="#000" strokeOpacity="0.22" strokeWidth="10" fill="none" />
      {/* placket */}
      <path d="M140 186 L160 186 L160 334 L140 334 Z" fill={placket} />
      <path d="M150 190 L150 332" stroke={navy ? '#0f1d42' : '#5a7196'} strokeWidth="2" strokeDasharray="3 2" />
      {navy ? (
        <g>
          {/* chest pockets with flaps */}
          <path d="M90 232 L132 232 L132 272 Q132 276 128 276 L90 276 Z" fill="#1a3264" stroke="#0f1d42" />
          <path d="M168 232 L210 232 L210 276 L172 276 Q168 276 168 272 Z" fill="#1a3264" stroke="#0f1d42" />
          <path d="M88 232 L134 232 L132 244 L90 244 Z" fill="#2a4a86" stroke="#0f1d42" />
          <path d="M166 232 L212 232 L210 244 L168 244 Z" fill="#2a4a86" stroke="#0f1d42" />
          {/* label on the chest pocket */}
          <rect x="96" y="250" width="22" height="16" rx="2" fill="#f4f4f0" stroke="#333" />
          <text x="107" y="257" textAnchor="middle" style={{ fontSize: 5, fontWeight: 800, fill: '#111' }}>{tag.split(' ')[0]}</text>
          <text x="107" y="263" textAnchor="middle" style={{ fontSize: 5.5, fontWeight: 800, fill: '#111' }}>{tag.split(' ')[1]}</text>
          <rect x="176" y="252" width="14" height="8" fill="#e8e8e8" opacity="0.9" />
          {/* hem band */}
          <path d="M78 316 L222 316 L222 334 L78 334 Z" fill="#000" opacity="0.18" />
          {body === 'ar12' && <path d="M72 290 L228 290 L228 302 L72 302 Z" fill="url(#cReflect)" />}
        </g>
      ) : (
        <g>
          <path d="M132 176 L150 196 L168 176 L162 170 L150 184 L138 170 Z" fill="#6f88ad" />
          <rect x="94" y="226" width="34" height="28" rx="2" fill="none" stroke="#dce5f1" strokeOpacity="0.8" />
          {[214, 244, 274, 304].map((y) => <circle key={y} cx="150" cy={y} r="2.2" fill="#eef2f8" />)}
        </g>
      )}

      {/* ---------- sleeves, bent out at the elbow ---------- */}
      <path d="M86 192 C 60 230, 48 266, 44 306" stroke={coat} strokeWidth="40" strokeLinecap="round" fill="none" />
      <path d="M214 192 C 240 230, 252 266, 256 306" stroke={coat} strokeWidth="40" strokeLinecap="round" fill="none" />
      <ellipse cx="60" cy="256" rx="16" ry="22" fill="url(#cShade)" transform="rotate(-20 60 256)" />
      <ellipse cx="240" cy="256" rx="16" ry="22" fill="url(#cShade)" transform="rotate(20 240 256)" />
      <path d="M78 200 C 56 236, 46 270, 44 300" stroke="#fff" strokeOpacity="0.12" strokeWidth="6" fill="none" />
      {(body === 'ar12') && <g><rect x="38" y="246" width="40" height="12" fill="url(#cReflect)" transform="rotate(16 58 252)" /><rect x="222" y="246" width="40" height="12" fill="url(#cReflect)" transform="rotate(-16 242 252)" /></g>}

      {/* ---------- gauntlet cuffs and gloves ---------- */}
      {rubber && (
        <g>
          <path d="M22 300 Q44 288 70 300 L74 334 Q46 344 18 334 Z" fill={cuff} stroke="#000" strokeOpacity="0.4" />
          <path d="M230 300 Q256 288 278 300 L282 334 Q254 344 226 334 Z" fill={cuff} stroke="#000" strokeOpacity="0.4" />
          <path d="M22 300 Q44 288 70 300 L70 308 Q44 298 22 308 Z M230 300 Q256 288 278 300 L278 308 Q256 298 230 308 Z" fill="#000" opacity="0.3" />
          <text x="46" y="326" textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, fill: cuffText }}>{rubber.gloveClass}</text>
          <text x="254" y="326" textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, fill: cuffText }}>{rubber.gloveClass}</text>
        </g>
      )}
      {on('gloves_leather') && <g><path d="M24 302 Q46 294 68 302 L70 324 Q46 332 22 324 Z" fill="#6b4a2a" /><path d="M232 302 Q254 294 276 302 L278 324 Q254 332 230 324 Z" fill="#6b4a2a" /></g>}
      {/* hands: open palms, thumbs in */}
      <path d="M24 330 Q46 322 70 330 L74 356 Q72 384 48 388 Q24 384 22 356 Z" fill={handFill} />
      <path d="M230 330 Q254 322 276 330 L278 356 Q276 384 252 388 Q228 384 226 356 Z" fill={handFill} />
      <path d="M70 336 Q86 342 84 360 Q80 368 70 362 Z" fill={handFill} />
      <path d="M230 336 Q214 342 216 360 Q220 368 230 362 Z" fill={handFill} />
      <g stroke="#000" strokeOpacity={rubber ? 0.45 : 0.22} strokeWidth="1.5" fill="none">
        <path d="M34 356 L34 380 M46 358 L46 384 M58 356 L58 380" />
        <path d="M242 356 L242 380 M254 358 L254 384 M266 356 L266 380" />
      </g>

      {/* ---------- neck and head ---------- */}
      <path d="M134 116 L166 116 L168 150 L132 150 Z" fill={skin} />
      <path d="M134 116 L166 116 L164 132 L136 132 Z" fill="#000" opacity="0.2" />
      <ellipse cx="150" cy="80" rx="35" ry="41" fill={skin} />
      <ellipse cx="115" cy="84" rx="6" ry="9" fill={skin} />
      <ellipse cx="185" cy="84" rx="6" ry="9" fill={skin} />
      <path d="M115 72 Q117 38 150 38 Q183 38 185 72 Q179 54 150 52 Q121 54 115 72 Z" fill="#3b2a1e" />
      <path d="M136 68 Q142 64 149 68" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M151 68 Q158 64 164 68" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="141" cy="78" rx="5.5" ry="3.5" fill="#fff" /><ellipse cx="159" cy="78" rx="5.5" ry="3.5" fill="#fff" />
      <circle cx="141" cy="78" r="2.4" fill="#4a3a2a" /><circle cx="159" cy="78" r="2.4" fill="#4a3a2a" />
      <path d="M150 82 L146 94 L153 94" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M140 104 Q150 110 160 104" stroke="#8a4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* balaclava for the shield without a hood */}
      {!hood && on('faceshield') && (
        <g>
          <path d="M115 62 Q115 36 150 36 Q185 36 185 62 L185 98 Q185 126 164 130 L168 150 L132 150 L136 130 Q115 126 115 98 Z" fill="#17305f" />
          <path d="M127 70 Q150 64 173 70 L173 86 Q150 92 127 86 Z" fill={skin} />
          <ellipse cx="141" cy="78" rx="5.5" ry="3.5" fill="#fff" /><ellipse cx="159" cy="78" rx="5.5" ry="3.5" fill="#fff" />
          <circle cx="141" cy="78" r="2.4" fill="#4a3a2a" /><circle cx="159" cy="78" r="2.4" fill="#4a3a2a" />
        </g>
      )}

      {on('glasses') && !hood && (
        <g>
          <path d="M126 72 Q141 68 149 74 L149 84 Q141 88 130 84 Q124 80 126 72 Z" fill="#9fd6ff" opacity="0.55" stroke="#222" strokeWidth="1.5" />
          <path d="M174 72 Q159 68 151 74 L151 84 Q159 88 170 84 Q176 80 174 72 Z" fill="#9fd6ff" opacity="0.55" stroke="#222" strokeWidth="1.5" />
          <path d="M149 76 L151 76" stroke="#222" strokeWidth="2" />
          <path d="M126 74 L115 78 M174 74 L185 78" stroke="#222" strokeWidth="2.5" />
        </g>
      )}
      {on('hearing') && !hood && (
        <g>
          <circle cx="113" cy="86" r="4.5" fill="#ff8a1f" stroke="#b35a00" /><circle cx="187" cy="86" r="4.5" fill="#ff8a1f" stroke="#b35a00" />
          <path d="M113 90 Q108 130 150 152 Q192 130 187 90" stroke="#3aa0e0" strokeWidth="1.5" fill="none" />
        </g>
      )}

      {/* ---------- hood: bell from the hat brim down over the shoulders ---------- */}
      {hood && (
        <g>
          <path d="M104 92 C 92 120, 78 160, 66 198 C 60 216, 70 226, 96 230 L204 230 C 230 226, 240 216, 234 198 C 222 160, 208 120, 196 92 Z" fill="url(#cHood)" />
          <path d="M66 198 Q70 226 96 230 L116 226 Q150 240 184 226 L204 230 Q230 226 234 198 Q230 214 206 218 L94 218 Q70 214 66 198 Z" fill="#0f1d42" opacity="0.55" />
          <path d="M104 96 C 96 124, 86 160, 78 196" stroke="#fff" strokeOpacity="0.14" strokeWidth="6" fill="none" />
          <path d="M196 96 C 206 124, 218 160, 226 196" stroke="#000" strokeOpacity="0.3" strokeWidth="10" fill="none" />
          {/* chin area inside the hood, under the visor */}
          <path d="M108 150 Q150 174 192 150 L192 176 Q150 190 108 176 Z" fill="#0b1633" />
        </g>
      )}

      {/* ---------- hard hat: orange dome, ridge, dark brim band ---------- */}
      {on('hardhat') && (
        <g>
          <path d="M104 86 C 104 36, 196 36, 196 86 Z" fill="url(#cHat)" />
          <path d="M104 86 C 104 36, 196 36, 196 86" fill="none" stroke="#8a3f05" strokeWidth="1.5" />
          <path d="M142 40 L142 84 L158 84 L158 40 Q150 36 142 40 Z" fill="#ffc77a" opacity="0.55" />
          <path d="M120 44 Q150 30 180 44" stroke="#ffe3bd" strokeOpacity="0.8" strokeWidth="2.5" fill="none" />
          <path d="M96 84 Q150 74 204 84 L206 92 Q150 102 94 92 Z" fill="url(#cBrim)" stroke="#8a3f05" strokeWidth="1.5" />
          <path d="M94 92 Q150 102 206 92 L206 98 Q150 108 94 98 Z" fill="#2a2a2e" />
          <path d="M126 96 Q150 104 174 96" stroke="#000" strokeOpacity="0.5" strokeWidth="2" fill="none" />
        </g>
      )}

      {/* ---------- green visor in a dark frame: hat-mounted shield or the hood window ---------- */}
      {(on('faceshield') || hood) && (
        <g>
          <path d="M106 98 L106 142 Q110 164 150 168 Q190 164 194 142 L194 98 Z" fill="#1a2a1a" />
          <path d="M110 100 L110 140 Q114 158 150 162 Q186 158 190 140 L190 100 Z" fill="url(#cVisor)" />
          <path d="M116 104 Q118 126 124 150" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M150 100 L150 160" stroke="#000" strokeOpacity="0.1" strokeWidth="8" />
          <ellipse cx="141" cy="80" rx="5" ry="3" fill="#fff" opacity="0.25" /><ellipse cx="159" cy="80" rx="5" ry="3" fill="#fff" opacity="0.25" />
        </g>
      )}

      {body === 'cotton' && <text x="150" y="352" textAnchor="middle" style={{ fontSize: 11, fill: '#c0252b', fontWeight: 700 }}>cotton, no arc rating</text>}
    </svg>
  )
}
