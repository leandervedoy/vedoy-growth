"use client";

import { useMemo, useState } from "react";

export type CalendarSurfaceEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  meta?: string;
  color?: "blue" | "green" | "violet" | "orange";
};

export type VedoyCalendarSurfaceProps = {
  events?: CalendarSurfaceEvent[];
  initialDate?: string;
  timeSlots?: string[];
  onDateChange?: (date: string) => void;
  onTimeSelect?: (time: string, date: string) => void;
};

const DEFAULT_DATE = "2026-08-22";
const DEFAULT_SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30"];
const WEEKDAYS = ["M", "T", "O", "T", "F", "L", "S"];

function dateFrom(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sameDay(left: Date, right: Date) {
  return toDateKey(left) === toDateKey(right);
}

function accessibleDateLabel(date: Date, count: number) {
  const label = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
  return count ? `${label}, ${count} avtale${count === 1 ? "" : "r"}` : `${label}, ingen avtaler`;
}

function daysForMonth(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return day;
  });
}

export function VedoyCalendarSurface({
  events = [],
  initialDate = DEFAULT_DATE,
  timeSlots = DEFAULT_SLOTS,
  onDateChange,
  onTimeSelect,
}: VedoyCalendarSurfaceProps) {
  const [selectedDate, setSelectedDate] = useState(() => dateFrom(initialDate));
  const [month, setMonth] = useState(() => new Date(dateFrom(initialDate).getFullYear(), dateFrom(initialDate).getMonth(), 1, 12));
  const [selectedTime, setSelectedTime] = useState(timeSlots[1] || timeSlots[0] || "");
  const days = useMemo(() => daysForMonth(month), [month]);
  const selectedEvents = events.filter((event) => sameDay(dateFrom(event.startsAt), selectedDate)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const monthLabel = new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" }).format(month);
  const dateLabel = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(selectedDate);

  function selectDate(date: Date) {
    setSelectedDate(date);
    onDateChange?.(toDateKey(date));
  }

  return <section className="vedoy-calendar-surface" aria-label="Vedøy kalender">
    <div className="vedoy-calendar-toolbar">
      <div className="vedoy-calendar-controls">
        <button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1, 12))}>Forrige</button>
        <button type="button" onClick={() => { const today = dateFrom(initialDate); setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12)); selectDate(today); }}>I dag</button>
        <button type="button" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1, 12))}>Neste</button>
      </div>
      <h2>{monthLabel}</h2>
    </div>

    <div className="vedoy-calendar-weekdays">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
    <div className="vedoy-calendar-grid">
      {days.map((day) => {
        const eventsForDay = events.filter((event) => sameDay(dateFrom(event.startsAt), day));
        const isSelected = sameDay(day, selectedDate);
        const isMuted = day.getMonth() !== month.getMonth();
        return <button type="button" key={toDateKey(day)} aria-label={accessibleDateLabel(day, eventsForDay.length)} aria-pressed={isSelected} className={`${isSelected ? "is-selected" : ""} ${isMuted ? "is-muted" : ""}`} onClick={() => selectDate(day)}>
          <time>{day.getDate()}</time>
          {eventsForDay.slice(0, 2).map((event) => <span aria-hidden="true" key={event.id} className={`vedoy-calendar-event-dot ${event.color || "blue"}`} title={event.title} />)}
        </button>;
      })}
    </div>

    <div className="vedoy-calendar-agenda">
      <div><small>VALGT DAG</small><h3>{dateLabel}</h3></div>
      <div className="vedoy-calendar-event-list">
        {selectedEvents.length ? selectedEvents.map((event) => <article key={event.id}>
          <span aria-hidden="true" className={`vedoy-calendar-event-line ${event.color || "blue"}`} />
          <time>{event.startsAt.slice(11, 16)}</time>
          <div><strong>{event.title}</strong>{event.meta && <small>{event.meta}</small>}</div>
        </article>) : <p>Ingen avtaler denne dagen.</p>}
      </div>
      <div className="vedoy-calendar-slots" aria-label="Velg tidspunkt">
        {timeSlots.map((time) => <button type="button" key={time} aria-pressed={selectedTime === time} className={selectedTime === time ? "is-selected" : ""} onClick={() => { setSelectedTime(time); onTimeSelect?.(time, toDateKey(selectedDate)); }}>{time}</button>)}
      </div>
    </div>
  </section>;
}
