/*
 * AJAX cart: add to cart, drawer, quantity changes, live count badge.
 * Uses Shopify's Cart Ajax API + Section Rendering API, so totals, discounts and checkout stay native.
 */
(function () {
  'use strict';

  window.hhc = window.hhc || {};
  var routes = function () { return window.hhc.routes || {}; };
  var strings = function () { return window.hhc.strings || {}; };

  var queue = Promise.resolve();

  function jsonRequest(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          var error = new Error(data.description || data.message || strings().cartError);
          error.data = data;
          throw error;
        }
        return data;
      });
    });
  }

  function sectionIds() {
    var ids = ['cart-drawer'];
    var page = document.querySelector('[data-cart-page]');
    if (page && page.dataset.sectionId) ids.push(page.dataset.sectionId);
    return ids;
  }

  function parseSection(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  /** Apply Section Rendering API output to the page and update the badge. */
  function applySections(sections) {
    if (!sections) return;
    var count = null;
    Object.keys(sections).forEach(function (id) {
      var doc = parseSection(sections[id]);
      var drawerInner = doc.querySelector('[data-cart-drawer-inner]');
      var pageInner = doc.querySelector('[data-cart-page-inner]');
      var liveDrawer = document.querySelector('[data-cart-drawer-inner]');
      var livePage = document.querySelector('[data-cart-page-inner]');
      if (drawerInner) {
        count = Number(drawerInner.dataset.itemCount);
        if (liveDrawer) {
          liveDrawer.innerHTML = drawerInner.innerHTML;
          liveDrawer.dataset.itemCount = drawerInner.dataset.itemCount;
        }
      }
      if (pageInner && livePage) {
        livePage.innerHTML = pageInner.innerHTML;
        livePage.dataset.itemCount = pageInner.dataset.itemCount;
        if (count === null) count = Number(pageInner.dataset.itemCount);
      }
    });
    if (count !== null) updateCount(count);
  }

  function updateCount(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (badge) {
      badge.textContent = count;
      badge.classList.toggle('is-empty', count === 0);
    });
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { itemCount: count } }));
  }

  function add(formData) {
    formData.append('sections', sectionIds().join(','));
    formData.append('sections_url', window.location.pathname);
    return fetch(routes().cart_add_url + '.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          var error = new Error(data.description || data.message || strings().cartError);
          error.data = data;
          throw error;
        }
        applySections(data.sections);
        return data;
      });
    });
  }

  function change(line, quantity) {
    // serialise changes so rapid clicks cannot race each other
    queue = queue.then(function () {
      return jsonRequest(routes().cart_change_url + '.js', {
        line: line,
        quantity: quantity,
        sections: sectionIds().join(','),
        sections_url: window.location.pathname
      }).then(function (data) {
        applySections(data.sections);
        return data;
      });
    }).catch(function (error) {
      if (window.console) console.error(error);
      window.location.reload();
    });
    return queue;
  }

  function updateNote(note) {
    return jsonRequest(routes().cart_update_url + '.js', { note: note });
  }

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.panel = this.querySelector('.cart-drawer__panel');
      this.addEventListener('click', function (event) {
        if (event.target.closest('[data-cart-close]')) this.close();
      }.bind(this));
      this.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') this.close();
        else if (event.key === 'Tab') this.trapFocus(event);
      }.bind(this));
    }

    open(opener) {
      this.opener = opener || document.activeElement;
      this.hidden = false;
      this.classList.add('is-open');
      document.documentElement.classList.add('cart-open');
      var toggle = document.querySelector('[data-cart-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      if (this.panel) this.panel.focus();
    }

    close() {
      this.classList.remove('is-open');
      this.hidden = true;
      document.documentElement.classList.remove('cart-open');
      var toggle = document.querySelector('[data-cart-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      if (this.opener && this.opener.focus) this.opener.focus();
    }

    trapFocus(event) {
      var focusable = this.panel.querySelectorAll('a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);

  function openCart(opener) {
    var drawer = document.querySelector('cart-drawer');
    if (window.hhc.cartType === 'drawer' && drawer) {
      drawer.open(opener);
      return true;
    }
    return false;
  }

  function showFormError(form, message) {
    var box = form.querySelector('[data-form-error]');
    if (!box) return;
    box.textContent = message || '';
    box.hidden = !message;
  }

  document.addEventListener('submit', function (event) {
    var form = event.target.closest ? event.target.closest('[data-product-form]') : null;
    if (!form || event.target !== form) return;
    event.preventDefault();
    var button = form.querySelector('[data-add-to-cart]');
    var idInput = form.querySelector('[data-variant-id]');
    if (!idInput || idInput.disabled || !idInput.value) {
      showFormError(form, strings().unavailable);
      return;
    }
    if (button && button.disabled) return;
    var label = form.querySelector('[data-add-to-cart-label]');
    var original = label ? label.textContent : '';
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    if (label) label.textContent = strings().adding;
    showFormError(form, '');

    add(new FormData(form)).then(function () {
      if (!openCart(button)) window.location.href = routes().cart_url;
    }).catch(function (error) {
      showFormError(form, error.message);
    }).then(function () {
      if (button) { button.disabled = false; button.removeAttribute('aria-busy'); }
      if (label) label.textContent = original;
    });
  });

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest && event.target.closest('[data-cart-toggle]');
    if (toggle && window.hhc.cartType === 'drawer' && document.querySelector('cart-drawer')) {
      event.preventDefault();
      openCart(toggle);
      return;
    }
    var item = event.target.closest && event.target.closest('[data-cart-item]');
    if (!item) return;
    var line = Number(item.dataset.line);
    var input = item.querySelector('[data-cart-qty]');
    if (event.target.closest('[data-cart-remove]')) {
      event.preventDefault();
      change(line, 0);
    } else if (event.target.closest('[data-cart-qty-plus]')) {
      change(line, Number(input.value) + 1);
    } else if (event.target.closest('[data-cart-qty-minus]')) {
      change(line, Math.max(0, Number(input.value) - 1));
    }
  });

  document.addEventListener('change', function (event) {
    var input = event.target.closest && event.target.closest('[data-cart-qty]');
    if (input) {
      var item = input.closest('[data-cart-item]');
      change(Number(item.dataset.line), Math.max(0, parseInt(input.value, 10) || 0));
      return;
    }
    var note = event.target.closest && event.target.closest('[data-cart-note]');
    if (note) updateNote(note.value).catch(function () {});
  });

  window.hhc.cart = { add: add, change: change, applySections: applySections, updateCount: updateCount, open: openCart };
})();
