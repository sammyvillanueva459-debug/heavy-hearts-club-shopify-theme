// Minimal Shopify-flavoured Liquid environment for rendering theme snippets in tests.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function createEngine() {
  const engine = new Liquid({ root: [path.join(root, 'snippets')], extname: '.liquid', jsTruthy: false,
    globals: { routes: { collections_url: '/collections', root_url: '/', cart_url: '/cart', search_url: '/search', account_url: '/account', all_products_url: '/collections/all' } } });
  engine.registerFilter('handleize', (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
  engine.registerFilter('image_url', (img, opts = {}) => `https://cdn.test/${img?.id ?? 'x'}.jpg?width=${opts.width ?? ''}`);
  engine.registerFilter('t', (key) => String(key));
  engine.registerFilter('placeholder_svg_tag', () => '<svg data-placeholder></svg>');
  engine.registerFilter('money', (v) => `$${(Number(v) / 100).toFixed(2)}`);
  return engine;
}

/** Build a product fixture. `media` items: { id, alt }, `variants`: { id, options, featuredMedia } */
export function makeProduct({ media, variants, colorMap, optionNames = ['Color', 'Size'] }) {
  const mediaObjs = media.map((m) => ({
    id: m.id,
    alt: m.alt ?? '',
    preview_image: { id: m.id, width: 1000, height: 1250 }
  }));
  return {
    title: 'Heavy Hoodie',
    media: mediaObjs,
    featured_media: mediaObjs[0],
    options: optionNames,
    variants: variants.map((v) => ({
      id: v.id,
      options: v.options,
      available: v.available !== false,
      featured_media: v.featuredMedia ? mediaObjs.find((m) => m.id === v.featuredMedia) : null
    })),
    metafields: { hhc: { color_map_placeholder: null, color_media: { value: colorMap } } }
  };
}

export async function renderSet(engine, product, color, extra = {}) {
  const tpl = `{% render 'product-gallery-set', product: product, color: color, color_label: color_label, color_position: 1, prefer_back: prefer_back, set_id: 'x', eager: true %}`;
  return engine.parseAndRender(tpl, { product, color, color_label: color, prefer_back: true, ...extra });
}

export function slideIds(html) {
  return [...html.matchAll(/data-gallery-slide data-media-id="(\d+)"/g)].map((m) => Number(m[1]));
}
export function mainId(html) {
  const m = html.match(/data-media-id="(\d+)"[^>]*data-main/);
  return m ? Number(m[1]) : null;
}
