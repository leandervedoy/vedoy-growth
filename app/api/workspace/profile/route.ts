import { NextResponse } from "next/server";
import { getAuthContext, getWorkspaceContextFromAuth, refreshAuthContext, supabaseHeaders } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let auth = await getAuthContext(request);
  let refreshed: Awaited<ReturnType<typeof refreshAuthContext>> = null;
  if (!auth) { refreshed = await refreshAuthContext(request); auth = refreshed?.auth || null; }
  if (!auth) return NextResponse.json({ authenticated: false });
  const context = await getWorkspaceContextFromAuth(auth);
  const result = NextResponse.json({ authenticated: true, profile: context?.business || null, role: context?.role || null, user: { id: auth.user.id, email: auth.user.email } });
  if (refreshed) {
    const shared = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
    result.cookies.set("vedoy-access-token", refreshed.accessToken, { ...shared, ...(refreshed.remember ? { maxAge: refreshed.expiresIn } : {}) });
    result.cookies.set("vedoy-refresh-token", refreshed.refreshToken, { ...shared, ...(refreshed.remember ? { maxAge: 60 * 60 * 24 * 30 } : {}) });
  }
  return result;
}

export async function POST(request: Request) {
  const context = await getAuthContext(request);
  if (!context) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const businessName = typeof body?.businessName === "string" ? body.businessName.trim().slice(0, 160) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 1000) : "";
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim().slice(0, 2000) : null;
  if (!businessName || !description) return NextResponse.json({ error: "Bedriftsnavn og beskrivelse er påkrevd." }, { status: 400 });

  const response = await fetch(`${context.url}/rest/v1/business_profiles?on_conflict=owner_id`, {
    method: "POST",
    headers: supabaseHeaders(context, { Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify({ owner_id: context.user.id, business_name: businessName, description, logo_url: logoUrl }),
  });
  const profiles = await response.json().catch(() => []);
  if (!response.ok || !profiles[0]) return NextResponse.json({ error: "Kunne ikke lagre virksomheten. Kjør supabase/schema.sql først." }, { status: 500 });

  await fetch(`${context.url}/rest/v1/organization_members?on_conflict=business_id,user_id`, {
    method: "POST",
    headers: supabaseHeaders(context, { Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({ business_id: profiles[0].id, user_id: context.user.id, role: "owner", display_name: String(context.user.user_metadata?.full_name || ""), email: context.user.email || "" }),
  });
  return NextResponse.json({ profile: profiles[0], role: "owner" });
}
