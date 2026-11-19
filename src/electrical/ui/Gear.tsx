import type { PpeId } from '../types'

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
    case 'ar8':
      return <svg viewBox="0 0 40 40"><path d="M8 8 L14 5 L20 9 L26 5 L32 8 L34 18 L28 18 L28 22 L12 22 L12 18 L6 18 Z" fill="#24427c" stroke="#101f3e" /><path d="M13 22 L27 22 L26 36 L21 36 L20 28 L19 36 L14 36 Z" fill="#1b3261" stroke="#101f3e" /><text x="20" y="18" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">8</text></svg>
    case 'ar12':
      return <svg viewBox="0 0 40 40"><path d="M10 6 L30 6 L32 18 L28 18 L27 36 L21 36 L20 24 L19 36 L13 36 L12 18 L8 18 Z" fill="#24427c" stroke="#101f3e" /><path d="M11 14 L29 14 L29 16 L11 16 Z M13 28 L19 28 L19 30 L13 30 Z M21 28 L27 28 L27 30 L21 30 Z" fill="#dfe3e8" /></svg>
    case 'suit40':
      return <svg viewBox="0 0 40 40"><path d="M14 4 Q20 0 26 4 L28 14 L12 14 Z" fill="#24427c" stroke="#101f3e" /><rect x="16" y="6" width="8" height="6" fill="#8fd17a" opacity="0.8" /><path d="M8 14 L32 14 L34 24 L30 24 L29 38 L11 38 L10 24 L6 24 Z" fill="#24427c" stroke="#101f3e" /><text x="20" y="31" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">40</text></svg>
    case 'faceshield':
      return <svg viewBox="0 0 40 40"><path d="M10 6 Q20 2 30 6 L30 14 Q20 10 10 14 Z" fill="#1b3261" /><path d="M8 14 L8 28 Q20 36 32 28 L32 14 Z" fill="#8fd17a" opacity="0.6" stroke="#2f5a26" /><path d="M11 16 L12 26" stroke="#fff" strokeWidth="1.5" /></svg>
    case 'gloves_leather':
      return <svg viewBox="0 0 40 40"><path d="M12 10 L28 10 L28 20 L30 22 L30 34 L12 34 L10 22 Z" fill="#c89a6a" stroke="#6b4a2a" /><path d="M10 10 L30 10 L30 14 L10 14 Z" fill="#6b4a2a" /></svg>
    case 'gloves00':
      return <svg viewBox="0 0 40 40"><path d="M12 14 L28 14 L28 22 L31 24 L30 36 L12 36 L9 24 Z" fill="#555a62" stroke="#1d2024" /><path d="M9 6 L31 6 L31 14 L9 14 Z" fill="#9c2a38" stroke="#5e1420" /><text x="20" y="31" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="700">00</text></svg>
    case 'boots':
      return <svg viewBox="0 0 40 40"><path d="M10 6 L24 6 L24 22 L34 26 L34 34 L8 34 L8 26 Z" fill="#2a2d33" stroke="#0f1114" /><path d="M8 32 L34 32 L34 36 L8 36 Z" fill="#050505" /><path d="M13 10 L21 12 M13 14 L21 16 M13 18 L21 20" stroke="#9aa0a8" strokeWidth="1.2" /></svg>
  }
}
