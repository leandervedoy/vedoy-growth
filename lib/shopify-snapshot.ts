/** Read-only Shopify metrics. No tokens, SDK imports or customer data belong here. */
export type ShopifyPeriod = { periodStart: string; periodEnd: string };
export type ShopifyStoreSnapshot = ShopifyPeriod & {
  shop: string;
  name: string;
  currency: string;
  sales: number;
  orders: number;
  pages: number;
  excluded: { test: number; cancelled: number };
};
export type CurrencyTotal = { currency: string; sales: number; orders: number; stores: number };
export type ShopifyOverview = Partial<ShopifyPeriod> & {
  connected?: boolean;
  sales?: number | null;
  currency?: string | null;
  orders?: number | null;
  abandonedCheckouts?: number | null;
  currencyTotals?: CurrencyTotal[];
  partial?: boolean;
  reason?: string;
};
type Money = { shopMoney: { amount: string; currencyCode: string } };
type Order = { id: string; createdAt: string; test: boolean; cancelledAt: string | null; netPaymentSet: Money };
type PageData = {
  shop: { name: string; currencyCode: string };
  orders: { nodes: Order[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
};
type Variables = { first: number; after: string | null; query: string };
export type ShopifyPageRequest = (variables: Variables) => Promise<unknown>;

export const SHOPIFY_PAYMENT_QUERY = `query VedoyGrowthPayments($first: Int!, $after: String, $query: String!) {
  shop { name currencyCode }
  orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
    nodes {
      id createdAt test cancelledAt
      netPaymentSet { shopMoney { amount currencyCode } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

export const SHOPIFY_METRIC_DESCRIPTION = "Netto betalt (mottatt minus refusjoner, før gebyrer) på ikke-kansellerte ordre opprettet siste 30 døgn. Inkluderer betalt frakt og avgifter. Testordre er utelatt. Beløpet kan endres etter refusjoner. Dette er ikke regnskapsomsetning, netto bankoppgjør eller betalinger datert i perioden.";

export function shopifyPeriod(now = new Date()): ShopifyPeriod {
  if (!Number.isFinite(now.getTime())) throw new Error("Ugyldig måletidspunkt.");
  return { periodStart: new Date(now.getTime() - 30 * 86400000).toISOString(), periodEnd: now.toISOString() };
}

function readPage(response: unknown): PageData {
  const body = response as { data?: PageData; errors?: unknown } | null;
  if (!body || (Array.isArray(body.errors) ? body.errors.length > 0 : body.errors != null)) {
    throw new Error("Shopify returnerte feil; ingen ufullstendig totalsum vises.");
  }
  const data = body.data;
  if (!data?.shop || typeof data.shop.name !== "string" || !/^[A-Z]{3}$/.test(data.shop.currencyCode)
    || !Array.isArray(data.orders?.nodes) || typeof data.orders.pageInfo?.hasNextPage !== "boolean") {
    throw new Error("Shopify returnerte ufullstendige ordredata.");
  }
  return data;
}

async function requestBeforeDeadline(request: ShopifyPageRequest, variables: Variables, deadline: number) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Shopify-målingen tok for lang tid. Prøv igjen.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => request(variables)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Shopify-målingen tok for lang tid. Prøv igjen.")), remaining); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Finish every page, or fail the store explicitly. Never return a truncated total. */
export async function collectShopifySnapshot(
  request: ShopifyPageRequest,
  shop: string,
  options: { now?: Date; maxPages?: number; timeoutMs?: number } = {},
): Promise<ShopifyStoreSnapshot> {
  const period = shopifyPeriod(options.now);
  const start = Date.parse(period.periodStart);
  const end = Date.parse(period.periodEnd);
  const maxPages = options.maxPages ?? 100;
  const timeoutMs = options.timeoutMs ?? 25000;
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100 || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Ugyldig grense for Shopify-måling.");
  }
  const deadline = Date.now() + timeoutMs;
  const query = `created_at:>='${period.periodStart}' created_at:<='${period.periodEnd}'`;
  const cursors = new Set<string>();
  const seenOrders = new Set<string>();
  let after: string | null = null;
  let snapshot: ShopifyStoreSnapshot | undefined;

  for (let page = 1; page <= maxPages; page += 1) {
    const data = readPage(await requestBeforeDeadline(request, { first: 250, after, query }, deadline));
    if (!snapshot) snapshot = { ...period, shop, name: data.shop.name, currency: data.shop.currencyCode, sales: 0, orders: 0, pages: 0, excluded: { test: 0, cancelled: 0 } };
    if (data.shop.currencyCode !== snapshot.currency) throw new Error("Butikkens valuta endret seg under målingen. Prøv igjen.");
    snapshot.pages = page;

    for (const order of data.orders.nodes) {
      if (!order || typeof order.id !== "string" || !order.id || typeof order.test !== "boolean"
        || !(order.cancelledAt === null || typeof order.cancelledAt === "string") || typeof order.createdAt !== "string") {
        throw new Error("Shopify returnerte en ugyldig ordre.");
      }
      const created = Date.parse(order.createdAt);
      if (!Number.isFinite(created)) throw new Error("Shopify returnerte en ugyldig ordredato.");
      if (created < start || created > end || seenOrders.has(order.id)) continue;
      seenOrders.add(order.id);
      if (order.test) { snapshot.excluded.test += 1; continue; }
      if (order.cancelledAt !== null) { snapshot.excluded.cancelled += 1; continue; }
      const money = order.netPaymentSet?.shopMoney;
      if (!money || money.currencyCode !== snapshot.currency || typeof money.amount !== "string" || !/^-?\d+(?:\.\d+)?$/.test(money.amount)) {
        throw new Error("Ordren mangler gyldig beløp i butikkens valuta.");
      }
      const amount = Number(money.amount);
      if (!Number.isFinite(amount)) throw new Error("Shopify returnerte et ugyldig beløp.");
      snapshot.sales += amount;
      if (!Number.isFinite(snapshot.sales)) throw new Error("Shopify-totalen overstiger gyldig tallområde.");
      snapshot.orders += 1;
    }

    if (!data.orders.pageInfo.hasNextPage) return { ...snapshot, sales: Number(snapshot.sales.toFixed(6)) };
    const cursor = data.orders.pageInfo.endCursor;
    if (typeof cursor !== "string" || !cursor || cursors.has(cursor)) throw new Error("Shopify-pagineringen stoppet. Ingen ufullstendig totalsum vises.");
    cursors.add(cursor);
    after = cursor;
  }
  throw new Error("Perioden krever mer enn 25 000 ordre eller sidegrensen. Bruk bakgrunnssynk; ingen ufullstendig totalsum vises.");
}

export function aggregateShopifySnapshots(stores: ShopifyStoreSnapshot[], expectedStores = stores.length) {
  const grouped = new Map<string, CurrencyTotal>();
  for (const store of stores) {
    const group = grouped.get(store.currency) ?? { currency: store.currency, sales: 0, orders: 0, stores: 0 };
    group.sales += store.sales;
    group.orders += store.orders;
    group.stores += 1;
    grouped.set(store.currency, group);
  }
  const currencyTotals = Array.from(grouped.values()).map((total) => ({ ...total, sales: Number(total.sales.toFixed(6)) })).sort((a, b) => a.currency.localeCompare(b.currency));
  const partial = stores.length !== expectedStores;
  const singleCurrency = !partial && currencyTotals.length === 1;
  return {
    connected: stores.length > 0,
    sales: singleCurrency ? currencyTotals[0].sales : null,
    currency: singleCurrency ? currencyTotals[0].currency : null,
    orders: partial || !stores.length ? null : stores.reduce((sum, store) => sum + store.orders, 0),
    abandonedCheckouts: null,
    currencyTotals,
    stores,
    partial,
    metric: "net_payments_for_created_orders",
    metricDescription: SHOPIFY_METRIC_DESCRIPTION,
    reason: partial ? `Kun ${stores.length} av ${expectedStores} butikker kunne måles. Ingen samlet totalsum vises.` : currencyTotals.length > 1 ? "Butikkene har ulike valutaer. Beløp vises separat uten valutakonvertering." : undefined,
  };
}

export function formatShopifyMoney(amount: number | null | undefined, currency?: string | null) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || !currency || !/^[A-Z]{3}$/.test(currency)) return "—";
  return new Intl.NumberFormat("nb-NO", { style: "currency", currency }).format(amount);
}

export function formatShopifySales(snapshot: ShopifyOverview | null) {
  if (!snapshot?.connected) return "—";
  if (snapshot.partial) return "Ufullstendig";
  if ((snapshot.currencyTotals?.length ?? 0) > 1) return "Flere valutaer";
  return formatShopifyMoney(snapshot.sales, snapshot.currency);
}

export function formatShopifyCount(value: number | null | undefined, connected?: boolean) {
  return connected && typeof value === "number" && Number.isInteger(value) && value >= 0 ? value.toLocaleString("nb-NO") : "—";
}

/** Always replace stale measurements when transport, HTTP or decoding fails. */
export async function loadShopifyOverview(request: () => Promise<Response>): Promise<ShopifyOverview> {
  try {
    const response = await request();
    const data = await response.json();
    if (!response.ok) throw new Error("Shopify-data kunne ikke oppdateres. Prøv igjen.");
    if (!data || typeof data.connected !== "boolean") throw new Error("Ugyldig svar fra Shopify-målingen.");
    return data;
  } catch {
    return { connected: false, sales: null, orders: null, abandonedCheckouts: null,
      reason: "Shopify-data kunne ikke oppdateres. Tidligere tall er skjult. Prøv igjen." };
  }
}
