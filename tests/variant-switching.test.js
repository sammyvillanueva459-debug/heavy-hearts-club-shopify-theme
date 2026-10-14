import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductPage, visibleMediaIds, pick } from './helpers/dom.js';

const q = (w, sel) => w.document.querySelector(sel);

test('initial render shows only the selected color, starting on the back image', async () => {
  const w = await buildProductPage();
  assert.deepEqual(visibleMediaIds(w), [101, 102, 103]);
  assert.equal(q(w, '.gallery-slide.is-active').dataset.mediaId, '102');
  assert.equal(q(w, '[data-gallery-counter]').textContent, '2 / 3');
});

test('clicking a color shows ONLY that color and resets to its back image', async () => {
  const w = await buildProductPage();
  pick(w, 'Color', 'Washed Black');
  assert.deepEqual(visibleMediaIds(w), [201, 202]);
  assert.equal(q(w, '.gallery-slide.is-active').dataset.mediaId, '202');
  assert.equal(w.document.querySelectorAll('[data-gallery-thumb]').length, 2);
  // the hidden variant id follows (Washed Black / M)
  assert.equal(q(w, '[data-variant-id]').value, '3');
  assert.equal(q(w, '[data-option-selected]').textContent, 'Washed Black');
});

test('color with a single photo and no back view shows that photo', async () => {
  const w = await buildProductPage();
  pick(w, 'Color', 'Burgundy');
  assert.deepEqual(visibleMediaIds(w), [301]);
  assert.equal(w.document.querySelectorAll('[data-gallery-thumb]').length, 0);
});

test('rapid color changes always end on the last selection with no mixed photos', async () => {
  const w = await buildProductPage();
  const gallery = q(w, 'color-gallery');
  gallery.transitionMs = 25; // exercise the debounced path
  const seen = [];
  gallery.addEventListener('gallery:change', (e) => seen.push(e.detail));
  pick(w, 'Color', 'Washed Black');
  pick(w, 'Color', 'Burgundy');
  pick(w, 'Color', 'Navy Blue');
  pick(w, 'Color', 'Washed Black');
  await new Promise((r) => setTimeout(r, 120));
  assert.deepEqual(visibleMediaIds(w), [201, 202]);
  assert.equal(gallery.activeColor, 'washed-black');
  assert.equal(gallery.classList.contains('is-switching'), false);
  for (const detail of seen) {
    const all = detail.mediaIds.join(',');
    assert.ok(['201,202', '301', '101,102,103'].includes(all), `mixed gallery: ${all}`);
  }
});

test('returning to the visible color before the swap commits cancels the swap', async () => {
  const w = await buildProductPage();
  const gallery = q(w, 'color-gallery');
  gallery.transitionMs = 40;
  pick(w, 'Color', 'Washed Black');
  pick(w, 'Color', 'Navy Blue');
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(visibleMediaIds(w), [101, 102, 103]);
  assert.equal(gallery.classList.contains('is-switching'), false);
});

test('changing size keeps the current photo (gallery is not reset)', async () => {
  const w = await buildProductPage();
  const gallery = q(w, 'color-gallery');
  gallery.goTo(0, false);
  pick(w, 'Size', 'L');
  assert.equal(q(w, '.gallery-slide.is-active').dataset.mediaId, '101');
  assert.deepEqual(visibleMediaIds(w), [101, 102, 103]);
});

test('switching back to an earlier color restores its main image', async () => {
  const w = await buildProductPage();
  pick(w, 'Color', 'Washed Black');
  pick(w, 'Color', 'Navy Blue');
  assert.deepEqual(visibleMediaIds(w), [101, 102, 103]);
  assert.equal(q(w, '.gallery-slide.is-active').dataset.mediaId, '102');
});

test('thumbnails, next/previous and keyboard navigate within the selected color only', async () => {
  const w = await buildProductPage();
  const gallery = q(w, 'color-gallery');
  q(w, '[data-gallery-thumb][data-index="0"]').click();
  assert.equal(q(w, '.gallery-slide.is-active').dataset.mediaId, '101');
  assert.equal(q(w, '[data-gallery-thumb].is-active').dataset.mediaId, '101');
  q(w, '[data-gallery-prev]').click(); // wraps to the last photo of this color
  assert.equal(q(w, '.gallery-slide.is-active').dataset.mediaId, '103');
  q(w, '[data-gallery-next]').click();
  assert.equal(q(w, '.gallery-slide.is-active').dataset.mediaId, '101');
  q(w, '[data-gallery-slides]').dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(gallery.index, 1);
});

test('price, compare-at price, availability and the add-to-cart state follow the variant', async () => {
  const w = await buildProductPage();
  pick(w, 'Color', 'Washed Black');
  assert.equal(q(w, '.price__current').textContent, '$55.00');
  assert.equal(q(w, '.price__compare').textContent, '$70.00');
  assert.ok(q(w, '[data-price]').classList.contains('price--on-sale'));
  assert.equal(q(w, '[data-inventory]').textContent, 'Only 3 left');
  assert.equal(q(w, '[data-add-to-cart]').disabled, false);

  pick(w, 'Size', 'L');
  assert.equal(q(w, '[data-variant-id]').value, '4');
  assert.equal(q(w, '[data-inventory]').textContent, 'In stock');

  pick(w, 'Color', 'Burgundy');
  assert.equal(q(w, '[data-add-to-cart]').disabled, true);
  assert.equal(q(w, '[data-add-to-cart-label]').textContent, 'Sold out');
  assert.equal(q(w, '.price__compare'), null);
});

test('variant id in the URL and unavailable options are kept accurate', async () => {
  const w = await buildProductPage();
  pick(w, 'Color', 'Washed Black');
  assert.match(w.location.search, /variant=3/);
  // Navy Blue/L is sold out, Burgundy is sold out entirely
  pick(w, 'Color', 'Navy Blue');
  const sizeL = [...w.document.querySelectorAll('label.option-pill')].find((l) => l.textContent === 'L');
  assert.ok(sizeL.classList.contains('is-unavailable'));
  const burgundy = [...w.document.querySelectorAll('label.option-pill')].find((l) => l.textContent === 'Burgundy');
  assert.ok(burgundy.classList.contains('is-unavailable'));
});

test('findVariant matches exact option combinations', async () => {
  const w = await buildProductPage();
  const { findVariant } = w.hhc.productForm;
  assert.equal(findVariant(JSON.parse(w.document.querySelector('[data-product-json]').textContent).variants, ['Washed Black', 'L']).id, 4);
  assert.equal(findVariant([], ['x']), null);
});

test('quantity stepper never goes below 1', async () => {
  const w = await buildProductPage();
  const input = q(w, '[data-quantity-input]');
  q(w, '[data-quantity-minus]').click();
  assert.equal(input.value, '1');
  q(w, '[data-quantity-plus]').click();
  assert.equal(input.value, '2');
});

test('a color without a pre-rendered gallery leaves the current one and reports it', async () => {
  const w = await buildProductPage();
  const gallery = q(w, 'color-gallery');
  let missing = null;
  gallery.addEventListener('gallery:missing', (e) => { missing = e.detail.color; });
  assert.equal(gallery.setColor('does-not-exist'), false);
  assert.equal(missing, 'does-not-exist');
  assert.deepEqual(visibleMediaIds(w), [101, 102, 103]);
});
