import { NextResponse } from "next/server";
import { getGoogleAccessToken, googleServiceAccountReady } from "@/lib/google-service-account";
import { getAuthContext } from "@/lib/workspace";
import { getConnectionSettings } from "@/lib/workspace-connections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const connection = await getConnectionSettings(auth, "search").catch(() => undefined);
  const siteUrl = connection?.settings?.siteUrl?.trim() || "";
  if (!siteUrl) return NextResponse.json({ connected: false, reason: "Legg inn Search Console-egenskapen." });
  if (!googleServiceAccountReady()) return NextResponse.json({ connected: false, configured: true, reason: "Vedøy sin Google-tilgang er ikke satt opp ennå." });

  try {
    const token = await getGoogleAccessToken();
    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const base = { startDate: dateDaysAgo(30), endDate: dateDaysAgo(1), dataState: "final" };
    const [summaryResponse, queryResponse] = await Promise.all([
      fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ ...base, rowLimit: 1 }), cache: "no-store" }),
      fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ ...base, dimensions: ["query"], rowLimit: 5 }), cache: "no-store" }),
    ]);
    const [summaryData, queryData] = await Promise.all([
      summaryResponse.json().catch(() => null),
      queryResponse.json().catch(() => null),
    ]);
    if (!summaryResponse.ok || !queryResponse.ok) {
      const message = summaryData?.error?.message || queryData?.error?.message || "Search Console avviste forespørselen.";
      return NextResponse.json({ connected: false, configured: true, reason: message }, { status: 502 });
    }

    const summary = summaryData?.rows?.[0] || {};
    const rows = Array.isArray(queryData?.rows) ? queryData.rows : [];
    const clicks = Number(summary.clicks) || 0;
    const impressions = Number(summary.impressions) || 0;
    return NextResponse.json({
      connected: true,
      siteUrl,
      clicks,
      impressions,
      ctr: impressions ? clicks / impressions : 0,
      position: Number(summary.position) || 0,
      queries: rows.map((row: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }) => ({
        query: row.keys?.[0] || "Ukjent",
        clicks: Number(row.clicks) || 0,
        impressions: Number(row.impressions) || 0,
        ctr: Number(row.ctr) || 0,
        position: Number(row.position) || 0,
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ connected: false, configured: true, reason: error instanceof Error ? error.message : "Kunne ikke hente Search Console-data." }, { status: 502 });
  }
}
