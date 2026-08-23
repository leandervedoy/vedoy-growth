import { getWorkspaceContext, supabaseHeaders } from "@/lib/workspace";
export const dynamic = "force-dynamic";
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export async function GET(request: Request) {
  const c = await getWorkspaceContext(request); if (!c) return new Response("Ikke innlogget.", { status: 401 });
  const r = await fetch(`${c.url}/rest/v1/work_time_entries?business_id=eq.${c.business.id}&select=owner_id,started_at,ended_at,note&order=started_at.desc`, { headers: supabaseHeaders(c), cache: "no-store" });
  const entries = await r.json().catch(() => []); if (!r.ok) return new Response("Kunne ikke hente timer.", { status: 500 });
  const rows = ["Bruker,Start,Slutt,Timer,Notat", ...entries.map((x: { owner_id: string; started_at: string; ended_at: string | null; note: string }) => { const hours = x.ended_at ? ((new Date(x.ended_at).getTime() - new Date(x.started_at).getTime()) / 3_600_000).toFixed(2) : "Pågår"; return [x.owner_id, x.started_at, x.ended_at || "", hours, x.note].map(csv).join(","); })];
  return new Response(rows.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=vedoy-timer.csv" } });
}
