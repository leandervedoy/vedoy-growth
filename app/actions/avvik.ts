"use server";

import { headers } from "next/headers";
import { avvikSchema } from "@/app/schemas/avvik";
import { getWorkspaceContext, supabaseHeaders } from "@/lib/workspace";
import { isGrowthWorkspaceOpen, WORKSPACE_UNAVAILABLE_MESSAGE } from "@/lib/progress/launch";

export type AvvikActionResult = { success: true; id: string } | { success: false; formError?: string; fieldErrors?: Record<string, string[] | undefined> };

export async function lagreAvvik(formData: FormData): Promise<AvvikActionResult> {
  if (!isGrowthWorkspaceOpen()) return { success: false, formError: WORKSPACE_UNAVAILABLE_MESSAGE };

  const parsed = avvikSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    immediateAction: formData.get("immediateAction"),
    category: formData.get("category"),
    severity: formData.get("severity"),
  });

  if (!parsed.success) return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const cookie = (await headers()).get("cookie") || "";
  const workspace = await getWorkspaceContext(new Request("http://internal/avvik", { headers: { cookie } }));
  if (!workspace) return { success: false, formError: "Logg inn og velg en arbeidsflate før du registrerer avvik." };

  const response = await fetch(`${workspace.url}/rest/v1/incident_reports`, {
    method: "POST",
    headers: supabaseHeaders(workspace, { Prefer: "return=representation" }),
    body: JSON.stringify({ business_id: workspace.business.id, reported_by: workspace.user.id, ...parsed.data }),
    cache: "no-store",
  });
  const rows = await response.json().catch(() => []);
  if (!response.ok || !rows[0]?.id) return { success: false, formError: "Kunne ikke lagre avviket. Kjør nyeste supabase/schema.sql først." };
  return { success: true, id: rows[0].id };
}
