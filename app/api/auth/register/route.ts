import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { fullName, company, managingDirector, phone, email, password } = body;
  if (!fullName || !company || !managingDirector || !phone || !email || !password || password.length < 10) return NextResponse.json({ error: "Fyll ut alle feltene. Passordet må ha minst 10 tegn." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase er ikke konfigurert i miljøet ennå." }, { status: 503 });
  const response = await fetch(`${url}/auth/v1/signup`, { method: "POST", headers: { "Content-Type": "application/json", apikey: key }, body: JSON.stringify({ email, password, data: { full_name: fullName, company, managing_director: managingDirector, phone } }) });
  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.msg || data.message || "Kunne ikke opprette konto." }, { status: response.status });
  const authenticated = Boolean(data.access_token);
  const result = NextResponse.json({ ok: true, authenticated, message: authenticated ? "Konto opprettet." : "Sjekk e-posten din for å bekrefte kontoen." });
  if (authenticated) {
    const shared = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
    result.cookies.set("vedoy-access-token", data.access_token, shared);
    result.cookies.set("vedoy-refresh-token", data.refresh_token, shared);
    result.cookies.set("vedoy-remember", "0", shared);
  }
  return result;
}
