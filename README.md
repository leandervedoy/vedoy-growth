# Vedøy Growth

Vedøy Growth er en fullstack Next.js-arbeidsflate for små og mellomstore virksomheter. Innlogging, virksomhetsprofil, team, roller, dashboard-oppsett, notater, booking, kalender, timeregistrering og Vedøy Blogg lagres i Supabase.

## Lokal oppstart

1. Kopier `.env.example` til `.env.local` og fyll inn Supabase-verdiene.
2. Kjør hele `supabase/schema.sql` i Supabase SQL Editor på et nytt prosjekt. På eksisterende produksjon er migrasjonene allerede kjørt.
3. Installer og start:

```powershell
npm.cmd install
npm.cmd run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

## Produksjon på Vercel

Legg variablene fra `.env.example` inn under Vercel → Project Settings → Environment Variables. Bare `NEXT_PUBLIC_*` kan være synlige i nettleseren. `SUPABASE_SERVICE_ROLE_KEY`, Shopify-token og Instagram-token skal alltid være server-only.

Etter at miljøvariabler endres må appen redeployes.

## Hva som virker uten leverandørnøkler

- Supabase registrering og innlogging
- virksomhetsprofil og onboarding
- lagring av dashboard-moduler og private notater
- teamoversikt og roller
- booking, kalender og timeregistrering
- Vedøy Blogg med utkast og publisering

Ansattinvitasjoner krever `SUPABASE_SERVICE_ROLE_KEY`. Shopify og Instagram viser en ærlig frakoblet tilstand frem til de respektive servernøklene er satt.

## Google Analytics og Search Console

Growth bruker én server-side Google service account. Sett `GOOGLE_SERVICE_ACCOUNT_EMAIL` og `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` i Vercel, aktiver Google Analytics Data API og Search Console API i samme Google Cloud-prosjekt, og gi service account-adressen Viewer-tilgang i kundens GA4-egenskap og tilgang i Search Console.

Kunden legger bare inn:

- numerisk GA4 Property ID fra Analytics → Admin → Property details
- Search Console-egenskapen nøyaktig som Google viser den, for eksempel `sc-domain:example.no` eller `https://example.no/`

Measurement ID som starter med `G-` brukes til installasjon av Google-taggen, men er ikke Property ID-et Data API-et trenger.

## Nettsidestatus og varsler

Kjør nyeste `supabase/schema.sql` for tabellen `website_status_checks`. Dashboardet lagrer oppetid, responstid og score ved hver kontroll. E-postvarsler krever `RESEND_API_KEY`, en verifisert avsender i `ALERT_FROM_EMAIL`, varsele-post og terskel i nettsidetilkoblingen.

## Vedøy-biblioteker

Åpne Vedøy-biblioteker vises på `/libraries`. Første pakke ligger i `packages/vedoy-calender` og inneholder booking-adapter, konfliktkontroll, ledige tider og ICS-eksport.

```powershell
npm.cmd --prefix packages/vedoy-calender test
```

## Sikkerhet

Growth-tabellene har Row Level Security og minimale database-grants. Brukere får bare tilgang til egen virksomhet. Bloggartikler kan administreres av Growth-eiere, mens bare publiserte artikler er offentlig lesbare.

Ikke legg hemmelige nøkler i Git, chat, klientkode eller `localStorage`.
# Shopify-integrasjon

Vedøy Growth bruker Shopifys offisielle Node API-bibliotek og OAuth for å koble til én eller flere kundebutikker. Prisma-startmalen brukes ikke som en ekstra applikasjon eller database; Growth beholder Supabase som felles datalag.

Opprett en app i Shopify Dev Dashboard og legg inn callback-adressen `https://growth.vedoy.store/api/shopify/callback`.

Legg disse hemmelige servervariablene i `.env.local` og i Vercel:

```env
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_TOKEN_ENCRYPTION_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SHOPIFY_TOKEN_ENCRYPTION_KEY` bør være en tilfeldig verdi på minst 32 tegn. Ingen av variablene skal prefikses med `NEXT_PUBLIC_`.

I Growth åpner du **Tilkoblinger → Shopify**, legger inn `.myshopify.com`-domenet og velger **Koble sikkert med Shopify**. Kunden godkjenner lesetilgang til ordre og analyse. Dashboardet kan vise valgt butikk eller samlet statistikk for alle tilkoblede butikker.
