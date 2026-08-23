import { NextResponse } from "next/server";
import { getWorkspaceContext, supabaseHeaders } from "@/lib/workspace";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const c = await getWorkspaceContext(request); if (!c) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const r = await fetch(`${c.url}/rest/v1/calendar_events?business_id=eq.${c.business.id}&select=*&order=starts_at.asc&limit=150`, { headers: supabaseHeaders(c), cache: "no-store" });
  const events = await r.json().catch(() => []); return r.ok ? NextResponse.json({ events }) : NextResponse.json({ error: "Kunne ikke hente kalender. Kjør schema.sql." }, { status: 500 });
}
export async function POST(request: Request) {
  const c = await getWorkspaceContext(request); if (!c) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const b = await request.json().catch(() => null); const title = typeof b?.title === "string" ? b.title.trim().slice(0, 180) : "";
  if (!title || !b?.startsAt || !b?.endsAt || new Date(b.endsAt) <= new Date(b.startsAt)) return NextResponse.json({ error: "Fyll inn tittel og gyldig tidspunkt." }, { status: 400 });
  const r = await fetch(`${c.url}/rest/v1/calendar_events`, { method: "POST", headers: supabaseHeaders(c, { Prefer: "return=representation" }), body: JSON.stringify({ business_id: c.business.id, created_by: c.user.id, title, starts_at: b.startsAt, ends_at: b.endsAt, source: "vedoy", notes: typeof b.notes === "string" ? b.notes.trim().slice(0, 1000) : "" }) });
  const data = await r.json().catch(() => []); return r.ok ? NextResponse.json({ event: data[0] }) : NextResponse.json({ error: "Kunne ikke lagre kalenderhendelsen." }, { status: 500 });
}
