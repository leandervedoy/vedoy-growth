#!/usr/bin/env node
// Offline snapshot of the actual production build; no application reimplementation.
// Run: node scripts/export-learning-demo.mjs [--base-url http://127.0.0.1:3310]
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const built = path.join(root, '.next/server/app');
const output = path.join(root, 'demo/vedoy-growth-demo.html');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--base-url')) {
  throw new Error('Usage: node scripts/export-learning-demo.mjs [--base-url http://127.0.0.1:3310]');
}
const base = args[1] ? new URL(args[1]) : null;
if (base && (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.protocol !== 'http:' || base.username || base.password)) {
  throw new Error('The optional HTML source must be a local HTTP server without credentials.');
}
const lessons = (await readdir(path.join(built, 'laer'))).filter(x => x.endsWith('.html')).sort();
const routes = [
  ['/', 'index.html'], ['/laer', 'laer.html'],
  ...lessons.map(file => ['/laer/' + file.slice(0, -5), 'laer/' + file]),
  ['/personvern', 'personvern.html'], ['/under-utvikling', 'under-utvikling.html'],
];
if (routes.length !== 10) throw new Error('Expected the ten public pages from the production build.');
const sources = new Map(await Promise.all(routes.map(async ([route, file]) => [route, await readFile(path.join(built, file), 'utf8')])));
const accountRoutes = ['/register', '/login', '/konto'];
if (base) {
  for (const route of accountRoutes) {
    try {
      const response = await fetch(new URL(route, base), { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      if (response.ok) sources.set(route, await response.text());
      else console.warn('Using offline account placeholder:', route, response.status);
    } catch (error) { console.warn('Using offline account placeholder:', route, error.message); }
  }
}
const stylesheets = new Set();
const pages = [];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const notice = '<aside class="offline-account-note" role="note"><strong>Demoforhåndsvisning – registrering er ikke aktiv.</strong> Dette er en lokal kopi. Ingen opplysninger sendes eller lagres, og skjemaene er deaktivert. <a href="#/laer">Gå til læringssidene →</a></aside>';
for (const route of [...routes.map(([route]) => route), ...accountRoutes]) {
  const source = sources.get(route) || sources.get('/under-utvikling');
  for (const match of source.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) stylesheets.add(match[1]);
  const title = source.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Vedøy Growth';
  const extracted = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!extracted) throw new Error('Missing SSR body for ' + route);
  let html = extracted
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<(?:link|meta|base)\b[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/\s(?:on[a-z]+|action|formaction|ping)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<(input|button|select|textarea)\b([^>]*)>/gi, '<$1 disabled aria-disabled="true"$2>')
    .replace(/<form\b([^>]*)>/gi, '<form autocomplete="off"$1>')
    .replace(/href="([^"]*)"/g, (whole, href) => {
      if (href.startsWith('#')) return 'href="#' + route + href + '"';
      if (href.startsWith('/') && !href.startsWith('//')) return 'href="#' + href + '"';
      return whole;
    });
  if (accountRoutes.includes(route)) {
    // Keep the real SSR screen when available, with an unambiguous offline notice.
    html = html.replace(/(<main\b[^>]*>)/i, '$1' + notice);
    if (!html.includes('offline-account-note')) html = notice + html;
  }
  pages.push({ route, title, html });
}

const renderedClasses = new Set(pages.flatMap(page => [...page.html.matchAll(/\bclass="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/))));
const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2' };
let css = '';
for (const href of stylesheets) {
  if (!href.startsWith('/_next/static/css/')) throw new Error('Unexpected stylesheet: ' + href);
  let contents = await readFile(path.join(root, '.next', href.slice('/_next/'.length)), 'utf8');
  // The legacy shell logo is a 2 MB PNG. Its class is absent from these pages;
  // omit that unused rule, but retain it if a future snapshot actually uses it.
  if (!renderedClasses.has('brand-mark')) contents = contents.replace(/\.brand-mark\{[^{}]*\}/g, '');
  contents = contents.replace(/@import\s+(?:url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/gi, '');
  const pattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g;
  const replacements = new Map();
  for (const match of contents.matchAll(pattern)) {
    const url = (match[1] ?? match[2] ?? match[3]).trim();
    if (url.startsWith('data:') || url.startsWith('#')) continue;
    if (/^(?:https?:)?\/\//i.test(url)) { replacements.set(match[0], 'none'); continue; }
    const clean = url.split(/[?#]/)[0];
    const asset = clean.startsWith('/_next/') ? path.join(root, '.next', clean.slice('/_next/'.length))
      : clean.startsWith('/') ? path.join(root, 'public', clean)
      : path.resolve(root, '.next', href.slice('/_next/'.length), '..', clean);
    if (!asset.startsWith(root + path.sep)) throw new Error('Asset escapes repository: ' + url);
    const bytes = await readFile(asset);
    replacements.set(match[0], 'url("data:' + (mime[path.extname(asset)] || 'application/octet-stream') + ';base64,' + bytes.toString('base64') + '")');
  }
  for (const [before, after] of replacements) contents = contents.replaceAll(before, after);
  css += contents + '\n';
}
const templates = pages.map(page => '<template data-route="' + escape(page.route) + '" data-title="' + escape(page.title) + '">' + page.html + '</template>').join('\n');
const router = `(() => {
  const pages = new Map([...document.querySelectorAll('template[data-route]')].map(t => [t.dataset.route, t]));
  const view = document.getElementById('offline-view');
  let currentRoute = null;
  function render() {
    const raw = location.hash.slice(1) || '/';
    const split = raw.indexOf('#');
    const requested = split < 0 ? raw : raw.slice(0, split);
    const route = pages.has(requested) ? requested : '/under-utvikling';
    const page = pages.get(route);
    const changed = currentRoute !== route;
    if (changed) {
      view.replaceChildren(page.content.cloneNode(true));
      document.title = page.dataset.title + ' – offline demo';
      currentRoute = route;
    }
    let anchor = split < 0 ? '' : raw.slice(split + 1);
    try { anchor = decodeURIComponent(anchor); } catch {}
    requestAnimationFrame(() => {
      const target = anchor && document.getElementById(anchor);
      if (target) { target.scrollIntoView(); if (target.matches('main')) { target.tabIndex = -1; target.focus({ preventScroll: true }); } }
      else if (changed) window.scrollTo(0, 0);
    });
  }
  document.addEventListener('submit', event => event.preventDefault(), true);
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (link && link.getAttribute('href') === location.hash) { event.preventDefault(); render(); }
  });
  addEventListener('hashchange', render);
  render();
})();`;
const html = '<!doctype html>\n<html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; font-src data:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; object-src \'none\'">'
  + '<title>Vedøy Growth – offline demo</title><style>' + css.replaceAll('</style', '<\\/style')
  + '\n.offline-account-note{max-width:1060px;margin:24px auto;padding:18px 24px;background:#f3e8c6;color:#243829;border:1px solid #cbb976;border-radius:12px;font:15px/1.6 Arial,sans-serif}.offline-account-note strong{display:block}.offline-account-note a{display:inline-block;margin-left:.4em}template{display:none!important}</style></head><body>'
  + '<div id="offline-view">' + pages[0].html + '</div>' + templates
  + '<script>' + router + '</script></body></html>\n';
if (/<script\b[^>]*src=|<link\b|<iframe\b|<img\b[^>]*src="(?!data:)/i.test(html)) throw new Error('The snapshot still contains an external resource.');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html);
console.log('Exported ' + routes.length + ' public pages and 3 disabled account previews to ' + path.relative(root, output) + ' (' + Buffer.byteLength(html) + ' bytes).');
