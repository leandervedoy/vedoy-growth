# vedoy-calender

Et lite, avhengighetsfritt Node.js/TypeScript-bibliotek basert på eventmodellen i Vedøy Booking. Pakken håndterer kalenderhendelser, booking-adapter, konfliktkontroll, ledige tider og ICS-eksport.

> Pakken heter bevisst `vedoy-calender` for å samsvare med Vedøy-navnet som er valgt for biblioteket.

## Installer

```bash
npm install vedoy-calender
```

## Eksempel

```js
import { VedoyCalendar, fromVedoyBooking } from "vedoy-calender";

const calendar = new VedoyCalendar([
  fromVedoyBooking({
    id: "booking-1",
    customer_name: "Haugesund Bakeri",
    starts_at: "2026-08-24T08:00:00.000Z",
    ends_at: "2026-08-24T09:00:00.000Z"
  })
]);

const slots = calendar.available({
  date: "2026-08-24",
  workdayStart: "08:00",
  workdayEnd: "16:00",
  durationMinutes: 60
});

const ics = calendar.toICS("Vedøy Booking");
```

## API

- `VedoyCalendar` – legg til, fjern og hent hendelser
- `fromVedoyBooking()` – adapter fra Vedøy Booking/Supabase-felter
- `eventsOverlap()` og `findConflicts()` – konfliktkontroll
- `findAvailableSlots()` – finn ledige tidspunkt
- `toICS()` – eksporter til Apple Calendar, Outlook og Google Calendar

Krever Node.js 18 eller nyere. Lisensiert under MIT.

## React-flate og CSS

Vil du ha den samme rolige kalenderflaten som i Vedøy Booking, importer den valgfrie React-komponenten og stilarket:

```tsx
import { VedoyCalendarSurface } from "vedoy-calender/react";
import "vedoy-calender/styles.css";

export default function Calendar() {
  return <VedoyCalendarSurface events={[
    { id: "1", title: "Digital IT-hjelp", startsAt: "2026-08-22T10:00", endsAt: "2026-08-22T11:00", meta: "Ingrid Solheim", color: "blue" }
  ]} />;
}
```

`VedoyCalendarSurface` er klientinteraktiv og har månedsnavigering, dagsvalg, agenda og tidspunkter. Selve kalenderlogikken fra hovedimporten kan fortsatt brukes uten React eller CSS.
