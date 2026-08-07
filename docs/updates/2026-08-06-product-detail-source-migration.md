# 2026-08-06 Product Detail Source Migration

## Goal

Rebuild the Shopify product detail template from the supplied DOTCOMCANVAS source structure. Source-only product data must render when available; missing Shopify data must fall back to native product data or stay hidden instead of being invented.

## Changed Files

- `sections/source-product-main.liquid`: source-style product page shell, breadcrumbs, and details accordions.
- `snippets/source-product-gallery.liquid`: vertical thumbnails, main media viewer, previous/next controls, zoom, and lightbox.
- `snippets/source-product-purchase.liquid`: native Shopify product form, option selectors, quantity, add-to-cart status, size guide, badges, discount table, benefits, and payment icons.
- `assets/source-product.css`: source-measured desktop geometry and responsive layout.
- `assets/source-product.js`: media switching, lightbox, variant matching, URL updates, quantity controls, native AJAX add-to-cart, and size-guide interaction.

## Validation

- Source and test theme were opened at a 1920px viewport and compared by measured DOM geometry.
- Product page geometry now matches the source values: page width `1430px`, breadcrumbs height `22px`, product start `268px`, media viewer width `725.55px`, and info panel width `578.44px`.
- Desktop document width equals viewport width (`1920/1920`); mobile document width equals viewport width (`390/390`).
- Real browser checks passed for thumbnail switching, fullscreen zoom open/close, size-guide open/close, variant selection and price/URL update, and AJAX add-to-cart status.
- The five product files were pushed to Shopify theme `199199260753`; Shopify's automatic sync also updated the GitHub `main` branch.

## Remaining Constraints

- The test catalog product does not contain every source product field (material, frame, review count, source badges, and source brand artwork). Those controls are intentionally omitted or use the native product fallback rather than fabricated values.
- Theme Check still reports pre-existing parser-blocking and remote-asset warnings in the collection catalog sections; they are outside this product-page change.
