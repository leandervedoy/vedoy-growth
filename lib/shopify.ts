import "@shopify/shopify-api/adapters/node";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { ApiVersion, Session, shopifyApi } from "@shopify/shopify-api";

export const SHOPIFY_SCOPES = ["read_orders", "read_products", "read_customers", "read_analytics"];

export function normalizeShopDomain(input: string) {
  const value = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value) ? value : null;
}

function encryptionKey() {
  const secret = process.env.SHOPIFY_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("SHOPIFY_TOKEN_ENCRYPTION_KEY mangler.");
  return createHash("sha256").update(secret).digest();
}

export function encryptShopifyToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptShopifyToken(value: string) {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !encrypted) throw new Error("Ugyldig kryptert Shopify-token.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function shopifyClient(hostName: string) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecretKey = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecretKey) throw new Error("Shopify-appnøkler mangler.");
  return shopifyApi({ apiKey, apiSecretKey, scopes: SHOPIFY_SCOPES, hostName, apiVersion: ApiVersion.January26, isEmbeddedApp: false });
}

export async function fetchShopifySnapshot(hostName: string, shop: string, accessToken: string) {
  const api = shopifyClient(hostName);
  const session = new Session({ id: `offline_${shop}`, shop, state: "", isOnline: false, accessToken });
  const client = new api.clients.Graphql({ session, apiVersion: ApiVersion.January26 });
  const response = await client.request(`query VedoyGrowthSnapshot {
    shop { name currencyCode }
    orders(first: 100, sortKey: CREATED_AT, reverse: true) {
      nodes { createdAt totalPriceSet { shopMoney { amount currencyCode } } }
    }
  }`);
  const data = response.data as { shop: { name: string; currencyCode: string }; orders: { nodes: Array<{ createdAt: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } } }> } };
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const orders = data.orders.nodes.filter((order) => new Date(order.createdAt).getTime() >= since);
  return {
    shop,
    name: data.shop.name,
    currency: data.shop.currencyCode,
    sales: orders.reduce((sum, order) => sum + Number(order.totalPriceSet.shopMoney.amount), 0),
    orders: orders.length,
  };
}
