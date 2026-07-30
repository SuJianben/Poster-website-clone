# 2026-07-30 Homepage product-grid overflow

## Status

Fixed and browser-verified.

## Symptom

The Best sellers product cards rendered as full-width stacked images, causing severe overflow below the homepage hero.

## Cause

The copied source runtime changed product lists from `f-grid` to Swiper layout, then failed because it depended on the original store's unavailable runtime. The original store's rendered Shopify header scripts also conflicted with the target store's injected header scripts.

## Fix

- Keep the copied HTML and CSS as a static migration.
- Remove original-store runtime scripts from the generated head and page sections.
- Remove the original store's rendered `content_for_header` payload and keep only the target store's native `content_for_header`.
- Split generated snippets only at completed HTML-node boundaries.
- In the static fallback, retain only the source carousel's initial active panel
  and first five desktop cards; clip that panel rather than allowing an
  uninitialized carousel to enlarge the document.

## Verification

- Desktop 1920 x 1080: Best sellers renders as a five-column grid; first card width is 351px.
- Mobile: first card width is 161px and page scroll width equals viewport width.
- Fresh browser run: no source-theme runtime script errors.
- Desktop 1920 x 1080 after the static fallback: exactly five visible Best
  sellers cards; the former second row is absent.
- Mobile 390 x 844: page scroll width equals viewport width.
