import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './helpers/liquid.js';

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const list = (dir, ext) => fs.readdirSync(path.join(root, dir), { recursive: true })
  .filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
const liquidFiles = [...list('layout', '.liquid'), ...list('sections', '.liquid'), ...list('snippets', '.liquid')];
const jsonFiles = [...list('templates', '.json'), ...list('sections', '.json'), ...list('config', '.json'), ...list('locales', '.json')];

test('Online Store 2.0 directory structure is present', () => {
  for (const f of ['layout/theme.liquid', 'layout/password.liquid', 'config/settings_schema.json', 'config/settings_data.json',
    'locales/en.default.json', 'templates/index.json', 'templates/product.json', 'templates/collection.json',
    'templates/cart.json', 'templates/search.json', 'templates/customers/login.json', 'templates/customers/account.json',
    'sections/header-group.json', 'sections/footer-group.json', '.theme-check.yml', 'README.md', 'assets/theme.css']) {
    assert.ok(fs.existsSync(path.join(root, f)), `${f} is missing`);
  }
});

test('every JSON file is valid', () => {
  for (const f of jsonFiles) assert.doesNotThrow(() => JSON.parse(read(f)), f);
});

test('every section referenced by a JSON template or group exists', () => {
  const sectionFiles = new Set(list('sections', '.liquid').map((f) => path.basename(f, '.liquid')));
  for (const f of jsonFiles.filter((j) => j.startsWith('templates') || j.endsWith('-group.json'))) {
    const data = JSON.parse(read(f));
    for (const [id, s] of Object.entries(data.sections ?? {})) {
      assert.ok(sectionFiles.has(s.type), `${f}: section "${id}" uses missing type "${s.type}"`);
    }
  }
});

test('every section has a valid {% schema %} (or is a static section) and blocks used in templates are declared', () => {
  for (const f of list('sections', '.liquid')) {
    const src = read(f);
    const m = src.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
    assert.ok(m, `${f} has no schema`);
    const schema = JSON.parse(m[1]);
    assert.ok(schema.name, `${f} schema has no name`);
  }
  const index = JSON.parse(read('templates/index.json'));
  for (const s of Object.values(index.sections)) {
    const schema = JSON.parse(read(`sections/${s.type}.liquid`).match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/)[1]);
    const declared = new Set((schema.blocks ?? []).map((b) => b.type));
    for (const b of Object.values(s.blocks ?? {})) assert.ok(declared.has(b.type), `${s.type} block ${b.type}`);
  }
});

test('all translation keys used in Liquid exist in locales/en.default.json', () => {
  const locale = JSON.parse(read('locales/en.default.json'));
  const get = (key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), locale);
  for (const f of liquidFiles) {
    for (const m of read(f).matchAll(/'([a-z0-9_.]+)'\s*\|\s*t\b/g)) {
      const v = get(m[1]);
      assert.ok(v !== undefined, `${f}: missing translation ${m[1]}`);
    }
  }
});

test('every asset referenced with asset_url exists', () => {
  for (const f of liquidFiles) {
    for (const m of read(f).matchAll(/'([\w.-]+\.(?:css|js|svg|png|jpg))'\s*\|\s*asset_url/g)) {
      assert.ok(fs.existsSync(path.join(root, 'assets', m[1])), `${f}: ${m[1]} missing`);
    }
  }
});

test('prices, products and inventory are never hardcoded in templates', () => {
  for (const f of [...liquidFiles, ...list('templates', '.json')]) {
    const src = read(f).replace(/{%\s*schema\s*%}[\s\S]*?{%\s*endschema\s*%}/g, '');
    assert.doesNotMatch(src, /[$€£]\s?\d/, `${f} contains a hardcoded price`);
  }
  // prices only come from Shopify's money filter
  const priceSnippet = read('snippets/price.liquid');
  assert.match(priceSnippet, /\| money/);
  assert.doesNotMatch(read('snippets/price.liquid'), /\* 0\.|minus:.*percent/i);
});

test('promotions are not faked: discounts only come from Shopify discount allocations', () => {
  const cart = read('snippets/cart-contents.liquid');
  assert.match(cart, /line_level_discount_allocations/);
  assert.match(cart, /cart_level_discount_applications/);
  assert.match(cart, /name="checkout"/);
  assert.doesNotMatch(cart, /discount_code|coupon/i);
});

test('theme check config is present and strict about syntax and assets', () => {
  const yml = read('.theme-check.yml');
  assert.match(yml, /extends: theme-check:recommended/);
  assert.match(yml, /ParserBlockingScript:\s*\n\s*enabled: true/);
});

test('the theme ships as an unpublished development theme (nothing publishes or overwrites live themes)', () => {
  for (const f of ['.github/workflows/ci.yml']) {
    const src = read(f);
    assert.doesNotMatch(src, /theme (push|publish)|--live|shopify theme/i, f);
  }
  const ignore = read('.shopifyignore');
  assert.match(ignore, /tests/);
});
