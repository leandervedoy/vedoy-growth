import { NextResponse } from "next/server";
import { getAuthContext, supabaseHeaders } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ error: "Ikke innlogget." }, { status: 401 });
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const response = await fetch(
    `${auth.url}/rest/v1/website_status_checks?owner_id=eq.${auth.user.id}&checked_at=gte.${encodeURIComponent(since)}&select=online,status_code,response_time_ms,source,performance_score,checked_at&order=checked_at.asc&limit=500`,
    { headers: supabaseHeaders(auth), cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ available: false, checks: [] });
  const checks = await response.json().catch(() => []);
  const successful = checks.filter((check: { online?: boolean }) => check.online).length;
  const responseTimes = checks.map((check: { response_time_ms?: number }) => Number(check.response_time_ms)).filter((value: number) => Number.isFinite(value));
  return NextResponse.json({
    available: true,
    checks,
    uptimePercent: checks.length ? Math.round((successful / checks.length) * 10_000) / 100 : null,
    averageResponseTimeMs: responseTimes.length ? Math.round(responseTimes.reduce((sum: number, value: number) => sum + value, 0) / responseTimes.length) : null,
  });
}
