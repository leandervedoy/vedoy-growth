import { NextResponse } from "next/server";
import { getWorkspaceContext, supabaseHeaders } from "@/lib/workspace";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const c = await getWorkspaceContext(request); if (!c) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const r = await fetch(`${c.url}/rest/v1/booking_events?business_id=eq.${c.business.id}&select=*&order=starts_at.asc&limit=100`, { headers: supabaseHeaders(c), cache: "no-store" });
  const bookings = await r.json().catch(() => []); return r.ok ? NextResponse.json({ bookings }) : NextResponse.json({ error: "Kunne ikke hente bookinger. Kjør schema.sql." }, { status: 500 });
}
export async function POST(request: Request) {
  const c = await getWorkspaceContext(request); if (!c) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const b = await request.json().catch(() => null); const customerName = typeof b?.customerName === "string" ? b.customerName.trim().slice(0, 160) : "";
  const startsAt = typeof b?.startsAt === "string" ? b.startsAt : ""; const endsAt = typeof b?.endsAt === "string" ? b.endsAt : "";
  if (!customerName || !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) return NextResponse.json({ error: "Fyll inn kunde og gyldig tidspunkt." }, { status: 400 });
  const r = await fetch(`${c.url}/rest/v1/booking_events`, { method: "POST", headers: supabaseHeaders(c, { Prefer: "return=representation" }), body: JSON.stringify({ business_id: c.business.id, created_by: c.user.id, customer_name: customerName, customer_email: typeof b?.customerEmail === "string" ? b.customerEmail.trim().slice(0, 200) : "", starts_at: startsAt, ends_at: endsAt, notes: typeof b?.notes === "string" ? b.notes.trim().slice(0, 1000) : "" }) });
  const data = await r.json().catch(() => []); return r.ok ? NextResponse.json({ booking: data[0] }) : NextResponse.json({ error: "Kunne ikke lagre booking." }, { status: 500 });
}
