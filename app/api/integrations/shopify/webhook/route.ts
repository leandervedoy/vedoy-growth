import { timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const eventSchema = z.object({
  version: z.literal(1),
  source: z.literal("shopify"),
  deliveryId: z.string().min(8).max(200),
  shopDomain: z.string().regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/),
  topic: z.enum(["orders/create", "products/update", "customers/create"]),
  receivedAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

function secureTokenMatch(received: string | null, expected: string | undefined) {
  if (!received?.startsWith("Bearer ") || !expected) return false;
  const supplied = Buffer.from(received.slice(7), "utf8");
  const configured = Buffer.from(expected, "utf8");
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  if (!secureTokenMatch(request.headers.get("authorization"), process.env.SHOPIFY_WEBHOOK_TOKEN)) {
    return NextResponse.json({ error: "Ugyldig webhook-token." }, { status: 401 });
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig webhook-data." }, { status: 400 });
  }

  const admin = serverClient();
  if (!admin) {
    return NextResponse.json({ error: "Growth-databasen er ikke konfigurert." }, { status: 503 });
  }

  const event = parsed.data;
  const { data: connection, error: connectionError } = await admin
    .from("shopify_store_connections")
    .select("business_id")
    .eq("shop_domain", event.shopDomain)
    .eq("status", "connected")
    .limit(1)
    .maybeSingle();

  if (connectionError) {
    return NextResponse.json({ error: "Kunne ikke kontrollere Shopify-butikken." }, { status: 503 });
  }
  if (!connection) {
    return NextResponse.json({ error: "Shopify-butikken er ikke koblet til en Growth-bedrift." }, { status: 409 });
  }

  const { error } = await admin.from("shopify_sync_events").insert({
    business_id: connection.business_id,
    delivery_id: event.deliveryId,
    shop_domain: event.shopDomain,
    topic: event.topic,
    payload: event.payload,
    received_at: event.receivedAt,
  });

  if (error?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true, deliveryId: event.deliveryId });
  }
  if (error) {
    return NextResponse.json({ error: "Webhooken kunne ikke lagres." }, { status: 503 });
  }

  return NextResponse.json({ received: true, duplicate: false, deliveryId: event.deliveryId });
}

export async function GET(request: Request) {
  const context = await getWorkspaceContext(request);
  if (!context) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });

  const admin = serverClient();
  if (!admin) return NextResponse.json({ events: [], configured: false }, { status: 503 });
  const { data, error } = await admin
    .from("shopify_sync_events")
    .select("delivery_id,shop_domain,topic,payload,received_at")
    .eq("business_id", context.business.id)
    .order("received_at", { ascending: false })
    .limit(25);

  return error
    ? NextResponse.json({ error: "Kunne ikke hente Shopify-synk." }, { status: 500 })
    : NextResponse.json({ events: data, configured: true });
}
