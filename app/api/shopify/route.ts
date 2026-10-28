import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { decryptShopifyToken, fetchShopifySnapshot, normalizeShopDomain } from "@/lib/shopify";
import { getWorkspaceContext } from "@/lib/workspace";
import { aggregateShopifySnapshots, shopifyPeriod } from "@/lib/shopify-snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ connected: false, reason: "Logg inn for å se Shopify-data." }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ connected: false, reason: "Shopify er ikke ferdig konfigurert på serveren." }, { status: 503 });
  const selected = normalizeShopDomain(new URL(request.url).searchParams.get("shop") || "");
  const admin = createClient(context.url, serviceKey, { auth: { persistSession: false } });
  let query = admin.from("shopify_store_connections").select("shop_domain,encrypted_access_token,updated_at").eq("business_id", context.business.id).eq("status", "connected");
  if (selected) query = query.eq("shop_domain", selected);
  const { data, error } = await query;
  if (error || !data?.length) return NextResponse.json({ connected: false, reason: "Ingen Shopify-butikk er koblet til." });

  const now = new Date();
  const snapshots = await Promise.allSettled(data.map(async (item) => fetchShopifySnapshot(new URL(request.url).host, item.shop_domain, decryptShopifyToken(item.encrypted_access_token), now)));
  const stores = snapshots.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!stores.length) return NextResponse.json({ connected: false, reason: "Shopify svarte ikke. Kontroller tilgangene og koble til på nytt." }, { status: 502 });
  return NextResponse.json({
    ...aggregateShopifySnapshots(stores, data.length),
    ...shopifyPeriod(now),
    updatedAt: new Date().toISOString(),
  });
}

export async function DELETE(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Serveroppsettet mangler." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const shop = normalizeShopDomain(typeof body?.shop === "string" ? body.shop : "");
  const admin = createClient(context.url, serviceKey, { auth: { persistSession: false } });
  let query = admin.from("shopify_store_connections").delete().eq("business_id", context.business.id);
  if (shop) query = query.eq("shop_domain", shop);
  const { error } = await query;
  return error ? NextResponse.json({ error: "Kunne ikke fjerne Shopify-koblingen." }, { status: 500 }) : NextResponse.json({ ok: true });
}

