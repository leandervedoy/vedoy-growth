import { NextResponse } from "next/server";
import { getWorkspaceContext, supabaseHeaders } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const ownOnly = context.role === "employee";
  const filters = `business_id=eq.${context.business.id}${ownOnly ? `&owner_id=eq.${context.user.id}` : ""}`;
  const response = await fetch(`${context.url}/rest/v1/work_time_entries?${filters}&select=id,owner_id,started_at,ended_at,note&order=started_at.desc&limit=120`, { headers: supabaseHeaders(context), cache: "no-store" });
  const entries = await response.json().catch(() => []);
  if (!response.ok) return NextResponse.json({ error: "Kunne ikke hente timer. Kjør supabase/schema.sql først." }, { status: 500 });
  return NextResponse.json({ entries, role: context.role });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const body = await request.json().catch(() => null);
  const headers = supabaseHeaders(context, { Prefer: "return=representation" });
  if (body?.action === "start") {
    const open = await fetch(`${context.url}/rest/v1/work_time_entries?business_id=eq.${context.business.id}&owner_id=eq.${context.user.id}&ended_at=is.null&select=id&limit=1`, { headers, cache: "no-store" });
    const openEntries = await open.json().catch(() => []);
    if (openEntries[0]) return NextResponse.json({ error: "En timer kjører allerede." }, { status: 409 });
    const response = await fetch(`${context.url}/rest/v1/work_time_entries`, { method: "POST", headers, body: JSON.stringify({ business_id: context.business.id, owner_id: context.user.id, note: typeof body.note === "string" ? body.note.trim().slice(0, 300) : "" }) });
    const data = await response.json().catch(() => []);
    return response.ok ? NextResponse.json({ entry: data[0] }) : NextResponse.json({ error: "Kunne ikke starte timer." }, { status: 500 });
  }
  if (body?.action === "stop") {
    const response = await fetch(`${context.url}/rest/v1/work_time_entries?business_id=eq.${context.business.id}&owner_id=eq.${context.user.id}&ended_at=is.null`, { method: "PATCH", headers, body: JSON.stringify({ ended_at: new Date().toISOString() }) });
    return response.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Kunne ikke stoppe timer." }, { status: 500 });
  }
  return NextResponse.json({ error: "Ukjent handling." }, { status: 400 });
}
