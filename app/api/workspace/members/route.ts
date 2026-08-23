import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canManageUsers, getWorkspaceContext, supabaseHeaders, type WorkspaceRole } from "@/lib/workspace";

export const dynamic = "force-dynamic";
const assignableRoles: WorkspaceRole[] = ["admin", "manager", "employee"];

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  const response = await fetch(`${context.url}/rest/v1/organization_members?business_id=eq.${context.business.id}&select=id,user_id,display_name,email,role,created_at&order=created_at.asc`, { headers: supabaseHeaders(context), cache: "no-store" });
  const members = await response.json().catch(() => []);
  return response.ok ? NextResponse.json({ members, canManage: canManageUsers(context.role), inviteReady: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) }) : NextResponse.json({ error: "Kunne ikke hente teamet." }, { status: 500 });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  if (!canManageUsers(context.role)) return NextResponse.json({ error: "Du har ikke tilgang til å invitere ansatte." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim().slice(0, 120) : "";
  const role = assignableRoles.includes(body?.role) ? body.role as WorkspaceRole : "employee";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Skriv inn en gyldig e-postadresse." }, { status: 400 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Ansattinvitasjoner er klargjort, men SUPABASE_SERVICE_ROLE_KEY mangler i Vercel." }, { status: 503 });
  const admin = createClient(context.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: "Kunne ikke kontrollere brukerkontoen." }, { status: 500 });
  let user = listed.users.find((candidate) => candidate.email?.toLowerCase() === email);
  let invited = false;
  if (!user) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: displayName }, redirectTo: "https://growth.vedoy.store/login" });
    if (error || !data.user) return NextResponse.json({ error: error?.message || "Kunne ikke sende invitasjonen." }, { status: 500 });
    user = data.user;
    invited = true;
  }
  const { data: member, error } = await admin.from("organization_members").upsert({ business_id: context.business.id, user_id: user.id, role, display_name: displayName || user.user_metadata?.full_name || "", email }, { onConflict: "business_id,user_id" }).select("id,user_id,display_name,email,role,created_at").single();
  if (error) return NextResponse.json({ error: "Kunne ikke knytte brukeren til virksomheten." }, { status: 500 });
  return NextResponse.json({ member, invited });
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Opprett virksomheten din først." }, { status: 409 });
  if (!canManageUsers(context.role)) return NextResponse.json({ error: "Du har ikke tilgang til å endre roller." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const role = assignableRoles.includes(body?.role) ? body.role as WorkspaceRole : null;
  if (!id || !role) return NextResponse.json({ error: "Ugyldig rolleendring." }, { status: 400 });
  const response = await fetch(`${context.url}/rest/v1/organization_members?id=eq.${id}&business_id=eq.${context.business.id}&role=neq.owner`, { method: "PATCH", headers: supabaseHeaders(context, { Prefer: "return=representation" }), body: JSON.stringify({ role }) });
  const rows = await response.json().catch(() => []);
  return response.ok && rows[0] ? NextResponse.json({ member: rows[0] }) : NextResponse.json({ error: "Kunne ikke endre rollen." }, { status: 400 });
}
