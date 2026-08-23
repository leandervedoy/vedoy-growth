import type { AuthContext } from "@/lib/workspace";
import { supabaseHeaders } from "@/lib/workspace";

export async function getConnectionSettings(auth: AuthContext, moduleId: string) {
  const response = await fetch(
    `${auth.url}/rest/v1/workspace_connections?owner_id=eq.${auth.user.id}&module_id=eq.${encodeURIComponent(moduleId)}&select=settings,status,updated_at&limit=1`,
    { headers: supabaseHeaders(auth), cache: "no-store" },
  );
  const rows = await response.json().catch(() => []);
  if (!response.ok) throw new Error("Kunne ikke hente tilkoblingen.");
  return rows[0] as { settings?: Record<string, string>; status?: string; updated_at?: string } | undefined;
}

