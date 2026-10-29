# Vedøy Growth – fremgang for bedrifter og organisasjoner

Brukeren har bedt om bygging nå. Denne beskrivelsen samler beslutningene fra samtalen, ikke en ny godkjenningsrunde.

## Formål og første leveranse

En norsk, tilgjengelig nettside som gjør nyttig kunnskap om virksomhetsutvikling enklere å bruke. Målgruppen omfatter enkeltpersonforetak, små og store bedrifter, foreninger og ideelle organisasjoner. Fremgang omfatter økonomi, mennesker og ressursbruk. Produktet presenteres som praktisk læring og arbeidsverktøy, uten KI-chat, inntektsløfter eller oppdiktede kundeeksempler.

Klargjort for offentlig lansering: forside, kunnskapsbibliotek med seks konkrete leksjoner og personvern. Registrering/innlogging og kontoside med egne varselsvalg er implementert, men viser «åpner snart» frem til backend er godkjent og satt opp. Arbeidsflaten og eksisterende integrasjoner er serverlåst med tydelig «Under utvikling». Konto gir ikke tilgang til arbeidsverktøy før det åpnes.

## Beslutninger og avgrensning

- Viderefør eksisterende `leandervedoy/vedoy-growth`, isolert branch `feat/fair-progress-launch`; ikke ombygg Studio eller Developer Portal.
- Behold produktnavnet Vedøy Growth. «Vedøy Kunnskapsassistent» behandles som pedagogisk veiledning, ikke generativ KI eller ny separat app.
- Bygg kunnskapsinnhold som serverrenderede artikler med ett tiltak og én refleksjon per emne.
- Separate, frivillige og som standard tomme avkrysninger for lanseringsoppdateringer via e-post og SMS. Meldinger tolkes som SMS. Aktiv varselprofil har bare telefon når SMS er valgt; tidligere samtykkehistorikk og registreringsmetadata beholdes frem til sletting av kontoen.
- Supabase Auth håndterer passord og bekreftelse. Klienten får ingen service role-nøkkel. Innlogging bruker HttpOnly-cookies. Et samtykke er ikke bevis på at kontaktkanalen er verifisert.
- DB-generert, versjonert samtykkehistorikk og RLS som begrenser hver bruker til egen profil. Varsler sendes ikke i denne leveransen; utsending krever verifiserte mottakere og konfigurert avsenderleverandør.
- Konto kan opprettes uten noen varsler. Preferanser kan trekkes tilbake på kontosiden. Ingen betaling eller abonnement inngås ved registrering.
- Launch gate er stengt som standard. Bare eksplisitt `GROWTH_WORKSPACE_OPEN=true` kan åpne senere. API-er, direkte URL-er og server actions må alle respektere låsen.
- Next.js oppdateres til verifisert sikkerhetsversjon 15.5.28. Bruk eksisterende React 18 og npm-lockfil.

## Vurderte alternativer

1. Gjenbruk Growth: valgt, fordi innlogging, roller og virksomhetsmodell finnes. Ny offentlig overflate isoleres fra eldre arbeidsverktøy.
2. Legg dette i Studio: unødvendig blanding av markedsføring/hosting og ny arbeidsflate.
3. Ny separat app: mer vedlikehold og duplisert kode.

## Backend og kostnadsgrense

Den eksisterende, delte Supabase-backenden brukes også av andre funksjoner. For å holde nye registreringer uavhengige av eldre data og tilganger klargjøres en portabel migrasjon for en isolert backend. Endringen åpner ikke registrering mot det delte prosjektet og endrer ikke eldre tabeller.

Supabase har oppgitt USD 10 per måned for et nytt prosjekt i organisasjonen Vedoy. Denne kostnaden er ikke godkjent. Ingen prosjektopprettelse, kostnadsbekreftelse, dataflytting eller endring av eldre tabeller gjennomføres før dette er avklart. Nettsiden og all kode ferdigstilles; kontoregistrering feiler tydelig og trygt når backend mangler.

## Akseptanse

- Offentlige sider fungerer på mobil og med tastatur, med lesbar kontrast og fungerende lenker.
- Registrering validerer navn, organisasjonstype, e-post, passord og to uavhengige varselsvalg. SMS krever internasjonalt telefonnummer. Ingen forhåndsvalgte samtykker.
- Manglende backend eller leverandørfeil vises som feil, aldri som bekreftet registrering.
- Bruker A kan ikke lese eller endre B sin profil, og kan ikke endre auditloggen. SQL-test er transaksjonell.
- Arbeidsflaten er blokkert også med innlogget sesjon, direkte API-kall og server actions.
- Produksjonsbygg, fokuserte tester og en uavhengig gjennomgang gjennomføres før GitHub-/Vercel-levering.

## Better Plans / Sales-notat

Prioritet: 1 faktisk nyttig læring; 2 ærlig lanseringsstatus; 3 frivillige varsler og dataminimering; 4 trygg konto; 5 videre skalerbar arbeidsflate. Begrensninger: eksisterende kode, ingen godkjent ny databasekostnad, ingen konfigurert SMS-avsender dokumentert. Viktigste fallgruver er feilaktige suksessmeldinger, tilgang på tvers av brukere og tvungent samtykke; de testes konkret.

Første kundereise: les én leksjon → prøv ett tiltak → registrer konto om ønskelig → velg eventuelle lanseringsvarsler. Konverteringsmål eller inntekter er ikke dokumentert. Et senere avgrenset pilotløp bør måle forståelse, nytte og tid brukt sammen med faktiske bedrifter og foreninger.
