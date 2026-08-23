"use client";

import { FormEvent, useState } from "react";
import { VedoyCalendarSurface } from "@/packages/vedoy-calender/src/react";
import "@/packages/vedoy-calender/src/styles.css";

type DemoEvent = { id: number; title: string; start: number; duration: number };
const HOURS = Array.from({ length: 8 }, (_, index) => index + 8);

export default function CalendarDemoPage() {
  const [events, setEvents] = useState<DemoEvent[]>([{ id: 1, title: "Kundemøte", start: 9, duration: 1 }]);
  const [title, setTitle] = useState("Ny booking");
  const [start, setStart] = useState(11);
  const [duration, setDuration] = useState(1);
  const [message, setMessage] = useState("Velg et tidspunkt for å teste konfliktkontrollen.");

  function addEvent(event: FormEvent) {
    event.preventDefault();
    const end = start + duration;
    const conflict = events.some((item) => start < item.start + item.duration && item.start < end);
    if (conflict) {
      setMessage("Konflikt funnet – tidspunktet er allerede opptatt.");
      return;
    }
    setEvents((current) => [...current, { id: Date.now(), title: title.trim() || "Booking", start, duration }]);
    setMessage("Booking lagt til i demokalenderen.");
  }

  return <main className="library-demo-page surface-library-page">
    <nav><a href="/libraries">← Biblioteker</a><span>VEDØY-CALENDER / DEMO</span></nav>
    <header><small>INTERAKTIV DEMO</small><h1>Vedøy Kalender</h1><p>Samme rolige arbeidsflate, med konfliktkontroll og kalenderlogikken fra biblioteket.</p></header>
    <section className="surface-demo-shell">
      <form className="surface-sidebar surface-form" onSubmit={addEvent}>
        <small>NY HENDELSE</small><h2>Legg til hendelse</h2><p>Test ledige tider og konflikter uten å lagre data.</p>
        <label>Tittel<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Start<select value={start} onChange={(event) => setStart(Number(event.target.value))}>{HOURS.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}:00</option>)}</select></label>
        <label>Varighet<select value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={1}>1 time</option><option value={2}>2 timer</option></select></label>
        <button className="surface-submit" type="submit">Test tidspunkt</button>
        <p className="demo-message" aria-live="polite">{message}</p>
      </form>
      <VedoyCalendarSurface initialDate="2026-08-22" events={events.map((item) => ({ id: String(item.id), title: item.title, startsAt: `2026-08-22T${String(item.start).padStart(2, "0")}:00`, endsAt: `2026-08-22T${String(item.start + item.duration).padStart(2, "0")}:00`, meta: "Vedøy Booking", color: "blue" }))} />
    </section>
    <div className="demo-footer-actions"><a href="https://github.com/leandervedoy/vedoy-calender/archive/refs/heads/main.zip">Last ned biblioteket ↓</a><a href="https://github.com/leandervedoy/vedoy-calender" target="_blank" rel="noreferrer">Se kildekode ↗</a></div>
  </main>;
}
