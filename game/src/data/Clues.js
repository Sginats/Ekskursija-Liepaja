export const CITY_CLUES = {
  dzintars: { icon: '🟠', title: 'Dzintara forma', text: 'Mirdzoša fasāde glabā stāstu par pilsētas kultūras balsi.' },
  teatris: { icon: '🎭', title: 'Skatuves balss', text: 'Veca skatuve palīdzēja liepājniekiem stāstīt savu stāstu.' },
  osta: { icon: '⚓', title: 'Jūras ceļš', text: 'Kuģi savienoja Liepāju ar tālām ostām un jaunām idejām.' },
  mols: { icon: '🌊', title: 'Viļņu sargs', text: 'Akmens ceļš sniedzas jūrā, lai pasargātu pilsētas vārtus.' },
  kanals: { icon: '🚲', title: 'Ūdens ceļš', text: 'Kanāls ievelk jūras klātbūtni pašā pilsētas sirdī.' },
  lsez: { icon: '🏭', title: 'Darba spēks', text: 'Nozare un osta kopā veidoja pilsētas industriālo ritmu.' },
  cietums: { icon: '🔑', title: 'Aizslēgtā lapa', text: 'Aiz sienām glabājas pagātnes noslēpums, nevis tikai sods.' },
  parks: { icon: '🌳', title: 'Zaļā elpa', text: 'Parki atgādina, ka pilsēta ir arī vieta atpūtai un satikšanās.' },
  ezerkrasts: { icon: '🦢', title: 'Klusais krasts', text: 'Ūdens mala dod pilsētai mieru un citu skatpunktu.' },
  tower: { icon: '🔭', title: 'Skats no augšas', text: 'No augstuma var ieraudzīt, kā visi pavedieni savienojas.' },
};

export function getClue(locationId) {
  return CITY_CLUES[locationId] || null;
}
