import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'localStorage']) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const ts = require('typescript');
const notices = []; const navigations = [];
const mocks = {
  // UI icon rendering is outside this session/navigation integration test.
  '@karrotmarket/react-monochrome-icon': { IconHorizline3VerticalLine: () => React.createElement('svg'), IconXmarkLine: () => React.createElement('svg') },
  'next/navigation': { usePathname: () => '/', useRouter: () => ({ replace: p => navigations.push(p), refresh: () => {} }) },
  'next/link': { __esModule: true, default: ({ href, children, prefetch: _prefetch, ...props }) => React.createElement('a', { href, ...props }, children) },
  './toast-provider': { useToast: () => notice => notices.push(notice) },
  './theme-toggle': { ThemeToggle: () => null },
};
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const m = new Module(filename); cache.set(filename, m);
  m.filename = filename; m.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = m.require.bind(m);
  m.require = id => mocks[id] ?? (['./admin-session', './mobile-menu'].includes(id) ? load(path.resolve(path.dirname(filename), `${id}.tsx`)) : originalRequire(id));
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return m.exports;
}
const { AdminSessionProvider, useAdminSession } = load('components/admin-session.tsx');
const { HeaderNavigation } = load('components/header-navigation.tsx');
let session = true; let logoutFails = false;
globalThis.fetch = async (url, options) => {
  if (url === '/api/login') { assert.equal(options.cache, 'no-store'); return { ok: true, json: async () => ({ authenticated: session }) }; }
  assert.equal(url, '/api/logout'); assert.equal(options.method, 'POST');
  if (!logoutFails) session = false;
  return { ok: !logoutFails };
};
function LoginControl() {
  const { updateSession } = useAdminSession();
  return React.createElement('button', { id: 'login-test', onClick: () => { session = true; updateSession(true); } }, 'test');
}
const root = createRoot(document.getElementById('root'));
await React.act(async () => root.render(React.createElement(AdminSessionProvider, null, React.createElement(HeaderNavigation), React.createElement(LoginControl))));
assert.equal(document.querySelectorAll('a[href="/ykk"]').length, 1);
await React.act(async () => document.querySelector('.mobile-menu-trigger').click());
assert.equal(document.querySelectorAll('a[href="/ykk"]').length, 2);
assert.equal(document.querySelectorAll('.header-logout').length, 2);
logoutFails = true;
await React.act(async () => document.querySelector('.header-logout').click());
assert.equal(document.querySelectorAll('.header-logout').length, 2);
assert.equal(notices.at(-1).tone, 'error');
logoutFails = false;
await React.act(async () => document.querySelector('.mobile-menu-panel .header-logout').click());
assert.equal(document.querySelectorAll('.header-logout').length, 0);
assert.equal(document.querySelectorAll('a[href="/ykk"]').length, 0);
assert.equal(document.body.style.overflow, '');
assert.equal(navigations.at(-1), '/');
assert.equal(notices.at(-1).tone, 'success');
await React.act(async () => document.querySelector('#login-test').click());
assert.equal(document.querySelectorAll('a[href="/ykk"]').length, 1);
session = false;
await React.act(async () => window.dispatchEvent(new Event('focus')));
assert.equal(document.querySelectorAll('a[href="/ykk"]').length, 0);
await React.act(async () => root.unmount()); dom.window.close();
console.log('PASS: authenticated desktop/mobile menus, logout failure/success, menu scroll cleanup, login synchronization, expired session refresh');
