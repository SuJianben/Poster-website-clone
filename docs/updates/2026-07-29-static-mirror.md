# 2026-07-29 Static Mirror Delivery

## Goal

Deploy the supplied `dotcomcanvas.de` source snapshot as the second Shopify site's homepage without replacing or rewriting its page content, markup, styles, media, or client scripts.

## Changed Files

- `static-mirror/`: immutable source archive extracted from the supplied ZIP.
- `assets/source-homepage.html`: mechanical copy of the source homepage with a base URL adapter and iframe height reporter required by Shopify's file-size constraint.
- `sections/source-home.liquid`: Shopify carrier for the source document only.
- `templates/index.json`: routes the Shopify homepage to that carrier.
- `layout/theme.liquid`, `config/settings_*.json`, `locales/en.default.json`: minimal Shopify-required scaffold; none add page UI.

## Validation

- `shopify theme check --path D:\CODEX项目\海报站\Poster-website-2`: passed, 15 files inspected, 0 offenses.
- Theme `199199260753` pushed successfully to `test-app-english.myshopify.com`.
- Browser verification confirmed original source title, 22 stylesheet links, 317 image elements, homepage iframe height `9879px`, and full-page scrolling to `8968px`.
- Desktop screenshot compared against the supplied original first viewport: original navigation, announcement strip, hero image, promotional typography, and product overlay render from the source document.

## Remaining Constraints

- This is intentionally a static source mirror. Product, cart, search, and other source-site interactions remain source-page behavior and are not connected to Shopify catalog data.
