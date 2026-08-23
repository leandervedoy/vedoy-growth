export const vedoyLibraries = [
  {
    name: "vedoy-calender",
    version: "0.1.0",
    status: "Open source",
    description: "Kalender, ledige tider, booking-adapter, konfliktkontroll og ICS-eksport for Node.js og TypeScript.",
    href: "https://github.com/leandervedoy/vedoy-calender",
    action: "Se kode og dokumentasjon på GitHub →",
    demoHref: "/libraries/demo/calendar",
    downloadHref: "https://github.com/leandervedoy/vedoy-calender/archive/refs/heads/main.zip",
    install: "npm install vedoy-calender",
    features: ["Vedøy Booking-adapter", "Ledige tidsluker", "Konfliktkontroll", "ICS-eksport"],
    steps: [
      "Installer pakken og importer VedoyCalendar.",
      "Gjør Vedøy Booking-rader om til kalenderhendelser.",
      "Finn ledige tider, sjekk konflikter eller eksporter ICS.",
    ],
    example: `const calendar = new VedoyCalendar(bookinger);
const ledige = calendar.available({
  date: "2026-08-24",
  durationMinutes: 60
});`,
  },
  {
    name: "Vedøy Booking",
    version: "Beta",
    status: "Open source",
    description: "Bookingflate for lokale virksomheter med tjenestevalg, pris, destinasjon, kalender og arbeidsflate.",
    href: "https://github.com/leandervedoy/vedoy-booking",
    action: "Se kode og dokumentasjon på GitHub →",
    demoHref: "/libraries/demo/booking",
    downloadHref: "/downloads/vedoy-booking-demo.html",
    install: "npm install vedoy-booking",
    features: ["Tjenester og priser", "Plassering/destinasjon", "Kalendersynk", "Tilgjengelighet"],
    steps: [
      "Kunden velger en ledig tid og fyller inn kontaktinformasjon.",
      "Bookingen lagres sikkert i virksomhetens arbeidsflate.",
      "Avtalen vises i både Booking og Kalender for teamet.",
    ],
    example: "KUNDE  →  LEDIG TID  →  BEKREFTET  →  KALENDER",
  },
] as const;
