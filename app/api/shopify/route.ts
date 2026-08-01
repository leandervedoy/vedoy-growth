import { NextResponse } from "next/server";

export async function GET() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!domain || !token) return NextResponse.json({ connected: false, reason: "Shopify is not connected yet." });
  const query = `query GrowthSnapshot { orders(first: 100, query: "created_at:>=2026-01-01") { nodes { totalPriceSet { shopMoney { amount currencyCode } } } } abandonedCheckouts(first: 100) { nodes { id } } }`;
  const response = await fetch(`https://${domain}/admin/api/2026-01/graphql.json`, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token }, body: JSON.stringify({ query }), next: { revalidate: 900 } });
  if (!response.ok) return NextResponse.json({ connected: false, reason: "Shopify returned an error." }, { status: 502 });
  const json = await response.json();
  if (json.errors) return NextResponse.json({ connected: false, reason: "Shopify query failed." }, { status: 502 });
  const orders = json.data.orders.nodes;
  const sales = orders.reduce((sum: number, order: { totalPriceSet: { shopMoney: { amount: string } } }) => sum + Number(order.totalPriceSet.shopMoney.amount), 0);
  return NextResponse.json({ connected: true, sales, orders: orders.length, abandonedCheckouts: json.data.abandonedCheckouts.nodes.length });
}
