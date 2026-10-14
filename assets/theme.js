/*
 * Core theme behavior: mega menus, mobile navigation, search panel + predictive search.
 */
(function () {
  'use strict';

  window.hhc = window.hhc || {};

  /* ---------- Mega menu ---------- */
  var openMega = null;
  var hoverTimer = null;

  function setMega(toggle, open) {
    var panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.hidden = !open;
    toggle.closest('.nav__item').classList.toggle('is-open', open);
    openMega = open ? toggle : (openMega === toggle ? null : openMega);
  }

  function closeMega() {
    if (openMega) setMega(openMega, false);
  }

  function initMegaMenu() {
    var items = document.querySelectorAll('.nav__item.has-mega');
    items.forEach(function (item) {
      if (item.__hhcMega) return;
      item.__hhcMega = true;
      var toggle = item.querySelector('[data-mega-toggle]');
      if (!toggle) return;

      toggle.addEventListener('click', function () {
        var willOpen = toggle.getAttribute('aria-expanded') !== 'true';
        closeMega();
        if (willOpen) setMega(toggle, true);
      });

      // hover intent for pointer devices
      item.addEventListener('mouseenter', function () {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () {
          if (openMega !== toggle) { closeMega(); setMega(toggle, true); }
        }, 80);
      });
      item.addEventListener('mouseleave', function () {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { setMega(toggle, false); }, 160);
      });
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (openMega) { var t = openMega; closeMega(); t.focus(); }
      closeMobileNav();
      closeSearch();
    }
  });
  document.addEventListener('click', function (event) {
    if (openMega && !event.target.closest('.nav__item')) closeMega();
  });

  /* ---------- Mobile navigation ---------- */
  function closeMobileNav() {
    var nav = document.querySelector('[data-mobile-nav]');
    if (!nav || nav.hidden) return;
    nav.hidden = true;
    document.documentElement.classList.remove('nav-open');
    var opener = document.querySelector('[data-mobile-nav-open]');
    if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-mobile-nav-open]')) {
      var nav = document.querySelector('[data-mobile-nav]');
      if (!nav) return;
      nav.hidden = false;
      document.documentElement.classList.add('nav-open');
      event.target.closest('[data-mobile-nav-open]').setAttribute('aria-expanded', 'true');
      var close = nav.querySelector('.mobile-nav__close');
      if (close) close.focus();
    } else if (event.target.closest('[data-mobile-nav-close]')) {
      closeMobileNav();
    }
  });

  /* ---------- Search panel + predictive search ---------- */
  function closeSearch() {
    var panel = document.querySelector('[data-search-panel]');
    var toggle = document.querySelector('[data-search-toggle]');
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-search-toggle]');
    if (!toggle) return;
    var panel = document.querySelector('[data-search-panel]');
    if (!panel) return;
    var open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var input = panel.querySelector('[data-predictive-input]');
      if (input) input.focus();
    }
  });

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function initPredictiveSearch() {
    var input = document.querySelector('[data-predictive-input]');
    var results = document.querySelector('[data-predictive-results]');
    if (!input || !results || input.__hhcPredictive) return;
    input.__hhcPredictive = true;
    var controller = null;
    var latest = 0;

    var run = debounce(function () {
      var term = input.value.trim();
      if (!term) { results.innerHTML = ''; return; }
      if (controller) controller.abort();
      controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var id = ++latest;
      var url = (window.hhc.routes.predictive_search_url || '/search/suggest') +
        '?q=' + encodeURIComponent(term) +
        '&resources[type]=product,collection&resources[limit]=4&section_id=predictive-search';
      fetch(url, controller ? { signal: controller.signal } : {})
        .then(function (response) {
          if (!response.ok) throw new Error(response.status);
          return response.text();
        })
        .then(function (html) {
          if (id !== latest) return;
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var content = doc.querySelector('[data-predictive-content]');
          results.innerHTML = content ? content.innerHTML : '';
        })
        .catch(function (error) {
          if (error && error.name === 'AbortError') return;
          results.innerHTML = '';
        });
    }, 250);

    input.addEventListener('input', run);
  }

  function boot() {
    initMegaMenu();
    initPredictiveSearch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('shopify:section:load', boot);
})();
