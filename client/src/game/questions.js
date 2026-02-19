/**
 * Questions pool — no answer data stored here.
 * All answer validation is done server-side via check_answer.php.
 */
export const questionsPool = {
  RTU: [
    { id: 'rtu_1', q: 'Kurā gadā dibināta Liepājas akadēmija?', fact: 'RTU Liepājas akadēmija dibināta 1954. gadā!' },
    { id: 'rtu_2', q: 'Kāda IT studiju programma ir pieejama RTU Liepājā?', fact: 'Datorika ir viena no populārākajām programmām RTU Liepājā!' },
    { id: 'rtu_3', q: 'Kurā pilsētas daļā atrodas RTU Liepājas akadēmija?', fact: 'RTU Liepājas akadēmija atrodas pašā pilsētas centrā!' },
    { id: 'rtu_4', q: 'Kādā inženierzinātņu jomā RTU Liepājā piedāvā visvairāk studiju programmu?', fact: 'Informācijas tehnoloģijas ir populārākā studiju nozare RTU Liepājā!' },
    { id: 'rtu_5', q: 'Vai RTU Liepājā ir pieejamas arī valsts apmaksātas studiju vietas? (Jā/Nē)', fact: 'Jā – katru gadu RTU Liepājā ir pieejamas budžeta vietas!' },
  ],
  Mols: [
    { id: 'mols_1', q: 'Cik metrus garš ir Ziemeļu mols?', fact: 'Ziemeļu mols ir aptuveni 1800 metrus garš!' },
    { id: 'mols_2', q: 'Ko cilvēki dara uz Ziemeļu mola? (makšķerē/peld)', fact: 'Mols ir populāra makšķerēšanas vieta!' },
    { id: 'mols_3', q: 'Kuras ostas daļā atrodas Ziemeļu mols? (ziemeļu/dienvidu)', fact: 'Mols atrodas ostas ziemeļu pusē.' },
    { id: 'mols_4', q: 'Kādam militāram nolūkam sākotnēji tika būvēts mols un Karosta?', fact: 'Karosta tika būvēta kā Cara Krievijas kara flotes bāze!' },
    { id: 'mols_5', q: 'Kāda jūra apskalo Ziemeļu molu?', fact: 'Baltijas jūra apskalo Ziemeļu molu!' },
  ],
  Cietums: [
    { id: 'cietums_1', q: 'Kā sauc Karostas tūrisma cietumu?', fact: 'Vienīgais militārais cietums atvērts tūristiem!' },
    { id: 'cietums_2', q: 'Kurā gadā celts Karostas cietums?', fact: 'Cietums celts 1900. gadā cara armijas vajadzībām.' },
    { id: 'cietums_3', q: 'Kam sākotnēji bija paredzēts Karostas cietums? (armija/civīliem)', fact: 'Cietums bija paredzēts cara armijas vajadzībām.' },
    { id: 'cietums_4', q: 'Vai Karostas cietums šobrīd darbojas kā īsts cietums vai muzejs?', fact: 'Karostas cietums darbojas kā tūrisma muzejs!' },
    { id: 'cietums_5', q: 'Kādu sodu šeit saņēma nepaklausīgie jūrnieki?', fact: 'Nepaklausīgie jūrnieki saņēma arestu izolācijas kamerā!' },
  ],
  Dzintars: [
    { id: 'dzintars_1', q: 'Kā sauc Liepājas koncertzāli?', fact: 'Izskatās pēc milzīga dzintara gabala!' },
    { id: 'dzintars_2', q: 'Kurā gadā atklāta koncertzāle "Lielais Dzintars"?', fact: 'Koncertzāle atklāta 2015. gadā.' },
    { id: 'dzintars_3', q: 'Kura orķestra mājvieta ir Lielais Dzintars? (Simfoniskā/Kamermūzikas)', fact: 'Liepājas Simfoniskais orķestris šeit uzstājas regulāri!' },
    { id: 'dzintars_4', q: 'Kurš austriešu arhitekts projektēja Liepājas koncertzāli?', fact: 'Wolf Prix no Coop Himmelb(l)au projektēja šo ikonisko ēku!' },
    { id: 'dzintars_5', q: 'Kādu unikālu krāsu ieguva Lielā Dzintara stiklojums?', fact: 'Dzintarkrāsas stikls veido ēkas atpazīstamo izskatu!' },
    { id: 'dzintars_6', q: 'Cik skatītāju vietu ir Lielā Dzintara galvenajā zālē? (1040/500/2000)', fact: 'Lielajā zālē ir 1040 skatītāju vietas!' },
  ],
  Teatris: [
    { id: 'teatris_1', q: 'Kurā gadā dibināts Liepājas Teātris?', fact: 'Vecākais profesionālais teātris Latvijā!' },
    { id: 'teatris_2', q: 'Kādā arhitektūras stilā celta Liepājas Teātra ēka?', fact: 'Teātra ēka ir skaists jūgendstila piemērs!' },
    { id: 'teatris_3', q: 'Vai Liepājas Teātris ir vecākais profesionālais teātris Latvijā? (Ja/Ne)', fact: 'Dibināts 1907. gadā — vecākais profesionālais teātris!' },
    { id: 'teatris_4', q: 'Kurš rakstnieks sarakstījis lugu "Pūt, vējiņi!", kas teātrī piedzīvojusi daudzus iestudējumus?', fact: 'Jānis Rainis – latviešu literatūras klasiķis!' },
  ],
  Kanals: [
    { id: 'kanals_1', q: 'Kā sauc kanālu starp ezeru un jūru?', fact: 'Tirdzniecības kanāls savieno ezeru ar jūru.' },
    { id: 'kanals_2', q: 'Kopš kura gadsimta kalpo Tirdzniecības kanāls?', fact: 'Kanāls kalpo kopš 16. gadsimta!' },
    { id: 'kanals_3', q: 'Ko Tirdzniecības kanāls savieno? (ezeru un jūru/upes)', fact: 'Kanāls savieno Liepājas ezeru ar Baltijas jūru.' },
    { id: 'kanals_4', q: 'Kura nozīmīga transporta līnija šķērso Tirdzniecības kanālu pār tiltu?', fact: 'Tramvaja tilts ir viens no Liepājas simboliem!' },
    { id: 'kanals_5', q: 'Kādam nolūkam tika izrakts Tirdzniecības kanāls?', fact: 'Kanāls tika izrakts tirdzniecības kuģošanas vajadzībām!' },
  ],
  Osta: [
    { id: 'osta_1', q: 'Kā sauc Liepājas speciālo zonu?', fact: 'Osta šeit neaizsalst!' },
    { id: 'osta_2', q: 'Vai Liepājas osta aizsalst ziemā? (Ja/Ne)', fact: 'Liepājas osta neaizsalst — unikāla iezīme!' },
    { id: 'osta_3', q: 'Kā sauc ostas speciālo ekonomisko zonu? (LSEZ/LREZ)', fact: 'Liepājas Speciālā ekonomiskā zona piesaista investorus.' },
    { id: 'osta_4', q: 'Kāda veida kravas visbiežāk tiek pārkrautas Liepājas ostā?', fact: 'Liepājas ostā dominē beramkravas – graudi un mineralmēsli!' },
    { id: 'osta_5', q: 'Kas pārvalda Liepājas ostas darbību?', fact: 'LSEZ pārvalda Liepājas ostas teritoriju!' },
  ],
  Parks: [
    { id: 'parks_1', q: 'Kā sauc parku pie jūras?', fact: 'Viens no lielākajiem parkiem Latvijā!' },
    { id: 'parks_2', q: 'Kurā gadsimtā ierīkots Jūrmalas parks?', fact: 'Parks ierīkots 19. gadsimta beigās.' },
    { id: 'parks_3', q: 'Cik koku un krūmu sugu aug Jūrmalas parkā? (170/50/300)', fact: 'Parkā aug vairāk nekā 170 koku un krūmu sugas!' },
    { id: 'parks_4', q: 'Cik garš (aptuveni) ir Jūrmalas parks? (3 km/10 km/1 km)', fact: 'Jūrmalas parks stiepjas aptuveni 3 km gar jūras krastu!' },
    { id: 'parks_5', q: 'Kādi koki visbiežāk aug Jūrmalas parkā, sargājot pilsētu no vēja?', fact: 'Priedes ir Jūrmalas parka galvenais koks – tās aizsargā pilsētu no vēja!' },
  ],
  LSEZ: [
    { id: 'lsez_1', q: 'Vai UPB ir Liepājas uzņēmums (Ja/Ne)?', fact: 'UPB būvē ēkas visā pasaulē!' },
    { id: 'lsez_2', q: 'Kurā gadā izveidota LSEZ?', fact: 'LSEZ izveidota 1997. gadā.' },
    { id: 'lsez_3', q: 'Cik uzņēmumi darbojas LSEZ teritorijā? (80/20/200)', fact: 'Vairāk nekā 80 uzņēmumi darbojas LSEZ!' },
    { id: 'lsez_4', q: 'Ko nozīmē saīsinājums LSEZ?', fact: 'Liepājas Speciālā Ekonomiskā Zona piesaista investīcijas!' },
    { id: 'lsez_5', q: 'Kāds ir galvenais mērķis Liepājas Speciālajai Ekonomiskajai Zonai?', fact: 'Investīciju piesaiste un ekonomikas attīstīšana!' },
  ],
  Ezerkrasts: [
    { id: 'ezerkrasts_1', q: 'Kāda ezera krastā ir taka?', fact: 'Liepājas ezers ir piektais lielākais Latvijā.' },
    { id: 'ezerkrasts_2', q: 'Kurš lielākais ezers Latvijā ir Liepājas ezers? (5./3./7.)', fact: 'Liepājas ezers ir piektais lielākais Latvijā!' },
    { id: 'ezerkrasts_3', q: 'Ko var vērot no Ezerkrasta takas skatu platformām? (putnus/zivis)', fact: 'Taka piedāvā skatu platformas putnu vērošanai!' },
    { id: 'ezerkrasts_4', q: 'Kas ir galvenais dabas objekts, ko var vērot no šīs takas torņa?', fact: 'No vērošanas torņa var novērot daudzas putnu sugas!' },
    { id: 'ezerkrasts_5', q: 'Kā sauc unikālo biotopu (augu kopu), kas klāj lielu daļu ezera krasta?', fact: 'Niedres veido unikālu dzīvotni daudziem dzīvniekiem!' },
  ],
};

export function pickQuestion(location) {
  const pool = questionsPool[location];
  if (!pool) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
