import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import type { ShopifyWebMcpRoutes } from "../types";
import {
  mapArticle,
  mapCollection,
  mapPage,
  mapProductSummary,
  searchCatalog as fetchSearchCatalog,
} from "./catalog";
import { formatUcpMoney, toolError, toolResult } from "./shared";

export const searchCatalog: ShopifyWebMcpToolExecutor<"searchCatalog"> = async (
  params,
  context,
) => {
  const query = params.catalog?.query?.trim();
  if (!query) {
    return toolError("Search query is required.", "Call search_catalog with catalog.query.");
  }

  try {
    const limit = clamp(Number(params.catalog?.pagination?.limit) || 5, 1, 10);
    const data = await fetchSearchCatalog(query, limit);
    return searchResult(
      query,
      mapSearchResults(data.predictiveSearch, context.routes),
      context.routes,
    );
  } catch (error) {
    return toolError(
      error instanceof Error ? error.message : "Search failed",
      "Try again with a simpler catalog.query, or use browse_store to inspect collections.",
    );
  }
};

function mapSearchResults(
  results: Awaited<ReturnType<typeof fetchSearchCatalog>>["predictiveSearch"],
  routes: ShopifyWebMcpRoutes,
) {
  return {
    products: results.products.map((product) => mapProductSummary(product, routes)),
    collections: results.collections.map((collection) => mapCollection(collection, routes)),
    articles: results.articles.map(mapArticle),
    pages: results.pages.map(mapPage),
  };
}

function searchResult(
  query: string,
  results: ReturnType<typeof mapSearchResults>,
  routes: ShopifyWebMcpRoutes,
) {
  const total =
    results.products.length +
    results.collections.length +
    results.articles.length +
    results.pages.length;
  const data = {
    ...results,
    search_url: routes.search(query),
  };

  if (total === 0) {
    return toolResult(
      `No search results found for "${query}".`,
      data,
      null,
      "Try browse_store to inspect collections or search_catalog with a broader catalog.query.",
    );
  }

  return toolResult(
    `Found ${formatResultCounts(results).join(", ")} for "${query}".`,
    data,
    formatSearchResults(results),
    searchNextStep(results),
  );
}

function formatResultCounts(results: ReturnType<typeof mapSearchResults>) {
  return [
    resultCount("product", results.products.length),
    resultCount("collection", results.collections.length),
    resultCount("article", results.articles.length),
    resultCount("page", results.pages.length),
  ].filter(Boolean);
}

function resultCount(label: string, count: number) {
  if (!count) return "";
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function searchNextStep(results: ReturnType<typeof mapSearchResults>) {
  if (results.products.length) {
    return "If the user wants the selected or first available variant, call update_cart with cart.line_items using the product handle or query. If the user requested a specific color, size, material, or other option, call get_product with catalog.id and any known catalog.selected_options to filter available_options, then use the matching variants[].id with update_cart.";
  }

  return results.collections.length || results.articles.length || results.pages.length
    ? "No products matched, but other catalog results were found. Share the relevant collection, article, or page URL with the user, or call browse_store for product collections."
    : "Use browse_store to inspect products by collection.";
}

function formatSearchResults(results: ReturnType<typeof mapSearchResults>) {
  const sections = [
    formatProducts(results.products),
    formatLinkResults("Collections", results.collections),
    formatLinkResults("Articles", results.articles),
    formatLinkResults("Pages", results.pages),
  ].filter(Boolean);

  return sections.length ? sections.join("\n\n") : null;
}

function formatProducts(products: ReturnType<typeof mapProductSummary>[]) {
  if (!products.length) return null;

  return (
    "Products:\n" +
    products
      .map(
        (product) =>
          `- ${product.title} (id: ${product.id}, handle: ${product.handle}) - ${formatUcpMoney(product.price_range) || "price unavailable"}`,
      )
      .join("\n")
  );
}

function formatLinkResults(
  label: string,
  items: Array<{ title: string; handle?: string; url: string }>,
) {
  if (!items.length) return null;

  return (
    `${label}:\n` +
    items
      .map((item) => `- ${item.title}${item.handle ? ` (${item.handle})` : ""}: ${item.url}`)
      .join("\n")
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
