import { NextResponse } from 'next/server';
import { ValidationError, sameOrigin } from '@/lib/progress/validation';

export const BACKEND_UNAVAILABLE = 'Kontoregistreringen åpner snart. Du kan lese alle læringssidene allerede nå.';
const PROFILE_FIELDS = 'user_id,display_name,organization_name,organization_kind,email_updates,sms_updates,phone_e164,consent_version,consent_updated_at,created_at';

export type LaunchUser = { id: string; email?: string; email_confirmed_at?: string; user_metadata?: Record<string, unknown> };
export type LaunchSession = { user: LaunchUser; accessToken: string; refreshToken?: string; expiresIn?: number; rotated?: boolean };
export class LaunchError extends Error {
  status: number;
  constructor(message: string, status = 503) { super(message); this.status = status; }
}
export function launchConfig() {
  const url = process.env.GROWTH_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const key = process.env.GROWTH_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  try { const u = new URL(url); if (!['https:', 'http:'].includes(u.protocol)) return null; } catch { return null; }
  return { url, key };
}
export function launchJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' } });
}
export function launchError(error: unknown): NextResponse {
  if (error instanceof ValidationError) return launchJson({ error: error.message }, 400);
  if (error instanceof LaunchError) return launchJson({ error: error.message }, error.status);
  return launchJson({ error: 'Tjenesten svarte ikke. Prøv igjen om litt.' }, 503);
}
export async function readLaunchJson(request: Request): Promise<Record<string, unknown>> {
  if (!sameOrigin(request)) throw new LaunchError('Forespørselen kunne ikke godkjennes. Last siden på nytt.', 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new LaunchError('Forventet et gyldig JSON-skjema.', 415);
  if (Number(request.headers.get('content-length')) > 16_384) throw new LaunchError('Skjemaet er for stort.', 413);
  const raw = await request.text();
  if (raw.length > 16_384) throw new LaunchError('Skjemaet er for stort.', 413);
  let data: unknown;
  try { data = JSON.parse(raw); } catch { throw new ValidationError('Skjemaet kunne ikke leses. Prøv igjen.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ValidationError('Ugyldig skjema.');
  return data as Record<string, unknown>;
}
export async function backend(path: string, options: RequestInit = {}, token?: string) {
  const config = launchConfig();
  if (!config) throw new LaunchError(BACKEND_UNAVAILABLE);
  let response: Response;
  try {
    response = await fetch(`${config.url}${path}`, { ...options, cache: 'no-store', signal: AbortSignal.timeout(12_000), headers: { apikey: config.key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...options.headers } });
  } catch { throw new LaunchError('Tjenesten svarte ikke. Prøv igjen om litt.'); }
  const data = await response.json().catch(() => null);
  return { response, data };
}
function cookie(request: Request, name: string) {
  const value = request.headers.get('cookie')?.split(';').map(p => p.trim()).find(p => p.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return undefined; }
}
export function setSessionCookies(response: NextResponse, session: LaunchSession, request: Request) {
  const shared = { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax' as const, path: '/' };
  response.cookies.set('vedoy-access-token', session.accessToken, { ...shared, maxAge: Math.min(session.expiresIn || 3600, 3600) });
  if (session.refreshToken) response.cookies.set('vedoy-refresh-token', session.refreshToken, { ...shared, maxAge: 60 * 60 * 24 * 30 });
}
export function clearSessionCookies(response: NextResponse, request: Request) {
  const shared = { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax' as const, path: '/', maxAge: 0 };
  for (const name of ['vedoy-access-token', 'vedoy-refresh-token', 'vedoy-remember']) response.cookies.set(name, '', shared);
}
export async function getLaunchSession(request: Request): Promise<LaunchSession | null> {
  if (!launchConfig()) return null;
  const accessToken = cookie(request, 'vedoy-access-token');
  if (accessToken) {
    const { response, data } = await backend('/auth/v1/user', {}, accessToken);
    if (response.ok && data?.id) return { user: data as LaunchUser, accessToken };
    if (response.status >= 500 || response.status === 429) throw new LaunchError('Innloggingstjenesten er midlertidig utilgjengelig.');
  }
  const refreshToken = cookie(request, 'vedoy-refresh-token');
  if (!refreshToken) return null;
  const { response, data } = await backend('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  if (response.status >= 500 || response.status === 429) throw new LaunchError('Innloggingstjenesten er midlertidig utilgjengelig.');
  if (!response.ok || !data?.access_token || !data?.refresh_token || !data?.user?.id) return null;
  return { user: data.user as LaunchUser, accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in, rotated: true };
}
export async function getLaunchProfile(session: LaunchSession) {
  const { response, data } = await backend(`/rest/v1/growth_launch_profiles?user_id=eq.${encodeURIComponent(session.user.id)}&select=${PROFILE_FIELDS}&limit=1`, {}, session.accessToken);
  if (!response.ok || !Array.isArray(data)) throw new LaunchError('Profilen kunne ikke hentes. Prøv igjen om litt.');
  return data[0] || null;
}
export function publicUser(user: LaunchUser) { return { email: user.email || '', emailConfirmed: Boolean(user.email_confirmed_at) }; }
