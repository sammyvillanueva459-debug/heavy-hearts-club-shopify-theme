import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './helpers/dom.js';

function drawerHtml(count, lines = []) {
  return `<div id="shopify-section-cart-drawer"><cart-drawer><div data-cart-drawer-inner data-item-count="${count}">
    ${lines.map((qty, i) => `<div data-cart-item data-line="${i + 1}"><button data-cart-qty-minus></button><input data-cart-qty value="${qty}"><button data-cart-qty-plus></button><a data-cart-remove href="/cart/change?line=${i + 1}&quantity=0">x</a></div>`).join('')}
  </div></cart-drawer></div>`;
}

function page({ responses }) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    return { ok: next.ok !== false, status: next.status || 200, json: async () => next.body };
  };
  const html = `<!doctype html><body>
    <a href="/cart" data-cart-toggle>Cart <span data-cart-count class="is-empty">0</span></a>
    <section data-product-section>
      <form data-product-form action="/cart/add" method="post">
        <input type="hidden" name="id" value="3" data-variant-id>
        <input name="quantity" value="2">
        <button type="submit" data-add-to-cart><span data-add-to-cart-label>Add to cart</span></button>
        <p data-form-error hidden></p>
      </form>
    </section>
    <cart-drawer hidden><div class="cart-drawer__panel" tabindex="-1"><button data-cart-close>close</button>
      <div data-cart-drawer-inner data-item-count="0"></div></div></cart-drawer>
  </body>`;
  const w = loadPage(html, ['cart.js'], { fetch });
  return { w, calls };
}

const tick = () => new Promise((r) => setTimeout(r, 10));

test('add to cart posts the selected variant id + quantity and opens the drawer with a live badge', async () => {
  const { w, calls } = page({
    responses: [{ body: { id: 3, sections: { 'cart-drawer': drawerHtml(2, [2]) } } }]
  });
  w.document.querySelector('[data-add-to-cart]').click();
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/cart/add.js');
  const body = calls[0].init.body;
  assert.equal(body.get('id'), '3');
  assert.equal(body.get('quantity'), '2');
  assert.equal(body.get('sections'), 'cart-drawer');
  const badge = w.document.querySelector('[data-cart-count]');
  assert.equal(badge.textContent, '2');
  assert.equal(badge.classList.contains('is-empty'), false);
  assert.equal(w.document.querySelector('cart-drawer').hidden, false);
  assert.ok(w.document.querySelector('[data-cart-item]'));
  assert.equal(w.document.querySelector('[data-add-to-cart]').disabled, false);
});

test('add to cart errors from Shopify (e.g. out of stock) are shown and the button recovers', async () => {
  const { w } = page({
    responses: [{ ok: false, status: 422, body: { status: 422, message: 'Cart Error', description: 'All 3 are in your cart.' } }]
  });
  w.document.querySelector('[data-add-to-cart]').click();
  await tick();
  const error = w.document.querySelector('[data-form-error]');
  assert.equal(error.hidden, false);
  assert.equal(error.textContent, 'All 3 are in your cart.');
  assert.equal(w.document.querySelector('[data-add-to-cart]').disabled, false);
  assert.equal(w.document.querySelector('[data-add-to-cart-label]').textContent, 'Add to cart');
});

test('a disabled variant id (unavailable combination) never reaches the cart API', async () => {
  const { w, calls } = page({ responses: [] });
  w.document.querySelector('[data-variant-id]').disabled = true;
  w.document.querySelector('form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await tick();
  assert.equal(calls.length, 0);
  assert.equal(w.document.querySelector('[data-form-error]').textContent, 'Unavailable');
});

test('quantity buttons call /cart/change.js with the line number and refresh totals + badge', async () => {
  const { w, calls } = page({
    responses: [
      { body: { sections: { 'cart-drawer': drawerHtml(1, [1]) } } },
      { body: { sections: { 'cart-drawer': drawerHtml(0, []) } } }
    ]
  });
  w.document.querySelector('[data-cart-drawer-inner]').innerHTML = drawerHtml(2, [2]);
  w.document.querySelector('[data-cart-qty-minus]').click();
  await tick();
  assert.equal(calls[0].url, '/cart/change.js');
  assert.deepEqual(JSON.parse(calls[0].init.body).line, 1);
  assert.equal(JSON.parse(calls[0].init.body).quantity, 1);
  assert.equal(w.document.querySelector('[data-cart-count]').textContent, '1');

  w.document.querySelector('[data-cart-remove]').click();
  await tick();
  assert.equal(JSON.parse(calls[1].init.body).quantity, 0);
  assert.equal(w.document.querySelector('[data-cart-count]').textContent, '0');
  assert.ok(w.document.querySelector('[data-cart-count]').classList.contains('is-empty'));
});

test('rapid quantity clicks are serialised so responses cannot arrive out of order', async () => {
  const order = [];
  const w = loadPage(`<!doctype html><body><span data-cart-count>5</span><cart-drawer><div data-cart-drawer-inner>
      <div data-cart-item data-line="1"><button data-cart-qty-plus></button><button data-cart-qty-minus></button><input data-cart-qty value="1"></div></div></cart-drawer></body>`,
  ['cart.js'], {
    fetch: async (url, init) => {
      const q = JSON.parse(init.body).quantity;
      await new Promise((r) => setTimeout(r, q === 2 ? 40 : 1)); // the first request is much slower
      order.push(q);
      return { ok: true, json: async () => ({ sections: { 'cart-drawer': drawerHtml(q, [q]) } }) };
    }
  });
  w.document.querySelector('[data-cart-qty-plus]').click(); // 1 -> 2 (slow)
  w.document.querySelector('[data-cart-qty-minus]').click(); // 1 -> 0 (fast)
  await new Promise((r) => setTimeout(r, 150));
  assert.deepEqual(order, [2, 0]); // requests were sent one after another, in click order
  assert.equal(w.document.querySelector('[data-cart-count]').textContent, '0'); // last response wins
});

test('clicking the header cart icon opens the drawer instead of navigating', async () => {
  const { w } = page({ responses: [] });
  const event = new w.MouseEvent('click', { bubbles: true, cancelable: true });
  w.document.querySelector('[data-cart-toggle]').dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(w.document.querySelector('cart-drawer').hidden, false);
  w.document.querySelector('[data-cart-close]').click();
  assert.equal(w.document.querySelector('cart-drawer').hidden, true);
});
