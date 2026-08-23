import assert from "node:assert/strict";
import test from "node:test";
import { VedoyCalendar, eventsOverlap, findAvailableSlots, fromVedoyBooking, toICS } from "../dist/index.js";

const event = { id: "one", title: "Kundemøte", startsAt: "2026-08-24T08:00:00.000Z", endsAt: "2026-08-24T09:00:00.000Z" };

test("detects overlap but permits adjacent events", () => {
  assert.equal(eventsOverlap(event, { startsAt: "2026-08-24T08:30:00.000Z", endsAt: "2026-08-24T09:30:00.000Z" }), true);
  assert.equal(eventsOverlap(event, { startsAt: "2026-08-24T09:00:00.000Z", endsAt: "2026-08-24T10:00:00.000Z" }), false);
});

test("maps Vedøy Booking rows", () => {
  const mapped = fromVedoyBooking({ id: "b1", customer_name: "Haugesund Bakeri", customer_email: "hei@example.no", starts_at: event.startsAt, ends_at: event.endsAt });
  assert.equal(mapped.title, "Haugesund Bakeri");
  assert.equal(mapped.customerEmail, "hei@example.no");
});

test("finds open slots", () => {
  const slots = findAvailableSlots({ date: "2026-08-24", workdayStart: "08:00", workdayEnd: "11:00", durationMinutes: 60, events: [event] });
  assert.equal(slots.length, 2);
});

test("calendar rejects conflicts and exports ICS", () => {
  const calendar = new VedoyCalendar([event]);
  assert.throws(() => calendar.add({ id: "two", title: "Konflikt", startsAt: "2026-08-24T08:30:00.000Z", endsAt: "2026-08-24T09:30:00.000Z" }));
  assert.match(calendar.toICS("Vedøy Booking"), /BEGIN:VEVENT/);
  assert.match(toICS([event]), /SUMMARY:Kundemøte/);
});

