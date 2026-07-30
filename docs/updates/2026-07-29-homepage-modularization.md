# 2026-07-29 Homepage modularization

## Goal

Convert the imported homepage into Shopify OS 2.0 section modules without changing the copied source markup, styles, media, or visual layout.

## Scope

- Added shared Header and Footer section groups in `layout/theme.liquid`.
- Split the homepage into 12 editable, reorderable and show/hide-able homepage sections.
- Kept the imported source markup in Liquid snippets so the source visual output remains unchanged.
- Added a generator script that recreates the section structure while preserving the required section-group metadata.

## Verification

- Shopify Theme Check: 71 files inspected, no offenses.
- Browser verification at 1920 x 1080: one header, one footer, 12 homepage module wrappers, loaded hero image, and no source-site iframe.

## Impact

The Theme Editor can now manage the homepage section order and visibility. Header and Footer remain reusable groups for all templates using the shared layout.

## Remaining work

The individual copied source fields (for example, a specific product card title or image) are deliberately still source-static. Converting every source field into a native Shopify setting is a separate data-binding task and was not included in this structural-only change.
