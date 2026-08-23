export type CalendarSource = "vedoy" | "google" | "microsoft" | "manual";

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
  source?: CalendarSource;
  customerName?: string;
  customerEmail?: string;
};

export type VedoyBooking = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  starts_at: string;
  ends_at: string;
  notes?: string | null;
};

export type AvailabilityOptions = {
  date: string;
  workdayStart?: string;
  workdayEnd?: string;
  durationMinutes: number;
  intervalMinutes?: number;
  events?: CalendarEvent[];
};

export type AvailabilitySlot = { startsAt: string; endsAt: string };

function validDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${label} must be a valid ISO date.`);
  return date;
}

function validateEvent(event: CalendarEvent) {
  if (!event.id?.trim()) throw new TypeError("Event id is required.");
  if (!event.title?.trim()) throw new TypeError("Event title is required.");
  const start = validDate(event.startsAt, "startsAt");
  const end = validDate(event.endsAt, "endsAt");
  if (end <= start) throw new RangeError("endsAt must be after startsAt.");
}

export function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => validDate(a.startsAt, "startsAt").getTime() - validDate(b.startsAt, "startsAt").getTime());
}

export function eventsOverlap(first: Pick<CalendarEvent, "startsAt" | "endsAt">, second: Pick<CalendarEvent, "startsAt" | "endsAt">) {
  const firstStart = validDate(first.startsAt, "startsAt").getTime();
  const firstEnd = validDate(first.endsAt, "endsAt").getTime();
  const secondStart = validDate(second.startsAt, "startsAt").getTime();
  const secondEnd = validDate(second.endsAt, "endsAt").getTime();
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function findConflicts(events: CalendarEvent[]) {
  const sorted = sortEvents(events);
  const conflicts: Array<[CalendarEvent, CalendarEvent]> = [];
  for (let left = 0; left < sorted.length; left += 1) {
    for (let right = left + 1; right < sorted.length; right += 1) {
      if (new Date(sorted[right].startsAt) >= new Date(sorted[left].endsAt)) break;
      if (eventsOverlap(sorted[left], sorted[right])) conflicts.push([sorted[left], sorted[right]]);
    }
  }
  return conflicts;
}

export function fromVedoyBooking(booking: VedoyBooking): CalendarEvent {
  const event: CalendarEvent = {
    id: booking.id,
    title: booking.customer_name,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    source: "vedoy",
    customerName: booking.customer_name,
    customerEmail: booking.customer_email || undefined,
    notes: booking.notes || undefined,
  };
  validateEvent(event);
  return event;
}

function localDate(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) throw new TypeError("date and workday times must be valid.");
  return value;
}

export function findAvailableSlots(options: AvailabilityOptions): AvailabilitySlot[] {
  const duration = Math.floor(options.durationMinutes);
  const interval = Math.floor(options.intervalMinutes ?? duration);
  if (duration <= 0 || interval <= 0) throw new RangeError("durationMinutes and intervalMinutes must be positive.");
  const dayStart = localDate(options.date, options.workdayStart ?? "08:00");
  const dayEnd = localDate(options.date, options.workdayEnd ?? "16:00");
  if (dayEnd <= dayStart) throw new RangeError("workdayEnd must be after workdayStart.");

  const events = options.events ?? [];
  const slots: AvailabilitySlot[] = [];
  for (let startsAt = dayStart.getTime(); startsAt + duration * 60_000 <= dayEnd.getTime(); startsAt += interval * 60_000) {
    const candidate = { startsAt: new Date(startsAt).toISOString(), endsAt: new Date(startsAt + duration * 60_000).toISOString() };
    if (!events.some((event) => eventsOverlap(candidate, event))) slots.push(candidate);
  }
  return slots;
}

function icsEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function icsDate(value: string) {
  return validDate(value, "date").toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function toICS(events: CalendarEvent[], calendarName = "Vedøy Kalender") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vedoy//vedoy-calender//NB", `X-WR-CALNAME:${icsEscape(calendarName)}`];
  for (const event of sortEvents(events)) {
    validateEvent(event);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(event.id)}@vedoy.com`,
      `DTSTAMP:${icsDate(new Date().toISOString())}`,
      `DTSTART:${icsDate(event.startsAt)}`,
      `DTEND:${icsDate(event.endsAt)}`,
      `SUMMARY:${icsEscape(event.title)}`,
      ...(event.notes ? [`DESCRIPTION:${icsEscape(event.notes)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export class VedoyCalendar {
  #events = new Map<string, CalendarEvent>();

  constructor(events: CalendarEvent[] = []) {
    for (const event of events) this.add(event);
  }

  add(event: CalendarEvent, options: { allowConflicts?: boolean } = {}) {
    validateEvent(event);
    if (!options.allowConflicts) {
      const conflict = this.events().find((current) => current.id !== event.id && eventsOverlap(current, event));
      if (conflict) throw new Error(`Event conflicts with ${conflict.id}.`);
    }
    this.#events.set(event.id, { ...event });
    return this;
  }

  remove(id: string) {
    return this.#events.delete(id);
  }

  get(id: string) {
    const event = this.#events.get(id);
    return event ? { ...event } : undefined;
  }

  events() {
    return sortEvents([...this.#events.values()]).map((event) => ({ ...event }));
  }

  available(options: Omit<AvailabilityOptions, "events">) {
    return findAvailableSlots({ ...options, events: this.events() });
  }

  toICS(name?: string) {
    return toICS(this.events(), name);
  }
}

