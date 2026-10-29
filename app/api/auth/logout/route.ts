import { backend, clearSessionCookies, getLaunchSession, launchError, launchJson, readLaunchJson } from '@/lib/progress/auth';

export async function POST(request: Request) {
  try {
    await readLaunchJson(request);
    let revoked = false;
    try {
      const session = await getLaunchSession(request);
      if (session) { const { response } = await backend('/auth/v1/logout?scope=local', { method: 'POST' }, session.accessToken); revoked = response.ok; }
    } catch { /* Clear this browser's cookies even during a provider outage. */ }
    const result = launchJson({ ok: true, serverSessionRevoked: revoked });
    clearSessionCookies(result, request);
    return result;
  } catch (error) { return launchError(error); }
}
