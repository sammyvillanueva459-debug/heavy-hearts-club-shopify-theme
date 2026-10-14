import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './helpers/liquid.js';

const css = fs.readFileSync(path.join(root, 'assets/theme.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'layout/theme.liquid'), 'utf8');

/** Return the body of the first @media block whose condition contains `condition`. */
function mediaBlock(condition) {
  const start = css.indexOf(`@media (${condition})`);
  assert.ok(start > -1, `no @media (${condition})`);
  let depth = 0;
  let i = css.indexOf('{', start);
  const begin = i + 1;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) break;
  }
  return css.slice(begin, i);
}

test('viewport meta tag is set', () => {
  assert.match(layout, /<meta name="viewport" content="width=device-width,initial-scale=1">/);
});

test('mobile: hamburger shown, desktop nav and mega panels hidden below 990px', () => {
  const mobile = mediaBlock('max-width: 989px');
  assert.match(mobile, /\.site-header__menu-toggle\s*{\s*display:\s*inline-flex/);
  assert.match(mobile, /\.site-nav\s*{\s*display:\s*none/);
  assert.match(mobile, /\.mega\s*{\s*display:\s*none/);
});

test('desktop: product grid goes to 4 columns and product page splits gallery/info at 990px', () => {
  const desktop = mediaBlock('min-width: 990px');
  assert.match(desktop, /\.product-grid--4\s*{\s*grid-template-columns:\s*repeat\(4/);
  assert.match(desktop, /\.product__grid\s*{\s*grid-template-columns:\s*minmax\(0,\s*1\.15fr\)/);
  assert.match(desktop, /\.collection__layout\s*{\s*grid-template-columns:\s*260px 1fr/);
});

test('mobile first: grids start at 2 columns and tablet moves up to 3', () => {
  assert.match(css, /\.product-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/);
  assert.match(mediaBlock('min-width: 750px'), /\.product-grid--3, \.product-grid--4\s*{\s*grid-template-columns:\s*repeat\(3/);
});

test('gallery supports native swiping with scroll snapping and hides arrows on small screens', () => {
  assert.match(css, /\.gallery-set__slides\s*{[^}]*overflow-x:\s*auto;[^}]*scroll-snap-type:\s*x mandatory/);
  assert.match(css, /\.gallery-slide\s*{[^}]*flex:\s*0 0 100%/);
  assert.match(mediaBlock('max-width: 749px'), /\.gallery-nav\s*{\s*display:\s*none/);
});

test('gallery thumbnails become a vertical rail on desktop', () => {
  assert.match(mediaBlock('min-width: 990px'), /\.gallery-set__thumbs\s*{[^}]*flex-direction:\s*column/);
});

test('cart drawer never overflows small screens', () => {
  assert.match(css, /\.cart-drawer__panel\s*{[^}]*width:\s*min\(100vw,\s*440px\)/);
});

test('touch targets are at least 44px for key controls', () => {
  assert.match(css, /\.icon-button\s*{[^}]*width:\s*44px;\s*height:\s*44px/);
  assert.match(css, /\.option-pill\s*{[^}]*min-height:\s*44px/);
  assert.match(css, /\.quantity__button\s*{[^}]*height:\s*44px/);
});

test('reduced motion preference is respected', () => {
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('stylesheet stays within the Theme Check size budget', () => {
  assert.ok(Buffer.byteLength(css) < 150000);
});
