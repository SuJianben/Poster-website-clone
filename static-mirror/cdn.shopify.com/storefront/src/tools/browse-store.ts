import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import type { ShopifyWebMcpRoutes, ShopifyWebMcpToolContext } from "../types";
import {
  type CollectionBrowseResult,
  browseCollectionProducts,
  browseProducts,
  listCollections,
  mapCollection,
  mapProductSummary,
} from "./catalog";
import { formatUcpMoney, navigationResult, toolError, toolResult } from "./shared";

const ALLOWED_SORTS = new Set([
  "best-selling",
  "price-ascending",
  "price-descending",
  "title-ascending",
  "title-descending",
  "created-ascending",
  "created-descending",
]);

export const browseStore: ShopifyWebMcpToolExecutor<"browseStore"> = async (params, context) => {
  try {
    const collection = params.collection?.trim();
    const shouldNavigate = params.navigate === true;

    if (!collection) {
      return collectionListResult(await listCollections(), context.routes, shouldNavigate);
    }

    const page = Math.max(1, Number(params.page) || 1);
    const sortBy = normalizeSort(params.sort_by);
    const browseResult = await fetchBrowseResult(collection, sortBy, page);
    return productBrowseResult(collection, browseResult, sortBy, page, context, shouldNavigate);
  } catch (error) {
    return toolError(
      error instanceof Error ? error.message : "Failed to browse store",
      "Try browsing without a collection to list available collections.",
    );
  }
};

async function fetchBrowseResult(collection: string, sortBy: string, page: number) {
  return collection === "all"
    ? browseProducts({
        page,
        sortBy,
      })
    : browseCollectionProducts({
        handle: collection,
        page,
        sortBy,
      });
}

function collectionListResult(
  data: Awaited<ReturnType<typeof listCollections>>,
  routes: ShopifyWebMcpRoutes,
  shouldNavigate: boolean,
) {
  const collections =
    data.collections?.nodes?.map((collection) => mapCollection(collection, routes)) ?? [];

  const nextSteps = shouldNavigate
    ? 'A collection handle is required to navigate. Ask the user which collection, or call browse_store again with a specific collection handle (or "all") and navigate=true.'
    : 'Call browse_store with a collection handle, or with collection "all" to browse products. Set navigate=true to take the user to the collection page.';

  return toolResult(
    `Found ${collections.length} collection${collections.length !== 1 ? "s" : ""}.`,
    { collections, products: [], navigated: false },
    formatCollections(collections),
    nextSteps,
  );
}

function productBrowseResult(
  collection: string,
  browseResult: CollectionBrowseResult,
  sortBy: string,
  page: number,
  context: ShopifyWebMcpToolContext,
  shouldNavigate: boolean,
) {
  const { routes } = context;
  if (collection !== "all" && !browseResult.collection) {
    return toolError(
      `Collection "${collection}" was not found.`,
      "Call browse_store without a collection to list available collections.",
    );
  }

  const products = browseResult.products.map((product) => mapProductSummary(product, routes));
  const collectionUrl = routes.collection(collection);
  const structured = {
    collections: [],
    products,
    collection_title: browseResult.title,
    page,
    sort_by: sortBy,
    url: collectionUrl,
  };

  if (shouldNavigate) {
    const navigated = !isCurrentUrl(collectionUrl);
    if (navigated) setTimeout(() => context.navigate(collectionUrl), 0);

    return navigationResult(
      {
        summary: navigated
          ? `Showing the ${browseResult.title} collection.`
          : `Already showing the ${browseResult.title} collection.`,
        url: collectionUrl,
        navigated,
        keyFields:
          `Collection page URL: ${collectionUrl}\n${formatProducts(products) ?? ""}`.trim(),
      },
      { ...structured, navigated },
    );
  }

  return toolResult(
    `Showing ${products.length} product${products.length !== 1 ? "s" : ""} from ${browseResult.title}.`,
    { ...structured, navigated: false },
    formatProducts(products),
    "If the user asked to be taken to this collection, call browse_store again with navigate=true. If the user wants the selected or first available variant, call update_cart with cart.line_items using the product handle. If the user requested a specific color, size, material, or other option, call get_product with catalog.id and any known catalog.selected_options, then use the matching variants[].id with update_cart, OR call show_variant with selected_options to just navigate to that variant.",
  );
}

function isCurrentUrl(url: string) {
  if (typeof window === "undefined") return false;
  const current = new URL(window.location.href);
  return current.pathname + current.search === url;
}

function normalizeSort(sortBy: string | undefined) {
  return sortBy && ALLOWED_SORTS.has(sortBy) ? sortBy : "best-selling";
}

function formatCollections(collections: ReturnType<typeof mapCollection>[]) {
  if (!collections.length) return null;
  return `Collections:\n${collections.map((collection) => `- ${collection.title} (${collection.handle})`).join("\n")}`;
}

function formatProducts(products: ReturnType<typeof mapProductSummary>[]) {
  if (!products.length) return null;
  return `Products:\n${products
    .map(
      (product) =>
        `- ${product.title} (id: ${product.id}, handle: ${product.handle}) - ${formatUcpMoney(product.price_range) || "price unavailable"}`,
    )
    .join("\n")}`;
}
