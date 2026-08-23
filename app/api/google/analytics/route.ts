import { NextResponse } from "next/server";
import { getGoogleAccessToken, googleServiceAccountReady } from "@/lib/google-service-account";
import { getAuthContext } from "@/lib/workspace";
import { getConnectionSettings } from "@/lib/workspace-connections";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function metric(row: unknown, index: number) {
  const value = (row as { metricValues?: Array<{ value?: string }> } | undefined)?.metricValues?.[index]?.value;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const connection = await getConnectionSettings(auth, "analytics").catch(() => undefined);
  const propertyId = connection?.settings?.propertyId?.replace(/\D/g, "") || "";
  if (!propertyId) return NextResponse.json({ connected: false, reason: "Legg inn GA4 Property ID." });
  if (!googleServiceAccountReady()) return NextResponse.json({ connected: false, configured: true, reason: "Vedøy sin Google-tilgang er ikke satt opp ennå." });

  try {
    const token = await getGoogleAccessToken();
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "29daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "engagementRate" },
          { name: "totalRevenue" },
        ],
        metricAggregations: ["TOTAL"],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.error?.message || "Google Analytics avviste forespørselen.";
      return NextResponse.json({ connected: false, configured: true, reason: message }, { status: 502 });
    }

    const total = data?.totals?.[0];
    const sources = Array.isArray(data?.rows)
      ? data.rows.map((row: { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }) => ({
        name: row.dimensionValues?.[0]?.value || "Ukjent",
        sessions: metric(row, 1),
      }))
      : [];
    return NextResponse.json({
      connected: true,
      propertyId,
      activeUsers: metric(total, 0),
      sessions: metric(total, 1),
      views: metric(total, 2),
      engagementRate: metric(total, 3),
      revenue: metric(total, 4),
      sources,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ connected: false, configured: true, reason: error instanceof Error ? error.message : "Kunne ikke hente Analytics-data." }, { status: 502 });
  }
}

