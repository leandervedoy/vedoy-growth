import "@shopify/shopify-api/adapters/node";
import { ApiVersion, Session, shopifyApi } from "@shopify/shopify-api";
import { setAbstractFetchFunc } from "@shopify/shopify-api/runtime";
import test from "node:test";
import assert from "node:assert/strict";
import { collectShopifySnapshot, SHOPIFY_PAYMENT_QUERY } from "../lib/shopify-snapshot.ts";

// Real installed SDK, simulated transport. No credentials or live requests.
const api = shopifyApi({ apiKey: "test-key", apiSecretKey: "test-secret", scopes: ["read_orders"],
  hostName: "localhost", apiVersion: ApiVersion.January26, isEmbeddedApp: false,
  logger: { level: 0 } });
const session = new Session({ id: "test", shop: "example.myshopify.com", state: "", isOnline: false, accessToken: "test-token" });
const collect = () => {
  const client = new api.clients.Graphql({ session, apiVersion: ApiVersion.January26 });
  return collectShopifySnapshot(variables => client.request(SHOPIFY_PAYMENT_QUERY, { variables }), session.shop);
};
const empty = { data: { shop: { name: "Example", currencyCode: "NOK" }, orders: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } };

test("installed SDK sends the production query/version and accepts an empty measured result", async () => {
  setAbstractFetchFunc(async (url, init) => {
    assert.match(String(url), /\/admin\/api\/2026-01\/graphql.json$/);
    const body = JSON.parse(init.body);
    assert.equal(body.query, SHOPIFY_PAYMENT_QUERY);
    assert.equal(body.variables.first, 250);
    return Response.json(empty);
  });
  const result = await collect();
  assert.equal(result.sales, 0);
  assert.equal(result.orders, 0);
});

for (const status of [401, 403, 429, 500]) {
  test(`installed SDK HTTP ${status} rejects the store without a fabricated zero`, async () => {
    setAbstractFetchFunc(async () => Response.json({ errors: "simulated upstream failure" }, { status }));
    await assert.rejects(collect());
  });
}

test("installed SDK rejects partial GraphQL results", async () => {
  setAbstractFetchFunc(async () => Response.json({ ...empty, errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] }));
  await assert.rejects(collect());
});
