import type { PpeId } from '../types'
import { PPE_ITEMS } from '../types'

/**
 * The technician, proportioned after a standard arc flash PPE chart: hood and visor about a third of the height,
 * jacket a quarter, legs a quarter, boots the rest. Orange hard hat with a dark band under the brim, wide green visor
 * in a dark frame with nothing visible behind it, bell hood draping to mid-chest, navy jacket with lighter placket
 * and flapped pockets below the hood hem, gauntlet cuffs over big grey protector gloves, bib pants, black laced boots.
 */
export function Worker({ ppe, adequate }: { ppe: PpeId[]; adequate: boolean }) {
  const on = (id: PpeId) => ppe.includes(id)
  const body = on('suit40') ? 'suit40' : on('ar12') ? 'ar12' : on('ar8') ? 'ar8' : 'cotton'
  const hood = body === 'suit40'
  const navy = body !== 'cotton'
  const shield = on('faceshield') || hood
  const tag = { cotton: '', ar8: 'ATPV 8', ar12: 'ATPV 12', suit40: 'ATPV 40' }[body]
  const coat = navy ? 'url(#kNavy)' : 'url(#kCotton)'
  const placket = navy ? 'url(#kPlacket)' : 'url(#kCottonLight)'
  const pant = navy ? 'url(#kPant)' : 'url(#kDenim)'
  const skin = 'url(#kSkin)'
  const rubber = PPE_ITEMS.find((p) => p.slot === 'hands' && p.shockOk && on(p.id))
  const handFill = rubber ? 'url(#kProtector)' : on('gloves_leather') ? 'url(#kLeather)' : skin
  const cuff = rubber?.cuff ?? '#8f1f2b'
  const cuffText = rubber && (rubber.gloveClass === '1' || rubber.gloveClass === '00') ? '#222' : '#fff'

  return (
    <svg viewBox="0 0 300 640" className={`worker ${adequate ? 'ok' : ''}`}>
      <defs>
        <radialGradient id="kSkin" cx="38%" cy="32%" r="72%"><stop offset="0" stopColor="#f2cfae" /><stop offset="1" stopColor="#c58e63" /></radialGradient>
        <linearGradient id="kNavy" x1="0" y1="0" x2="1" y2="0.15"><stop offset="0" stopColor="#4466a8" /><stop offset="0.4" stopColor="#24427c" /><stop offset="1" stopColor="#0f1f46" /></linearGradient>
        <linearGradient id="kHood" x1="0" y1="0" x2="1" y2="0.25"><stop offset="0" stopColor="#4d6fb3" /><stop offset="0.38" stopColor="#263f7a" /><stop offset="1" stopColor="#0e1c40" /></linearGradient>
        <linearGradient id="kPant" x1="0" y1="0" x2="1" y2="0.1"><stop offset="0" stopColor="#3c5b98" /><stop offset="0.5" stopColor="#1f386c" /><stop offset="1" stopColor="#0e1b3c" /></linearGradient>
        <linearGradient id="kPlacket" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5b7dc2" /><stop offset="1" stopColor="#2f5090" /></linearGradient>
        <linearGradient id="kCotton" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a9bbd3" /><stop offset="0.5" stopColor="#7f97b9" /><stop offset="1" stopColor="#5a7196" /></linearGradient>
        <linearGradient id="kCottonLight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#c3d1e4" /><stop offset="1" stopColor="#96abc8" /></linearGradient>
        <linearGradient id="kDenim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#56709c" /><stop offset="0.5" stopColor="#3d5280" /><stop offset="1" stopColor="#28375a" /></linearGradient>
        <linearGradient id="kHat" x1="0" y1="0" x2="1" y2="0.7"><stop offset="0" stopColor="#ffc26b" /><stop offset="0.4" stopColor="#f98c1c" /><stop offset="1" stopColor="#bf5706" /></linearGradient>
        <linearGradient id="kVisor" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stopColor="#bfe28e" /><stop offset="0.45" stopColor="#6ea84a" /><stop offset="1" stopColor="#2e6329" /></linearGradient>
        <linearGradient id="kProtector" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stopColor="#9aa0a7" /><stop offset="0.5" stopColor="#636870" /><stop offset="1" stopColor="#353940" /></linearGradient>
        <linearGradient id="kLeather" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#cfa373" /><stop offset="1" stopColor="#8a6239" /></linearGradient>
        <linearGradient id="kBoot" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0" stopColor="#50545b" /><stop offset="0.45" stopColor="#1f2227" /><stop offset="1" stopColor="#07080a" /></linearGradient>
        <linearGradient id="kReflect" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f4f4f4" /><stop offset="0.5" stopColor="#b9bec4" /><stop offset="1" stopColor="#eeeeee" /></linearGradient>
        <radialGradient id="kShade" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#000" stopOpacity="0.3" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
      </defs>

      <rect width="300" height="640" rx="14" fill="#ffffff" />
      <ellipse cx="150" cy="628" rx="110" ry="9" fill="#000" opacity="0.14" />

      {/* ---------- legs: short, straight, slightly apart ---------- */}
      <path d="M94 420 L148 420 L146 500 L140 592 L84 592 L90 500 Z" fill={pant} />
      <path d="M152 420 L206 420 L210 500 L216 592 L160 592 L154 500 Z" fill={pant} />
      <path d="M118 428 C 114 480, 114 540, 112 590" stroke="#000" strokeOpacity="0.22" strokeWidth="2.5" fill="none" />
      <path d="M182 428 C 186 480, 186 540, 188 590" stroke="#000" strokeOpacity="0.22" strokeWidth="2.5" fill="none" />
      <ellipse cx="118" cy="505" rx="24" ry="18" fill="url(#kShade)" />
      <ellipse cx="184" cy="505" rx="24" ry="18" fill="url(#kShade)" />
      <path d="M150 420 L150 470" stroke="#000" strokeOpacity="0.3" strokeWidth="3" />
      {body === 'cotton' && <g stroke="#c6d3e6" strokeOpacity="0.7" strokeWidth="1.6" fill="none"><path d="M98 428 L88 590" /><path d="M202 428 L212 590" /></g>}
      {body === 'ar12' && <path d="M86 548 L142 548 L142 560 L85 560 Z M158 548 L214 548 L215 560 L158 560 Z" fill="url(#kReflect)" />}

      {/* ---------- boots: high ankle, laces, toes out, thick sole with heel ---------- */}
      {on('boots') ? (
        <g>
          <path d="M82 584 L142 584 L144 612 Q146 622 134 626 L62 626 Q50 626 52 614 Q54 604 70 600 L82 596 Z" fill="url(#kBoot)" />
          <path d="M218 584 L158 584 L156 612 Q154 622 166 626 L238 626 Q250 626 248 614 Q246 604 230 600 L218 596 Z" fill="url(#kBoot)" />
          <path d="M50 622 L148 622 L148 634 L54 634 Q48 634 48 628 Z M152 622 L250 622 L246 628 Q246 634 240 634 L152 634 Z" fill="#0c0d10" />
          <path d="M84 586 L140 586 L140 592 L84 592 Z M160 586 L216 586 L216 592 L160 592 Z" fill="#000" opacity="0.35" />
          <g stroke="#aab0b8" strokeWidth="1.6" fill="none">
            <path d="M96 596 L126 600 M96 604 L126 608 M96 612 L126 616" />
            <path d="M174 600 L204 596 M174 608 L204 604 M174 616 L204 612" />
          </g>
          <path d="M66 602 Q82 594 96 604 M234 602 Q218 594 204 604" stroke="#2b2f35" strokeWidth="2" fill="none" />
          <ellipse cx="90" cy="618" rx="30" ry="4" fill="#fff" opacity="0.08" />
        </g>
      ) : (
        <g>
          <path d="M86 588 L140 588 L140 614 Q138 624 112 624 L76 624 Q70 614 80 604 Z" fill="#8d9398" />
          <path d="M214 588 L160 588 L160 614 Q162 624 188 624 L224 624 Q230 614 220 604 Z" fill="#8d9398" />
          <path d="M72 620 L148 620 L148 630 L72 630 Z M152 620 L228 620 L228 630 L152 630 Z" fill="#f2f2f2" />
        </g>
      )}

      {/* ---------- jacket: broad shoulders, hem at the hips ---------- */}
      <path d="M50 246 Q150 222 250 246 L246 330 Q244 380 236 432 L64 432 Q56 380 54 330 Z" fill={coat} />
      <path d="M58 262 C 62 320, 62 380, 70 430" stroke="#fff" strokeOpacity="0.12" strokeWidth="10" fill="none" />
      <path d="M238 262 C 236 320, 236 380, 230 430" stroke="#000" strokeOpacity="0.24" strokeWidth="14" fill="none" />
      <path d="M140 246 L160 246 L160 432 L140 432 Z" fill={placket} />
      <path d="M150 250 L150 430" stroke={navy ? '#0f1d42' : '#5a7196'} strokeWidth="2" strokeDasharray="3 2" />
      {navy ? (
        <g>
          <path d="M80 330 L130 330 L130 376 Q130 380 126 380 L80 380 Z" fill="#17305f" stroke="#0d1a3a" />
          <path d="M170 330 L220 330 L220 380 L174 380 Q170 380 170 376 Z" fill="#17305f" stroke="#0d1a3a" />
          <path d="M78 330 L132 330 L130 344 L80 344 Z" fill="#2c4c8a" stroke="#0d1a3a" />
          <path d="M168 330 L222 330 L220 344 L170 344 Z" fill="#2c4c8a" stroke="#0d1a3a" />
          <rect x="88" y="352" width="26" height="18" rx="2" fill="#f4f4f0" stroke="#333" />
          <text x="101" y="360" textAnchor="middle" style={{ fontSize: 5.5, fontWeight: 800, fill: '#111' }}>{tag.split(' ')[0]}</text>
          <text x="101" y="367" textAnchor="middle" style={{ fontSize: 6, fontWeight: 800, fill: '#111' }}>{tag.split(' ')[1]}</text>
          <rect x="182" y="354" width="16" height="9" fill="#e8e8e8" opacity="0.9" />
          <path d="M64 414 L236 414 L236 432 L64 432 Z" fill="#000" opacity="0.2" />
          {body === 'ar12' && <path d="M56 392 L244 392 L244 404 L56 404 Z" fill="url(#kReflect)" />}
        </g>
      ) : (
        <g>
          <path d="M130 240 L150 262 L170 240 L164 232 L150 250 L136 232 Z" fill="#6f88ad" />
          <rect x="84" y="330" width="40" height="34" rx="2" fill="none" stroke="#dce5f1" strokeOpacity="0.8" />
          {[300, 334, 368, 402].map((y) => <circle key={y} cx="150" cy={y} r="2.4" fill="#eef2f8" />)}
        </g>
      )}

      {/* ---------- sleeves: from the shoulder down and out ---------- */}
      <path d="M66 258 C 44 300, 36 350, 36 400" stroke={coat} strokeWidth="46" strokeLinecap="round" fill="none" />
      <path d="M234 258 C 256 300, 264 350, 264 400" stroke={coat} strokeWidth="46" strokeLinecap="round" fill="none" />
      <ellipse cx="46" cy="340" rx="18" ry="26" fill="url(#kShade)" transform="rotate(-12 46 340)" />
      <ellipse cx="254" cy="340" rx="18" ry="26" fill="url(#kShade)" transform="rotate(12 254 340)" />
      <path d="M56 266 C 38 304, 30 350, 30 392" stroke="#fff" strokeOpacity="0.12" strokeWidth="8" fill="none" />
      {body === 'ar12' && <g><rect x="22" y="338" width="46" height="12" fill="url(#kReflect)" transform="rotate(10 45 344)" /><rect x="232" y="338" width="46" height="12" fill="url(#kReflect)" transform="rotate(-10 255 344)" /></g>}

      {/* ---------- gauntlet cuffs and big protector gloves ---------- */}
      {rubber && (
        <g>
          <path d="M12 394 Q36 382 62 394 L66 428 Q38 440 10 428 Z" fill={cuff} stroke="#000" strokeOpacity="0.4" />
          <path d="M238 394 Q264 382 288 394 L290 428 Q262 440 234 428 Z" fill={cuff} stroke="#000" strokeOpacity="0.4" />
          <path d="M12 394 Q36 382 62 394 L62 402 Q36 392 12 402 Z M238 394 Q264 382 288 394 L288 402 Q264 392 238 402 Z" fill="#000" opacity="0.3" />
          <text x="37" y="420" textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, fill: cuffText }}>{rubber.gloveClass}</text>
          <text x="263" y="420" textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, fill: cuffText }}>{rubber.gloveClass}</text>
        </g>
      )}
      {on('gloves_leather') && <g><path d="M14 396 Q38 388 62 396 L64 418 Q38 426 12 418 Z" fill="#6b4a2a" /><path d="M238 396 Q262 388 286 396 L288 418 Q262 426 236 418 Z" fill="#6b4a2a" /></g>}
      <path d="M12 424 Q38 414 64 424 L70 456 Q70 494 40 500 Q10 494 8 456 Z" fill={handFill} />
      <path d="M236 424 Q262 414 288 424 L292 456 Q290 494 260 500 Q230 494 230 456 Z" fill={handFill} />
      <path d="M64 432 Q84 440 82 464 Q76 474 64 466 Z" fill={handFill} />
      <path d="M236 432 Q216 440 218 464 Q224 474 236 466 Z" fill={handFill} />
      <g stroke="#000" strokeOpacity={rubber ? 0.5 : 0.22} strokeWidth="1.6" fill="none">
        <path d="M24 452 L22 482 M38 454 L38 488 M52 452 L54 482" />
        <path d="M248 452 L246 482 M262 454 L262 488 M276 452 L278 482" />
      </g>

      {/* ---------- neck and head (shown when there is no hood) ---------- */}
      <path d="M134 196 L166 196 L170 250 L130 250 Z" fill={skin} />
      <path d="M134 196 L166 196 L164 214 L136 214 Z" fill="#000" opacity="0.2" />
      <ellipse cx="150" cy="150" rx="38" ry="44" fill={skin} />
      <ellipse cx="112" cy="156" rx="6" ry="10" fill={skin} />
      <ellipse cx="188" cy="156" rx="6" ry="10" fill={skin} />
      <path d="M112 140 Q114 104 150 104 Q186 104 188 140 Q181 120 150 118 Q119 120 112 140 Z" fill="#3b2a1e" />
      <path d="M135 138 Q142 134 149 138" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M151 138 Q158 134 165 138" stroke="#3b2a1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="140" cy="148" rx="6" ry="3.8" fill="#fff" /><ellipse cx="160" cy="148" rx="6" ry="3.8" fill="#fff" />
      <circle cx="140" cy="148" r="2.6" fill="#4a3a2a" /><circle cx="160" cy="148" r="2.6" fill="#4a3a2a" />
      <path d="M150 152 L146 166 L154 166" stroke="#000" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
      <path d="M139 178 Q150 184 161 178" stroke="#8a4a3a" strokeWidth="2" fill="none" strokeLinecap="round" />

      {!hood && on('faceshield') && (
        <path d="M112 130 Q112 104 150 104 Q188 104 188 130 L188 170 Q188 200 168 206 L170 250 L130 250 L132 206 Q112 200 112 170 Z" fill="#17305f" />
      )}
      {on('glasses') && !hood && !on('faceshield') && (
        <g>
          <path d="M124 142 Q140 138 149 144 L149 154 Q140 158 128 154 Q122 150 124 142 Z" fill="#9fd6ff" opacity="0.55" stroke="#222" strokeWidth="1.5" />
          <path d="M176 142 Q160 138 151 144 L151 154 Q160 158 172 154 Q178 150 176 142 Z" fill="#9fd6ff" opacity="0.55" stroke="#222" strokeWidth="1.5" />
          <path d="M149 146 L151 146" stroke="#222" strokeWidth="2" />
          <path d="M124 144 L112 148 M176 144 L188 148" stroke="#222" strokeWidth="2.5" />
        </g>
      )}
      {on('hearing') && !hood && (
        <g>
          <circle cx="110" cy="158" r="4.5" fill="#ff8a1f" stroke="#b35a00" /><circle cx="190" cy="158" r="4.5" fill="#ff8a1f" stroke="#b35a00" />
          <path d="M110 162 Q106 210 150 240 Q194 210 190 162" stroke="#3aa0e0" strokeWidth="1.5" fill="none" />
        </g>
      )}

      {/* ---------- hood: bell from the brim, over the shoulders, draping to mid-chest ---------- */}
      {hood && (
        <g>
          <path d="M100 100 C 86 140, 66 190, 46 236 C 36 258, 44 276, 72 282 Q110 290 150 318 Q190 290 228 282 C 256 276, 264 258, 254 236 C 234 190, 214 140, 200 100 Z" fill="url(#kHood)" />
          <path d="M46 236 C 36 258, 44 276, 72 282 Q110 290 150 318 Q190 290 228 282 C 256 276, 264 258, 254 236 Q250 266 222 270 Q180 276 150 302 Q120 276 78 270 Q50 266 46 236 Z" fill="#0b1738" opacity="0.6" />
          <path d="M98 104 C 84 144, 66 194, 52 236" stroke="#fff" strokeOpacity="0.16" strokeWidth="8" fill="none" />
          <path d="M202 104 C 216 144, 234 194, 248 236" stroke="#000" strokeOpacity="0.32" strokeWidth="12" fill="none" />
          <path d="M150 220 L150 318" stroke="#0b1738" strokeOpacity="0.5" strokeWidth="2" />
          <path d="M98 196 Q150 230 202 196 L202 230 Q150 252 98 230 Z" fill="#070f26" />
        </g>
      )}

      {/* ---------- hard hat: tall orange dome, highlight ridge, peak, black band under the brim ---------- */}
      {on('hardhat') && (
        <g>
          <path d="M98 100 C 98 36, 202 36, 202 100 Z" fill="url(#kHat)" />
          <path d="M98 100 C 98 36, 202 36, 202 100" fill="none" stroke="#8a3f05" strokeWidth="1.5" />
          <path d="M140 42 L140 98 L160 98 L160 42 Q150 38 140 42 Z" fill="#ffd79a" opacity="0.5" />
          <path d="M116 50 Q150 34 184 50" stroke="#ffe6c2" strokeOpacity="0.85" strokeWidth="3" fill="none" />
          <path d="M86 100 Q150 86 214 100 L218 110 Q150 124 82 110 Z" fill="url(#kHat)" stroke="#8a3f05" strokeWidth="1.5" />
          <path d="M82 110 Q150 124 218 110 L218 118 Q150 132 82 118 Z" fill="#26272b" />
          <path d="M120 116 Q150 126 180 116" stroke="#000" strokeOpacity="0.5" strokeWidth="2" fill="none" />
        </g>
      )}

      {/* ---------- wide green visor in a dark frame: nothing visible behind it ---------- */}
      {shield && (
        <g>
          <path d="M94 116 L94 196 Q96 236 150 242 Q204 236 206 196 L206 116 Z" fill="#1a241a" />
          <path d="M100 120 L100 194 Q102 228 150 234 Q198 228 200 194 L200 120 Z" fill="url(#kVisor)" />
          <path d="M100 120 L100 194 Q102 228 150 234 Q198 228 200 194 L200 120 Z" fill="#000" opacity="0.18" />
          <path d="M108 126 Q110 166 120 212" stroke="#fff" strokeOpacity="0.55" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M150 122 L150 232" stroke="#000" strokeOpacity="0.12" strokeWidth="10" />
          <path d="M94 116 L206 116 L206 122 L94 122 Z" fill="#111" />
        </g>
      )}

      {body === 'cotton' && <text x="150" y="452" textAnchor="middle" style={{ fontSize: 11, fill: '#c0252b', fontWeight: 700 }}>cotton, no arc rating</text>}
      {!on('boots') && <text x="150" y="638" textAnchor="middle" style={{ fontSize: 9, fill: '#c0252b', fontWeight: 700 }}>no leather safety boots</text>}
    </svg>
  )
}
