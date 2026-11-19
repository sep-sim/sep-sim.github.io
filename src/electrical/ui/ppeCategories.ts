/** NFPA 70E arc flash PPE categories, as printed on the shop chart. */
export const PPE_CATEGORIES: { cat: number; range: string; minRating: string; items: string; color: string }[] = [
  { cat: 0, range: '0 – 1.1', minRating: '—', items: 'FR clothing (shirt & pants), safety glasses or goggles, hearing protection', color: '#2e9e4f' },
  { cat: 1, range: '1.2 – 4.0', minRating: '4', items: 'AR clothing (shirt & pants or coverall), AR face shield or hood, AR gloves, hearing protection', color: '#d9b400' },
  { cat: 2, range: '4.1 – 8.0', minRating: '8', items: 'AR clothing (shirt & pants or coverall), AR face shield or hood, AR gloves, hearing protection', color: '#ef7d1a' },
  { cat: 3, range: '8.1 – 25.0', minRating: '25', items: 'AR clothing (shirt & pants or coverall), AR flash hood, AR gloves with leather protectors, hearing protection', color: '#d9342b' },
  { cat: 4, range: '25.1 – 40.0', minRating: '40', items: 'AR clothing (shirt & pants or coverall), AR flash hood, AR gloves with leather protectors, hearing protection', color: '#a1151a' },
]
