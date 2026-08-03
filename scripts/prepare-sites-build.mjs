import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });

await writeFile(
  'dist/server/index.js',
  `const encoder = new TextEncoder();
const sessionName = 'outsidesynq_session';
const stateName = 'outsidesynq_oauth_state';

const base64Url = (value) => btoa(value).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
const fromBase64Url = (value) => atob(value.replace(/-/g, '+').replace(/_/g, '/'));
const readCookie = (request, name) => (request.headers.get('Cookie') || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(name + '='))?.slice(name.length + 1) || '';
const cookie = (name, value, maxAge) => name + '=' + value + '; Path=/; HttpOnly; Secure; SameSite=Lax' + (maxAge === undefined ? '' : '; Max-Age=' + maxAge);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return base64Url(String.fromCharCode(...new Uint8Array(signed)));
}

async function getSession(request, env) {
  const raw = readCookie(request, sessionName);
  const [payload, token] = raw.split('.');
  if (!payload || !token || !env.SESSION_SECRET || token !== await signature(payload, env.SESSION_SECRET)) return null;
  try { return JSON.parse(fromBase64Url(payload)); } catch { return null; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const redirectUri = url.origin + '/auth/github/callback';

    if (url.pathname === '/auth/github') {
      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) return json({ message: 'GitHub sign-in is not configured yet.' }, 503);
      const state = crypto.randomUUID();
      const github = new URL('https://github.com/login/oauth/authorize');
      github.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      github.searchParams.set('redirect_uri', redirectUri);
      github.searchParams.set('scope', 'read:user user:email');
      github.searchParams.set('state', state);
      return new Response(null, { status: 302, headers: { Location: github.toString(), 'Set-Cookie': cookie(stateName, state, 600) } });
    }

    if (url.pathname === '/auth/github/callback') {
      const state = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      if (!code || !state || state !== readCookie(request, stateName)) return new Response('GitHub sign-in could not be verified.', { status: 400 });
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirectUri }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) return new Response('GitHub sign-in was declined.', { status: 401 });
      const githubResponse = await fetch('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + tokenData.access_token, 'User-Agent': 'outsideSynq' } });
      const githubUser = await githubResponse.json();
      if (!githubUser.id) return new Response('Could not read your GitHub profile.', { status: 401 });
      const user = { id: String(githubUser.id), username: githubUser.login, displayName: githubUser.name || githubUser.login, photos: [{ value: githubUser.avatar_url }] };
      const payload = base64Url(JSON.stringify(user));
      const session = payload + '.' + await signature(payload, env.SESSION_SECRET);
      const headers = new Headers({ Location: '/dashboard' });
      headers.append('Set-Cookie', cookie(sessionName, session, 604800));
      headers.append('Set-Cookie', cookie(stateName, '', 0));
      return new Response(null, { status: 302, headers });
    }

    if (url.pathname === '/api/me') {
      const user = await getSession(request, env);
      return user ? json({ user }) : json({ message: 'Not authenticated' }, 401);
    }

    if (url.pathname === '/logout') return new Response(JSON.stringify({ message: 'Logged out' }), { headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie(sessionName, '', 0) } });

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  },
};
`,
);

await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
