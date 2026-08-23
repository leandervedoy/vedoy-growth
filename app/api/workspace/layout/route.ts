import { NextResponse } from "next/server";
import { getWorkspaceContext, supabaseHeaders } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const response = await fetch(`${context.url}/rest/v1/dashboard_layouts?business_id=eq.${context.business.id}&user_id=eq.${context.user.id}&select=modules,updated_at&limit=1`, { headers: supabaseHeaders(context), cache: "no-store" });
  const rows = await response.json().catch(() => []);
  if (!response.ok) return NextResponse.json({ error: "Kunne ikke hente dashboard-oppsettet." }, { status: 500 });
  return NextResponse.json({ modules: Array.isArray(rows[0]?.modules) ? rows[0].modules : null, updatedAt: rows[0]?.updated_at || null });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.modules) || body.modules.length > 40) return NextResponse.json({ error: "Ugyldig moduloppsett." }, { status: 400 });
  const modules = body.modules.filter((module: unknown) => module && typeof module === "object" && typeof (module as { id?: unknown }).id === "string").slice(0, 40);
  const response = await fetch(`${context.url}/rest/v1/dashboard_layouts?on_conflict=business_id,user_id`, { method: "POST", headers: supabaseHeaders(context, { Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify({ business_id: context.business.id, user_id: context.user.id, modules, updated_at: new Date().toISOString() }) });
  const rows = await response.json().catch(() => []);
  return response.ok ? NextResponse.json({ layout: rows[0] || null }) : NextResponse.json({ error: "Kunne ikke lagre dashboard-oppsettet." }, { status: 500 });
}
