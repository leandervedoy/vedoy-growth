import { backend, launchError, launchJson, readLaunchJson, setSessionCookies, LaunchError } from '@/lib/progress/auth';
import { parseRegistration, profileToRecord } from '@/lib/progress/validation';

export async function POST(request: Request) {
  try {
    const body = await readLaunchJson(request);
    if (body.website) throw new LaunchError('Registreringen kunne ikke behandles.', 400);
    const input = parseRegistration(body);
    const callback = new URL('/auth/callback', request.url).toString();
    const metadata = { ...profileToRecord(input), growth_launch_registration: true };
    const { response, data } = await backend(`/auth/v1/signup?redirect_to=${encodeURIComponent(callback)}`, { method: 'POST', body: JSON.stringify({ email: input.email, password: input.password, data: metadata }) });
    if (!response.ok) {
      if (response.status === 429) throw new LaunchError('For mange forsøk. Vent litt før du prøver igjen.', 429);
      if (response.status >= 500 || data?.code === 'email_address_not_authorized' || data?.error_code === 'email_address_not_authorized') throw new LaunchError('Registreringen er midlertidig utilgjengelig. Prøv igjen senere.');
      throw new LaunchError('Kontoen kunne ikke opprettes. Kontroller opplysningene, eller prøv å logge inn hvis du allerede har konto.', 400);
    }
    if (!data?.user?.id && !data?.id) throw new LaunchError('Registreringen kunne ikke bekreftes. Prøv igjen senere.');
    const authenticated = Boolean(data?.access_token && data?.refresh_token && data?.user?.id);
    const result = launchJson({ ok: true, authenticated, message: authenticated ? 'Kontoen er opprettet. Arbeidsflaten er fortsatt under utvikling.' : 'Hvis adressen kan registreres, får du en e-post for å bekrefte kontoen. Har du allerede konto, kan du logge inn.' }, 201);
    if (authenticated) setSessionCookies(result, { user: data.user, accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in }, request);
    return result;
  } catch (error) { return launchError(error); }
}
