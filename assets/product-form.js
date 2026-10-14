/*
 * Variant selection for the product page.
 * Reads the variant list rendered by Shopify (never hardcoded), keeps the hidden variant id,
 * price, availability, inventory text and the color gallery in sync with the chosen options.
 */
(function () {
  'use strict';

  window.hhc = window.hhc || {};

  /** Find the variant whose options exactly match `selected` (array of option values). */
  function findVariant(variants, selected) {
    for (var i = 0; i < variants.length; i++) {
      var options = variants[i].options;
      var match = options.length === selected.length;
      for (var j = 0; match && j < options.length; j++) {
        if (options[j] !== selected[j]) match = false;
      }
      if (match) return variants[i];
    }
    return null;
  }

  /** Is there an available variant using `value` at `index` with the other selections kept? */
  function isValueAvailable(variants, selected, index, value) {
    return variants.some(function (variant) {
      if (variant.options[index] !== value) return false;
      for (var k = 0; k < selected.length; k++) {
        if (k !== index && selected[k] && variant.options[k] !== selected[k]) return false;
      }
      return variant.available;
    });
  }

  class ProductSection {
    constructor(root) {
      this.root = root;
      var json = root.querySelector('[data-product-json]');
      this.data = json ? JSON.parse(json.textContent) : { variants: [], options: [], strings: {} };
      this.variants = this.data.variants;
      this.form = root.querySelector('[data-product-form]');
      this.gallery = root.querySelector('color-gallery');
      this.idInput = root.querySelector('[data-variant-id]');
      this.button = root.querySelector('[data-add-to-cart]');
      this.buttonLabel = root.querySelector('[data-add-to-cart-label]');
      this.inventory = root.querySelector('[data-inventory]');
      this.priceWrap = root.querySelector('[data-product-price]');
      this.groups = Array.prototype.slice.call(root.querySelectorAll('[data-option-position]'));
      this.colorIndex = this.data.colorPosition ? this.data.colorPosition - 1 : -1;
      this.currentId = this.data.currentVariantId;

      root.addEventListener('change', this.onChange.bind(this));
      root.addEventListener('click', this.onClick.bind(this));
      this.refreshAvailability();
    }

    selectedValues() {
      return this.groups.map(function (group) {
        var checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    }

    onChange(event) {
      if (event.target.matches && event.target.matches('.option-input')) this.update();
    }

    onClick(event) {
      var button = event.target.closest && event.target.closest('[data-quantity-minus],[data-quantity-plus]');
      if (!button) return;
      var input = this.root.querySelector('[data-quantity-input]');
      if (!input) return;
      var value = parseInt(input.value, 10) || 1;
      value += button.hasAttribute('data-quantity-plus') ? 1 : -1;
      input.value = Math.max(1, value);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    update() {
      var selected = this.selectedValues();
      var variant = selected.indexOf(null) === -1 ? findVariant(this.variants, selected) : null;

      this.groups.forEach(function (group, i) {
        var label = group.querySelector('[data-option-selected]');
        if (label && selected[i] !== null) label.textContent = selected[i];
      });

      // The gallery follows the selected COLOR only, so size changes never reset the photos.
      if (this.gallery && this.colorIndex > -1) {
        var colorGroup = this.groups[this.colorIndex];
        var checked = colorGroup && colorGroup.querySelector('input:checked');
        if (checked) this.gallery.setColor(checked.dataset.optionHandle || '');
      }

      this.refreshAvailability();

      if (!variant) {
        this.currentId = null;
        if (this.idInput) this.idInput.disabled = true;
        this.setButton(false, this.data.strings.unavailable);
        this.setInventory(null);
        this.root.dispatchEvent(new CustomEvent('variant:change', { bubbles: true, detail: { variant: null } }));
        return;
      }

      this.currentId = variant.id;
      if (this.idInput) {
        this.idInput.disabled = false;
        this.idInput.value = variant.id;
      }
      this.setButton(variant.available, variant.available ? this.data.strings.addToCart : this.data.strings.soldOut);
      this.setInventory(variant);
      this.setPrice(variant);

      if (this.colorIndex < 0 && this.gallery && variant.featuredMediaId) {
        this.gallery.showMedia(variant.featuredMediaId);
      }

      if (window.history && window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }

      this.root.dispatchEvent(new CustomEvent('variant:change', { bubbles: true, detail: { variant: variant } }));
    }

    refreshAvailability() {
      var selected = this.selectedValues();
      var variants = this.variants;
      this.groups.forEach(function (group, index) {
        group.querySelectorAll('.option-input').forEach(function (input) {
          var ok = isValueAvailable(variants, selected, index, input.value);
          var label = group.querySelector('label[for="' + input.id + '"]');
          if (label) label.classList.toggle('is-unavailable', !ok);
        });
      });
    }

    setButton(enabled, text) {
      if (!this.button) return;
      this.button.disabled = !enabled;
      if (this.buttonLabel && text) this.buttonLabel.textContent = text;
    }

    setInventory(variant) {
      if (!this.inventory) return;
      var strings = this.data.strings;
      var threshold = Number(this.inventory.dataset.threshold) || 0;
      if (!variant) this.inventory.textContent = strings.unavailable;
      else if (!variant.available) this.inventory.textContent = strings.soldOut;
      else if (variant.inventoryQuantity !== null && variant.inventoryQuantity > 0 && variant.inventoryQuantity <= threshold) {
        this.inventory.textContent = strings.lowStock.replace('__QTY__', variant.inventoryQuantity);
      } else this.inventory.textContent = strings.inStock;
    }

    setPrice(variant) {
      if (!this.priceWrap) return;
      var wrap = this.priceWrap.querySelector('[data-price]');
      if (!wrap) return;
      wrap.textContent = '';
      wrap.classList.toggle('price--on-sale', !!variant.compareAtPrice);
      if (variant.compareAtPrice) {
        var compare = document.createElement('s');
        compare.className = 'price__compare';
        compare.textContent = variant.compareAtPrice;
        wrap.appendChild(compare);
      }
      var current = document.createElement('span');
      current.className = 'price__current';
      current.textContent = variant.price;
      wrap.appendChild(current);
    }
  }

  function init(scope) {
    (scope || document).querySelectorAll('[data-product-section]').forEach(function (root) {
      if (!root.__hhcProduct) root.__hhcProduct = new ProductSection(root);
    });
  }

  window.hhc.productForm = { findVariant: findVariant, isValueAvailable: isValueAvailable, init: init };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
  document.addEventListener('shopify:section:load', function (event) { init(event.target); });
})();
