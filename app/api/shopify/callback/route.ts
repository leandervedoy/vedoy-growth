import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { encryptShopifyToken, normalizeShopDomain, shopifyClient } from "@/lib/shopify";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

function redirect(request: Request, result: string) {
  const response = NextResponse.redirect(new URL(`/connections?module=shopify&shopify=${result}`, request.url));
  response.cookies.delete("vedoy-shopify-state");
  return response;
}

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.redirect(new URL("/login", request.url));
  const url = new URL(request.url);
  const shop = normalizeShopDomain(url.searchParams.get("shop") || "");
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const stateCookie = request.headers.get("cookie")?.match(/(?:^|;\s*)vedoy-shopify-state=([^;]+)/)?.[1];
  if (!shop || !state || !code || !stateCookie || state !== stateCookie) return redirect(request, "invalid-state");

  const api = shopifyClient(url.host);
  const query = Object.fromEntries(url.searchParams.entries()) as Record<string, string>;
  if (!(await api.utils.validateHmac(query))) return redirect(request, "invalid-signature");

  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_API_KEY, client_secret: process.env.SHOPIFY_API_SECRET, code }),
    cache: "no-store",
  });
  const tokenData = await tokenResponse.json().catch(() => null) as { access_token?: string; scope?: string } | null;
  if (!tokenResponse.ok || !tokenData?.access_token) return redirect(request, "token-error");

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return redirect(request, "server-config-error");
  const admin = createClient(context.url, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from("shopify_store_connections").upsert({
    business_id: context.business.id,
    connected_by: context.user.id,
    shop_domain: shop,
    encrypted_access_token: encryptShopifyToken(tokenData.access_token),
    scopes: tokenData.scope || "",
    status: "connected",
    updated_at: new Date().toISOString(),
  }, { onConflict: "business_id,shop_domain" });
  return redirect(request, error ? "save-error" : "connected");
}
