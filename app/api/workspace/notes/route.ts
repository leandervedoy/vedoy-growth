import { NextResponse } from "next/server";
import { getWorkspaceContext, supabaseHeaders } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const response = await fetch(`${context.url}/rest/v1/workspace_notes?business_id=eq.${context.business.id}&user_id=eq.${context.user.id}&select=content,updated_at&limit=1`, { headers: supabaseHeaders(context), cache: "no-store" });
  const rows = await response.json().catch(() => []);
  return response.ok ? NextResponse.json({ content: rows[0]?.content || "", updatedAt: rows[0]?.updated_at || null }) : NextResponse.json({ error: "Kunne ikke hente notater." }, { status: 500 });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const body = await request.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.slice(0, 20000) : "";
  const response = await fetch(`${context.url}/rest/v1/workspace_notes?on_conflict=business_id,user_id`, { method: "POST", headers: supabaseHeaders(context, { Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify({ business_id: context.business.id, user_id: context.user.id, content, updated_at: new Date().toISOString() }) });
  const rows = await response.json().catch(() => []);
  return response.ok ? NextResponse.json({ note: rows[0] || null }) : NextResponse.json({ error: "Kunne ikke lagre notatet." }, { status: 500 });
}
