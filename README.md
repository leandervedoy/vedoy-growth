# Vedøy Growth · Kunnskapsassistenten

Praktisk kunnskap for bedrifter og organisasjoner som vil skape fremgang med hensyn til økonomi, mennesker og miljø.

## Denne versjonen

- Åpen forside og seks leksjoner med konkrete tiltak, eksempler og refleksjon.
- Arbeidsflaten er stengt på serveren mens den utvikles. Gamle API-er og server actions er også sperret.
- Registrering, innlogging og kontoside er implementert for en separat Supabase-database.
- E-post og SMS velges uavhengig og er av som standard. Ingen utsendelser er aktivert.
- Uten databaseoppsett viser skjemaene «åpner snart». De sender eller lagrer ingen registrering.

Vedøy Kunnskapsassistent er i denne versjonen en veiviser med redaksjonelle leksjoner. Den gir ikke genererte KI-svar eller løfter om garantert suksess.

## Se demoen

Åpne [demo/vedoy-growth-demo.html](demo/vedoy-growth-demo.html) i nettleseren. Filen inneholder læringssidene og deaktiverte kontoforhåndsvisninger; den samler ikke inn opplysninger.

## Lokal oppstart

Bruk Node.js 22 eller 24 og npm. Prosjektet bruker `package-lock.json`.

```sh
npm ci
npm run dev
```

Åpne http://localhost:3000. Ingen leverandørnøkler er nødvendige for læringssidene.

## Kontroll før publisering

```sh
npm test
npm run typecheck
npm run build
```

SQL- og HTTP-testene, aktivering av kontoer og leverandøroppsett er beskrevet i [lanseringsnotatet](docs/launch-readiness.md). Testene bruker syntetiske data; en ekte Auth-kontroll må gjentas etter at den separate databasen og e-postleveringen er konfigurert.

## Aktivering

Den offentlige siden kan publiseres nå med arbeidsflaten lukket og registrering deaktivert. Den separate Supabase-databasen har et oppgitt pristillegg på **10 USD per måned**, som krever eierens godkjenning før opprettelse. SMTP og avsender må deretter avklares. Ikke gjenbruk den eksisterende delte databasen eller kjør gamle migrasjoner i den nye.

Følg [docs/launch-readiness.md](docs/launch-readiness.md). `GROWTH_WORKSPACE_OPEN` skal fortsatt være `false`; aktivering av kontoer åpner ikke arbeidsflaten.

## Tidligere arbeidsflate

Den eldre koden er bevart bak sperren. Eldre tekniske notater finnes i [docs/legacy-workspace.md](docs/legacy-workspace.md) og gjelder ikke den offentlige lanseringen.
