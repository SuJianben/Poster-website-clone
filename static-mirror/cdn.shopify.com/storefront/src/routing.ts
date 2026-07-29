import type { ShopifyGlobal } from "#hydrogen/globals";

import type { ShopifyWebMcpRoutes } from "./types";

type ShopifyRoutes = Partial<Pick<ShopifyGlobal["routes"], "match" | "root">>;

export const DEFAULT_ROUTES: ShopifyWebMcpRoutes = {
  checkout: () => shopifyRoute("/checkout"),
  accountOrders: () => shopifyRoute("/account/orders"),
  product: (handle) => shopifyRoute(`/products/${handle}`),
  collection: (handle) => shopifyRoute(`/collections/${handle}`),
  search: (query) => shopifyRoute(`/search?q=${encodeURIComponent(query)}`),
};

function shopifyRoute(path: string) {
  const routeRoot = storefrontRouteRoot();
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return routeRoot + normalizedPath;
}

export function productHandleFromRoute(url: string) {
  const routes = shopifyRoutes();
  const routeTemplateMatch = routes?.match?.(url);
  if (
    routeTemplateMatch?.route === "product" ||
    routeTemplateMatch?.route === "productInCollection"
  ) {
    const handle = routeTemplateMatch.params?.productHandle;
    if (handle) return handle;
  }

  const standardRouteMatch = url.match(/\/products\/([^/?#]+)/);
  return standardRouteMatch?.[1] ? decodeHandle(standardRouteMatch[1]) : "";
}

function storefrontRouteRoot() {
  if (typeof window === "undefined") return "/";

  const routes = shopifyRoutes();
  const root = routes?.root;
  if (typeof root !== "string") return "/";

  return root;
}

function shopifyRoutes(): ShopifyRoutes | undefined {
  if (typeof window === "undefined") return undefined;

  return window.Shopify?.routes;
}

function decodeHandle(handle: string) {
  try {
    return decodeURIComponent(handle);
  } catch {
    return "";
  }
}
