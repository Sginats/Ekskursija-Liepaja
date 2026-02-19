/**
 * Questions pool — no answer data stored here.
 * All answer validation is done server-side via check_answer.php.
 */
export const questionsPool = {
  RTU: [
    { id: 'rtu_1', q: 'Kurā gadā dibināta Liepājas akadēmija?', fact: 'RTU Liepājas akadēmija dibināta 1954. gadā!' },
    { id: 'rtu_2', q: 'Kāda IT studiju programma ir pieejama RTU Liepājā?', fact: 'Datorika ir viena no populārākajām programmām RTU Liepājā!' },
    { id: 'rtu_3', q: 'Kurā pilsētas daļā atrodas RTU Liepājas akadēmija?', fact: 'RTU Liepājas akadēmija atrodas pašā pilsētas centrā!' },
  ],
  Mols: [
    { id: 'mols_1', q: 'Cik metrus garš ir Ziemeļu mols?', fact: 'Ziemeļu mols ir aptuveni 1800 metrus garš!' },
    { id: 'mols_2', q: 'Ko cilvēki dara uz Ziemeļu mola? (makšķerē/peld)', fact: 'Mols ir populāra makšķerēšanas vieta!' },
    { id: 'mols_3', q: 'Kuras ostas daļā atrodas Ziemeļu mols? (ziemeļu/dienvidu)', fact: 'Mols atrodas ostas ziemeļu pusē.' },
  ],
  Cietums: [
    { id: 'cietums_1', q: 'Kā sauc Karostas tūrisma cietumu?', fact: 'Vienīgais militārais cietums atvērts tūristiem!' },
    { id: 'cietums_2', q: 'Kurā gadā celts Karostas cietums?', fact: 'Cietums celts 1900. gadā cara armijas vajadzībām.' },
    { id: 'cietums_3', q: 'Kam sākotnēji bija paredzēts Karostas cietums? (armija/civīliem)', fact: 'Cietums bija paredzēts cara armijas vajadzībām.' },
  ],
  Dzintars: [
    { id: 'dzintars_1', q: 'Kā sauc Liepājas koncertzāli?', fact: 'Izskatās pēc milzīga dzintara gabala!' },
    { id: 'dzintars_2', q: 'Kurā gadā atklāta koncertzāle "Lielais Dzintars"?', fact: 'Koncertzāle atklāta 2015. gadā.' },
    { id: 'dzintars_3', q: 'Kura orķestra mājvieta ir Lielais Dzintars? (Simfoniskā/Kamermūzikas)', fact: 'Liepājas Simfoniskais orķestris šeit uzstājas regulāri!' },
  ],
  Teatris: [
    { id: 'teatris_1', q: 'Kurā gadā dibināts Liepājas Teātris?', fact: 'Vecākais profesionālais teātris Latvijā!' },
    { id: 'teatris_2', q: 'Kādā arhitektūras stilā celta Liepājas Teātra ēka?', fact: 'Teātra ēka ir skaists jūgendstila piemērs!' },
    { id: 'teatris_3', q: 'Vai Liepājas Teātris ir vecākais profesionālais teātris Latvijā? (Ja/Ne)', fact: 'Dibināts 1907. gadā — vecākais profesionālais teātris!' },
  ],
  Kanals: [
    { id: 'kanals_1', q: 'Kā sauc kanālu starp ezeru un jūru?', fact: 'Tirdzniecības kanāls savieno ezeru ar jūru.' },
    { id: 'kanals_2', q: 'Kopš kura gadsimta kalpo Tirdzniecības kanāls?', fact: 'Kanāls kalpo kopš 16. gadsimta!' },
    { id: 'kanals_3', q: 'Ko Tirdzniecības kanāls savieno? (ezeru un jūru/upes)', fact: 'Kanāls savieno Liepājas ezeru ar Baltijas jūru.' },
  ],
  Osta: [
    { id: 'osta_1', q: 'Kā sauc Liepājas speciālo zonu?', fact: 'Osta šeit neaizsalst!' },
    { id: 'osta_2', q: 'Vai Liepājas osta aizsalst ziemā? (Ja/Ne)', fact: 'Liepājas osta neaizsalst — unikāla iezīme!' },
    { id: 'osta_3', q: 'Kā sauc ostas speciālo ekonomisko zonu? (LSEZ/LREZ)', fact: 'Liepājas Speciālā ekonomiskā zona piesaista investorus.' },
  ],
  Parks: [
    { id: 'parks_1', q: 'Kā sauc parku pie jūras?', fact: 'Viens no lielākajiem parkiem Latvijā!' },
    { id: 'parks_2', q: 'Kurā gadsimtā ierīkots Jūrmalas parks?', fact: 'Parks ierīkots 19. gadsimta beigās.' },
    { id: 'parks_3', q: 'Cik koku un krūmu sugu aug Jūrmalas parkā? (170/50/300)', fact: 'Parkā aug vairāk nekā 170 koku un krūmu sugas!' },
  ],
  LSEZ: [
    { id: 'lsez_1', q: 'Vai UPB ir Liepājas uzņēmums (Ja/Ne)?', fact: 'UPB būvē ēkas visā pasaulē!' },
    { id: 'lsez_2', q: 'Kurā gadā izveidota LSEZ?', fact: 'LSEZ izveidota 1997. gadā.' },
    { id: 'lsez_3', q: 'Cik uzņēmumi darbojas LSEZ teritorijā? (80/20/200)', fact: 'Vairāk nekā 80 uzņēmumi darbojas LSEZ!' },
  ],
  Ezerkrasts: [
    { id: 'ezerkrasts_1', q: 'Kāda ezera krastā ir taka?', fact: 'Liepājas ezers ir piektais lielākais Latvijā.' },
    { id: 'ezerkrasts_2', q: 'Kurš lielākais ezers Latvijā ir Liepājas ezers? (5./3./7.)', fact: 'Liepājas ezers ir piektais lielākais Latvijā!' },
    { id: 'ezerkrasts_3', q: 'Ko var vērot no Ezerkrasta takas skatu platformām? (putnus/zivis)', fact: 'Taka piedāvā skatu platformas putnu vērošanai!' },
  ],
};

export function pickQuestion(location) {
  const pool = questionsPool[location];
  if (!pool) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
