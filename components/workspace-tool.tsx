"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Item = { id: string; title?: string; customer_name?: string; customer_email?: string; starts_at: string; ends_at: string; notes?: string };
type Service = { name: string; duration: number; price: string; color: string; description: string; category: string };

const SERVICES: Service[] = [
  { name: "Digital IT-hjelp", duration: 60, price: "350 kr", color: "blue", category: "IT-hjelp", description: "Rolig hjelp via telefon eller sikker skjermdeling." },
  { name: "Hjemmebesøk", duration: 90, price: "599 kr", color: "green", category: "IT-hjelp", description: "PC, TV, Wi-Fi, printer eller mobil hjemme hos kunden." },
  { name: "Digital bedriftssjekk", duration: 120, price: "1 190 kr", color: "violet", category: "Bedrift", description: "Gjennomgang av nettside, e-post, sikkerhet og rutiner." },
  { name: "Nettside og vekst", duration: 90, price: "890 kr", color: "orange", category: "Vekst", description: "Praktisk sparring om nettside, synlighet og neste steg." },
];
const CALENDARS = ["Alle kalendere", "Kundebookinger", "Team og drift", "Egne hendelser"];
const HOURS = ["09:00", "10:30", "12:00", "14:00", "15:30"];
// A stable first render prevents a server/client time mismatch. The real date
// is applied immediately after hydration, so "I dag" always remains useful.
const INITIAL_DATE = new Date(2026, 7, 22, 10, 30, 0, 0);

