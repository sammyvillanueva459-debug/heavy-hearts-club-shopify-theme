# Color ↔ photo associations

When a shopper chooses a color the gallery shows **only** the photos assigned to that color, starts on that color's
main image (the back design when one is tagged `view:back`), and lets them move through front, back and detail photos.

The theme never assumes Shopify assigned images to the right color. It reads explicit associations, in this order:

## 1. Metafield `hhc.color_media` (JSON) – best for bulk or app-driven setup

Create a **Product metafield definition**: namespace and key `hhc.color_media`, type **JSON**.
The value maps each color to the media IDs for that color:

```json
{
  "Navy Blue": [32410000000001, 32410000000002, 32410000000003],
  "Washed Black": [32410000000004, 32410000000005]
}
```

Color names are compared after Shopify `handleize` (case/spacing-insensitive: `Navy Blue` = `navy blue`).

## 2. Alt-text tag on each media – easiest in the Shopify admin

Edit a product image's alt text and append a tag in double square brackets:

```
Oversized hoodie back [[color:navy blue|view:back]]
```

| Field | Values | Notes |
| --- | --- | --- |
| `color` | a color name, a comma list (`black,navy blue`), or `all` | `all` shows the photo for every color (size chart, fabric detail) |
| `view` | `front`, `back`, `detail` (free text allowed) | `back` becomes the starting photo when **Prefer back image** is on |

The tag is stripped before the alt text is output, so screen readers only hear the description.

## 3. Shopify variant image

Photos with **no tag** that are assigned to a variant (Shopify's own variant image) belong to that variant's color.
An explicit tag or metafield entry always wins over the variant image.

## Missing associations (graceful handling)

For a color with no associated photos the theme falls back, in order, to:

1. the color's variant image(s),
2. media that is not claimed by any color,
3. the product's featured image.

It never shows a photo explicitly assigned to a different color. In the theme editor a yellow notice tells you which color
needs association; shoppers never see it.

## Printify products

Printify syncs images and a few variant images, but it does not label every photo with a color.
After a product syncs:

1. Open the product → **Media**.
2. For each image click it → **Edit alt text** and add `[[color:<color>|view:<front|back|detail>]]`.
   (Or fill `hhc.color_media` once per product, for example with the bulk editor or a Flow/Admin API script.)
3. Re-syncing from Printify can reset alt text; Printify-sourced media IDs change when images are replaced.
   If you re-publish a product, re-check the tags (the metafield is also not touched by Printify, but IDs may change).

Printify product, variant, price and inventory data are used untouched: the theme only reads them dynamically.
