import type { PpeId } from '../types'
import { PPE_ITEMS } from '../types'

/** Small picture of each item on the rack, in the chart's palette. */
export function GearIcon({ id }: { id: PpeId }) {
  switch (id) {
    case 'hardhat':
      return <svg viewBox="0 0 40 40"><path d="M8 24 Q10 8 20 8 Q30 8 32 24 Z" fill="#f58a1f" stroke="#9a4d08" /><path d="M4 24 Q20 20 36 24 L36 28 Q20 32 4 28 Z" fill="#f58a1f" stroke="#9a4d08" /></svg>
    case 'glasses':
      return <svg viewBox="0 0 40 40"><path d="M4 18 Q12 14 19 18 L19 24 Q12 28 6 24 Z M36 18 Q28 14 21 18 L21 24 Q28 28 34 24 Z" fill="#9fd6ff" stroke="#222" /><path d="M19 20 L21 20" stroke="#222" strokeWidth="2" /></svg>
    case 'hearing':
      return <svg viewBox="0 0 40 40"><circle cx="12" cy="14" r="5" fill="#ff8a1f" stroke="#b35a00" /><circle cx="28" cy="14" r="5" fill="#ff8a1f" stroke="#b35a00" /><path d="M12 19 Q12 34 20 34 Q28 34 28 19" stroke="#3aa0e0" strokeWidth="1.5" fill="none" /></svg>
    case 'cotton':
      return <svg viewBox="0 0 40 40"><path d="M8 10 L14 6 L20 10 L26 6 L32 10 L34 20 L28 20 L28 34 L12 34 L12 20 L6 20 Z" fill="#7d95b8" stroke="#3f5279" /></svg>
    case 'frs8':
      return <svg viewBox="0 0 40 40"><path d="M8 8 L14 5 L20 9 L26 5 L32 8 L34 18 L28 18 L28 22 L12 22 L12 18 L6 18 Z" fill="#24427c" stroke="#101f3e" /><path d="M13 22 L27 22 L26 36 L21 36 L20 28 L19 36 L14 36 Z" fill="#1b3261" stroke="#101f3e" /><text x="20" y="18" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">8</text></svg>
    case 'frj12':
      return <svg viewBox="0 0 40 40"><path d="M8 8 L14 5 L20 9 L26 5 L32 8 L34 20 L28 20 L28 24 L12 24 L12 20 L6 20 Z" fill="#24427c" stroke="#101f3e" /><path d="M20 9 L20 24" stroke="#dfe3e8" strokeWidth="1.2" /><path d="M13 24 L27 24 L26 36 L21 36 L20 28 L19 36 L14 36 Z" fill="#1b3261" stroke="#101f3e" /><text x="20" y="18" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">12</text></svg>
    case 'suit40':
      return <svg viewBox="0 0 40 40"><path d="M8 6 L14 3 L20 7 L26 3 L32 6 L34 20 L28 20 L28 22 L12 22 L12 20 L6 20 Z" fill="#24427c" stroke="#101f3e" /><path d="M13 22 L27 22 L26 38 L21 38 L20 28 L19 38 L14 38 Z" fill="#1b3261" stroke="#101f3e" /><text x="20" y="17" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">40</text></svg>
    case 'hood40':
      return <svg viewBox="0 0 40 40"><path d="M12 4 Q20 0 28 4 L32 16 L32 36 L8 36 L8 16 Z" fill="#24427c" stroke="#101f3e" /><path d="M13 10 Q20 6 27 10 L28 22 Q20 28 12 22 Z" fill="#8fd17a" opacity="0.75" stroke="#2f5a26" /><text x="20" y="33" textAnchor="middle" fontSize="5.5" fill="#fff" fontWeight="700">40</text></svg>
    case 'gloves_leather':
      return <svg viewBox="0 0 40 40"><path d="M12 12 L28 12 L28 22 L30 24 L30 36 L12 36 L10 24 Z" fill="#c89a6a" stroke="#6b4a2a" /><path d="M10 8 L30 8 L30 14 L10 14 Z" fill="#6b4a2a" /><path d="M14 16 L14 30 M19 16 L19 30 M24 16 L24 30" stroke="#8a6a44" strokeWidth="1" /></svg>
    case 'gloves00': case 'gloves0': case 'gloves1': case 'gloves2': case 'gloves3': case 'gloves4': {
      const item = PPE_ITEMS.find((p) => p.id === id)!
      const dark = item.gloveClass === '1' || item.gloveClass === '00'
      return <svg viewBox="0 0 40 40"><path d="M12 14 L28 14 L28 22 L31 24 L30 36 L12 36 L9 24 Z" fill="#555a62" stroke="#1d2024" /><path d="M9 6 L31 6 L31 14 L9 14 Z" fill={item.cuff} stroke="#333" /><text x="20" y="12" textAnchor="middle" fontSize="6" fill={dark ? '#222' : '#fff'} fontWeight="700">{item.gloveClass}</text></svg>
    }
    case 'boots':
      return <svg viewBox="0 0 40 40"><path d="M10 6 L24 6 L24 22 L34 26 L34 34 L8 34 L8 26 Z" fill="#2a2d33" stroke="#0f1114" /><path d="M8 32 L34 32 L34 36 L8 36 Z" fill="#050505" /><path d="M13 10 L21 12 M13 14 L21 16 M13 18 L21 20" stroke="#9aa0a8" strokeWidth="1.2" /></svg>
  }
}