function pad(value: number) { return String(value).padStart(2, "0"); }
function inputDate(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function monthName(date: Date) { return new Intl.DateTimeFormat("nb-NO", { month: "long", year: "numeric" }).format(date); }
function dayLabel(date: Date) { return new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date); }
function isSameDay(left: Date, right: Date) { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
function startOfWeek(date: Date) { const value = new Date(date); const offset = (value.getDay() + 6) % 7; value.setDate(value.getDate() - offset); value.setHours(12, 0, 0, 0); return value; }

export function WorkspaceTool({ type }: { type: "booking" | "calendar" }) {
  const [now, setNow] = useState(INITIAL_DATE);
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(new Date(INITIAL_DATE.getFullYear(), INITIAL_DATE.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(INITIAL_DATE);
  const [service, setService] = useState(SERVICES[0]);
  const [plan, setPlan] = useState("Ingen plan");
  const [destination, setDestination] = useState<"digital" | "customer" | "office">("digital");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [filter, setFilter] = useState("Alle");
  const [calendarFilter, setCalendarFilter] = useState(CALENDARS[0]);
  const [form, setForm] = useState({ title: "", customerName: "", customerEmail: "", startsAt: inputDate(INITIAL_DATE), endsAt: inputDate(new Date(INITIAL_DATE.getTime() + 60 * 60_000)), notes: "", phone: "" });
  const api = type === "booking" ? "bookings" : "calendar";

  const load = useCallback(async () => {
    const response = await fetch(`/api/workspace/${api}`);
    const data = await response.json().catch(() => ({}));
    if (response.ok) setItems(data.bookings || data.events || []);
    else setMessage(data.error || "Kunne ikke hente oversikten.");
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const current = new Date();
    current.setHours(10, 30, 0, 0);
    setNow(current);
    setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    setSelectedDay(current);
    setForm((value) => ({ ...value, startsAt: inputDate(current), endsAt: inputDate(new Date(current.getTime() + 60 * 60_000)) }));
  }, []);

  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => { const date = startOfWeek(month); date.setDate(date.getDate() + index); return date; }), [month]);
  const selectedItems = items.filter((item) => isSameDay(new Date(item.starts_at), selectedDay));
  const visibleServices = SERVICES.filter((item) => filter === "Alle" || item.category === filter);
  const selectedDuration = type === "booking" ? service.duration : 60;

  function pickDay(date: Date) { const start = new Date(date); const previous = new Date(form.startsAt || now); start.setHours(previous.getHours() || 10, previous.getMinutes(), 0, 0); const end = new Date(start.getTime() + selectedDuration * 60_000); setSelectedDay(start); setForm((current) => ({ ...current, startsAt: inputDate(start), endsAt: inputDate(end) })); setMessage(""); }
  function pickTime(time: string) { const [hour, minute] = time.split(":").map(Number); const start = new Date(selectedDay); start.setHours(hour, minute, 0, 0); setForm((current) => ({ ...current, startsAt: inputDate(start), endsAt: inputDate(new Date(start.getTime() + selectedDuration * 60_000)) })); }
  function chooseService(next: Service) { setService(next); const start = new Date(form.startsAt); setForm((current) => ({ ...current, endsAt: inputDate(new Date(start.getTime() + next.duration * 60_000)) })); }
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); const destinationLabel = destination === "digital" ? "Digitalt" : destination === "office" ? "Hos Vedøy, Bleikemyr" : `Hos kunde${destinationAddress ? `: ${destinationAddress}` : ""}`; const bookingNotes = [service.name, `${service.price} · ${plan}`, destinationLabel, form.phone && `Telefon: ${form.phone}`, form.notes].filter(Boolean).join(" — "); const payload = type === "booking" ? { ...form, notes: bookingNotes } : form; const response = await fetch(`/api/workspace/${api}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const data = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) { setMessage(data.error || "Kunne ikke lagre."); return; } setMessage(type === "booking" ? "Bookingen er lagret med pris og plassering." : "Hendelsen er lagret i kalenderen."); setForm((current) => ({ ...current, title: "", customerName: "", customerEmail: "", notes: "", phone: "" })); void load(); }

  const heading = type === "booking" ? "Vedøy Booking" : "Vedøy Kalender";
  return <main className="scheduler-page">
    <header className="scheduler-topbar"><a href="/" className="scheduler-brand">VEDØY <span>GROWTH</span></a><nav><a href="/booking" className={type === "booking" ? "active" : ""}>Booking</a><a href="/calendar" className={type === "calendar" ? "active" : ""}>Kalender</a><a href="/libraries">Biblioteker</a><a href="/">Oversikt</a></nav><a className="scheduler-return" href="/">Til dashboard</a></header>
    <section className="scheduler-shell">
      <aside className="scheduler-sidebar"><div className="scheduler-section-head"><small>{type === "booking" ? "VELG TJENESTE" : "KALENDEROVERSIKT"}</small><h1>{heading}</h1><p>{type === "booking" ? "Velg tjeneste, tidspunkt og kundeinformasjon." : "Se avtaler, drift og interne hendelser samlet."}</p></div>
        {type === "booking" ? <><div className="scheduler-filter-row">{["Alle", "IT-hjelp", "Bedrift", "Vekst"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="service-stack">{visibleServices.map((item) => <button key={item.name} className={`service-card ${service.name === item.name ? "selected" : ""}`} onClick={() => chooseService(item)}><span className={`service-line ${item.color}`} /><strong>{item.name}</strong><small>{item.duration} min · {item.price}</small><p>{item.description}</p></button>)}</div><div className="scheduler-plan"><small>VELG PLAN</small><div><button className="selected">Ingen plan</button><button>Enkelttime</button><button>Trygg</button><button>Growth</button></div></div></> : <><div className="calendar-stack">{CALENDARS.map((item, index) => <button key={item} onClick={() => setCalendarFilter(item)} className={calendarFilter === item ? "selected" : ""}><span className={`calendar-dot dot-${index}`} />{item}<small>{index === 0 ? items.length : index === 1 ? items.filter((entry) => entry.customer_name).length : "0"}</small></button>)}</div><div className="scheduler-plan"><small>DAGENS OVERSIKT</small><p>{selectedItems.length ? `${selectedItems.length} avtale${selectedItems.length === 1 ? "" : "r"} valgt dag.` : "Ingen avtaler valgt dag."}</p></div></>}
      </aside>
      <section className="scheduler-calendar"><div className="calendar-toolbar"><div><button onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>Forrige</button><button onClick={() => { setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); pickDay(now); }}>I dag</button><button onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>Neste</button></div><h2>{monthName(month)}</h2></div><div className="weekdays">{["M", "T", "O", "T", "F", "L", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="month-grid">{days.map((day) => { const dayItems = items.filter((item) => isSameDay(new Date(item.starts_at), day)); const muted = day.getMonth() !== month.getMonth(); const chosen = isSameDay(day, selectedDay); const today = isSameDay(day, now); return <button key={day.toISOString()} className={`${muted ? "muted" : ""} ${chosen ? "chosen" : ""} ${today ? "today" : ""}`} onClick={() => pickDay(day)}><time>{day.getDate()}</time>{dayItems.length > 0 && <span className="booking-count">{dayItems.length}</span>}{dayItems.slice(0, 2).map((item) => <em key={item.id}>{item.customer_name || item.title}</em>)}</button>; })}</div><section className="times-panel"><div><small>{type === "booking" ? "VELG TIDSPUNKT" : "DAGSAGENDA"}</small><h3>{dayLabel(selectedDay)}</h3></div><span className="duration-pill">{selectedDuration} min</span>{type === "booking" ? <div className="time-slots">{HOURS.map((time) => <button key={time} onClick={() => pickTime(time)} className={form.startsAt.slice(11, 16) === time ? "selected" : ""}>{time}</button>)}</div> : <div className="day-agenda">{selectedItems.length ? selectedItems.map((item) => <article key={item.id}><time>{new Date(item.starts_at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}</time><div><strong>{item.title || item.customer_name}</strong><small>{item.notes || "Ingen notat"}</small></div></article>) : <p>Ingen hendelser denne dagen.</p>}</div>}</section></section>
      <aside className="scheduler-details"><div className="detail-summary"><small>{type === "booking" ? "VALGT TJENESTE" : "NY HENDELSE"}</small><strong>{type === "booking" ? service.name : form.title || "Ikke valgt tittel"}</strong><small>{type === "booking" ? `${service.price} · ${plan}` : dayLabel(selectedDay)} · {form.startsAt.slice(11, 16)}</small></div><form onSubmit={submit} className="detail-form">{type === "booking" ? <><label>Navn *<input required value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} /></label><label>E-post *<input required type="email" value={form.customerEmail} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} /></label><label>Telefon<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label><fieldset className="booking-destination"><legend>Plassering</legend>{[["digital", "Digitalt"], ["customer", "Hos kunde"], ["office", "Hos Vedøy"]].map(([value, label]) => <label key={value}><input type="radio" name="destination" checked={destination === value} onChange={() => setDestination(value as "digital" | "customer" | "office")} /> {label}</label>)}{destination === "customer" && <label>Adresse eller sted<input value={destinationAddress} onChange={(event) => setDestinationAddress(event.target.value)} placeholder="F.eks. Haugesund" /></label>}</fieldset><fieldset className="booking-destination"><legend>Prisplan</legend><select value={plan} onChange={(event) => setPlan(event.target.value)}>{["Ingen plan", "Enkelttime", "Trygg", "Growth"].map((item) => <option key={item}>{item}</option>)}</select></fieldset></> : <label>Tittel *<input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="For eksempel: Team-møte" /></label>}<label>Starter<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} /></label><label>Slutter<input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} /></label><label>{type === "booking" ? "Kommentar" : "Notat"}<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={type === "booking" ? "Fortell kort hva kunden trenger hjelp med." : "Beskrivelse eller agenda."} /></label>{type === "booking" && <label className="consent"><input type="checkbox" required /> Kunden kan kontaktes om bestillingen</label>}<button type="submit" disabled={busy}>{busy ? "Lagrer …" : type === "booking" ? "Bekreft booking" : "Lagre hendelse"}</button>{message && <p className="detail-message" aria-live="polite">{message}</p>}</form></aside>
    </section><p className="scheduler-note">Vedøy Growth samler booking, kalender og arbeidsflyt. Kundedata lagres kun når du bekrefter.</p>
  </main>;
}
