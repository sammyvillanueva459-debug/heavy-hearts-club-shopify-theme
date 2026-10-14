import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, makeProduct, renderSet, slideIds, mainId } from './helpers/liquid.js';

const engine = createEngine();
const variants = [
  { id: 1, options: ['Navy Blue', 'M'] },
  { id: 2, options: ['Navy Blue', 'L'] },
  { id: 3, options: ['Washed Black', 'M'] }
];

test('alt-text tags associate media with exactly one color', async () => {
  const product = makeProduct({
    variants,
    media: [
      { id: 101, alt: 'Front [[color:navy blue|view:front]]' },
      { id: 102, alt: 'Back [[color:Navy Blue|view:back]]' },
      { id: 103, alt: 'Detail [[color:navy blue|view:detail]]' },
      { id: 201, alt: 'Front [[color:washed black|view:front]]' },
      { id: 202, alt: 'Back [[color:washed black|view:back]]' }
    ]
  });
  const navy = await renderSet(engine, product, 'navy-blue');
  const black = await renderSet(engine, product, 'washed-black');
  assert.deepEqual(slideIds(navy), [101, 102, 103]);
  assert.deepEqual(slideIds(black), [201, 202]);
  // never mixed
  assert.ok(!slideIds(navy).some((id) => slideIds(black).includes(id)));
});

test('the back design is the main image when available', async () => {
  const product = makeProduct({
    variants,
    media: [
      { id: 101, alt: 'Front [[color:navy blue|view:front]]' },
      { id: 102, alt: 'Back [[color:navy blue|view:back]]' }
    ]
  });
  assert.equal(mainId(await renderSet(engine, product, 'navy-blue')), 102);
  assert.equal(mainId(await renderSet(engine, product, 'navy-blue', { prefer_back: false })), 101);
});

test('main falls back to the first image when there is no back view', async () => {
  const product = makeProduct({
    variants,
    media: [{ id: 101, alt: '[[color:navy blue]]' }, { id: 102, alt: '[[color:navy blue]]' }]
  });
  assert.equal(mainId(await renderSet(engine, product, 'navy-blue')), 101);
});

test('alt text shown to shoppers has the tag stripped', async () => {
  const product = makeProduct({ variants, media: [{ id: 101, alt: 'Oversized hoodie front [[color:navy blue|view:front]]' }] });
  const html = await renderSet(engine, product, 'navy-blue');
  assert.match(html, /alt="Oversized hoodie front"/);
  assert.doesNotMatch(html, /\[\[/);
});

test('one media can be shared by several colors or by all', async () => {
  const product = makeProduct({
    variants,
    media: [
      { id: 1, alt: '[[color:navy blue,washed black]]' },
      { id: 2, alt: '[[color:all|view:detail]]' },
      { id: 3, alt: '[[color:navy blue]]' }
    ]
  });
  assert.deepEqual(slideIds(await renderSet(engine, product, 'navy-blue')), [1, 2, 3]);
  assert.deepEqual(slideIds(await renderSet(engine, product, 'washed-black')), [1, 2]);
});

test('the hhc.color_media metafield associates media by id', async () => {
  const product = makeProduct({
    variants,
    media: [{ id: 11 }, { id: 12 }, { id: 21 }, { id: 22 }],
    colorMap: { 'Navy Blue': [11, 12], 'Washed Black': [21, 22] }
  });
  assert.deepEqual(slideIds(await renderSet(engine, product, 'navy-blue')), [11, 12]);
  assert.deepEqual(slideIds(await renderSet(engine, product, 'washed-black')), [21, 22]);
});

test('Shopify variant images are used when media has no tag', async () => {
  const product = makeProduct({
    variants: [
      { id: 1, options: ['Navy Blue', 'M'], featuredMedia: 11 },
      { id: 2, options: ['Navy Blue', 'L'], featuredMedia: 11 },
      { id: 3, options: ['Washed Black', 'M'], featuredMedia: 21 }
    ],
    media: [{ id: 11 }, { id: 21 }, { id: 99 }]
  });
  const navy = await renderSet(engine, product, 'navy-blue');
  assert.deepEqual(slideIds(navy), [11]);
  assert.match(navy, /data-fallback="none"/);
  assert.deepEqual(slideIds(await renderSet(engine, product, 'washed-black')), [21]);
});

test('an explicit tag wins over the variant image of another color', async () => {
  const product = makeProduct({
    variants: [
      { id: 1, options: ['Navy Blue', 'M'], featuredMedia: 11 },
      { id: 3, options: ['Washed Black', 'M'] }
    ],
    media: [{ id: 11, alt: '[[color:washed black]]' }, { id: 12, alt: '[[color:navy blue]]' }]
  });
  assert.deepEqual(slideIds(await renderSet(engine, product, 'navy-blue')), [12]);
  assert.deepEqual(slideIds(await renderSet(engine, product, 'washed-black')), [11]);
});

test('missing associations degrade gracefully without showing other colors', async () => {
  const product = makeProduct({
    variants: [{ id: 1, options: ['Navy Blue', 'M'] }, { id: 3, options: ['Washed Black', 'M'] }],
    media: [{ id: 11, alt: '[[color:navy blue]]' }, { id: 31 }, { id: 21, alt: '[[color:washed black]]' }]
  });
  // washed black has a tag, navy has a tag, untagged media (31) is not claimed by any color
  const red = await renderSet(engine, product, 'brick-red');
  assert.deepEqual(slideIds(red), [31]);
  assert.match(red, /data-fallback="untagged"/);

  const allTagged = makeProduct({
    variants: [{ id: 1, options: ['Navy Blue', 'M'] }],
    media: [{ id: 11, alt: '[[color:navy blue]]' }]
  });
  const none = await renderSet(engine, allTagged, 'brick-red');
  assert.deepEqual(slideIds(none), [11]);
  assert.match(none, /data-fallback="featured"/);
});

test('products without a color option render all media', async () => {
  const product = makeProduct({ variants, media: [{ id: 1 }, { id: 2 }, { id: 3 }] });
  assert.deepEqual(slideIds(await renderSet(engine, product, '')), [1, 2, 3]);
});

test('thumbnails match the slides of the selected color only', async () => {
  const product = makeProduct({
    variants,
    media: [{ id: 101, alt: '[[color:navy blue]]' }, { id: 102, alt: '[[color:navy blue]]' }, { id: 201, alt: '[[color:washed black]]' }]
  });
  const html = await renderSet(engine, product, 'navy-blue');
  const thumbs = [...html.matchAll(/data-gallery-thumb data-index="(\d+)" data-media-id="(\d+)"/g)].map((m) => Number(m[2]));
  assert.deepEqual(thumbs, [101, 102]);
});
