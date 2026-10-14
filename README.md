# Heavy Hearts Club™ Apparel – Shopify Theme

A Shopify **Online Store 2.0** theme (Liquid, JSON templates, CSS, vanilla JavaScript) for Heavy Hearts Club,
an urban Y2K streetwear brand. Warm ivory, off-white, washed denim, slate, charcoal and muted burgundy;
large editorial photography; Hollister-style navigation and category layouts with an original identity.

> The theme is delivered as source for Shopify's GitHub integration and creates an **unpublished** theme.
> Nothing in this repository publishes, pushes to, or overwrites your live theme.

## Highlights

| Area | What you get |
| --- | --- |
| Navigation | Announcement bar, sticky header, multi-column mega menus (3-level menus), accessible mobile accordion menu, built-in Men / Women / Kids / More department menu used until you pick a menu |
| Homepage | Editorial hero with Shop Men/Women/Kids buttons, new arrivals, trending, category photography, matching sets, featured collections, seasonal campaign, newsletter, footer |
| **Product page** | **Color-specific gallery**: choosing a color swaps in *only* that color's photos, resets to its main (back design when available) image, with thumbnails, arrows, keyboard and mobile swipe |
| Variants | Size/color pickers, live price, compare-at price, availability, low-stock text, correct variant id, `?variant=` URL sync, sold-out combinations flagged |
| Cart | AJAX drawer (or cart page), live count badge, quantity/remove/note, native Shopify discounts and checkout |
| Discovery | Search page, predictive search, collection filtering (Shopify storefront filters) and sorting, pagination |
| Accounts | Login, register, account, orders, addresses, reset/activate password |
| Quality | Theme Check config, 57 automated tests (variant switching, cart, navigation, responsive layout, structure), CI |

## Quick start

See [docs/SETUP.md](docs/SETUP.md) for the full walkthrough. In short:

1. Connect this repo to Shopify (**Online Store → Themes → Add theme → Connect from GitHub**) using a dedicated branch.
   Shopify creates a new *unpublished* theme. Do **not** click Publish until you have previewed it.
2. Create the menu and collections described in [docs/COLLECTIONS.md](docs/COLLECTIONS.md).
3. Upload your red broken-heart logo in **Theme settings → Brand** and your photography in the theme editor.
4. Associate photos with colors as described in [docs/COLOR-MEDIA.md](docs/COLOR-MEDIA.md) (works with Printify).

## Color-specific product galleries

Shopify does not assign every image to the right color, so this theme uses **explicit, editable associations**:

1. Product metafield `hhc.color_media` (JSON): `{"Navy Blue": [123, 456], "Washed Black": [789]}`
2. Media alt-text tag: `Back of hoodie [[color:navy blue|view:back]]` (the tag is removed from the visible alt text)
3. Shopify's own variant image when a photo has no tag

Colors without associations degrade gracefully (variant image → unclaimed photos → product image) and never
show a photo explicitly assigned to another color. Details and Printify tips: [docs/COLOR-MEDIA.md](docs/COLOR-MEDIA.md).

## Development

```bash
npm install
npm run check      # Shopify Theme Check using .theme-check.yml
npm test           # node:test + jsdom + liquidjs
npm run validate   # both
```

Tests render the real `snippets/product-gallery-set.liquid` and `snippets/mega-menu-default.liquid` with
[liquidjs](https://liquidjs.com), then run the shipped `assets/*.js` in jsdom. They cover color association rules,
variant switching (including rapid changes), cart add/change/errors, navigation, CSS breakpoints and theme structure.
They do not replace a visual check in Shopify's theme preview, so please review on a phone and desktop before publishing.

## Structure

```
assets/      theme.css, theme.js, color-gallery.js, product-form.js, cart.js, collection-filters.js
config/      settings_schema.json, settings_data.json
layout/      theme.liquid, password.liquid
locales/     en.default.json
sections/    header, footer, hero, product, collection, cart drawer, accounts, ... (+ header/footer groups)
snippets/    product-card, product-gallery-set, price, cart-contents, mega-menu-default, ...
templates/   JSON templates (incl. customers/)
tests/       automated tests
docs/        setup, collections, color/media guide
```

## What is *not* included

* Photography: the theme ships with placeholders only. Add your own editorial images in the theme editor; the theme never invents garment details.
* Menus, collections and products live in your Shopify admin (see the docs for exact handles).
* Fake promotions: prices and discounts come only from Shopify (compare-at prices, automatic discounts and discount codes at checkout).
