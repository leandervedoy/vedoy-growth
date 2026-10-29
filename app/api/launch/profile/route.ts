import { backend, getLaunchProfile, getLaunchSession, launchError, launchJson, readLaunchJson, setSessionCookies, LaunchError, type LaunchSession } from '@/lib/progress/auth';
import { parseProfile, profileToRecord } from '@/lib/progress/validation';

export { GET } from '@/app/api/auth/session/route';

export async function PATCH(request: Request) {
  let session: LaunchSession | null = null;
  try {
    const body = await readLaunchJson(request);
    session = await getLaunchSession(request);
    if (!session) throw new LaunchError('Økten er utløpt. Logg inn på nytt før du lagrer.', 401);
    const profile = parseProfile(body);
    const existing = await getLaunchProfile(session);
    const path = existing ? `/rest/v1/growth_launch_profiles?user_id=eq.${encodeURIComponent(session.user.id)}` : '/rest/v1/growth_launch_profiles';
    const record = profileToRecord(profile);
    const { response, data } = await backend(path, { method: existing ? 'PATCH' : 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(existing ? record : { user_id: session.user.id, ...record }) }, session.accessToken);
    if (!response.ok || !Array.isArray(data) || data.length !== 1 || data[0].user_id !== session.user.id) throw new LaunchError('Endringene ble ikke lagret. Prøv igjen om litt.');
    const result = launchJson({ ok: true, profile: data[0] });
    if (session.rotated) setSessionCookies(result, session, request);
    return result;
  } catch (error) {
    const result = launchError(error);
    if (session?.rotated) setSessionCookies(result, session, request);
    return result;
  }
}
