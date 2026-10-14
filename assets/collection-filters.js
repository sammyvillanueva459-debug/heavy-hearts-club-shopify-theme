/*
 * Collection filtering + sorting without full page reloads.
 * Falls back to normal GET navigation if anything fails (the form is a plain GET form).
 */
(function () {
  'use strict';

  var controllers = {};

  function buildUrl(form, sortSelect) {
    var params = new URLSearchParams();
    new FormData(form).forEach(function (value, key) {
      if (value !== '' && value !== null) params.append(key, value);
    });
    if (sortSelect && sortSelect.value) params.set('sort_by', sortSelect.value);
    var query = params.toString();
    return form.getAttribute('action') + (query ? '?' + query : '');
  }

  function render(root, url) {
    var sectionId = root.dataset.sectionId;
    var requestId = (controllers.id = (controllers.id || 0) + 1);
    if (controllers.abort) controllers.abort.abort();
    controllers.abort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var results = root.querySelector('[data-collection-results]');
    results.setAttribute('aria-busy', 'true');

    var fetchUrl = url + (url.indexOf('?') > -1 ? '&' : '?') + 'section_id=' + encodeURIComponent(sectionId);
    return fetch(fetchUrl, controllers.abort ? { signal: controllers.abort.signal } : {})
      .then(function (response) { return response.text(); })
      .then(function (html) {
        if (requestId !== controllers.id) return; // a newer request superseded this one
        var doc = new DOMParser().parseFromString(html, 'text/html');
        ['[data-collection-results]', '[data-collection-count]', '[data-collection-filters]'].forEach(function (selector) {
          var fresh = doc.querySelector(selector);
          var live = root.querySelector(selector);
          if (fresh && live) live.innerHTML = fresh.innerHTML;
        });
        window.history.pushState({}, '', url);
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        window.location.href = url;
      })
      .then(function () {
        if (requestId === controllers.id) results.removeAttribute('aria-busy');
      });
  }

  function init(root) {
    var form = root.querySelector('[data-filters-form]');
    var sort = root.querySelector('[data-collection-sort]');
    var toggle = root.querySelector('[data-filter-toggle]');
    var panel = root.querySelector('[data-collection-filters]');

    function update() {
      render(root, buildUrl(form, sort));
    }
    if (form) form.addEventListener('change', update);
    if (sort) {
      sort.addEventListener('change', function () {
        if (form) update();
        else window.location.href = window.location.pathname + '?sort_by=' + encodeURIComponent(sort.value);
      });
    }
    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var open = panel.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    window.addEventListener('popstate', function () { window.location.reload(); });
  }

  function boot() {
    document.querySelectorAll('[data-collection]').forEach(function (root) {
      if (!root.__hhcFilters) { root.__hhcFilters = true; init(root); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('shopify:section:load', boot);
})();
