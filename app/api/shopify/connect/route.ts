import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { normalizeShopDomain, SHOPIFY_SCOPES } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.redirect(new URL("/login", request.url));
  const shop = normalizeShopDomain(new URL(request.url).searchParams.get("shop") || "");
  const apiKey = process.env.SHOPIFY_API_KEY;
  if (!shop || !apiKey) return NextResponse.redirect(new URL("/connections?module=shopify&shopify=setup-error", request.url));

  const state = randomBytes(24).toString("base64url");
  const callback = new URL("/api/shopify/callback", request.url).toString();
  const authorize = new URL(`https://${shop}/admin/oauth/authorize`);
  authorize.searchParams.set("client_id", apiKey);
  authorize.searchParams.set("scope", SHOPIFY_SCOPES.join(","));
  authorize.searchParams.set("redirect_uri", callback);
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set("vedoy-shopify-state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return response;
}
