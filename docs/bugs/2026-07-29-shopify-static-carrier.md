# 2026-07-29 Shopify Static Carrier Constraints

## Resolved

- **Issue:** Shopify refused the full original homepage in a section because the body was larger than the 256 KB section limit.
- **Impact:** The raw page could not become the active `index.json` homepage through a direct Liquid section.
- **Resolution:** Store the original document as a theme asset and render it in an iframe. The only injected code is a base URL adapter and height reporter; source page visual/content code is unchanged.
- **Verified:** The embedded document expanded from its initial height to `9879px` after deferred media loaded and supports full-page scrolling.
