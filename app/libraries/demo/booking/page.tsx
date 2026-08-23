"use client";

import { useState } from "react";
import { VedoyCalendarSurface } from "@/packages/vedoy-calender/src/react";
import { VedoyBookingConfigurator, type VedoyBookingSelection } from "@/packages/vedoy-booking/src/react";
import "@/packages/vedoy-calender/src/styles.css";
import "@/packages/vedoy-booking/src/styles.css";

const SERVICES = [
  { id: "digital-help", name: "Digital IT-hjelp", duration: 60, price: 350, description: "Rolig hjelp via telefon eller sikker skjermdeling.", color: "blue" },
  { id: "home-visit", name: "Hjemmebesøk", duration: 90, price: 599, description: "PC, TV, Wi-Fi, printer eller mobil hjemme hos kunden.", color: "green" },
  { id: "business-check", name: "Digital bedriftssjekk", duration: 120, price: 1190, description: "Gjennomgang av nettside, e-post, sikkerhet og rutiner.", color: "violet" },
  { id: "website-growth", name: "Nettside og vekst", duration: 90, price: 890, description: "Praktisk sparring om nettside, synlighet og neste steg.", color: "orange" },
] as const;

export default function BookingDemoPage() {
  const [booking, setBooking] = useState<VedoyBookingSelection>({ service: SERVICES[0], plan: "Ingen plan", destination: "digital", address: "" });
  const [selection, setSelection] = useState({ date: "2026-08-22", time: "10:30" });

  return <main className="library-demo-page surface-library-page">
    <nav><a href="/libraries">← Biblioteker</a><span>VEDØY BOOKING / DEMO</span></nav>
    <header><small>INTERAKTIV DEMO</small><h1>Vedøy Booking</h1><p>Velg tjeneste, dato og tidspunkt. Demoen lagrer ingen kundedata.</p></header>
    <section className="surface-demo-shell">
      <VedoyBookingConfigurator services={[...SERVICES]} onChange={setBooking} />
      <div className="surface-calendar-wrap"><VedoyCalendarSurface initialDate="2026-08-22" onDateChange={(date) => setSelection((current) => ({ ...current, date }))} onTimeSelect={(time, date) => setSelection({ time, date })} /><div className="surface-selection" aria-live="polite"><span>{booking.service.name}</span><strong>{selection.date} kl. {selection.time}</strong><small>{booking.service.duration} min · {booking.destination === "customer" ? booking.address || "Hos deg" : booking.destination === "office" ? "Hos Vedøy" : "Digitalt"} · {booking.service.price.toLocaleString("nb-NO")} kr</small></div></div>
    </section>
    <div className="demo-footer-actions"><a href="/downloads/vedoy-booking-demo.html" download>Last ned offline-demo ↓</a><a href="/booking">Åpne ekte bookingflate →</a></div>
  </main>;
}
