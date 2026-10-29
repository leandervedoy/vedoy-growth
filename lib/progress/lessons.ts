export type LessonTheme = "direction" | "economy" | "people" | "environment" | "cooperation" | "learning";

export type ProgressLesson = {
  slug: string;
  theme: LessonTheme;
  category: string;
  title: string;
  summary: string;
  introduction: string;
  actionTitle: string;
  actionIntro: string;
  steps: { title: string; body: string }[];
  exampleTitle: string;
  example: string;
  followUp: string;
  reflection: string;
  takeaway: string;
};

export const lessons: ProgressLesson[] = [
  {
    slug: "finn-det-viktigste-forst",
    theme: "direction",
    category: "Retning",
    title: "Finn det viktigste først",
    summary: "Gjør en lang ønskeliste om til ett problem dere kan begynne å løse.",
    introduction: "Du trenger ikke forbedre alt samtidig. Begynn med noe som skaper trøbbel i hverdagen: en kunde som ikke finner svar, en oppgave som stadig må gjøres om, eller en frivillig som ikke vet hvor de skal møte. Beskriv det som skjer før du bestemmer deg for en løsning.",
    actionTitle: "Velg én floke fra hverdagen",
    actionIntro: "Ta frem et ark eller et tomt notat. Bruk en konkret hendelse fra den siste tiden som utgangspunkt.",
    steps: [
      { title: "Skriv hva som faktisk skjer", body: "Bytt «vi trenger en bedre nettside» med en observasjon, som «folk spør hvor de melder seg på». Da blir det lettere å se hva som må endres." },
      { title: "Hør med den det gjelder", body: "Spør en kunde, kollega eller deltaker: Hva prøvde du å gjøre? Hvor stoppet det? Lytt før du forklarer hvordan løsningen var ment å virke." },
      { title: "Velg det minste nyttige forsøket", body: "Skriv én endring dere kan prøve med tiden og ressursene dere allerede har. Avtal hvem som gjør den, og når dere skal se på resultatet." },
    ],
    exampleTitle: "En enklere påmelding",
    example: "En forening kan oppdage at påmeldingslenken forsvinner i lange innlegg. Før de skaffer et nytt system, kan de prøve én fast lenke med tid, sted og kontaktperson. Målet er at folk finner frem uten å måtte spørre.",
    followUp: "Se etter om det samme problemet oppstår igjen. Færre gjentatte spørsmål kan være et nyttig tegn, men spør også om informasjonen faktisk ble lettere å forstå.",
    reflection: "Hvem får en litt enklere hverdag hvis vi løser akkurat dette?",
    takeaway: "Skriv forsøket som én setning: «Vi vil gjøre … enklere for … ved å prøve …».",
  },
  {
    slug: "se-hva-som-blir-igjen",
    theme: "economy",
    category: "Økonomi",
    title: "Se hva som blir igjen",
    summary: "Forstå hva én vare, tjeneste eller aktivitet krever av penger og tid.",
    introduction: "Mye aktivitet er ikke det samme som god økonomi. Velg én liten del av virksomheten og se på hva dere får inn, hva den koster, og hvor mye arbeid som følger med. For en ideell organisasjon er spørsmålet også hvor godt ressursene støtter formålet.",
    actionTitle: "Lag en oversikt for én aktivitet",
    actionIntro: "Bruk beløp du kjenner. Skriv «ukjent» der opplysninger mangler, i stedet for å fylle inn et tilfeldig anslag.",
    steps: [
      { title: "Samle inntektene", body: "Noter det kunden betaler, deltakeravgiften eller støtten som hører til aktiviteten. Hold planlagte inntekter atskilt fra penger dere faktisk har mottatt." },
      { title: "Finn utgiftene og tiden", body: "Ta med varekostnad, materialer, frakt, betalingsgebyrer og andre direkte utgifter. Noter også tiden til forberedelser, levering og oppfølging, selv om den er ulønnet." },
      { title: "Se på det som står igjen", body: "Trekk direkte utgifter fra inntektene. Resten skal også bidra til faste kostnader og arbeid. Bruk samme grunnlag for beløpene, og ikke kall restbeløpet overskudd før alle relevante kostnader er med." },
    ],
    exampleTitle: "Et populært arrangement",
    example: "Et arrangement kan være fullt og samtidig kreve mye materiell, lokalleie og frivillig arbeid. En enkel oversikt kan vise om det er bedre å gjenbruke utstyr, endre opplegget eller planlegge færre arrangementer med bedre tid til hvert.",
    followUp: "Oppdater oversikten etter neste gjennomføring. Sammenlign det dere forventet med det som faktisk skjedde. Velg én kostnad eller arbeidsoppgave dere vil undersøke nærmere.",
    reflection: "Er det vi sitter igjen med rimelig, sett opp mot arbeidet og verdien vi skaper?",
    takeaway: "Velg én aktivitet og noter: inn, direkte ut, tid brukt og det du fortsatt ikke vet.",
  },
  {
    slug: "gjor-det-lettere-a-bli-med",
    theme: "people",
    category: "Mennesker",
    title: "Gjør det lettere å bli med",
    summary: "Finn én unødvendig hindring for kunder, medlemmer eller deltakere.",
    introduction: "Det som er opplagt for deg, kan være uklart for en som møter virksomheten for første gang. Test én vanlig vei inn: å bestille, spørre om hjelp, melde seg inn eller delta på en aktivitet. Målet er at flere skal forstå hva de kan gjøre og hva det krever.",
    actionTitle: "Prøv å være ny hos dere",
    actionIntro: "Velg én konkret oppgave og gå gjennom den på en mobil. Start der en ny person sannsynligvis starter.",
    steps: [
      { title: "Finn den nødvendige informasjonen", body: "Er det tydelig hva tilbudet er, hvem det passer for, hva det koster og hva neste steg er? For en aktivitet: sjekk også tid, sted og hvem man kan kontakte." },
      { title: "La noen andre prøve", body: "Be en person som ikke kjenner løsningen, vise hvordan de ville gått frem. Vent med å hjelpe. Noter hvor de blir usikre, uten å samle personopplysninger du ikke trenger." },
      { title: "Fjern én hindring", body: "Forklar et vanskelig ord, gjør lenketeksten tydeligere eller fjern et spørsmål som ikke er nødvendig. Be personen prøve igjen og fortelle om endringen hjalp." },
    ],
    exampleTitle: "Fra internspråk til et tydelig valg",
    example: "En knapp som heter «Send forespørsel til administrasjonen» kan erstattes med «Spør om plass». Ved siden av kan det stå hvem som svarer og hva de trenger å vite. Da slipper besøkende å forstå organiseringen deres før de tar kontakt.",
    followUp: "Se om nye personer finner frem med mindre hjelp. Bruker dere et skjema, prøv det også med tastatur og sjekk at alle feltene har forståelige navn.",
    reflection: "Hvem kan vi fortsatt gjøre det vanskelig for, selv om løsningen fungerer fint for oss?",
    takeaway: "Velg én vei inn til virksomheten og gjør det neste steget tydeligere.",
  },
  {
    slug: "bruk-det-dere-allerede-har",
    theme: "environment",
    category: "Ressurser og miljø",
    title: "Bruk det dere allerede har",
    summary: "Undersøk gjenbruk, reparasjon og deling før det neste innkjøpet.",
    introduction: "Begynn med en konkret ting dere vurderer å kjøpe. Kanskje behovet kan dekkes med noe som allerede finnes hos dere eller i nærmiljøet. Målet er å bruke ressursene bedre, uten å gjøre arbeidet vanskeligere eller flytte problemet over på andre.",
    actionTitle: "Ta en liten runde før dere kjøper",
    actionIntro: "Velg ett innkjøp. Beskriv behovet, ikke bare produktet dere hadde tenkt å bestille.",
    steps: [
      { title: "Se hva som finnes", body: "Sjekk lager, skap og utstyrslister. Spør om det dere har, kan brukes på en annen måte. Noter tilstand og om det faktisk er tilgjengelig når dere trenger det." },
      { title: "Vurder et alternativ", body: "Kan noe repareres, lånes, leies eller kjøpes brukt? Ta med tid, transport, vedlikehold og ansvar i vurderingen. Gjenbruk skal også fungere i praksis." },
      { title: "Velg og noter hvorfor", body: "Velg løsningen som dekker behovet på en forsvarlig måte. Skriv hva dere slapp å kjøpe eller kaste. Hvis dere kjøper nytt, noter hvordan det skal tas vare på og brukes videre." },
    ],
    exampleTitle: "Utstyr til neste samling",
    example: "En organisasjon som trenger skilt til et arrangement, kan først se om gamle skilt kan få nye innlegg. En liten bedrift kan undersøke om en skjerm som står ubrukt, dekker behovet for en ny arbeidsplass.",
    followUp: "Sjekk om løsningen holdt og var enkel å bruke. Noter konkrete innkjøp eller avfall dere unngikk. Ikke sett et tall på utslipp eller en bred miljøgevinst uten et egnet beregningsgrunnlag.",
    reflection: "Gjør dette at vi bruker mindre, eller bare at utgiften og arbeidet havner et annet sted?",
    takeaway: "Skriv spørsmålet «Har vi allerede det vi trenger?» øverst på neste innkjøpsliste.",
  },
  {
    slug: "fordel-ansvaret-tydelig",
    theme: "cooperation",
    category: "Samarbeid",
    title: "Fordel ansvaret tydelig",
    summary: "Gjør en gjentatt oppgave lettere å dele, overta og fullføre.",
    introduction: "En oppgave kan se liten ut og likevel bli liggende fordi ingen vet hvem som tar den. Den kan også havne hos den samme personen hver gang. Gjør forventningene synlige, enten dere er kolleger, frivillige eller én person som samarbeider med andre.",
    actionTitle: "Lag en enkel avtale om én oppgave",
    actionIntro: "Velg noe som gjentar seg, for eksempel svar på henvendelser, oppsett før en aktivitet eller oppfølging etter en bestilling.",
    steps: [
      { title: "Beskriv når oppgaven er ferdig", body: "Skriv hva som skal gjøres og hva som er godt nok. Ta med nødvendig informasjon og hvor den finnes, så oppgaven kan forstås av flere enn den som pleier å gjøre den." },
      { title: "Avtal hvem som gjør hva", body: "Spør hvem som har kapasitet og ønsker å ta ansvar. Avtal en realistisk frist og hvem som kan hjelpe. Frivillig innsats må bygge på et reelt ja." },
      { title: "Gjør det mulig å si fra", body: "Avtal hvordan man melder fra hvis oppgaven blir større eller ikke rekker å bli ferdig. Velg da sammen om omfanget, fristen eller ansvaret skal endres." },
    ],
    exampleTitle: "Når én person ikke kan stille",
    example: "En forening kan skrive en kort sjekkliste for å åpne lokalet. Den som tar vakten vet hvor nøkkelen er, hva som må settes frem og hvem som kan kontaktes. Oppgaven blir lettere å overta uten at noen må være tilgjengelige hele tiden.",
    followUp: "Etter neste gjennomføring: spør om avtalen var tydelig og arbeidsmengden rimelig. Endre sjekklisten ut fra erfaringene, og se om noen fortsatt får flere oppgaver enn avtalt.",
    reflection: "Er ansvaret fordelt gjennom tydelige avtaler, eller gjennom hvem som sjelden sier nei?",
    takeaway: "Skriv ned hva som skal gjøres, hvem som har sagt ja, og hvordan dere følger opp.",
  },
  {
    slug: "folg-fremgang-som-betyr-noe",
    theme: "learning",
    category: "Læring og fremgang",
    title: "Følg fremgang som betyr noe",
    summary: "Se hva et tiltak endrer for økonomien, menneskene og ressursbruken.",
    introduction: "Et tall kan se bedre ut uten at hverdagen gjør det. Flere bestillinger kan gi mer arbeid. Kortere åpningstid kan spare penger, men gjøre tilbudet vanskeligere å bruke. Når dere følger et lite tiltak, se derfor på både det dere ønsker å forbedre og det dere vil ta vare på.",
    actionTitle: "Avtal en kort sjekk av ett tiltak",
    actionIntro: "Ta utgangspunkt i noe dere faktisk prøver. Dere trenger et enkelt notat og et avtalt tidspunkt for å se på det igjen.",
    steps: [
      { title: "Skriv hva dere håper blir bedre", body: "Velg ett tydelig tegn, som kortere ventetid, færre feil eller lavere utgifter til materiell. Noter utgangspunktet hvis dere kjenner det. Skill observasjoner fra anslag." },
      { title: "Se etter virkninger rundt tiltaket", body: "Spør hva som skjer med penger og tid, hvem som får mer eller mindre arbeid, og om ressursbruken endres. En enkel samtale kan avdekke noe et tall ikke viser." },
      { title: "Bestem neste steg sammen", body: "På avtalt dato: se hva dere vet, hva som er usikkert og om noen opplevde ulemper. Velg om dere skal fortsette, justere eller stoppe. Å avslutte et tiltak kan også være et godt resultat." },
    ],
    exampleTitle: "En ny måte å svare på spørsmål",
    example: "Et felles svarark kan gjøre henvendelser raskere å håndtere. Følg også med på om svarene fortsatt passer den som spør, og om vedlikeholdet av arket blir en uventet ekstraoppgave for én person.",
    followUp: "Skriv en kort konklusjon med dato og grunnlag. Unngå å tolke én god uke som et sikkert mønster. Ta med det dere lærte når dere velger neste lille tiltak.",
    reflection: "Hva ble bedre, hvem fikk nytte av det, og hva kostet forbedringen?",
    takeaway: "Avtal når dere skal se tilbake på tiltaket, før dere starter et nytt.",
  },
];

export function getProgressLesson(slug: string): ProgressLesson | undefined {
  return lessons.find((lesson) => lesson.slug === slug);
}
