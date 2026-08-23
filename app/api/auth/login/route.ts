import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const { email, password, rememberMe } = await request.json();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase er ikke konfigurert i miljøet ennå." }, { status: 503 });
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { "Content-Type": "application/json", apikey: key }, body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.error_description || data.msg || "Feil e-post eller passord." }, { status: 401 });
  const result = NextResponse.json({ ok: true, user: data.user });
  const persistent = rememberMe === true || rememberMe === "on";
  const shared = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
  result.cookies.set("vedoy-access-token", data.access_token, { ...shared, ...(persistent ? { maxAge: data.expires_in || 3600 } : {}) });
  result.cookies.set("vedoy-refresh-token", data.refresh_token, { ...shared, ...(persistent ? { maxAge: 60 * 60 * 24 * 30 } : {}) });
  result.cookies.set("vedoy-remember", persistent ? "1" : "0", { ...shared, ...(persistent ? { maxAge: 60 * 60 * 24 * 30 } : {}) });
  return result;
}
