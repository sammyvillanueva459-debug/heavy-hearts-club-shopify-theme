import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { root, createEngine, makeProduct, renderSet } from './liquid.js';

export function asset(name) {
  return fs.readFileSync(path.join(root, 'assets', name), 'utf8');
}

export const COLORS = [
  { handle: 'navy-blue', label: 'Navy Blue' },
  { handle: 'washed-black', label: 'Washed Black' },
  { handle: 'burgundy', label: 'Burgundy' }
];

export const MEDIA = [
  { id: 101, alt: 'Front [[color:navy blue|view:front]]' },
  { id: 102, alt: 'Back [[color:navy blue|view:back]]' },
  { id: 103, alt: 'Detail [[color:navy blue|view:detail]]' },
  { id: 201, alt: 'Front [[color:washed black|view:front]]' },
  { id: 202, alt: 'Back [[color:washed black|view:back]]' },
  { id: 301, alt: 'Front [[color:burgundy|view:front]]' }
];

export const VARIANTS = [
  { id: 1, options: ['Navy Blue', 'M'], price: '$60.00', compareAtPrice: null, available: true, featuredMediaId: 101, inventoryQuantity: 20 },
  { id: 2, options: ['Navy Blue', 'L'], price: '$60.00', compareAtPrice: null, available: false, featuredMediaId: 101, inventoryQuantity: 0 },
  { id: 3, options: ['Washed Black', 'M'], price: '$55.00', compareAtPrice: '$70.00', available: true, featuredMediaId: 201, inventoryQuantity: 3 },
  { id: 4, options: ['Washed Black', 'L'], price: '$55.00', compareAtPrice: '$70.00', available: true, featuredMediaId: 201, inventoryQuantity: null },
  { id: 5, options: ['Burgundy', 'M'], price: '$60.00', compareAtPrice: null, available: false, featuredMediaId: 301, inventoryQuantity: 0 },
  { id: 6, options: ['Burgundy', 'L'], price: '$60.00', compareAtPrice: null, available: false, featuredMediaId: 301, inventoryQuantity: 0 }
];

/** Render the real gallery snippet for each color and assemble a product page like sections/main-product.liquid. */
export async function buildProductPage({ activeColor = 'navy-blue' } = {}) {
  const engine = createEngine();
  const product = makeProduct({
    media: MEDIA,
    variants: VARIANTS.map((v) => ({ id: v.id, options: v.options })),
  });
  const sets = {};
  for (const c of COLORS) sets[c.handle] = await renderSet(engine, product, c.handle, { color_label: c.label });

  const templates = COLORS.filter((c) => c.handle !== activeColor)
    .map((c) => `<template data-gallery-template data-color="${c.handle}">${sets[c.handle]}</template>`)
    .join('');
  const sizes = ['M', 'L'];
  const group = (pos, name, values, selected) => `
    <fieldset data-option-position="${pos}" ${pos === 1 ? 'data-color-option' : ''}>
      <legend>${name}: <span data-option-selected>${selected}</span></legend>
      ${values.map((v, i) => {
        const id = `opt-${pos}-${i}`;
        const handle = v.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `<input type="radio" class="option-input" id="${id}" name="options[${name}]" value="${v}" data-option-handle="${handle}" ${v === selected ? 'checked' : ''}><label class="option-pill" for="${id}">${v}</label>`;
      }).join('')}
    </fieldset>`;
  const current = VARIANTS[0];
  const html = `<!doctype html><html><body>
  <section data-product-section>
    <color-gallery data-active-color="${activeColor}" data-transition="0">
      <div data-gallery-stage>${sets[activeColor]}</div>
      ${templates}
    </color-gallery>
    <form data-product-form action="/cart/add" method="post">
      <input type="hidden" name="id" value="${current.id}" data-variant-id>
      <div data-product-price><div class="price" data-price><span class="price__current">${current.price}</span></div></div>
      ${group(1, 'Color', COLORS.map((c) => c.label), 'Navy Blue')}
      ${group(2, 'Size', sizes, 'M')}
      <p data-inventory data-threshold="5"></p>
      <input type="number" name="quantity" value="1" data-quantity-input>
      <button type="button" data-quantity-minus></button><button type="button" data-quantity-plus></button>
      <button type="submit" name="add" data-add-to-cart><span data-add-to-cart-label>Add to cart</span></button>
      <p data-form-error hidden></p>
    </form>
    <script type="application/json" data-product-json>${JSON.stringify({
      id: 1, colorPosition: 1, options: ['Color', 'Size'], currentVariantId: current.id, variants: VARIANTS,
      strings: { addToCart: 'Add to cart', soldOut: 'Sold out', unavailable: 'Unavailable', inStock: 'In stock', lowStock: 'Only __QTY__ left' }
    })}</script>
  </section></body></html>`;
  return loadPage(html, ['color-gallery.js', 'product-form.js']);
}

export function loadPage(html, scripts = [], { fetch } = {}) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://shop.test/products/heavy-hoodie' });
  const { window } = dom;
  if (fetch) window.fetch = fetch;
  window.hhc = {
    routes: { cart_add_url: '/cart/add', cart_change_url: '/cart/change', cart_update_url: '/cart/update', cart_url: '/cart' },
    cartType: 'drawer',
    strings: { unavailable: 'Unavailable', adding: 'Adding...', cartError: 'Cart error' }
  };
  for (const s of scripts) window.eval(asset(s));
  return window;
}

export function visibleMediaIds(window) {
  return [...window.document.querySelectorAll('color-gallery [data-gallery-stage] [data-gallery-slide]')].map((s) => Number(s.dataset.mediaId));
}

export function pick(window, name, value) {
  const input = [...window.document.querySelectorAll(`input[name="options[${name}]"]`)].find((i) => i.value === value);
  input.checked = true;
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
}
