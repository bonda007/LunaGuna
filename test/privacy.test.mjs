import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const runtimeFiles = [
  'index.html',
  'styles.css',
  'boot.js',
  'app.js',
  'cycle.js',
  'i18n.js',
  'sw.js',
  'manifest.webmanifest',
];

const blocked = [
  'google-analytics',
  'googletagmanager',
  'google-analytics.com',
  'fonts.googleapis',
  'fonts.gstatic',
  'cdn.jsdelivr',
  'cdnjs.cloudflare',
  'unpkg.com',
  'posthog',
  'segment.com',
  'sentry.io',
  'plausible',
  'mixpanel',
  'hotjar',
  'facebook.net',
  'doubleclick',
];

test('the runtime files do not call analytics or third-party CDNs', () => {
  for (const file of runtimeFiles) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').toLowerCase();
    for (const needle of blocked) {
      assert.equal(source.includes(needle), false, `${file} mentions ${needle}`);
    }
  }
});

test('the only outbound URL is the optional Google Calendar link', () => {
  const source = runtimeFiles
    .map((file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
    .join('\n');
  const urls = source.match(/https?:\/\/[^\s"'`)>]+/g) ?? [];
  for (const url of urls) {
    assert.match(url, /^https:\/\/calendar\.google\.com\/calendar\/render/);
  }
  assert.ok(urls.length >= 1);
});

test('cycle data is stored only under the local key and can be removed', () => {
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(app, /localStorage/);
  assert.match(app, /lunaguna\.v1/);
  assert.match(app, /localStorage\.removeItem/);
  assert.equal(app.includes('sendBeacon'), false);
  assert.equal(app.includes('XMLHttpRequest'), false);
  assert.equal(app.includes('fetch('), false);
});

test('the Python web service is gone so a static host will not boot it', () => {
  assert.equal(existsSync(new URL('../main.py', import.meta.url)), false);
  assert.equal(existsSync(new URL('../requirements.txt', import.meta.url)), false);
  assert.equal(existsSync(new URL('../static/index.html', import.meta.url)), false);
});

test('the service worker only precaches files that exist', () => {
  const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const listed = [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const files = listed.filter((item) => item.startsWith('./') && item !== './');
  assert.ok(files.includes('./index.html'));
  assert.ok(files.includes('./styles.css'));
  assert.ok(files.includes('./app.js'));
  for (const item of files) {
    const relative = item.slice(2);
    assert.equal(existsSync(new URL(`../${relative}`, import.meta.url)), true, item);
  }
});
