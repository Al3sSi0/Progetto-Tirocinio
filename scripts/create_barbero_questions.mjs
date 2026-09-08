const PB_URL = 'http://127.0.0.1:8090';
const OWNER  = 'chmzino5e3lqgca';
const TOKEN  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2xsZWN0aW9uSWQiOiJwYmNfMzE0MjYzNTgyMyIsImV4cCI6MTc3Njk1NjIxOSwiaWQiOiJ2cnJkNTJuZ2MwOGs1b24iLCJyZWZyZXNoYWJsZSI6dHJ1ZSwidHlwZSI6ImF1dGgifQ.eRABTdpPZVDnIpY1cEZrHo1kzTfA-qV94P1sc3oxHWg';

const QUESTIONS = [

  // ─────────────────────────────────────────────
  // PREISTORIA — Origini dell'uomo
  // ─────────────────────────────────────────────
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'Quale specie è considerata il primo ominide bipede?', options:['Australopithecus afarensis','Homo habilis','Homo erectus','Homo sapiens'], correct_answer:'Australopithecus afarensis' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'In quale continente si sono evoluti i primi ominidi?', options:['Africa','Asia','Europa','America'], correct_answer:'Africa' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'L\'Homo sapiens compare circa quanti anni fa?', options:['300.000 anni fa','1 milione di anni fa','50.000 anni fa','3 milioni di anni fa'], correct_answer:'300.000 anni fa' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'Cosa si intende con il termine "bipedismo"?', options:['Camminare su due zampe','Usare due mani per cacciare','Vivere in due habitat diversi','Nutrirsi di due tipi di cibo'], correct_answer:'Camminare su due zampe' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'L\'Homo neanderthalensis si estinse circa quando?', options:['40.000 anni fa','200.000 anni fa','10.000 anni fa','1 milione di anni fa'], correct_answer:'40.000 anni fa' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'Quale caratteristica distingueva l\'Homo habilis dalle specie precedenti?', options:['La produzione di strumenti in pietra','Il linguaggio articolato','La sepoltura dei morti','L\'agricoltura'], correct_answer:'La produzione di strumenti in pietra' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'Il sito di "Lucy" (Australopithecus afarensis) fu scoperto in quale paese?', options:['Etiopia','Kenya','Tanzania','Sudafrica'], correct_answer:'Etiopia' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'L\'Homo erectus fu il primo ominide a fare cosa?', options:['Uscire dall\'Africa e diffondersi in Eurasia','Praticare l\'agricoltura','Costruire abitazioni permanenti','Addomesticare animali'], correct_answer:'Uscire dall\'Africa e diffondersi in Eurasia' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'Che cos\'è la "teoria dell\'Out of Africa"?', options:['L\'Homo sapiens moderno si è originato in Africa e poi migrato nel resto del mondo','Gli ominidi si sono evoluti separatamente in ogni continente','L\'Africa è stata colonizzata per ultima dagli esseri umani','Gli esseri umani sono migrati in Africa dall\'Asia'], correct_answer:'L\'Homo sapiens moderno si è originato in Africa e poi migrato nel resto del mondo' },
  { subject:'Preistoria', topic:'Origini dell\'uomo', content:'Quale scoperta ha rivoluzionato la comprensione dell\'evoluzione umana nel XX secolo?', options:['Il DNA mitocondriale','La ruota','La scrittura cuneiforme','Il fuoco'], correct_answer:'Il DNA mitocondriale' },

  // ─────────────────────────────────────────────
  // PREISTORIA — Paleolitico
  // ─────────────────────────────────────────────
  { subject:'Preistoria', topic:'Paleolitico', content:'Il Paleolitico è anche detto Età della pietra...?', options:['Antica','Nuova','Levigata','Moderna'], correct_answer:'Antica' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Gli esseri umani del Paleolitico erano principalmente:',  options:['Cacciatori-raccoglitori nomadi','Agricoltori sedentari','Commercianti','Allevatori'], correct_answer:'Cacciatori-raccoglitori nomadi' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Le pitture rupestri di Lascaux (Francia) risalgono a circa:',  options:['17.000 anni fa','5.000 anni fa','50.000 anni fa','100.000 anni fa'], correct_answer:'17.000 anni fa' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Quale animale era tra i più rappresentati nelle pitture rupestri del Paleolitico?', options:['Bisonte','Cavallo','Mammut','Tutte le precedenti'], correct_answer:'Tutte le precedenti' },
  { subject:'Preistoria', topic:'Paleolitico', content:'La scoperta del fuoco risale a quale periodo?', options:['Paleolitico inferiore','Neolitico','Mesolitico','Età del Bronzo'], correct_answer:'Paleolitico inferiore' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Gli strumenti del Paleolitico erano realizzati principalmente in:',  options:['Pietra scheggiata','Bronzo','Ferro','Osso lavorato'], correct_answer:'Pietra scheggiata' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Il Paleolitico superiore è caratterizzato da una grande diffusione di:',  options:['Arte e ornamenti','Agricoltura','Metallurgia','Scrittura'], correct_answer:'Arte e ornamenti' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Le Veneri paleolitiche erano statuette che raffiguravano:',  options:['Figure femminili con forme accentuate','Guerrieri','Animali','Divinità maschili'], correct_answer:'Figure femminili con forme accentuate' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Quale era la principale fonte di nutrimento nel Paleolitico?', options:['Caccia, pesca e raccolta di frutti selvatici','Coltivazione di cereali','Allevamento di bovini','Commercio con altri gruppi'], correct_answer:'Caccia, pesca e raccolta di frutti selvatici' },
  { subject:'Preistoria', topic:'Paleolitico', content:'Il Paleolitico copre approssimativamente quale arco temporale?', options:['Da 2,5 milioni a 10.000 anni fa','Da 10.000 a 5.000 anni fa','Da 500.000 a 50.000 anni fa','Da 5.000 a 2.000 anni fa'], correct_answer:'Da 2,5 milioni a 10.000 anni fa' },

  // ─────────────────────────────────────────────
  // PREISTORIA — Neolitico
  // ─────────────────────────────────────────────
  { subject:'Preistoria', topic:'Neolitico', content:'La "rivoluzione neolitica" indica principalmente:',  options:['Il passaggio all\'agricoltura e all\'allevamento','L\'invenzione della scrittura','La scoperta dei metalli','La costruzione delle prime città'], correct_answer:'Il passaggio all\'agricoltura e all\'allevamento' },
  { subject:'Preistoria', topic:'Neolitico', content:'In quale regione del mondo iniziò per prima l\'agricoltura?', options:['Mezzaluna Fertile (Medio Oriente)','Valle dell\'Indo','Cina','America Centrale'], correct_answer:'Mezzaluna Fertile (Medio Oriente)' },
  { subject:'Preistoria', topic:'Neolitico', content:'Quali cereali vennero coltivati per primi nella Mezzaluna Fertile?', options:['Frumento e orzo','Riso e miglio','Mais e patate','Segale e avena'], correct_answer:'Frumento e orzo' },
  { subject:'Preistoria', topic:'Neolitico', content:'Il Neolitico inizia circa:',  options:['10.000 anni fa','2.000 anni fa','50.000 anni fa','30.000 anni fa'], correct_answer:'10.000 anni fa' },
  { subject:'Preistoria', topic:'Neolitico', content:'Nel Neolitico gli strumenti in pietra erano principalmente:',  options:['Levigati e politi','Scheggiati e grezzi','In metallo','In legno'], correct_answer:'Levigati e politi' },
  { subject:'Preistoria', topic:'Neolitico', content:'Quale animale fu tra i primi ad essere addomesticato?', options:['Cane','Leone','Orso','Cervo'], correct_answer:'Cane' },
  { subject:'Preistoria', topic:'Neolitico', content:'Stonehenge (Inghilterra) è un esempio di costruzione:',  options:['Megalitica neolitica','Paleolitica','Dell\'Età del Ferro','Romana'], correct_answer:'Megalitica neolitica' },
  { subject:'Preistoria', topic:'Neolitico', content:'Quale nuova abilità artigianale compare nel Neolitico?',  options:['La ceramica','La fusione del bronzo','La lavorazione del ferro','La scrittura'], correct_answer:'La ceramica' },
  { subject:'Preistoria', topic:'Neolitico', content:'La sedentarizzazione portò alla formazione di:',  options:['Villaggi permanenti','Grandi imperi','Eserciti organizzati','Flotte navali'], correct_answer:'Villaggi permanenti' },
  { subject:'Preistoria', topic:'Neolitico', content:'Il dolmen è una struttura funeraria tipica del:',  options:['Neolitico','Paleolitico','Mesolitico','Eneolitico'], correct_answer:'Neolitico' },

  // ─────────────────────────────────────────────
  // PREISTORIA — Età del Bronzo
  // ─────────────────────────────────────────────
  { subject:'Preistoria', topic:'Età del Bronzo', content:'Il bronzo è una lega composta da:',  options:['Rame e stagno','Ferro e carbone','Rame e zinco','Oro e argento'], correct_answer:'Rame e stagno' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'L\'Età del Bronzo inizia indicativamente:',  options:['3.300 a.C.','10.000 a.C.','500 a.C.','1.000 d.C.'], correct_answer:'3.300 a.C.' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'In quale civiltà si sviluppò per prima la lavorazione del bronzo?', options:['Mesopotamia','Grecia','Roma','Gallia'], correct_answer:'Mesopotamia' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'Quale importante innovazione sociale accompagnò l\'Età del Bronzo?', options:['La formazione di società gerarchiche e stati','L\'invenzione della stampa','Il monoteismo diffuso','La democrazia'], correct_answer:'La formazione di società gerarchiche e stati' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'La civiltà minoica (Creta) fiorì durante:',  options:['L\'Età del Bronzo','L\'Età del Ferro','Il Neolitico','L\'Età Classica'], correct_answer:'L\'Età del Bronzo' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'Il "collasso dell\'Età del Bronzo" avvenne intorno al:',  options:['1200 a.C.','500 a.C.','3000 a.C.','100 d.C.'], correct_answer:'1200 a.C.' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'Le "Civiltà del palazzo" dell\'Egeo (Micene, Cnosso) sono tipiche di quale periodo?', options:['Età del Bronzo','Età del Ferro','Età Ellenistica','Neolitico'], correct_answer:'Età del Bronzo' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'Quale scrittura fu usata dai Micenei durante l\'Età del Bronzo?', options:['Lineare B','Lineare A','Cuneiforme','Geroglifico'], correct_answer:'Lineare B' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'Özi, la "mummia del Similaun", vissuta nell\'Età del Rame/Bronzo, fu ritrovata in:',  options:['Alpi italo-austriache','Egitto','Mesopotamia','Cina'], correct_answer:'Alpi italo-austriache' },
  { subject:'Preistoria', topic:'Età del Bronzo', content:'L\'Età del Bronzo favorì lo sviluppo del commercio a lunga distanza perché:',  options:['Lo stagno e il rame erano rari e geograficamente separati','Il ferro era abbondante','Le strade romane facilitavano i viaggi','Le navi a vapore collegavano i continenti'], correct_answer:'Lo stagno e il rame erano rari e geograficamente separati' },

  // ─────────────────────────────────────────────
  // PREISTORIA — Età del Ferro
  // ─────────────────────────────────────────────
  { subject:'Preistoria', topic:'Età del Ferro', content:'L\'Età del Ferro inizia circa:',  options:['1200 a.C.','3300 a.C.','500 d.C.','10.000 a.C.'], correct_answer:'1200 a.C.' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'Rispetto al bronzo, il ferro presenta quale vantaggio principale?', options:['È più abbondante e accessibile','È più leggero','Non si arrugginisce','Ha un colore più brillante'], correct_answer:'È più abbondante e accessibile' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'Quale popolo diffuse per primo la lavorazione del ferro in Anatolia?', options:['Ittiti','Fenici','Greci','Persiani'], correct_answer:'Ittiti' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'I Celti sono una civiltà tipica dell\':',  options:['Età del Ferro in Europa','Età del Bronzo in Asia','Neolitico in Africa','Paleolitico in America'], correct_answer:'Età del Ferro in Europa' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'La cultura di Hallstatt (800–450 a.C.) è associata a:',  options:['I primi Celti in Europa centrale','I Germani del Nord','I Greci in Sicilia','I Fenici in Spagna'], correct_answer:'I primi Celti in Europa centrale' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'In Italia, quale civiltà protostorica fiorì nell\'Età del Ferro prima di Roma?', options:['Etruschi','Minoici','Fenici','Assiri'], correct_answer:'Etruschi' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'La cultura di La Tène è associata a quale fase dell\'Età del Ferro?', options:['Età del Ferro tarda (celtica)','Prima Età del Ferro','Tarda Età del Bronzo','Neolitico finale'], correct_answer:'Età del Ferro tarda (celtica)' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'Quale grande cambiamento politico accompagnò l\'Età del Ferro in Grecia?', options:['La nascita delle polis (città-stato)','La fine della democrazia','L\'unificazione sotto un unico re','La conquista persiana'], correct_answer:'La nascita delle polis (città-stato)' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'Il processo di produzione del ferro richiede temperature più alte del bronzo: vero o falso?', options:['Vero','Falso','Dipende dal tipo di ferro','Dipende dall\'altitudine'], correct_answer:'Vero' },
  { subject:'Preistoria', topic:'Età del Ferro', content:'L\'introduzione del ferro influenzò principalmente quale settore?', options:['Agricoltura e guerra','Medicina','Navigazione astronomica','Scrittura'], correct_answer:'Agricoltura e guerra' },

  // ─────────────────────────────────────────────
  // STORIA ANTICA — Civiltà mesopotamiche
  // ─────────────────────────────────────────────
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'Mesopotamia significa letteralmente:',  options:['Terra tra i fiumi','Terra del sole','Terra dei mille dei','Terra fertile'], correct_answer:'Terra tra i fiumi' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'Quali sono i due fiumi che delimitano la Mesopotamia?', options:['Tigri ed Eufrate','Nilo e Giordano','Indo e Gange','Volga e Danubio'], correct_answer:'Tigri ed Eufrate' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'La scrittura cuneiforme fu inventata dai:',  options:['Sumeri','Accadi','Babilonesi','Assiri'], correct_answer:'Sumeri' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'Il Codice di Hammurabi è un insieme di leggi risalente a circa:',  options:['1754 a.C.','500 a.C.','3000 a.C.','100 d.C.'], correct_answer:'1754 a.C.' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'I Sumeri costruivano i loro templi su strutture a gradoni chiamate:',  options:['Ziggurat','Piramidi','Mastabe','Obelischi'], correct_answer:'Ziggurat' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'L\'epopea di Gilgameš è considerata uno dei più antichi:',  options:['Poemi epici scritti','Codici di legge','Trattati scientifici','Calendari astronomici'], correct_answer:'Poemi epici scritti' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'La città di Babilonia raggiunse il suo apice sotto il re:',  options:['Nebuchadnezzar II','Hammurabi','Sargon di Akkad','Ciro il Grande'], correct_answer:'Nebuchadnezzar II' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'L\'Impero Assiro era noto per:',  options:['La sua potenza militare e le deportazioni di massa','La filosofia e la democrazia','Il commercio marittimo','Le piramidi monumentali'], correct_answer:'La sua potenza militare e le deportazioni di massa' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'I Fenici, vicini alla Mesopotamia, sono celebri per aver inventato:',  options:['L\'alfabeto','Il bronzo','La ruota','La matematica'], correct_answer:'L\'alfabeto' },
  { subject:'Storia Antica', topic:'Civiltà mesopotamiche', content:'Quale popolo pose fine all\'Impero Babilonese nel 539 a.C.?', options:['I Persiani di Ciro il Grande','I Greci di Alessandro Magno','I Romani','Gli Assiri'], correct_answer:'I Persiani di Ciro il Grande' },

  // ─────────────────────────────────────────────
  // STORIA ANTICA — Egitto antico
  // ─────────────────────────────────────────────
  { subject:'Storia Antica', topic:'Egitto antico', content:'Le tre grandi piramidi di Giza furono costruite durante quale periodo?', options:['Antico Regno (IV dinastia)','Medio Regno','Nuovo Regno','Periodo Tardo'], correct_answer:'Antico Regno (IV dinastia)' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'Il faraone era considerato:',  options:['Dio vivente e re','Solo un capo militare','Un sacerdote senza potere politico','Un mercante'], correct_answer:'Dio vivente e re' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'La Stele di Rosetta permise di decifrare:',  options:['I geroglifici egizi','La scrittura cuneiforme','Il lineare B','L\'alfabeto fenicio'], correct_answer:'I geroglifici egizi' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'Quale fiume era fondamentale per la civiltà egizia?', options:['Nilo','Eufrate','Tigri','Giordano'], correct_answer:'Nilo' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'Il dio del sole nell\'Egitto antico era principalmente chiamato:',  options:['Ra','Osiride','Anubi','Seth'], correct_answer:'Ra' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'Il processo della mummificazione aveva scopo:',  options:['Preservare il corpo per la vita dopo la morte','Igienico','Artistico','Medico-scientifico'], correct_answer:'Preservare il corpo per la vita dopo la morte' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'Cleopatra VII fu l\'ultima regina della dinastia:',  options:['Tolemaica','Ramessea','Saitica','Isiaca'], correct_answer:'Tolemaica' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'Il Nuovo Regno è noto per i grandi faraoni guerrieri come:',  options:['Ramesse II','Cheope','Amenofi I','Narmer'], correct_answer:'Ramesse II' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'La Valle dei Re si trova vicino a quale antica città egizia?', options:['Luxor (Tebe)','Alessandria','Menfi','Assuan'], correct_answer:'Luxor (Tebe)' },
  { subject:'Storia Antica', topic:'Egitto antico', content:'Chi fu il faraone "eretico" che introdusse il culto monoteistico di Aton?', options:['Akhenaton','Tutankhamon','Seti I','Thutmose III'], correct_answer:'Akhenaton' },

  // ─────────────────────────────────────────────
  // STORIA ANTICA — Grecia antica
  // ─────────────────────────────────────────────
  { subject:'Storia Antica', topic:'Grecia antica', content:'Le Guerre Persiane (490–479 a.C.) videro la vittoria di:',  options:['I Greci','I Persiani','Gli Egizi','I Macedoni'], correct_answer:'I Greci' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'La battaglia di Maratona (490 a.C.) si concluse con la vittoria di:',  options:['Atene','Sparta','Corinto','Tebe'], correct_answer:'Atene' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'La democrazia ateniese fu introdotta da:',  options:['Clistene','Pericle','Solone','Temistocle'], correct_answer:'Clistene' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'I Giochi Olimpici nell\'antichità si svolgevano in onore di:',  options:['Zeus','Apollo','Atena','Afrodite'], correct_answer:'Zeus' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'La Lega del Peloponneso era guidata da:',  options:['Sparta','Atene','Corinto','Argo'], correct_answer:'Sparta' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'La guerra del Peloponneso (431–404 a.C.) si concluse con la vittoria di:',  options:['Sparta','Atene','Macedonia','Persia'], correct_answer:'Sparta' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'Il Partenone sull\'Acropoli di Atene è un tempio dedicato a:',  options:['Atena','Zeus','Poseidone','Apollo'], correct_answer:'Atena' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'Alessandro Magno era figlio di:',  options:['Filippo II di Macedonia','Pericle di Atene','Leonida di Sparta','Dario I di Persia'], correct_answer:'Filippo II di Macedonia' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'Socrate fu condannato a morte per:',  options:['Empietà e corruzione della gioventù','Tradimento militare','Furto','Assassinio'], correct_answer:'Empietà e corruzione della gioventù' },
  { subject:'Storia Antica', topic:'Grecia antica', content:'Il teatro greco aveva due generi principali:',  options:['Tragedia e commedia','Epica e lirica','Opera e ballata','Poesia e prosa'], correct_answer:'Tragedia e commedia' },

  // ─────────────────────────────────────────────
  // STORIA ANTICA — Roma antica
  // ─────────────────────────────────────────────
  { subject:'Storia Antica', topic:'Roma antica', content:'Secondo la tradizione, Roma fu fondata nel:',  options:['753 a.C.','509 a.C.','27 a.C.','476 d.C.'], correct_answer:'753 a.C.' },
  { subject:'Storia Antica', topic:'Roma antica', content:'La Repubblica Romana terminò con:',  options:['Augusto primo imperatore (27 a.C.)','La caduta di Cartagine','L\'assassinio di Cesare','La conquista della Gallia'], correct_answer:'Augusto primo imperatore (27 a.C.)' },
  { subject:'Storia Antica', topic:'Roma antica', content:'Le Guerre Puniche furono combattute tra Roma e:',  options:['Cartagine','Grecia','Persia','Egitto'], correct_answer:'Cartagine' },
  { subject:'Storia Antica', topic:'Roma antica', content:'Giulio Cesare fu assassinato nel:',  options:['44 a.C.','27 a.C.','100 a.C.','14 d.C.'], correct_answer:'44 a.C.' },
  { subject:'Storia Antica', topic:'Roma antica', content:'Il Senato romano era composto principalmente da:',  options:['Patrizi e in seguito anche plebei ricchi','Solo schiavi liberati','Soldati eletti','Sacerdoti'], correct_answer:'Patrizi e in seguito anche plebei ricchi' },
  { subject:'Storia Antica', topic:'Roma antica', content:'La rivolta degli schiavi guidata da Spartaco avvenne nel:',  options:['73–71 a.C.','44 a.C.','100 d.C.','509 a.C.'], correct_answer:'73–71 a.C.' },
  { subject:'Storia Antica', topic:'Roma antica', content:'L\'Editto di Milano (313 d.C.) concesse la libertà di:',  options:['Culto religioso (incluso il Cristianesimo)','Commercio tra province','Movimento per gli schiavi','Voto alle donne'], correct_answer:'Culto religioso (incluso il Cristianesimo)' },
  { subject:'Storia Antica', topic:'Roma antica', content:'La caduta dell\'Impero Romano d\'Occidente è convenzionalmente fissata al:',  options:['476 d.C.','410 d.C.','395 d.C.','565 d.C.'], correct_answer:'476 d.C.' },
  { subject:'Storia Antica', topic:'Roma antica', content:'Chi era il "pater familias" nella società romana?', options:['Il capofamiglia maschio con autorità assoluta','Il sacerdote del focolare','Il console eletto','Il generale dell\'esercito'], correct_answer:'Il capofamiglia maschio con autorità assoluta' },
  { subject:'Storia Antica', topic:'Roma antica', content:'Il Colosseo fu costruito durante la dinastia:',  options:['Flavia (Vespasiano e Tito)','Giulio-Claudia','Antonina','Severiana'], correct_answer:'Flavia (Vespasiano e Tito)' },

  // ─────────────────────────────────────────────
  // STORIA ANTICA — Civiltà orientali
  // ─────────────────────────────────────────────
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'La Grande Muraglia cinese fu inizialmente costruita durante la dinastia:',  options:['Qin','Han','Tang','Ming'], correct_answer:'Qin' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'Il primo imperatore della Cina unificata fu:',  options:['Qin Shi Huang','Confucio','Sun Tzu','Laozi'], correct_answer:'Qin Shi Huang' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'La Via della Seta collegava la Cina con:',  options:['Il Mediterraneo e l\'Europa','L\'America precolombiana','L\'Africa subsahariana','Il Polo Nord'], correct_answer:'Il Mediterraneo e l\'Europa' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'L\'Impero Persiano raggiunse la massima estensione sotto:',  options:['Dario I','Ciro il Grande','Serse I','Artaserse'], correct_answer:'Dario I' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'Il Buddha (Siddhartha Gautama) visse circa nel:',  options:['V–IV secolo a.C.','I secolo d.C.','X secolo a.C.','III secolo d.C.'], correct_answer:'V–IV secolo a.C.' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'La civiltà della Valle dell\'Indo fiorì principalmente nell\'odierna:',  options:['Pakistan e India nord-occidentale','Cina meridionale','Iran settentrionale','Arabia'], correct_answer:'Pakistan e India nord-occidentale' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'Confucio è noto principalmente per la sua dottrina riguardante:',  options:['La morale, la famiglia e la società','La cosmologia','La guerra santa','L\'agricoltura'], correct_answer:'La morale, la famiglia e la società' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'L\'Impero Maurya in India raggiunse l\'apice sotto:',  options:['Ashoka','Chandragupta','Bindusara','Harsha'], correct_answer:'Ashoka' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'Il Zoroastrismo era la religione ufficiale di quale impero antico?', options:['Persiano (Achemenide)','Cinese (Han)','Indiano (Maurya)','Babilonese'], correct_answer:'Persiano (Achemenide)' },
  { subject:'Storia Antica', topic:'Civiltà orientali', content:'L\'Esercito di Terracotta fu sepolto con quale imperatore cinese?', options:['Qin Shi Huang','Han Wudi','Tang Taizong','Kublai Khan'], correct_answer:'Qin Shi Huang' },

  // ─────────────────────────────────────────────
  // MEDIOEVO — Alto Medioevo
  // ─────────────────────────────────────────────
  { subject:'Medioevo', topic:'Alto Medioevo', content:'L\'Alto Medioevo è convenzionalmente collocato tra il:',  options:['476 e il 1000 d.C.','1000 e il 1300 d.C.','313 e il 476 d.C.','1300 e il 1500 d.C.'], correct_answer:'476 e il 1000 d.C.' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'Carlo Magno fu incoronato imperatore del Sacro Romano Impero nell\'anno:',  options:['800','700','900','1000'], correct_answer:'800' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'I Vichinghi provenivano principalmente da:',  options:['Scandinavia','Germania','Russia','Inghilterra'], correct_answer:'Scandinavia' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'Il monachesimo occidentale si sviluppò principalmente seguendo la Regola di:',  options:['San Benedetto da Norcia','Sant\'Agostino','San Francesco','San Domenico'], correct_answer:'San Benedetto da Norcia' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'La battaglia di Poitiers (732) fermò l\'avanzata:',  options:['Araba/islamica in Europa occidentale','Normanna in Inghilterra','Vichinga in Francia','Germanica in Italia'], correct_answer:'Araba/islamica in Europa occidentale' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'I Longobardi invasero l\'Italia nel:',  options:['568 d.C.','476 d.C.','800 d.C.','1066 d.C.'], correct_answer:'568 d.C.' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'Il Trattato di Verdun (843) divise l\'Impero Carolingio tra i nipoti di Carlo Magno. In quante parti?', options:['Tre','Due','Quattro','Cinque'], correct_answer:'Tre' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'Quale popolo nomade devastò l\'Europa nel IV–V secolo d.C.?', options:['Unni','Arabi','Mongoli','Tartari'], correct_answer:'Unni' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'Giustiniano I fu imperatore di:',  options:['Impero Romano d\'Oriente (Bisanzio)','Sacro Romano Impero','Califfato Abbaside','Impero Carolingio'], correct_answer:'Impero Romano d\'Oriente (Bisanzio)' },
  { subject:'Medioevo', topic:'Alto Medioevo', content:'La lingua franca dei monasteri e del clero medievale era:',  options:['Latino','Greco','Arabo','Franco'], correct_answer:'Latino' },

  // ─────────────────────────────────────────────
  // MEDIOEVO — Feudalesimo
  // ─────────────────────────────────────────────
  { subject:'Medioevo', topic:'Feudalesimo', content:'Il feudo era:',  options:['Una concessione di terre in cambio di servizi militari e fedeltà','Una tassa pagata al re','Un tribunale ecclesiastico','Una città medievale'], correct_answer:'Una concessione di terre in cambio di servizi militari e fedeltà' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'Il vassallo era:',  options:['Chi riceveva il feudo e giurava fedeltà al signore','Il signore che concedeva le terre','Il servo della gleba','Il vescovo locale'], correct_answer:'Chi riceveva il feudo e giurava fedeltà al signore' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'I servi della gleba erano:',  options:['Contadini legati alla terra senza poterla abbandonare','Soldati professionisti','Mercanti itineranti','Monaci lavoratori'], correct_answer:'Contadini legati alla terra senza poterla abbandonare' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'L\'omaggio feudale era una cerimonia in cui:',  options:['Il vassallo giurava fedeltà al signore in ginocchio','Il re incoronava i vescovi','Il papa assegnava le terre ai principi','Il cavaliere riceveva la spada'], correct_answer:'Il vassallo giurava fedeltà al signore in ginocchio' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'La piramide feudale aveva al vertice:',  options:['Il re','Il papa','Il cavaliere','Il conte'], correct_answer:'Il re' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'La cavalleria medievale era un codice che regolava:',  options:['Il comportamento dei cavalieri (lealtà, coraggio, cortesia)','Le leggi commerciali','L\'organizzazione della Chiesa','La successione al trono'], correct_answer:'Il comportamento dei cavalieri (lealtà, coraggio, cortesia)' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'Il sistema feudale declinò principalmente a causa di:',  options:['La rinascita del commercio, delle città e di un\'economia monetaria','Una guerra nucleare','Le invasioni extraterrestri','Il ritorno dell\'Impero Romano'], correct_answer:'La rinascita del commercio, delle città e di un\'economia monetaria' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'La "investitura" era il rito con cui:',  options:['Il signore concedeva formalmente il feudo al vassallo','Il re veniva incoronato','Il cavaliere riceveva l\'armatura','Il papa eleggeva i vescovi'], correct_answer:'Il signore concedeva formalmente il feudo al vassallo' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'Quale documento inglese del 1215 limitò il potere del re e tutelo i baroni?', options:['Magna Carta','Bolla d\'Oro','Editto di Milano','Pace di Westfalia'], correct_answer:'Magna Carta' },
  { subject:'Medioevo', topic:'Feudalesimo', content:'Il sistema delle tre rotazioni agrarie nel Medioevo serviva per:',  options:['Mantenere fertile il suolo e aumentare i raccolti','Militarizzare le campagne','Organizzare le crociate','Costruire i castelli'], correct_answer:'Mantenere fertile il suolo e aumentare i raccolti' },

  // ─────────────────────────────────────────────
  // MEDIOEVO — Crociate
  // ─────────────────────────────────────────────
  { subject:'Medioevo', topic:'Crociate', content:'La Prima Crociata fu indetta nel 1095 da papa:',  options:['Urbano II','Gregorio VII','Innocenzo III','Clemente V'], correct_answer:'Urbano II' },
  { subject:'Medioevo', topic:'Crociate', content:'L\'obiettivo principale delle Crociate era:',  options:['La riconquista di Gerusalemme e della Terra Santa','Convertire i pagani nordici','Combattere l\'Impero Bizantino','Esplorare nuove rotte commerciali'], correct_answer:'La riconquista di Gerusalemme e della Terra Santa' },
  { subject:'Medioevo', topic:'Crociate', content:'Saladino è noto per aver riconquistato Gerusalemme nel:',  options:['1187','1099','1204','1291'], correct_answer:'1187' },
  { subject:'Medioevo', topic:'Crociate', content:'La Quarta Crociata (1204) prese una direzione inaspettata saccheggiando:',  options:['Costantinopoli (cristiana)','Il Cairo','Damasco','Bagdad'], correct_answer:'Costantinopoli (cristiana)' },
  { subject:'Medioevo', topic:'Crociate', content:'Quante Crociate principali vengono tradizionalmente enumerate?', options:['Otto','Quattro','Dieci','Tre'], correct_answer:'Otto' },
  { subject:'Medioevo', topic:'Crociate', content:'Gli Ordini militari-religiosi nati durante le Crociate includevano:',  options:['Templari, Ospitalieri, Teutonici','Domenicani, Francescani, Agostiniani','Benedettini, Cistercensi, Cluniacensi','Assassini, Druzi, Ismailiti'], correct_answer:'Templari, Ospitalieri, Teutonici' },
  { subject:'Medioevo', topic:'Crociate', content:'La "Crociata dei bambini" (1212) è considerata:',  options:['Una spedizione mal organizzata e tragica','La più vittoriosa delle crociate','Una leggenda senza fondamento storico','Una crociata diplomatica'], correct_answer:'Una spedizione mal organizzata e tragica' },
  { subject:'Medioevo', topic:'Crociate', content:'Federico II di Svevia riconquistò Gerusalemme nel 1229 attraverso:',  options:['Una trattativa diplomatica con il sultano','Una vittoria militare decisiva','Un miracolo religioso','Un assedio di tre anni'], correct_answer:'Una trattativa diplomatica con il sultano' },
  { subject:'Medioevo', topic:'Crociate', content:'Le Crociate favorirono gli scambi commerciali tra:',  options:['Europa e Oriente (spezie, seta, nuove tecnologie)','Europa e Americhe','Africa e Asia','Cina e India'], correct_answer:'Europa e Oriente (spezie, seta, nuove tecnologie)' },
  { subject:'Medioevo', topic:'Crociate', content:'L\'ultima presenza crociata in Terrasanta cadde definitivamente nel:',  options:['1291 (caduta di Acri)','1099','1187','1204'], correct_answer:'1291 (caduta di Acri)' },

  // ─────────────────────────────────────────────
  // MEDIOEVO — Basso Medioevo
  // ─────────────────────────────────────────────
  { subject:'Medioevo', topic:'Basso Medioevo', content:'La peste nera del 1347–1353 uccise circa quale percentuale della popolazione europea?', options:['Un terzo','Un decimo','La metà','Il 90%'], correct_answer:'Un terzo' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'La Guerra dei Cent\'Anni fu combattuta tra:',  options:['Francia e Inghilterra','Sacro Romano Impero e Francia','Spagna e Portogallo','Italia e Turchia'], correct_answer:'Francia e Inghilterra' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'Giovanna d\'Arco guidò i Francesi durante la Guerra dei Cent\'Anni e morì nel:',  options:['1431','1415','1453','1348'], correct_answer:'1431' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'La "Guerra delle Due Rose" fu una guerra civile in:',  options:['Inghilterra','Francia','Germania','Italia'], correct_answer:'Inghilterra' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'Lo Scisma d\'Occidente (1378–1417) vide la presenza simultanea di:',  options:['Due o tre papi','Due imperatori','Due re di Francia','Due sultani ottomani'], correct_answer:'Due o tre papi' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'La caduta di Costantinopoli nel 1453 fu opera dei:',  options:['Turchi Ottomani','Mongoli','Crociati veneziani','Arabi'], correct_answer:'Turchi Ottomani' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'Il Concilio di Costanza (1414–1418) risolse lo Scisma d\'Occidente e condannò al rogo:',  options:['Jan Hus','Girolamo Savonarola','John Wycliffe','Martin Lutero'], correct_answer:'Jan Hus' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'L\'Università di Bologna, la più antica d\'Europa, fu fondata nel:',  options:['1088','1200','1350','1453'], correct_answer:'1088' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'Dante Alighieri scrisse la Divina Commedia all\'inizio del:',  options:['XIV secolo (1300)','XII secolo (1100)','XV secolo (1400)','XVI secolo (1500)'], correct_answer:'XIV secolo (1300)' },
  { subject:'Medioevo', topic:'Basso Medioevo', content:'La rivolta dei Ciompi (1378) avvenne a:',  options:['Firenze','Venezia','Roma','Napoli'], correct_answer:'Firenze' },

  // ─────────────────────────────────────────────
  // MEDIOEVO — Cultura e religione medievale
  // ─────────────────────────────────────────────
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'L\'architettura gotica è caratterizzata da:',  options:['Archi a sesto acuto, volte a crociera, grandi vetrate','Colonne doriche e frontoni triangolari','Cupole e mosaici bizantini','Strutture in ferro e vetro'], correct_answer:'Archi a sesto acuto, volte a crociera, grandi vetrate' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'Il Romanico è uno stile architettonico che precede il Gotico e si caratterizza per:',  options:['Muri spessi, archi a tutto sesto e poca luce','Grandi vetrate colorate','Cupole a cipolla','Colonnati greci'], correct_answer:'Muri spessi, archi a tutto sesto e poca luce' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'La Scolastica era una corrente filosofica medievale che cercava di conciliare:',  options:['Fede cristiana e ragione aristotelica','Paganesimo e cristianesimo','Scienza moderna e religione','Islam e Ebraismo'], correct_answer:'Fede cristiana e ragione aristotelica' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'Tommaso d\'Aquino è il principale esponente della:',  options:['Scolastica','Mistica renana','Patristca','Eresia catara'], correct_answer:'Scolastica' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'L\'Inquisizione medievale fu istituita principalmente per combattere:',  options:['Le eresie cristiane (es. catarismo, valdismo)','L\'Islam','Il paganesimo nordico','La stregoneria moderna'], correct_answer:'Le eresie cristiane (es. catarismo, valdismo)' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'San Francesco d\'Assisi fondò l\'Ordine dei:',  options:['Frati Minori (Francescani)','Domenicani','Benedettini','Cistercensi'], correct_answer:'Frati Minori (Francescani)' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'I Trovatori erano poeti medievali che componevano principalmente in:',  options:['Lingua d\'oc (occitano)','Latino','Francese antico','Italiano volgare'], correct_answer:'Lingua d\'oc (occitano)' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'Il pellegrinaggio medievale per eccellenza verso l\'apostolo Giacomo portava a:',  options:['Santiago de Compostela (Spagna)','Roma','Gerusalemme','Canterbury'], correct_answer:'Santiago de Compostela (Spagna)' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'Bisanzio (Costantinopoli) conservò quale tradizione culturale per tutto il Medioevo?', options:['La cultura greco-romana e cristiana orientale','La cultura celtica','La cultura persiana','La cultura araba'], correct_answer:'La cultura greco-romana e cristiana orientale' },
  { subject:'Medioevo', topic:'Cultura e religione medievale', content:'La carta da stampa a caratteri mobili fu introdotta in Europa da:',  options:['Johannes Gutenberg (1450 ca.)','Leonardo da Vinci','Niccolò Copernico','Galileo Galilei'], correct_answer:'Johannes Gutenberg (1450 ca.)' },

  // ─────────────────────────────────────────────
  // STORIA MODERNA — Rinascimento
  // ─────────────────────────────────────────────
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Il Rinascimento ha il suo epicentro iniziale in:',  options:['Italia (Firenze, Roma, Venezia)','Francia','Spagna','Inghilterra'], correct_answer:'Italia (Firenze, Roma, Venezia)' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'L\'Umanesimo rinascimentale poneva al centro:',  options:['L\'uomo e le sue capacità','Dio e la salvezza dell\'anima','La natura selvaggia','Il potere assoluto dei re'], correct_answer:'L\'uomo e le sue capacità' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Leonardo da Vinci è noto come esempio di:',  options:['Uomo universale (uomo vitruviano)','Filosofo scolastico','Generale militare','Riformatore religioso'], correct_answer:'Uomo universale (uomo vitruviano)' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'La famiglia Medici a Firenze è celebre per il suo ruolo di:',  options:['Mecenate delle arti e della cultura','Costruttori di cattedrali gotiche','Fondatori dell\'Ordine Domenicano','Comandanti delle crociate'], correct_answer:'Mecenate delle arti e della cultura' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Niccolò Machiavelli scrisse "Il Principe" nel:',  options:['1513','1450','1600','1489'], correct_answer:'1513' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Michelangelo dipinse il soffitto della Cappella Sistina tra il:',  options:['1508 e il 1512','1450 e il 1460','1550 e il 1560','1480 e il 1490'], correct_answer:'1508 e il 1512' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Quale tecnica pittorica fu perfezionata durante il Rinascimento per la rappresentazione dello spazio?', options:['Prospettiva lineare','Mosaico','Affresco piatto','Gouache'], correct_answer:'Prospettiva lineare' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Il "De revolutionibus" di Copernico propose che al centro del sistema solare ci fosse:',  options:['Il Sole (eliocentrismo)','La Terra (geocentrismo)','La Luna','Giove'], correct_answer:'Il Sole (eliocentrismo)' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Erasmo da Rotterdam fu il principale esponente dell\':',  options:['Umanesimo nordico','Manierismo italiano','Illuminismo francese','Romanticismo tedesco'], correct_answer:'Umanesimo nordico' },
  { subject:'Storia Moderna', topic:'Rinascimento', content:'Il Rinascimento si diffuse in Europa anche grazie all\':',  options:['Invenzione della stampa a caratteri mobili','Apertura delle università','Istituzione dell\'Inquisizione','Costruzione delle cattedrali gotiche'], correct_answer:'Invenzione della stampa a caratteri mobili' },

  // ─────────────────────────────────────────────
  // STORIA MODERNA — Riforma protestante
  // ─────────────────────────────────────────────
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'Martin Lutero affisse le sue 95 tesi nel:',  options:['1517','1483','1555','1600'], correct_answer:'1517' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'Le 95 tesi di Lutero erano dirette principalmente contro:',  options:['La vendita delle indulgenze','L\'autorità dell\'imperatore','Le crociate','Il celibato dei preti'], correct_answer:'La vendita delle indulgenze' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'Calvino fondò il suo movimento riformato nella città di:',  options:['Ginevra','Zurigo','Londra','Wittenberg'], correct_answer:'Ginevra' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'La Pace di Augusta (1555) stabilì il principio:',  options:['"Cuius regio, eius religio" (la religione del principe diventa quella dei sudditi)','La libertà di coscienza individuale','L\'espulsione dei protestanti dalla Germania','L\'unità della Chiesa cristiana'], correct_answer:'"Cuius regio, eius religio" (la religione del principe diventa quella dei sudditi)' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'Enrico VIII d\'Inghilterra si separò da Roma principalmente per:',  options:['Ottenere l\'annullamento del suo matrimonio','Ragioni teologiche luterane','Motivazioni economiche legate alle miniere','Pressioni dei nobili inglesi'], correct_answer:'Ottenere l\'annullamento del suo matrimonio' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'Il Concilio di Trento (1545–1563) fu la risposta cattolica alla Riforma, chiamata:',  options:['Controriforma','Riforma cattolica progressiva','Secondo Rinascimento','Inquisizione moderna'], correct_answer:'Controriforma' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'I Gesuiti (Compagnia di Gesù) furono fondati da:',  options:['Ignazio di Loyola','Francesco d\'Assisi','Domenico di Guzmán','Filippo Neri'], correct_answer:'Ignazio di Loyola' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'La Guerra dei Trent\'Anni (1618–1648) fu in parte causata da:',  options:['Conflitti religiosi tra cattolici e protestanti','L\'invasione turca in Europa','La Rivoluzione Francese','Le guerre di successione spagnola'], correct_answer:'Conflitti religiosi tra cattolici e protestanti' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'Ulrico Zwingli fu un riformatore che operò principalmente in:',  options:['Zurigo (Svizzera)','Ginevra','Wittenberg','Londra'], correct_answer:'Zurigo (Svizzera)' },
  { subject:'Storia Moderna', topic:'Riforma protestante', content:'Quale fu la principale fonte di autorità religiosa per i riformatori protestanti?', options:['La Sacra Scrittura (Sola Scriptura)','Il papa','La tradizione della Chiesa','I Concili ecumenici'], correct_answer:'La Sacra Scrittura (Sola Scriptura)' },

  // ─────────────────────────────────────────────
  // STORIA MODERNA — Scoperte geografiche
  // ─────────────────────────────────────────────
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Cristoforo Colombo raggiunse le Americhe nel:',  options:['1492','1498','1519','1487'], correct_answer:'1492' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Vasco da Gama aprì la rotta marittima verso l\'India circumnavigando:',  options:['L\'Africa (Capo di Buona Speranza)','Le Americhe','L\'Arabia','Il Pacifico'], correct_answer:'L\'Africa (Capo di Buona Speranza)' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'La prima circumnavigazione del globo fu completata dalla spedizione di:',  options:['Magellano-Elcano (1519–1522)','Colombo (1492)','Vasco da Gama (1498)','Drake (1580)'], correct_answer:'Magellano-Elcano (1519–1522)' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Il Trattato di Tordesillas (1494) divise il mondo tra:',  options:['Spagna e Portogallo','Francia e Inghilterra','Spagna e Francia','Portogallo e Inghilterra'], correct_answer:'Spagna e Portogallo' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Hernán Cortés conquistò l\'Impero Azteco nel:',  options:['1519–1521','1492–1493','1531–1533','1540–1542'], correct_answer:'1519–1521' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Francisco Pizarro conquistò l\'Impero Inca in:',  options:['Perù','Messico','Colombia','Cile'], correct_answer:'Perù' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Il termine "Amerigo Vespucci" è legato al nome del continente americano perché:',  options:['Capì per primo che le terre scoperte erano un nuovo continente','Fu il primo a raggiungere l\'America','Disegnò la prima mappa delle Americhe','Fondò la prima colonia permanente'], correct_answer:'Capì per primo che le terre scoperte erano un nuovo continente' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Lo "Scambio colombiano" indica:',  options:['Il trasferimento di piante, animali, malattie e culture tra Vecchio e Nuovo Mondo','Il commercio di schiavi tra Africa e America','Il commercio di spezie tra Europa e Asia','Lo scambio di ambasciatori tra Spagna e Portogallo'], correct_answer:'Il trasferimento di piante, animali, malattie e culture tra Vecchio e Nuovo Mondo' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Bartolomé de las Casas è noto per aver denunciato:',  options:['I maltrattamenti degli indigeni americani da parte degli spagnoli','La corruzione della Chiesa','La pirateria inglese','La tratta degli schiavi africani'], correct_answer:'I maltrattamenti degli indigeni americani da parte degli spagnoli' },
  { subject:'Storia Moderna', topic:'Scoperte geografiche', content:'Quale nazione dominò il commercio delle spezie nel XVI secolo attraverso le rotte oceaniche?', options:['Portogallo','Spagna','Inghilterra','Olanda'], correct_answer:'Portogallo' },

  // ─────────────────────────────────────────────
  // STORIA MODERNA — Illuminismo
  // ─────────────────────────────────────────────
  { subject:'Storia Moderna', topic:'Illuminismo', content:'L\'Illuminismo fiorì principalmente nel:',  options:['XVIII secolo','XVI secolo','XVII secolo','XIX secolo'], correct_answer:'XVIII secolo' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'Il motto dell\'Illuminismo di Kant era:',  options:['"Abbi il coraggio di servirti della tua intelligenza" (Sapere aude!)','Cogito ergo sum','Vox populi vox Dei','E pur si muove'], correct_answer:'"Abbi il coraggio di servirti della tua intelligenza" (Sapere aude!)' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'L\'Encyclopédie fu diretta da:',  options:['Diderot e D\'Alembert','Voltaire e Rousseau','Montesquieu e Locke','Newton e Leibniz'], correct_answer:'Diderot e D\'Alembert' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'Montesquieu nella sua opera "Lo spirito delle leggi" teorizzò:',  options:['La separazione dei poteri','Il contratto sociale','Il diritto divino dei re','L\'empirismo scientifico'], correct_answer:'La separazione dei poteri' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'John Locke sostenne che il potere politico deriva da:',  options:['Il consenso dei governati (contratto sociale)','Dio (diritto divino)','La forza militare','La tradizione ereditaria'], correct_answer:'Il consenso dei governati (contratto sociale)' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'Voltaire è noto per la sua battaglia in difesa di:',  options:['La libertà di pensiero e contro il fanatismo religioso','Il diritto di monarchia assoluta','L\'educazione gesuitica','Il colonialismo francese'], correct_answer:'La libertà di pensiero e contro il fanatismo religioso' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'Isaac Newton formulò la legge di gravitazione universale nel:',  options:['1687 (Principia Mathematica)','1543','1776','1789'], correct_answer:'1687 (Principia Mathematica)' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'Rousseau sosteneva che l\'uomo è naturalmente:',  options:['Buono, ma corrotto dalla società','Malvagio per natura','Né buono né cattivo','Schiavo delle passioni'], correct_answer:'Buono, ma corrotto dalla società' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'Il "dispotismo illuminato" fu praticato da sovrani come Federico II di Prussia e:',  options:['Caterina II di Russia','Luigi XIV di Francia','Carlo I d\'Inghilterra','Filippo II di Spagna'], correct_answer:'Caterina II di Russia' },
  { subject:'Storia Moderna', topic:'Illuminismo', content:'La Dichiarazione di Indipendenza americana (1776) fu ispirata dai principi illuministi di:',  options:['Locke, Rousseau e Montesquieu','Machiavelli e Hobbes','Aristotele e Platone','Lutero e Calvino'], correct_answer:'Locke, Rousseau e Montesquieu' },

  // ─────────────────────────────────────────────
  // STORIA MODERNA — Rivoluzione francese
  // ─────────────────────────────────────────────
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'La Rivoluzione Francese iniziò nel:',  options:['1789','1776','1799','1815'], correct_answer:'1789' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'La presa della Bastiglia avvenne il:',  options:['14 luglio 1789','4 agosto 1789','26 agosto 1789','21 gennaio 1793'], correct_answer:'14 luglio 1789' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'La Dichiarazione dei Diritti dell\'Uomo e del Cittadino fu adottata nel:',  options:['Agosto 1789','Luglio 1789','Settembre 1791','Gennaio 1793'], correct_answer:'Agosto 1789' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'Luigi XVI fu giustiziato nel:',  options:['21 gennaio 1793','14 luglio 1789','9 novembre 1799','18 giugno 1815'], correct_answer:'21 gennaio 1793' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'Il "Terrore" (1793–1794) fu guidato principalmente da:',  options:['Robespierre e il Comitato di Salute Pubblica','Napoleone Bonaparte','Luigi XVI','La Gironda'], correct_answer:'Robespierre e il Comitato di Salute Pubblica' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'Il motto della Rivoluzione Francese era:',  options:['Liberté, Égalité, Fraternité','Roi, Dieu, Patrie','Travail, Famille, Patrie','Paix, Justice, Vertu'], correct_answer:'Liberté, Égalité, Fraternité' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'Napoleone Bonaparte prese il potere con il colpo di stato del 18 Brumaio nel:',  options:['1799','1789','1804','1815'], correct_answer:'1799' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'La Rivoluzione Francese abolì:',  options:['Il sistema feudale e i privilegi della nobiltà','La monarchia per sempre','Il cattolicesimo in Francia','Il Parlamento'], correct_answer:'Il sistema feudale e i privilegi della nobiltà' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'La "Notte del 4 agosto 1789" è nota per:',  options:['L\'abolizione dei privilegi feudali da parte dell\'Assemblea Nazionale','La presa della Bastiglia','L\'esecuzione di Robespierre','L\'incoronazione di Napoleone'], correct_answer:'L\'abolizione dei privilegi feudali da parte dell\'Assemblea Nazionale' },
  { subject:'Storia Moderna', topic:'Rivoluzione francese', content:'Il Congresso di Vienna (1814–1815) fu convocato per:',  options:['Ridisegnare la carta d\'Europa dopo Napoleone','Giudicare i responsabili della Rivoluzione','Fondare la Società delle Nazioni','Spartire le colonie africane'], correct_answer:'Ridisegnare la carta d\'Europa dopo Napoleone' },

  // ─────────────────────────────────────────────
  // STORIA CONTEMPORANEA — Prima Guerra Mondiale
  // ─────────────────────────────────────────────
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'La Prima Guerra Mondiale iniziò nel:',  options:['1914','1918','1939','1900'], correct_answer:'1914' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'L\'assassinio di Sarajevo (28 giugno 1914) riguardò:',  options:['Francesco Ferdinando d\'Austria','Il Kaiser Guglielmo II','Il re Vittorio Emanuele III','Lo zar Nicola II'], correct_answer:'Francesco Ferdinando d\'Austria' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'L\'Italia entrò in guerra nel 1915 a fianco di:',  options:['Francia, Gran Bretagna e Russia (Intesa)','Germania e Austria-Ungheria (Triplice Alleanza)','Russia da sola','Gli Stati Uniti'], correct_answer:'Francia, Gran Bretagna e Russia (Intesa)' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'La guerra di trincea fu caratteristica del fronte:',  options:['Occidentale (Francia–Belgio)','Orientale (Russia)','Italiano (Isonzo)','Navale (Atlantico)'], correct_answer:'Occidentale (Francia–Belgio)' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'Gli Stati Uniti entrarono in guerra nel:',  options:['1917','1914','1916','1918'], correct_answer:'1917' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'Il Trattato di Versailles (1919) impose pesanti condizioni a:',  options:['Germania','Austria-Ungheria','Impero Ottomano','Bulgaria'], correct_answer:'Germania' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'La clausola della "colpa di guerra" (art. 231 del Trattato di Versailles) attribuì la responsabilità del conflitto a:',  options:['Germania e suoi alleati','L\'Austria-Ungheria da sola','La Russia','L\'Impero Ottomano'], correct_answer:'Germania e suoi alleati' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'La Rivoluzione russa del 1917 portò all\'uscita della Russia dalla guerra e alla presa del potere dei:',  options:['Bolscevichi (Lenin)','Menshevichi','Monarchici (zar)','Socialisti moderati'], correct_answer:'Bolscevichi (Lenin)' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'La Prima Guerra Mondiale si concluse l\'11 novembre:',  options:['1918','1919','1917','1920'], correct_answer:'1918' },
  { subject:'Storia Contemporanea', topic:'Prima Guerra Mondiale', content:'Il genocidio degli Armeni fu perpetrato durante la Prima Guerra Mondiale dall\':',  options:['Impero Ottomano','Austria-Ungheria','Germania','Bulgaria'], correct_answer:'Impero Ottomano' },

  // ─────────────────────────────────────────────
  // STORIA CONTEMPORANEA — Seconda Guerra Mondiale
  // ─────────────────────────────────────────────
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'La Seconda Guerra Mondiale iniziò ufficialmente il:',  options:['1 settembre 1939','10 giugno 1940','7 dicembre 1941','8 maggio 1945'], correct_answer:'1 settembre 1939' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'La Germania invase quale paese per prima nella Seconda Guerra Mondiale?', options:['Polonia','Francia','Unione Sovietica','Danimarca'], correct_answer:'Polonia' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'L\'Operazione Barbarossa (1941) fu l\'invasione tedesca di:',  options:['Unione Sovietica','Gran Bretagna','Nord Africa','Grecia'], correct_answer:'Unione Sovietica' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'L\'attacco giapponese a Pearl Harbor avvenne il:',  options:['7 dicembre 1941','6 giugno 1944','8 maggio 1945','1 settembre 1939'], correct_answer:'7 dicembre 1941' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'Lo sbarco in Normandia (D-Day) avvenne il:',  options:['6 giugno 1944','8 maggio 1945','19 agosto 1942','10 luglio 1943'], correct_answer:'6 giugno 1944' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'La Shoah (Olocausto) fu il genocidio di circa 6 milioni di:',  options:['Ebrei europei','Prigionieri di guerra sovietici','Civili polacchi','Rom e Sinti'], correct_answer:'Ebrei europei' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'Le bombe atomiche furono sganciate su Hiroshima e Nagasaki nel:',  options:['Agosto 1945','Maggio 1945','Giugno 1944','Settembre 1943'], correct_answer:'Agosto 1945' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'La resa della Germania nazista avvenne il:',  options:['8 maggio 1945','2 settembre 1945','30 aprile 1945','6 giugno 1944'], correct_answer:'8 maggio 1945' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'Il processo di Norimberga (1945–1946) giudicò i:',  options:['Criminali di guerra nazisti','Collaborazionisti francesi','Generali giapponesi','Fascisti italiani'], correct_answer:'Criminali di guerra nazisti' },
  { subject:'Storia Contemporanea', topic:'Seconda Guerra Mondiale', content:'L\'Italia firmò l\'armistizio con gli Alleati l\'8 settembre:',  options:['1943','1944','1945','1942'], correct_answer:'1943' },

  // ─────────────────────────────────────────────
  // STORIA CONTEMPORANEA — Guerra Fredda
  // ─────────────────────────────────────────────
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'La Guerra Fredda fu il conflitto ideologico tra:',  options:['USA (capitalismo) e URSS (comunismo)','USA e Cina','NATO e Giappone','Europa e Russia'], correct_answer:'USA (capitalismo) e URSS (comunismo)' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'Il Piano Marshall (1947) era un programma americano per:',  options:['Ricostruire economicamente l\'Europa occidentale','Riarmare la NATO','Colonizzare l\'Africa','Finanziare la guerra di Corea'], correct_answer:'Ricostruire economicamente l\'Europa occidentale' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'La crisi dei missili di Cuba avvenne nel:',  options:['1962','1950','1968','1979'], correct_answer:'1962' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'Il Muro di Berlino fu costruito nel:',  options:['1961','1945','1949','1989'], correct_answer:'1961' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'Il Muro di Berlino cadde nel:',  options:['1989','1991','1979','1985'], correct_answer:'1989' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'La NATO fu fondata nel:',  options:['1949','1945','1955','1962'], correct_answer:'1949' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'Il Patto di Varsavia era l\'alleanza militare guidata da:',  options:['URSS','USA','Cina','Germania Est'], correct_answer:'URSS' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'La "Dottrina Truman" (1947) prometteva sostegno americano a:',  options:['Nazioni minacciate dal comunismo','Paesi in via di sviluppo','La Cina nazionalista','La Corea del Sud'], correct_answer:'Nazioni minacciate dal comunismo' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'Lo Sputnik (1957) fu il primo satellite artificiale lanciato da:',  options:['URSS','USA','Francia','Cina'], correct_answer:'URSS' },
  { subject:'Storia Contemporanea', topic:'Guerra Fredda', content:'L\'URSS si dissolse ufficialmente nel:',  options:['1991','1989','1985','1979'], correct_answer:'1991' },

  // ─────────────────────────────────────────────
  // STORIA CONTEMPORANEA — Decolonizzazione
  // ─────────────────────────────────────────────
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'La decolonizzazione fu principalmente un processo del:',  options:['Dopoguerra (1945–1975)','Fine Ottocento (1880–1900)','Primo Novecento (1900–1920)','Fine Novecento (1980–2000)'], correct_answer:'Dopoguerra (1945–1975)' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'L\'India ottenne l\'indipendenza dalla Gran Bretagna nel:',  options:['1947','1945','1960','1919'], correct_answer:'1947' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'Gandhi guidò il movimento indiano per l\'indipendenza attraverso:',  options:['La resistenza non violenta (Satyagraha)','La guerriglia armata','La diplomazia con il parlamento britannico','Alleanze militari internazionali'], correct_answer:'La resistenza non violenta (Satyagraha)' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'L\'"Anno dell\'Africa" (1960) vide l\'indipendenza di quanti paesi africani?', options:['17','5','30','50'], correct_answer:'17' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'La guerra d\'Algeria (1954–1962) oppose:',  options:['Algeria e Francia','Algeria e Inghilterra','Marocco e Spagna','Libia e Italia'], correct_answer:'Algeria e Francia' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'Nelson Mandela combatté contro il regime di apartheid in:',  options:['Sudafrica','Zimbabwe','Kenya','Nigeria'], correct_answer:'Sudafrica' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'La Conferenza di Bandung (1955) riunì paesi afro-asiatici per promuovere:',  options:['Il non allineamento ai blocchi USA e URSS','Una nuova alleanza militare','La redistribuzione delle colonie','L\'unificazione africana'], correct_answer:'Il non allineamento ai blocchi USA e URSS' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'Il Vietnam del Nord ottenne l\'indipendenza dalla Francia nel:',  options:['1954 (accordi di Ginevra)','1945','1960','1975'], correct_answer:'1954 (accordi di Ginevra)' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'Il concetto di "Terzo Mondo" nacque per indicare:',  options:['I paesi non allineati con USA né URSS','I paesi più poveri del pianeta','I paesi africani','Le colonie asiatiche'], correct_answer:'I paesi non allineati con USA né URSS' },
  { subject:'Storia Contemporanea', topic:'Decolonizzazione', content:'La Palestina e Israele: lo Stato di Israele fu proclamato nel:',  options:['1948','1945','1956','1967'], correct_answer:'1948' },

  // ─────────────────────────────────────────────
  // STORIA CONTEMPORANEA — Italia repubblicana
  // ─────────────────────────────────────────────
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Il referendum istituzionale (Repubblica vs Monarchia) si tenne il:',  options:['2 giugno 1946','25 aprile 1945','1 gennaio 1948','7 aprile 1948'], correct_answer:'2 giugno 1946' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'La Costituzione italiana entrò in vigore il:',  options:['1 gennaio 1948','2 giugno 1946','18 aprile 1948','25 aprile 1945'], correct_answer:'1 gennaio 1948' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Il "Miracolo economico" italiano avvenne principalmente negli anni:',  options:['1950–1963','1945–1950','1970–1980','1980–1990'], correct_answer:'1950–1963' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Alcide De Gasperi fu il principale leader della:',  options:['Democrazia Cristiana','Partito Comunista Italiano','Partito Socialista Italiano','Partito Liberal Italiano'], correct_answer:'Democrazia Cristiana' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Gli "Anni di piombo" in Italia (anni \'70) furono caratterizzati da:',  options:['Terrorismo politico di destra e di sinistra','Il boom economico','L\'adesione alla NATO','La decolonizzazione africana'], correct_answer:'Terrorismo politico di destra e di sinistra' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Aldo Moro fu rapito e ucciso dalle Brigate Rosse nel:',  options:['1978','1970','1980','1968'], correct_answer:'1978' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Tangentopoli fu lo scandalo di corruzione politica scoperto a Milano nel:',  options:['1992','1980','2000','1985'], correct_answer:'1992' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'L\'Italia aderì alla Comunità Economica Europea (CEE) fin dalla sua fondazione nel:',  options:['1957 (Trattati di Roma)','1945','1949','1973'], correct_answer:'1957 (Trattati di Roma)' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Il "68" italiano fu caratterizzato da:',  options:['Movimenti studenteschi e operai di contestazione','La caduta del governo fascista','L\'assassinio di Aldo Moro','L\'ingresso in NATO'], correct_answer:'Movimenti studenteschi e operai di contestazione' },
  { subject:'Storia Contemporanea', topic:'Italia repubblicana', content:'Giovanni Falcone e Paolo Borsellino furono magistrati uccisi dalla mafia nel:',  options:['1992','1982','2000','1978'], correct_answer:'1992' },
];

async function getAdminToken() {
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'whatnico007@gmail.com', password: 'Pocketbasemerda1' }),
  });
  const data = await res.json();
  return data.token;
}

async function createQuestion(token, q) {
  const res = await fetch(`${PB_URL}/api/collections/Question/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      subject: q.subject,
      topic: q.topic,
      content: q.content,
      options: q.options,
      correct_answer: q.correct_answer,
      bloom_level: '',
      owner: OWNER,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create question "${q.content.slice(0,40)}...": ${err}`);
  }
  return res.json();
}

async function main() {
  console.log('Authenticating...');
  const token = await getAdminToken();
  console.log(`Creating ${QUESTIONS.length} questions for Barbero...`);

  let ok = 0, fail = 0;
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    try {
      await createQuestion(token, q);
      ok++;
      if (ok % 10 === 0) process.stdout.write(`\r  ${ok}/${QUESTIONS.length} created...`);
    } catch (e) {
      fail++;
      console.error(`\nERROR [${i}]:`, e.message);
    }
  }
  console.log(`\nDone. Created: ${ok}, Failed: ${fail}`);
}

main().catch(console.error);
