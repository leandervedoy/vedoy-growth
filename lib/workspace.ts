import { createClient } from "@supabase/supabase-js";

export type WorkspaceRole = "owner" | "admin" | "manager" | "employee";
export type BusinessProfile = { id: string; business_name: string; description: string; logo_url?: string | null; organization_number?: string | null; owner_name?: string | null; founder_name?: string | null; managing_director_name?: string | null; representative_role?: string | null };
export type WorkspaceContext = { token: string; url: string; key: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> }; business: BusinessProfile; role: WorkspaceRole };
export type AuthContext = { token: string; url: string; key: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } };

function config(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)vedoy-access-token=([^;]+)/)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { token, url, key };
}

function cookieValue(request: Request, name: string) {
  const value = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return value; }
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const current = config(request);
  if (!current.token || !current.url || !current.key) return null;
  const { token, url, key } = current;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { token, url, key, user: data.user };
}

export async function getWorkspaceContext(request: Request): Promise<WorkspaceContext | null> {
  const auth = await getAuthContext(request);
  if (!auth) return null;
  return getWorkspaceContextFromAuth(auth);
}

export async function getWorkspaceContextFromAuth(auth: AuthContext): Promise<WorkspaceContext | null> {
  const { user } = auth;
  const headers = { apikey: auth.key, Authorization: `Bearer ${auth.token}` };
  const fields = "id,business_name,description,logo_url,organization_number,owner_name,founder_name,managing_director_name,representative_role";
  const ownerResponse = await fetch(`${auth.url}/rest/v1/business_profiles?owner_id=eq.${user.id}&select=${fields}&limit=1`, { headers, cache: "no-store" });
  const owned = ownerResponse.ok ? await ownerResponse.json().catch(() => []) : [];
  if (owned[0]) return { ...auth, user, business: owned[0], role: "owner" };
  const memberResponse = await fetch(`${auth.url}/rest/v1/organization_members?user_id=eq.${user.id}&select=role,business:business_profiles(${fields})&limit=1`, { headers, cache: "no-store" });
  const memberships = memberResponse.ok ? await memberResponse.json().catch(() => []) : [];
  const membership = memberships[0];
  if (!membership?.business) return null;
  return { ...auth, user, business: membership.business, role: membership.role as WorkspaceRole };
}

export async function refreshAuthContext(request: Request): Promise<{ auth: AuthContext; accessToken: string; refreshToken: string; expiresIn: number; remember: boolean } | null> {
  const refreshToken = cookieValue(request, "vedoy-refresh-token");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!refreshToken || !url || !key) return null;
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { "Content-Type": "application/json", apikey: key }, body: JSON.stringify({ refresh_token: refreshToken }), cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token || !data?.refresh_token || !data?.user) return null;
  return { auth: { token: data.access_token, url, key, user: data.user }, accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in || 3600, remember: cookieValue(request, "vedoy-remember") === "1" };
}

export function canManageWorkspace(role: WorkspaceRole) { return role === "owner" || role === "admin" || role === "manager"; }
export function canManageUsers(role: WorkspaceRole) { return role === "owner" || role === "admin"; }

export function supabaseHeaders(context: AuthContext | WorkspaceContext, extra: Record<string, string> = {}) {
  return { apikey: context.key, Authorization: `Bearer ${context.token}`, "Content-Type": "application/json", ...extra };
}
