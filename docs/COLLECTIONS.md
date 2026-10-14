# Collections and menu handles

The built-in menu (and `templates/index.json`) expects these collection handles. Create them as **smart collections**
(for example `Product type equals Hoodies` **and** `Tag equals men`) or manual collections, then rename the handle in
**Collection → Search engine listing** if needed.

## Men (`men`)
`men-hoodies`, `men-t-shirts`, `men-long-sleeves`, `men-sweatshirts`, `men-sweatpants`, `men-shorts`, `men-jackets`,
`men-matching-sets`, `men-hats`, `men-bags`, `men-bookbags`, `men-socks`

## Women (`women`)
`women-crop-tops`, `women-leggings`, `women-hoodies`, `women-t-shirts`, `women-long-sleeves`, `women-sweatshirts`,
`women-sweatpants`, `women-shorts`, `women-jackets`, `women-matching-sets`, `women-hats`, `women-bags`, `women-bookbags`, `women-socks`

## Kids (`kids`)
`kids-boys`, `kids-girls`, `kids-hoodies`, `kids-t-shirts`, `kids-sweatshirts`, `kids-sweatpants`, `kids-shorts`,
`kids-matching-sets`, `kids-hats`, `kids-bookbags`, `kids-socks`

## Other
`new-arrivals`, `best-sellers`, `accessories`, `holiday-specials`, `sale`, `matching-sets`
(`Collections` links to Shopify's all-collections page).

Department landing pages are the `men`, `women` and `kids` collections.

## Using your own Shopify menu instead

Create **Online Store → Navigation → Main menu** with the same three levels:

```
Men                      (level 1, link to the men collection)
  Tops                   (level 2 = mega-menu column heading)
    Hoodies              (level 3 = links)
    T-Shirts
```

Then select it in **Header → Menu**.
