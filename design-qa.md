# Vedøy Booking og Kalender - design QA

- **Designreferanse:** `C:\Users\leand\AppData\Local\Temp\codex-clipboard-1b1a6212-a9cb-4ea4-b7a4-8a1ea945b2af.png`
- **Referansestørrelse:** 874 x 845 piksler. CSS-pikseltetthet er ikke oppgitt; 1x er antatt.
- **Målvisning:** 874 x 845 piksler.
- **Implementasjoner:** `/libraries/demo/booking`, `/libraries/demo/calendar` og `public/downloads/vedoy-booking-demo.html`.
- **Delt komponent:** `packages/vedoy-calender/src/react.tsx`.
- **Delt stilark:** `packages/vedoy-calender/src/styles.css`.

## Sammenligning

Begge demoene bruker nå referansens varme off-white flate, to-kolonneoppsett, avrundede paneler, kompakte filterknapper, 7-kolonne månedsgrid, mørk valgt dato og tydelige tidspunkt. Kalenderdemoens venstre panel inneholder konfliktkontrollen i stedet for tjenestelisten, fordi dette er bibliotekets funksjonelle testflate.

## Funn og rettelser

- Den nedlastbare Booking-demoen brukte fortsatt det gamle mørke designet; den er erstattet med samme lyse og responsive flate.
- Valgt dato manglet den markerte sirkelen fra referansen; dette er rettet.
- Datoknapper og tidspunkt manglet fullstendige tilgjengelighetstilstander; `aria-label` og `aria-pressed` er lagt til i React-komponenten.
- Booking-demoens `I dag`-dato kunne følge valgt dato; startdatoen er nå stabilt satt til 22. august 2026 i demoen.

## Verifisering

- `packages/vedoy-calender`: `npm.cmd test` bestått - 4 av 4 tester.
- Vedøy Growth: `npm.cmd run build` bestått.
- Visuell browserkontroll av localhost ble avvist av browserens sikkerhetspolicy. Det finnes derfor ingen implementasjonsscreenshot for pikselvis sammenligning i denne kjøringen.
- Endringene i denne kontrollen er lokale og er ikke publisert til Vercel eller GitHub.

## Resultat

blocked
