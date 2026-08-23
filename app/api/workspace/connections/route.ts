import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedModules = new Set([
  "shopify",
  "instagram",
  "analytics",
  "search",
  "website",
  "email",
  "booking",
  "blog",
  "support",
  "seo",
  "ai",
  "custom",
]);

const allowedSettingKeys = new Set([
  "storeDomain",
  "username",
  "propertyId",
  "siteUrl",
  "emailAddress",
  "provider",
  "bookingUrl",
  "blogUrl",
  "inboxUrl",
  "keyword",
  "model",
  "moduleTitle",
  "alertEmail",
  "alertThresholdMs",
]);

function config(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.match(/(?:^|;\s*)vedoy-access-token=([^;]+)/)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { token, url, key };
}

async function session(request: Request) {
  const current = config(request);
  if (!current.token || !current.url || !current.key) return null;
  const response = await fetch(`${current.url}/auth/v1/user`, {
    headers: { apikey: current.key, Authorization: `Bearer ${current.token}` },
  });
  if (!response.ok) return null;
  return { ...current, user: await response.json() };
}

function safeSettings(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, item]) => allowedSettingKeys.has(key) && typeof item === "string")
      .map(([key, item]) => [key, item.trim().slice(0, 500)]),
  );
}

export async function GET(request: Request) {
  const current = await session(request);
  if (!current) return NextResponse.json({ authenticated: false, connections: [] }, { status: 401 });

  const response = await fetch(
    `${current.url}/rest/v1/workspace_connections?owner_id=eq.${current.user.id}&select=module_id,status,settings,updated_at`,
    { headers: { apikey: current.key!, Authorization: `Bearer ${current.token}` }, cache: "no-store" },
  );
  const connections = response.ok ? await response.json() : [];
  return NextResponse.json({ authenticated: true, connections });
}

export async function POST(request: Request) {
  const current = await session(request);
  if (!current) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const moduleId = typeof body?.moduleId === "string" ? body.moduleId : "";
  if (!allowedModules.has(moduleId)) return NextResponse.json({ error: "Ugyldig modul." }, { status: 400 });

  const response = await fetch(`${current.url}/rest/v1/workspace_connections?on_conflict=owner_id,module_id`, {
    method: "POST",
    headers: {
      apikey: current.key!,
      Authorization: `Bearer ${current.token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      owner_id: current.user.id,
      module_id: moduleId,
      status: body?.status === "live" ? "live" : "configured",
      settings: safeSettings(body?.settings),
      updated_at: new Date().toISOString(),
    }),
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) {
    return NextResponse.json({ error: "Kunne ikke lagre tilkoblingen. Kjør den nyeste supabase/schema.sql." }, { status: 500 });
  }
  return NextResponse.json({ connection: data[0] });
}

export async function DELETE(request: Request) {
  const current = await session(request);
  if (!current) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const moduleId = typeof body?.moduleId === "string" ? body.moduleId : "";
  if (!allowedModules.has(moduleId)) return NextResponse.json({ error: "Ugyldig modul." }, { status: 400 });

  const response = await fetch(
    `${current.url}/rest/v1/workspace_connections?owner_id=eq.${current.user.id}&module_id=eq.${encodeURIComponent(moduleId)}`,
    { method: "DELETE", headers: { apikey: current.key!, Authorization: `Bearer ${current.token}` } },
  );
  if (!response.ok) return NextResponse.json({ error: "Kunne ikke fjerne tilkoblingen." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
