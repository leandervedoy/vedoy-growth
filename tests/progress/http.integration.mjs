/**
 * Launch HTTP integration, using only synthetic users and a loopback Supabase stub.
 *
 * Run after installing this repository's dependencies (Node 22+):
 *   node tests/progress/http.integration.mjs
 * Optional port override, excluding the normal application port 3000:
 *   GROWTH_HTTP_TEST_PORT=3312 node tests/progress/http.integration.mjs
 *
 * Copies sources into a disposable directory and starts Next dev there, so neither
 * .next nor generated TypeScript files conflict with a simultaneous production build.
 * No .env files or provider credentials are copied/inherited. A preload denies
 * non-loopback network connections in the Next process and its workers.
 *
 * This exercises the real HTTP handlers, middleware and cookies. It does not claim
 * to test real Supabase Auth, PostgreSQL RLS, email delivery or browser callback JS.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, access, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appPort = Number(process.env.GROWTH_HTTP_TEST_PORT || 3311);
assert.ok(Number.isInteger(appPort) && appPort > 1024 && appPort < 65536 && appPort !== 3000, 'Choose a dedicated test port, for example 3311');
// NextURL canonicalizes loopback IP hosts to localhost. Match that canonical
// Host/Origin pair while making all TCP connections explicitly to 127.0.0.1.
const appOrigin = `http://localhost:${appPort}`;
const userId = '10000000-0000-4000-8000-000000000001';
const otherUserId = '10000000-0000-4000-8000-000000000002';
const publishableKey = 'synthetic-loopback-publishable-key';
const currentAccess = 'synthetic-current-access-token';
const currentRefresh = 'synthetic-current-refresh-token';
const oldRefresh = 'synthetic-old-refresh-token';
const rotatedAccess = 'synthetic-rotated-access-token';
const rotatedRefresh = 'synthetic-rotated-refresh-token';
const validCookie = `vedoy-access-token=${currentAccess}; vedoy-refresh-token=${currentRefresh}`;
const expiredCookie = `vedoy-access-token=synthetic-expired-access; vedoy-refresh-token=${oldRefresh}`;
const user = { id: userId, email: 'owner@example.invalid', email_confirmed_at: '2026-10-29T00:00:00Z' };
const profile = {
  user_id: userId, display_name: 'Synthetic Owner', organization_name: 'Synthetic Association', organization_kind: 'association',
  email_updates: false, sms_updates: false, phone_e164: null, consent_version: '2026-10-29-v1',
  consent_updated_at: '2026-10-29T00:00:00Z', created_at: '2026-10-29T00:00:00Z',
};
const registration = {
  displayName: 'Synthetic Owner', organizationName: 'Synthetic Association', organizationKind: 'association',
  email: 'owner@example.invalid', password: 'synthetic-test-password-only', privacyAccepted: true,
};
const profileInput = {
  displayName: 'Updated Synthetic Owner', organizationName: 'Synthetic Association', organizationKind: 'association',
  emailUpdates: false, smsUpdates: false, phone: null, user_id: otherUserId,
};
let mode = 'normal';
let calls = [];
let passed = 0;
let nextLog = '';
let temporaryDirectory;
let nextProcess;
let stub;

function reply(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(status === 204 ? undefined : JSON.stringify(body));
}

async function handleStub(request, response) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  const body = raw ? JSON.parse(raw) : null;
  const url = new URL(request.url, 'http://127.0.0.1');
  const call = { method: request.method, pathname: url.pathname, search: url.searchParams, body, authorization: request.headers.authorization };
  calls.push(call);
  assert.equal(request.headers.apikey, publishableKey, 'The real handler must use the synthetic backend key');

  if (url.pathname === '/auth/v1/signup' && request.method === 'POST') {
    if (mode === 'signup-outage') return reply(response, 503, { message: 'Synthetic provider outage' });
    if (mode === 'signup-rate') return reply(response, 429, { message: 'Synthetic rate limit' });
    if (mode === 'signup-email-denied') return reply(response, 422, { error_code: 'email_address_not_authorized' });
    if (mode === 'signup-malformed') return reply(response, 200, {});
    if (mode === 'signup-duplicate') return reply(response, 200, { user: { id: otherUserId, identities: [] } });
    return reply(response, 200, { user: { id: userId, email: body.email, email_confirmed_at: null } });
  }
  if (url.pathname === '/auth/v1/user' && request.method === 'GET') {
    if (mode === 'auth-outage') return reply(response, 503, { message: 'Synthetic auth outage' });
    if (mode === 'auth-rate') return reply(response, 429, { message: 'Synthetic auth rate limit' });
    if (call.authorization === `Bearer ${currentAccess}` || call.authorization === `Bearer ${rotatedAccess}`) return reply(response, 200, user);
    return reply(response, 401, { message: 'Synthetic expired access token' });
  }
  if (url.pathname === '/auth/v1/token' && request.method === 'POST') {
    if (url.searchParams.get('grant_type') === 'password') {
      if (mode === 'login-invalid') return reply(response, 400, { error_code: 'invalid_credentials' });
      return reply(response, 200, { user, access_token: currentAccess, refresh_token: currentRefresh, expires_in: 3600 });
    }
    if (url.searchParams.get('grant_type') === 'refresh_token') {
      if (mode === 'invalid-session') return reply(response, 400, { error_code: 'refresh_token_not_found' });
      assert.equal(body.refresh_token, oldRefresh);
      return reply(response, 200, { user, access_token: rotatedAccess, refresh_token: rotatedRefresh, expires_in: 3600 });
    }
  }
  if (url.pathname === '/rest/v1/growth_launch_profiles') {
    if (request.method === 'GET') {
      if (mode === 'refresh-profile-error') return reply(response, 500, { message: 'Synthetic profile read failure' });
      return reply(response, 200, mode === 'profile-missing' ? [] : [profile]);
    }
    if (request.method === 'PATCH' || request.method === 'POST') return reply(response, 200, [{ ...profile, ...body, user_id: userId }]);
  }
  if (url.pathname === '/auth/v1/logout' && request.method === 'POST') return reply(response, 204);
  reply(response, 500, { error: `Unexpected synthetic upstream route: ${request.method} ${url.pathname}` });
}

function request(pathname, { method = 'GET', json, raw, origin = appOrigin, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const body = json === undefined ? raw : JSON.stringify(json);
    const requestHeaders = { Host: `localhost:${appPort}`, ...(origin === null ? {} : { Origin: origin }), ...headers };
    if (body !== undefined) {
      requestHeaders['Content-Type'] ??= 'application/json';
      requestHeaders['Content-Length'] = Buffer.byteLength(body);
    }
    // Use http.request rather than URL/fetch so encoded traversal reaches Next verbatim.
    const req = http.request({ hostname: '127.0.0.1', port: appPort, path: pathname, method, headers: requestHeaders, agent: false }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = JSON.parse(text); } catch { data = null; }
        resolve({ status: response.statusCode, headers: response.headers, cookies: response.headers['set-cookie'] || [], data, text });
      });
    });
    req.setTimeout(45_000, () => req.destroy(new Error(`HTTP request timed out: ${method} ${pathname}`)));
    req.on('error', reject);
    req.end(body);
  });
}

function privateResponse(response) {
  assert.match(response.headers['cache-control'] || '', /no-store/i);
  for (const token of [publishableKey, currentAccess, currentRefresh, oldRefresh, rotatedAccess, rotatedRefresh]) assert.ok(!response.text.includes(token), 'Credentials must not appear in JSON');
}
function assertCookie(response, name, value) {
  const cookie = response.cookies.find(item => item.startsWith(`${name}=${value};`));
  assert.ok(cookie, `${name} must be set to the expected synthetic value`);
  assert.match(cookie, /; HttpOnly(?:;|$)/i);
  assert.match(cookie, /; SameSite=Lax(?:;|$)/i);
  assert.match(cookie, /; Path=\/(?:;|$)/i);
  return cookie;
}
async function scenario(name, run, nextMode = 'normal') {
  mode = nextMode;
  calls = [];
  await run();
  passed += 1;
  console.log(`PASS ${name}`);
}
async function availablePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(appPort, '127.0.0.1', resolve); });
  await new Promise(resolve => probe.close(resolve));
}
async function snapshot() {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'vedoy-growth-http-'));
  const sources = ['app', 'components', 'lib', 'public', 'packages', 'middleware.ts', 'tsconfig.json', 'next-env.d.ts', 'package.json', 'package-lock.json', 'next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts'];
  for (const source of sources) {
    const from = path.join(repo, source);
    try { await access(from); } catch { continue; }
    await cp(from, path.join(temporaryDirectory, source), {
      recursive: true,
      filter: entry => !path.relative(repo, entry).split(path.sep).some(part => part === 'node_modules' || part === '.git' || part.startsWith('.next') || part.startsWith('.env')),
    });
  }
  await access(path.join(repo, 'node_modules/next/dist/bin/next'));
  await symlink(path.join(repo, 'node_modules'), path.join(temporaryDirectory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  const preload = path.join(temporaryDirectory, 'loopback-only.cjs');
  await writeFile(preload, `
const net = require('node:net');
const allowed = host => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(host).toLowerCase());
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...originalArgs) {
  const args = Array.isArray(originalArgs[0]) ? originalArgs[0] : originalArgs;
  const first = args[0];
  const options = first && typeof first === 'object' ? first : null;
  const localPipe = options?.path || (typeof first === 'string' && !/^\\d+$/.test(first));
  const host = options ? (options.host || options.hostname || 'localhost') : (typeof args[1] === 'string' ? args[1] : 'localhost');
  if (!localPipe && !allowed(host)) throw new Error('HTTP integration forbids non-loopback connections');
  return originalConnect.apply(this, originalArgs);
};
const originalFetch = globalThis.fetch;
if (originalFetch) globalThis.fetch = async function(input, ...rest) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!allowed(url.hostname)) throw new Error('HTTP integration forbids non-loopback fetch');
  return originalFetch.call(this, input, ...rest);
};
`);
  return preload;
}
async function waitUntilReady() {
  const deadline = Date.now() + 100_000;
  while (Date.now() < deadline) {
    if (nextProcess.exitCode !== null) throw new Error(`Next dev exited before readiness (${nextProcess.exitCode})`);
    try {
      const response = await request('/api/auth/session');
      if (response.status === 401) return;
    } catch { /* The isolated dev server may still be starting or compiling. */ }
    await delay(250);
  }
  throw new Error('Next dev did not become ready within 100 seconds');
}
async function cleanup() {
  if (nextProcess?.pid) {
    const exited = nextProcess.exitCode !== null ? Promise.resolve() : new Promise(resolve => nextProcess.once('exit', resolve));
    try { process.platform === 'win32' ? nextProcess.kill('SIGTERM') : process.kill(-nextProcess.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
    await Promise.race([exited, delay(5000)]);
    if (nextProcess.exitCode === null) {
      try { process.platform === 'win32' ? nextProcess.kill('SIGKILL') : process.kill(-nextProcess.pid, 'SIGKILL'); } catch { /* Already stopped. */ }
      await Promise.race([exited, delay(1000)]);
    }
  }
  if (stub) {
    stub.closeAllConnections();
    await new Promise(resolve => stub.close(resolve));
  }
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
}

try {
  await availablePort();
  const preload = await snapshot();
  stub = http.createServer((req, res) => { handleStub(req, res).catch(error => reply(res, 500, { error: String(error) })); });
  await new Promise((resolve, reject) => { stub.once('error', reject); stub.listen(0, '127.0.0.1', resolve); });
  const stubOrigin = `http://127.0.0.1:${stub.address().port}`;
  const environment = {};
  for (const name of ['PATH', 'HOME', 'USERPROFILE', 'TMPDIR', 'TMP', 'TEMP', 'SystemRoot', 'WINDIR']) if (process.env[name]) environment[name] = process.env[name];
  Object.assign(environment, {
    NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', CI: '1', NO_COLOR: '1',
    NODE_OPTIONS: `--require ${JSON.stringify(preload)}`,
    GROWTH_WORKSPACE_OPEN: 'false', GROWTH_SUPABASE_URL: stubOrigin, GROWTH_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  });
  nextProcess = spawn(process.execPath, [path.join(repo, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(appPort)], {
    cwd: temporaryDirectory, env: environment, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  });
  nextProcess.on('error', error => { nextLog += String(error); });
  for (const stream of [nextProcess.stdout, nextProcess.stderr]) stream.on('data', chunk => { nextLog = (nextLog + chunk.toString()).slice(-24_000); });
  await waitUntilReady();
  console.log(`Isolated Next dev ready on ${appOrigin}; synthetic upstream only.`);

  await scenario('callback tokens cannot create a session through POST', async () => {
    const response = await request('/api/auth/session', { method: 'POST', json: { refreshToken: 'synthetic-attacker-refresh-token' } });
    assert.equal(response.status, 405);
    assert.equal(response.cookies.length, 0);
    assert.equal(calls.length, 0);
  });
  await scenario('cross-origin, null and absent origins fail before upstream', async () => {
    for (const origin of ['https://unrelated.example.invalid', 'null', null]) {
      const response = await request('/api/auth/register', { method: 'POST', origin, json: registration });
      assert.equal(response.status, 403);
      privateResponse(response);
    }
    assert.equal(calls.length, 0);
  });
  await scenario('registration defaults both channels off and does not claim login', async () => {
    const response = await request('/api/auth/register', { method: 'POST', json: registration });
    assert.equal(response.status, 201);
    assert.equal(response.data.authenticated, false);
    assert.equal(response.cookies.length, 0);
    assert.match(response.data.message, /Hvis adressen kan registreres/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].search.get('redirect_to'), `${appOrigin}/auth/callback`);
    assert.equal(calls[0].body.data.email_updates, false);
    assert.equal(calls[0].body.data.sms_updates, false);
    assert.equal(calls[0].body.data.phone_e164, null);
    privateResponse(response);
  });
  await scenario('SMS opt-in is independent and the number is normalized', async () => {
    const response = await request('/api/auth/register', { method: 'POST', json: { ...registration, smsUpdates: true, phone: '+47 987 65 432' } });
    assert.equal(response.status, 201);
    assert.equal(response.data.authenticated, false);
    assert.equal(calls[0].body.data.email_updates, false);
    assert.equal(calls[0].body.data.sms_updates, true);
    assert.equal(calls[0].body.data.phone_e164, '+4798765432');
    assert.equal('phone_confirmed_at' in calls[0].body.data, false);
    privateResponse(response);
  });
  await scenario('invalid consent and SMS data never reach the provider', async () => {
    for (const fields of [{ emailUpdates: 'false' }, { smsUpdates: true, phone: '98765432' }, { privacyAccepted: false }]) {
      const response = await request('/api/auth/register', { method: 'POST', json: { ...registration, ...fields } });
      assert.equal(response.status, 400);
      assert.equal(response.cookies.length, 0);
    }
    assert.equal(calls.length, 0);
  });
  for (const [failureMode, status] of [['signup-outage', 503], ['signup-rate', 429], ['signup-email-denied', 503], ['signup-malformed', 503]]) {
    await scenario(`${failureMode} produces an honest error`, async () => {
      const response = await request('/api/auth/register', { method: 'POST', json: registration });
      assert.equal(response.status, status);
      assert.equal(typeof response.data.error, 'string');
      assert.notEqual(response.data.ok, true);
      assert.notEqual(response.data.authenticated, true);
      assert.equal(response.cookies.length, 0);
      privateResponse(response);
    }, failureMode);
  }
  await scenario('obfuscated duplicate signup does not claim authentication or saved preferences', async () => {
    const response = await request('/api/auth/register', { method: 'POST', json: registration });
    assert.equal(response.status, 201);
    assert.equal(response.data.authenticated, false);
    assert.match(response.data.message, /Hvis adressen kan registreres/);
    assert.equal(response.cookies.length, 0);
    assert.equal('profile' in response.data, false);
  }, 'signup-duplicate');
  await scenario('password login sets HttpOnly session cookies without JSON tokens', async () => {
    const response = await request('/api/auth/login', { method: 'POST', json: { email: registration.email, password: registration.password } });
    assert.equal(response.status, 200);
    assert.equal(response.data.ok, true);
    assertCookie(response, 'vedoy-access-token', currentAccess);
    assertCookie(response, 'vedoy-refresh-token', currentRefresh);
    privateResponse(response);
  });
  await scenario('invalid password login does not set cookies', async () => {
    const response = await request('/api/auth/login', { method: 'POST', json: { email: registration.email, password: 'synthetic-incorrect-password' } });
    assert.equal(response.status, 401);
    assert.equal(response.cookies.length, 0);
    privateResponse(response);
  }, 'login-invalid');
  await scenario('refresh rotation is preserved when the following profile read fails', async () => {
    const response = await request('/api/auth/session', { headers: { Cookie: expiredCookie } });
    assert.equal(response.status, 503);
    assertCookie(response, 'vedoy-access-token', rotatedAccess);
    assertCookie(response, 'vedoy-refresh-token', rotatedRefresh);
    assert.deepEqual(calls.map(call => call.pathname), ['/auth/v1/user', '/auth/v1/token', '/rest/v1/growth_launch_profiles']);
    assert.equal(calls[2].authorization, `Bearer ${rotatedAccess}`);
    privateResponse(response);
  }, 'refresh-profile-error');
  await scenario('valid refreshed session returns only the current account', async () => {
    const response = await request('/api/auth/session', { headers: { Cookie: expiredCookie } });
    assert.equal(response.status, 200);
    assert.equal(response.data.user.email, user.email);
    assert.equal(response.data.profile.user_id, userId);
    assertCookie(response, 'vedoy-refresh-token', rotatedRefresh);
    privateResponse(response);
  });
  for (const failureMode of ['auth-outage', 'auth-rate']) {
    await scenario(`${failureMode} preserves the browser cookies`, async () => {
      const response = await request('/api/auth/session', { headers: { Cookie: validCookie } });
      assert.equal(response.status, 503);
      assert.equal(response.cookies.length, 0);
      privateResponse(response);
    }, failureMode);
  }
  await scenario('invalid refresh token clears the stale browser session', async () => {
    const response = await request('/api/auth/session', { headers: { Cookie: expiredCookie } });
    assert.equal(response.status, 401);
    assert.match(assertCookie(response, 'vedoy-access-token', ''), /Max-Age=0/);
    assert.match(assertCookie(response, 'vedoy-refresh-token', ''), /Max-Age=0/);
    privateResponse(response);
  }, 'invalid-session');
  for (const nextMode of ['normal', 'profile-missing']) {
    await scenario(`profile ${nextMode === 'normal' ? 'update' : 'creation'} ignores a client-supplied user_id`, async () => {
      const response = await request('/api/launch/profile', { method: 'PATCH', json: profileInput, headers: { Cookie: validCookie } });
      assert.equal(response.status, 200);
      assert.equal(response.data.profile.user_id, userId);
      const read = calls.find(call => call.pathname === '/rest/v1/growth_launch_profiles' && call.method === 'GET');
      const write = calls.find(call => call.pathname === '/rest/v1/growth_launch_profiles' && call.method !== 'GET');
      assert.equal(read.search.get('user_id'), `eq.${userId}`);
      assert.ok(write);
      if (nextMode === 'normal') {
        assert.equal(write.method, 'PATCH');
        assert.equal(write.search.get('user_id'), `eq.${userId}`);
        assert.equal('user_id' in write.body, false);
      } else {
        assert.equal(write.method, 'POST');
        assert.equal(write.body.user_id, userId);
      }
      assert.ok(!JSON.stringify(write.body).includes(otherUserId));
      privateResponse(response);
    }, nextMode);
  }
  await scenario('logout clears browser cookies even during an Auth outage', async () => {
    const response = await request('/api/auth/logout', { method: 'POST', json: {}, headers: { Cookie: validCookie } });
    assert.equal(response.status, 200);
    assert.equal(response.data.serverSessionRevoked, false);
    assert.match(assertCookie(response, 'vedoy-access-token', ''), /Max-Age=0/);
    assert.match(assertCookie(response, 'vedoy-refresh-token', ''), /Max-Age=0/);
    privateResponse(response);
  }, 'auth-outage');
  await scenario('legacy APIs, server actions and encoded legacy routes are stopped before upstream', async () => {
    for (const pathname of ['/api/workspace/profile', '/api/contact', '/api/website-status', '/api/shopify/callback?code=synthetic-secret', '/api/auth/login/extra']) {
      for (const method of ['GET', 'POST']) {
        const response = await request(pathname, { method });
        assert.equal(response.status, 503, `${method} ${pathname}`);
        assert.equal(response.headers['retry-after'], '3600');
        assert.equal(response.data.code, 'WORKSPACE_UNAVAILABLE');
        privateResponse(response);
      }
    }
    for (const pathname of ['/blog/%252e%252e', '/blog/%25252e%25252e', '/blog/.%252e', '/api%252fworkspace%252fprofile']) {
      const response = await request(pathname);
      assert.equal(response.status, 503, pathname);
      assert.equal(response.data.code, 'WORKSPACE_UNAVAILABLE');
    }
    const action = await request('/api/auth/register', { method: 'POST', json: registration, headers: { 'NeXt-AcTiOn': 'synthetic-old-action' } });
    assert.equal(action.status, 503);
    const actionForm = await request('/', { method: 'POST', raw: '$ACTION_ID=synthetic-old-action', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    assert.equal(actionForm.status, 503);
    const page = await request('/studio?access_token=synthetic-secret');
    assert.equal(page.status, 303);
    const destination = new URL(page.headers.location, appOrigin);
    assert.equal(destination.pathname, '/under-utvikling');
    assert.equal(destination.search, '');
    assert.equal(calls.length, 0);
  });
  console.log(`PASS: ${passed} launch HTTP scenarios. No real provider, database, email or SMS calls.`);
} catch (error) {
  console.error(error);
  if (nextLog) console.error(`Isolated Next log (last 8000 characters):\n${nextLog.slice(-8000)}`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
