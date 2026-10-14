# Setup guide

## 1. Connect to Shopify as an unpublished theme

1. Create a branch for Shopify to track (for example `shopify-dev`) from the branch that holds this code, or use this PR's branch.
2. In Shopify admin go to **Online Store → Themes → Add theme → Connect from GitHub**, authorize the GitHub app and choose
   this repository and branch.
3. Shopify adds the theme to **Theme library** as an unpublished theme. Your live theme is untouched.
4. Use **Preview** / the theme editor (**Customize**) to configure it. Publish only when you are satisfied.

Tip: `.shopifyignore` keeps `tests/`, `docs/`, `scripts/`, `package*.json` and `.github/` out of the theme.

## 2. Brand

* **Theme settings → Brand**: upload your red broken-heart logo. It is displayed as supplied (never recolored).
  Without a logo the wordmark "Heavy Hearts Club™" is shown.
* **Theme settings → Colors**: ivory `#f7f2e8`, off-white `#fffdf8`, charcoal `#2b2d31`, slate `#5f6b78`,
  washed denim `#6f8fb0` / `#3f5d7d`, muted burgundy `#7a2e3b` are the defaults.

## 3. Navigation

* **Header → Menu**: pick a Shopify menu. Three levels become a mega menu (level 1 = department, level 2 = column heading,
  level 3 = links). Leave it empty to use the built-in Men / Women / Kids / More menu, which links to the collection handles
  listed in [COLLECTIONS.md](COLLECTIONS.md).
* Footer menu: **Footer → Menu block**, default menu handle `footer`.

## 4. Homepage

Everything on the homepage is a section you can reorder in the editor: hero (add your editorial photo and buttons),
featured collections (new arrivals, trending, matching sets), category photography tiles, featured collection list,
seasonal campaign banner and newsletter signup. Collection pickers default to the handles in `templates/index.json`
(`new-arrivals`, `best-sellers`, `matching-sets`, ...). Change them in the editor if yours differ.

## 5. Products, colors and photos

* The color option must be named `Color` or `Colour` (change under **Theme settings → Products → Color option names**).
* Associate photos with colors: see [COLOR-MEDIA.md](COLOR-MEDIA.md).

## 6. Search and filters

* Predictive search is built into the header; results page is `templates/search.json`.
* Collection filters use Shopify's Search & Discovery app: **Apps → Search & Discovery → Filters** and add Availability,
  Price, Color, Size, etc.

## 7. Cart and checkout

* **Theme settings → Cart** switches between drawer and page.
* The cart uses Shopify's Ajax API and the Section Rendering API; discounts, taxes, shipping and checkout are Shopify's.
  Discount codes are entered at Shopify checkout.

## 8. Customer accounts

Customer account templates live in `templates/customers/`. Enable accounts in **Settings → Customer accounts**
(classic accounts use these templates; new customer accounts are hosted by Shopify).

## 9. Local validation

```bash
npm install
npm run validate
```

Optionally use the Shopify CLI against a **development** theme only (`shopify theme dev`), never `shopify theme push --live`.
