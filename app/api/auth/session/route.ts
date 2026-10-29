import { clearSessionCookies, getLaunchProfile, getLaunchSession, launchConfig, launchError, launchJson, publicUser, setSessionCookies, type LaunchSession } from '@/lib/progress/auth';

export async function GET(request: Request) {
  let session: LaunchSession | null = null;
  try {
    if (!launchConfig()) return launchJson({ configured: false, user: null, profile: null }, 503);
    session = await getLaunchSession(request);
    if (!session) { const result = launchJson({ user: null, error: 'Logg inn for å åpne kontoen.' }, 401); clearSessionCookies(result, request); return result; }
    const profile = await getLaunchProfile(session);
    const result = launchJson({ configured: true, user: publicUser(session.user), profile });
    if (session.rotated) setSessionCookies(result, session, request);
    return result;
  } catch (error) {
    const result = launchError(error);
    if (session?.rotated) setSessionCookies(result, session, request);
    return result;
  }
}
