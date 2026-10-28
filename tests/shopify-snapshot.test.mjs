import test from "node:test";
import assert from "node:assert/strict";
import { aggregateShopifySnapshots, collectShopifySnapshot, formatShopifyCount, formatShopifySales, shopifyPeriod } from "../lib/shopify-snapshot.ts";

const now = new Date("2026-10-29T00:00:00.000Z");
const shop = "example.myshopify.com";
const order = (id, amount = "10.00", override = {}) => ({
  id: `gid://shopify/Order/${id}`, createdAt: "2026-10-28T12:00:00.000Z", test: false,
  cancelledAt: null, netPaymentSet: { shopMoney: { amount, currencyCode: "NOK" } }, ...override,
});
const response = (nodes = [], cursor = null, currency = "NOK") => ({ data: {
  shop: { name: "Example", currencyCode: currency },
  orders: { nodes, pageInfo: { hasNextPage: cursor !== null, endCursor: cursor } },
} });
const store = (currency, sales, orders = 1) => ({
  shop, name: "Example", currency, sales, orders, pages: 1,
  excluded: { test: 0, cancelled: 0 }, ...shopifyPeriod(now),
});

test("501 recent orders are counted across all pages with a fixed date window", async () => {
  const pages = [response(Array.from({ length: 250 }, (_, i) => order(i)), "page-2"),
    response(Array.from({ length: 250 }, (_, i) => order(i + 250)), "page-3"), response([order(500)])];
  const calls = [];
  const result = await collectShopifySnapshot(async (variables) => { calls.push(variables); return pages.shift(); }, shop, { now });
  assert.equal(result.orders, 501);
  assert.equal(result.sales, 5010);
  assert.equal(result.pages, 3);
  assert.deepEqual(calls.map((call) => call.after), [null, "page-2", "page-3"]);
  assert.ok(calls.every((call) => call.query.includes("2026-09-29T00:00:00.000Z") && call.query.includes("2026-10-29T00:00:00.000Z")));
});

test("net payments include partial refunds, while test, cancelled and out-of-period orders are excluded", async () => {
  const result = await collectShopifySnapshot(async () => response([
    order(1, "300.00"), order(2, "80.00"), // Shopify netPaymentSet already subtracts the refund.
    order(3, "0.00"), order(4, "10000.00", { test: true }),
    order(5, "2000.00", { cancelledAt: "2026-10-28T15:00:00Z" }),
    order(6, "500.00", { createdAt: "2026-09-28T23:59:59.999Z" }),
    order(7, "500.00", { createdAt: "2026-10-29T00:00:00.001Z" }),
  ]), shop, { now });
  assert.equal(result.sales, 380);
  assert.equal(result.orders, 3);
  assert.deepEqual(result.excluded, { test: 1, cancelled: 1 });
});

test("duplicate order IDs at page boundaries do not inflate payments", async () => {
  let page = 0;
  const result = await collectShopifySnapshot(async () => ++page === 1 ? response([order(1)], "next") : response([order(1), order(2)]), shop, { now });
  assert.equal(result.orders, 2);
  assert.equal(result.sales, 20);
});

test("a failed later page rejects the store instead of returning a truncated total", async () => {
  let page = 0;
  await assert.rejects(collectShopifySnapshot(async () => {
    if (++page === 1) return response([order(1)], "next");
    throw new Error("upstream unavailable");
  }, shop, { now }), /upstream unavailable/);
});

test("GraphQL partial-data errors cannot become successful payments", async () => {
  await assert.rejects(collectShopifySnapshot(async () => ({ ...response([order(1)]), errors: [{ message: "Throttled" }] }), shop, { now }), /returnerte feil/);
});

test("repeating cursor and page limits fail explicitly rather than hanging or undercounting", async () => {
  await assert.rejects(collectShopifySnapshot(async () => response([order(1)], "same"), shop, { now }), /pagineringen stoppet/);
  await assert.rejects(collectShopifySnapshot(async () => response([order(1)], "more"), shop, { now, maxPages: 1 }), /sidegrensen/);
});

test("a hanging request respects the overall timeout", async () => {
  await assert.rejects(collectShopifySnapshot(() => new Promise(() => {}), shop, { now, timeoutMs: 10 }), /tok for lang tid/);
});

test("missing amounts and per-order currency mismatch fail instead of becoming zero", async () => {
  for (const money of [{ amount: "", currencyCode: "NOK" }, { amount: "1.00", currencyCode: "USD" }, { amount: "NaN", currencyCode: "NOK" }]) {
    await assert.rejects(collectShopifySnapshot(async () => response([order(1, "1", { netPaymentSet: { shopMoney: money } })]), shop, { now }), /gyldig beløp/);
  }
});

test("a complete empty store has a measured zero, while abandoned checkout remains unknown", async () => {
  const result = await collectShopifySnapshot(async () => response(), shop, { now });
  const summary = aggregateShopifySnapshots([result]);
  assert.equal(summary.sales, 0);
  assert.equal(summary.orders, 0);
  assert.equal(summary.currency, "NOK");
  assert.equal(summary.abandonedCheckouts, null);
});

test("NOK and USD stores remain separate and never produce a fabricated combined currency", () => {
  const summary = aggregateShopifySnapshots([store("NOK", 1000, 3), store("USD", 100, 2)]);
  assert.equal(summary.sales, null);
  assert.equal(summary.currency, null);
  assert.equal(summary.orders, 5);
  assert.deepEqual(summary.currencyTotals.map(({ currency, sales }) => ({ currency, sales })), [{ currency: "NOK", sales: 1000 }, { currency: "USD", sales: 100 }]);
  assert.equal(formatShopifySales(summary), "Flere valutaer");
});

test("same-currency stores can be added without floating-point display residue", () => {
  const summary = aggregateShopifySnapshots([store("NOK", 0.1), store("NOK", 0.2)]);
  assert.equal(summary.sales, 0.3);
  assert.equal(summary.currency, "NOK");
});

test("a failed store suppresses the overall total and exposes partial coverage", () => {
  const summary = aggregateShopifySnapshots([store("NOK", 100)], 2);
  assert.equal(summary.partial, true);
  assert.equal(summary.sales, null);
  assert.equal(summary.orders, null);
  assert.equal(summary.currencyTotals[0].sales, 100);
  assert.equal(formatShopifySales(summary), "Ufullstendig");
});

test("frontend distinguishes unavailable measurements from a measured zero", () => {
  assert.equal(formatShopifyCount(null, true), "—");
  assert.equal(formatShopifyCount(undefined, true), "—");
  assert.equal(formatShopifyCount(0, true), "0");
  assert.equal(formatShopifyCount(12, false), "—");
  assert.equal(formatShopifySales({ connected: true, sales: 100 }), "—");
});
