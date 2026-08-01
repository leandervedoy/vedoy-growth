import { NextResponse } from "next/server";

const GRAPH_VERSION = "v23.0";
export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return NextResponse.json({ connected: false, accounts: [] });
  const base = `https://graph.facebook.com/${GRAPH_VERSION}/${userId}`;
  const [profileResponse, insightResponse] = await Promise.all([
    fetch(`${base}?fields=username,name,followers_count,media_count&access_token=${encodeURIComponent(token)}`, { next: { revalidate: 900 } }),
    fetch(`${base}/insights?metric=audience_country&period=lifetime&access_token=${encodeURIComponent(token)}`, { next: { revalidate: 900 } })
  ]);
  if (!profileResponse.ok) return NextResponse.json({ connected: false, accounts: [], reason: "Meta returned an error." }, { status: 502 });
  const profile = await profileResponse.json();
  const insight = insightResponse.ok ? await insightResponse.json() : { data: [] };
  const countries = insight.data?.[0]?.values?.[0]?.value ?? {};
  const topCountry = Object.entries(countries).sort(([, a], [, b]) => Number(b) - Number(a))[0];
  return NextResponse.json({ connected: true, accounts: [{ id: userId, platform: "instagram", username: profile.username, name: profile.name, followers: profile.followers_count ?? 0, topCountry: topCountry?.[0] ?? null, topCountryFollowers: topCountry?.[1] ?? null }] });
}
