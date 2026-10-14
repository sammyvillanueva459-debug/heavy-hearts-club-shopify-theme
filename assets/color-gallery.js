/*
 * <color-gallery>
 * Shows ONLY the photos associated with the selected color.
 *
 * Markup contract (see sections/main-product.liquid + snippets/product-gallery-set.liquid):
 *   <color-gallery data-active-color="navy">
 *     <div data-gallery-stage> ...the rendered gallery set for the active color... </div>
 *     <template data-gallery-template data-color="black"> ...gallery set for black... </template>
 *   </color-gallery>
 *
 * Switching colors swaps the whole set (it never filters a shared list), so photos of different
 * colors can never be visible together. Rapid switches are coalesced: only the most recently
 * requested color is ever committed.
 */
(function () {
  'use strict';

  var TRANSITION_MS = 140;

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  class ColorGallery extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.stage = this.querySelector('[data-gallery-stage]');
      this.activeColor = this.dataset.activeColor || '';
      this.pendingColor = null;
      this.timer = null;
      this.lockTimer = null;
      this.stash = {};
      this.index = 0;
      this.transitionMs = this.dataset.transition !== undefined ? Number(this.dataset.transition) : TRANSITION_MS;

      this.addEventListener('click', this.onClick.bind(this));
      this.addEventListener('keydown', this.onKeydown.bind(this));
      this.bindSet(true);
    }

    disconnectedCallback() {
      clearTimeout(this.timer);
      clearTimeout(this.lockTimer);
    }

    get set() {
      return this.stage ? this.stage.querySelector('[data-gallery-set]') : null;
    }

    get slides() {
      return this.set ? Array.prototype.slice.call(this.set.querySelectorAll('[data-gallery-slide]')) : [];
    }

    get thumbs() {
      return this.set ? Array.prototype.slice.call(this.set.querySelectorAll('[data-gallery-thumb]')) : [];
    }

    /** Find the pre-rendered set for a color. Returns an element or null. */
    getSet(color) {
      if (this.stash[color]) return this.stash[color];
      var templates = this.querySelectorAll('template[data-gallery-template]');
      for (var i = 0; i < templates.length; i++) {
        if ((templates[i].dataset.color || '') === color) {
          var node = templates[i].content.firstElementChild;
          if (node) {
            this.stash[color] = node.cloneNode(true);
            return this.stash[color];
          }
        }
      }
      return null;
    }

    /** Request a color. Returns true when the request is accepted (or cancels a pending change). */
    setColor(color) {
      color = color || '';
      if (this.pendingColor === null && color === this.activeColor) return false;

      if (color === this.activeColor) {
        // user went back to the visible color before the swap committed: cancel it
        clearTimeout(this.timer);
        this.pendingColor = null;
        this.classList.remove('is-switching');
        return true;
      }

      if (!this.getSet(color)) {
        this.dispatchEvent(new CustomEvent('gallery:missing', { bubbles: true, detail: { color: color } }));
        return false;
      }

      this.pendingColor = color;
      clearTimeout(this.timer);
      if (this.transitionMs <= 0 || prefersReducedMotion()) {
        this.commit();
      } else {
        this.classList.add('is-switching');
        this.timer = setTimeout(this.commit.bind(this), this.transitionMs);
      }
      return true;
    }

    commit() {
      var color = this.pendingColor;
      this.pendingColor = null;
      if (color === null) return;
      var next = this.getSet(color);
      if (!next) {
        this.classList.remove('is-switching');
        return;
      }
      var current = this.set;
      if (current) {
        this.stash[this.activeColor] = current;
        current.remove();
      }
      this.stage.appendChild(next);
      this.activeColor = color;
      this.dataset.activeColor = color;
      this.bindSet(true);
      var self = this;
      var done = function () { self.classList.remove('is-switching'); };
      if (window.requestAnimationFrame && this.transitionMs > 0) window.requestAnimationFrame(done);
      else done();
      this.dispatchEvent(new CustomEvent('gallery:change', {
        bubbles: true,
        detail: { color: color, mediaIds: this.slides.map(function (s) { return s.dataset.mediaId; }) }
      }));
    }

    bindSet(resetToMain) {
      var slidesEl = this.set && this.set.querySelector('[data-gallery-slides]');
      if (slidesEl && !slidesEl.__hhcBound) {
        slidesEl.__hhcBound = true;
        var self = this;
        var ticking = false;
        slidesEl.addEventListener('scroll', function () {
          if (self.lockTimer || ticking) return;
          ticking = true;
          (window.requestAnimationFrame || setTimeout)(function () {
            ticking = false;
            var width = slidesEl.clientWidth;
            if (!width) return;
            self.syncActive(Math.round(slidesEl.scrollLeft / width));
          });
        }, { passive: true });
      }
      var slides = this.slides;
      var main = 0;
      for (var i = 0; i < slides.length; i++) {
        if (slides[i].hasAttribute('data-main')) { main = i; break; }
      }
      if (resetToMain) this.goTo(main, false);
    }

    /** Update active classes/aria/counter without scrolling. */
    syncActive(index) {
      var slides = this.slides;
      if (!slides.length) return;
      index = Math.max(0, Math.min(slides.length - 1, index));
      this.index = index;
      slides.forEach(function (slide, i) { slide.classList.toggle('is-active', i === index); });
      this.thumbs.forEach(function (thumb, i) {
        thumb.classList.toggle('is-active', i === index);
        if (i === index) thumb.setAttribute('aria-current', 'true');
        else thumb.removeAttribute('aria-current');
      });
      var counter = this.set && this.set.querySelector('[data-gallery-counter]');
      if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;
      var prev = this.set && this.set.querySelector('[data-gallery-prev]');
      var next = this.set && this.set.querySelector('[data-gallery-next]');
      if (prev) prev.disabled = slides.length < 2;
      if (next) next.disabled = slides.length < 2;
    }

    goTo(index, smooth) {
      var slides = this.slides;
      if (!slides.length) return;
      var count = slides.length;
      index = ((index % count) + count) % count;
      this.syncActive(index);
      var container = this.set.querySelector('[data-gallery-slides]');
      if (container && typeof container.scrollTo === 'function') {
        var self = this;
        clearTimeout(this.lockTimer);
        this.lockTimer = setTimeout(function () { self.lockTimer = null; }, smooth ? 450 : 60);
        try {
          container.scrollTo({ left: slides[index].offsetLeft, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
        } catch (e) { /* ignore */ }
      }
    }

    showMedia(mediaId) {
      var slides = this.slides;
      for (var i = 0; i < slides.length; i++) {
        if (String(slides[i].dataset.mediaId) === String(mediaId)) {
          this.goTo(i, true);
          return true;
        }
      }
      return false;
    }

    onClick(event) {
      var target = event.target.closest ? event.target.closest('[data-gallery-prev],[data-gallery-next],[data-gallery-thumb]') : null;
      if (!target || !this.contains(target)) return;
      if (target.hasAttribute('data-gallery-prev')) this.goTo(this.index - 1, true);
      else if (target.hasAttribute('data-gallery-next')) this.goTo(this.index + 1, true);
      else this.goTo(Number(target.dataset.index), true);
    }

    onKeydown(event) {
      if (!event.target.closest || !event.target.closest('[data-gallery-slides]')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); this.goTo(this.index + 1, true); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); this.goTo(this.index - 1, true); }
    }
  }

  if (!customElements.get('color-gallery')) customElements.define('color-gallery', ColorGallery);
})();
