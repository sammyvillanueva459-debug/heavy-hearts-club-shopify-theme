import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { root, createEngine } from './helpers/liquid.js';
import { asset } from './helpers/dom.js';

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const EXPECTED = {
  Men: ['Hoodies', 'T-Shirts', 'Long Sleeves', 'Sweatshirts', 'Sweatpants', 'Shorts', 'Jackets', 'Matching Sets', 'Hats', 'Bags', 'Bookbags', 'Socks'],
  Women: ['Crop Tops', 'Leggings', 'Hoodies', 'T-Shirts', 'Long Sleeves', 'Sweatshirts', 'Sweatpants', 'Shorts', 'Jackets', 'Matching Sets', 'Hats', 'Bags', 'Bookbags', 'Socks'],
  Kids: ['Boys', 'Girls', 'Hoodies', 'T-Shirts', 'Sweatshirts', 'Sweatpants', 'Shorts', 'Matching Sets', 'Hats', 'Bookbags', 'Socks'],
  More: ['New Arrivals', 'Best Sellers', 'Accessories', 'Collections', 'Holiday Specials', 'Sale']
};

async function renderDefaultMenu(mode) {
  const engine = createEngine();
  engine.registerFilter('t', (key, ...args) => (args.length ? `Shop all ${args[0][1]}` : key));
  return engine.parseAndRender(`{% render 'mega-menu-default', mode: '${mode}' %}`);
}

test('desktop mega menu contains every department and category', async () => {
  const html = await renderDefaultMenu('desktop');
  const doc = new JSDOM(html).window.document;
  const items = [...doc.querySelectorAll('.nav__item.has-mega')];
  assert.deepEqual(items.map((i) => i.querySelector('.nav__link').textContent.trim()), Object.keys(EXPECTED));
  for (const item of items) {
    const dept = item.querySelector('.nav__link').textContent.trim();
    const links = [...item.querySelectorAll('.mega__column li a')].map((a) => a.textContent.trim());
    assert.deepEqual([...links].sort(), [...EXPECTED[dept]].sort(), `${dept} categories`);
    assert.ok(item.querySelectorAll('.mega__column').length >= 2, `${dept} should be multi-column`);
  }
});

test('mega menu toggles are accessible buttons wired to their panels', async () => {
  const doc = new JSDOM(await renderDefaultMenu('desktop')).window.document;
  for (const button of doc.querySelectorAll('[data-mega-toggle]')) {
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    const panel = doc.getElementById(button.getAttribute('aria-controls'));
    assert.ok(panel && panel.hidden, 'panel exists and starts hidden');
  }
});

test('collection links use real collection URLs (department prefixes)', async () => {
  const doc = new JSDOM(await renderDefaultMenu('desktop')).window.document;
  const hrefs = [...doc.querySelectorAll('.mega__column li a')].map((a) => a.getAttribute('href'));
  for (const h of ['/collections/men-hoodies', '/collections/women-crop-tops', '/collections/women-leggings', '/collections/kids-boys', '/collections/kids-girls', '/collections/new-arrivals', '/collections/best-sellers', '/collections/sale', '/collections/holiday-specials', '/collections/accessories', '/collections']) {
    assert.ok(hrefs.includes(h), `missing ${h}`);
  }
});

test('mobile menu mirrors the desktop menu using <details> accordions', async () => {
  const doc = new JSDOM(await renderDefaultMenu('mobile')).window.document;
  const sections = [...doc.querySelectorAll('.mobile-nav__item > details')];
  assert.equal(sections.length, 4);
  const menLinks = [...sections[0].querySelectorAll('.mobile-nav__sub a')].map((a) => a.textContent.trim()).filter((t) => !t.startsWith('Shop all'));
  assert.deepEqual(menLinks.sort(), [...EXPECTED.Men].sort());
});

test('header has sticky option, search, account, cart badge and 3-level mega menu support', () => {
  const header = read('sections/header.liquid');
  assert.match(header, /site-header--sticky/);
  assert.match(header, /data-search-toggle/);
  assert.match(header, /routes\.account_url/);
  assert.match(header, /data-cart-count/);
  assert.match(header, /grandchild/);
  assert.match(header, /aria-label="\{\{ 'accessibility\.main_navigation' \| t \}\}"/);
  assert.match(read('assets/theme.css'), /\.shopify-section-group-header-group:has\(\.site-header--sticky\)\s*{[^}]*position:\s*sticky/);
});

test('theme.js: mega menu toggles aria-expanded and Escape closes menus', async () => {
  const dom = new JSDOM(`<body><li class="nav__item has-mega"><button data-mega-toggle aria-expanded="false" aria-controls="m" class="nav__link">Men</button><div id="m" hidden></div></li>
    <button data-mobile-nav-open aria-expanded="false"></button>
    <div data-mobile-nav hidden><button class="mobile-nav__close"></button></div></body>`, { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false });
  w.hhc = { routes: {} };
  w.eval(asset('theme.js'));
  if (w.document.readyState === 'loading') await new Promise((r) => w.document.addEventListener('DOMContentLoaded', r));
  const toggle = w.document.querySelector('[data-mega-toggle]');
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(w.document.getElementById('m').hidden, false);
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(w.document.getElementById('m').hidden, true);

  w.document.querySelector('[data-mobile-nav-open]').click();
  assert.equal(w.document.querySelector('[data-mobile-nav]').hidden, false);
  assert.ok(w.document.documentElement.classList.contains('nav-open'));
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(w.document.querySelector('[data-mobile-nav]').hidden, true);
});

test('search: header form posts to the search route and predictive search section exists', () => {
  assert.match(read('sections/header.liquid'), /action="\{\{ routes\.search_url \}\}"/);
  assert.match(read('sections/predictive-search.liquid'), /predictive_search\.resources/);
  assert.match(read('assets/theme.js'), /section_id=predictive-search/);
});
