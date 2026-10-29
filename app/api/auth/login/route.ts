import { backend, launchError, launchJson, readLaunchJson, setSessionCookies, LaunchError } from '@/lib/progress/auth';
export async function POST(request: Request) {
  try {
    const body = await readLaunchJson(request);
    if (typeof body.email !== 'string' || !body.email.trim() || body.email.length > 254 || typeof body.password !== 'string' || !body.password || body.password.length > 128) throw new LaunchError('Skriv e-post og passord.', 400);
    const { response, data } = await backend('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: body.email.trim().toLowerCase(), password: body.password }) });
    if (response.status === 429) throw new LaunchError('For mange forsøk. Vent litt før du prøver igjen.', 429);
    if (response.status >= 500) throw new LaunchError('Innloggingen er midlertidig utilgjengelig.');
    if (!response.ok || !data?.access_token || !data?.refresh_token || !data?.user?.id) throw new LaunchError('Kunne ikke logge inn. Kontroller e-post og passord, og at e-postadressen er bekreftet.', 401);
    const result = launchJson({ ok: true });
    setSessionCookies(result, { user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in }, request);
    return result;
  } catch (error) { return launchError(error); }
}
