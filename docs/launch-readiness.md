# Aktivering og drift av lanseringssiden

## Status – 29. oktober 2026

Siden er klargjort for publisering med kontoregistrering deaktivert til en isolert Supabase-backend og egen SMTP er klare. Et nytt prosjekt i organisasjonen **Vedoy** har bekreftet tilleggskostnad **10 USD per måned**. Kjøpet er ikke godkjent, prosjektet er ikke opprettet, og migrasjonen er ikke kjørt eksternt. Læringssidene fungerer uten backend.

Vercel-koblingen avviste opprettelse av `vedoy-growth` i Vedoy-teamet med HTTP 403 («mangler tillatelse»). CLI-fallbacken hadde ingen innlogging. Ingen Vercel-app er opprettet eller publisert av denne leveransen. En konto med rettighet til å opprette prosjekter må brukes før publisering; eksisterende Studio og Portal skal ikke overstyres.

## Aktivering etter godkjenning

1. Opprett et separat Supabase-prosjekt i Vedoy etter kostnadsgodkjenning. Ikke koble registreringen til den eksisterende, delte Vedoy-databasen.
2. Kjør **bare** `supabase/migrations/20261029010545_growth_launch_registration.sql` i den ferske Supabase-databasen. Filen er selvstendig og oppretter lanseringsprofiler, samtykkehistorikk, tilgangsregler og registreringstrigger. Ikke kjør hele repoets migrasjonshistorikk: eldre migrasjoner forutsetter tabeller fra arbeidsområdet.
3. Aktiver e-postbekreftelse og sett opp egen SMTP med bekreftet avsender. Supabases standardutsending er ikke tilstrekkelig for offentlig registrering. Kontroller at bekreftelsesmalen bruker Supabases bekreftelseslenke, og test leveransen før åpning.
4. Sett Auth **Site URL** til det endelige HTTPS-domenet, for eksempel `https://<publisert-domene>`. Legg nøyaktig `https://<publisert-domene>/auth/callback` i **Redirect URLs**. Registreringsendepunktet bygger denne callbackadressen fra forespørselens origin. Tillat bare konkrete miljøer som skal brukes; eventuell lokal test trenger `http://localhost:3000/auth/callback`. Callbacken fjerner URL-parametere og ber brukeren logge inn med e-post og passord; den oppretter ikke en økt fra tokens i URL-en.
5. Sett miljøvariablene nedenfor i riktig Vercel-miljø og deploy på nytt. Verifiser først i et kontrollert testmiljø. Åpne offentlig registrering først etter bestått auth-test.

| Miljøvariabel | Verdi og bruk |
| --- | --- |
| `GROWTH_SUPABASE_URL` | Prosjekt-URL for det nye, isolerte prosjektet: `https://<prosjektref>.supabase.co`. Leses bare på serveren. |
| `GROWTH_SUPABASE_PUBLISHABLE_KEY` | Publishable key fra samme prosjekt. Leses bare på serveren; bruk aldri service-role/secret key her. |
| `GROWTH_WORKSPACE_OPEN` | Skal være utelatt eller `false`. Kun den eksakte verdien `true` åpner arbeidsområdet. Skal aldri endres som bivirkning av å aktivere kontoer. |

Ikke gi de nye backendvariablene `NEXT_PUBLIC_`-prefiks, og ikke bruk de eldre Supabase-variablene som erstatning. Uten begge gyldige Growth-variabler er kontoflyten stengt med en «åpner snart»-melding. Det er den planlagte produksjonskonfigurasjonen frem til aktivering. Ved behov kan registreringen stenges igjen ved å fjerne Growth-backendkonfigurasjonen og deploye på nytt; dette påvirker også innlogging og kontosiden.

## Konto og samtykke

En registrering lagrer profil og valg før e-postbekreftelse, uten å opprette et arbeidsområde. E-post og SMS er uavhengige, valgfrie valg med standardverdi `false`. Gjeldende profil har bare telefonnummer når SMS er valgt; tidligere samtykkehendelser beholder sin historiske verdi. Endringer får serverstyrt tidsstempel og samtykkeversjon `2026-10-29-v1`; eieren kan lese egen profil og historikk, men ikke skrive direkte i historikken.

SMS-valget starter **ingen SMS-utsending**, og telefonnummeret er **ikke verifisert**. E-postbekreftelse gjelder kontoen og hentes fra Auth. Det finnes ingen automatisk markedsføringsutsending i denne implementasjonen. Et senere utsendingssystem må kontrollere gjeldende samtykke og nødvendig kanalverifisering før det sender.

## Verifisering

Produksjonsbygget med Next.js 15.5.28, TypeScript-kontrollen, 19 validerings-/gatetester og 21 HTTP-scenarier mot en isolert lokal Supabase-stub er bestått. HTTP-testen kjører ekte Next.js-handlere og middleware uten eksterne forbindelser:

```bash
npm test
npm run typecheck
npm run build
node tests/progress/http.integration.mjs
```

Den dekker registrering, feiltilstander, origin-sjekker, HttpOnly-cookies, sesjonsrotasjon, eierskap ved profilendring og sperring av gamle ruter. Den erstatter ikke kontroll mot en konfigurert Supabase-tjeneste.

SQL-testen er kjørt og bestått lokalt med midlertidig PGlite 0.5.13. Kjør fra repoets rot; denne eksakte kommandoen er verifisert:

```bash
GROWTH_TEST_PGLITE_MODULE=/tmp/vedoy-growth-dbtest/node_modules/@electric-sql/pglite/dist/index.js node tests/sql/run-launch-tests.mjs
```

Resultat:

```text
PASS: launch migration; signup defaults/validation; independent consent; owner RLS; immutable audit; erasure; rollback.
```

Hvis den midlertidige installasjonen er borte, kan den gjenopprettes uten å endre prosjektets avhengigheter:

```bash
npm install --prefix /tmp/vedoy-growth-dbtest --cache /tmp/vedoy-growth-pglite-cache --no-save --ignore-scripts @electric-sql/pglite@0.5.13
```

Testen bruker en lokal Postgres-motor med minimale Auth-tabeller og testroller. Den verifiserer migrasjonen, faktiske RLS-regler, validering, samtykkehistorikk og sletting. Den tester ikke Supabase Auth-tjenesten, PostgREST, SMTP eller nettleserens komplette kontoflyt.

**Ny ende-til-ende-test av Auth er obligatorisk etter backendaktivering og før offentlig registrering åpnes:** registrering med begge valg av; uavhengig e-post/SMS-valg; bekreftelsesmail og callback; innlogging, sesjonsfornyelse og utlogging; bevarte og tilbakekalte valg; avvisning av tilgang til en annen testbrukers profil. Bruk kontrollerte testadresser. Kontroller samtidig at arbeidsområdet fortsatt er låst, private API-er avviser tilgang, og ingen markedsføringsmelding eller SMS sendes.

## Demo og visuell kontroll

`demo/vedoy-growth-demo.html` er et selvstendig, nedlastbart speil av de ferdigbygde sidene, inkludert seks leksjoner og deaktiverte kontoskjermer. Den inneholder ingen konto- eller utsendingsfunksjon, bruker ingen eksterne ressurser og lagrer ingen skjemadata. Åpne filen i en vanlig nettleser.

Forside, læringsnavigasjon, en full leksjon og mobilvisning ved 390 px er kontrollert i nettleseren. Mobilkontrollen omfattet også registreringsskjemaet med tomme, deaktiverte varselsvalg. Dette gjelder det statiske speilet; en komplett nettlesertest av hosted Auth og callback gjenstår etter aktivering.
