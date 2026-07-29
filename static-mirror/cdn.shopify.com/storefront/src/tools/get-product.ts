import { productHandleFromRoute } from "../routing";
import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import type { ShopifyWebMcpToolContext } from "../types";
import { catalogId, fetchProduct } from "./catalog";
import type { ProductDetails } from "./catalog";
import { formatUcpMoney, navigationResult, toolError, toolResult } from "./shared";

export const getProduct: ShopifyWebMcpToolExecutor<"getProduct"> = async (params, context) => {
  const catalog = params.catalog;
  const id = catalogId(catalog?.id) || currentProductHandle();
  if (!id) {
    return toolError(
      "Product catalog.id is required.",
      "Call search_catalog or browse_store to find a product id or handle first.",
    );
  }

  try {
    return await fetchAndFormatProduct(id, catalog, context);
  } catch (error) {
    return toolError(
      error instanceof Error ? error.message : "Failed to load product details",
      "Try again with a product id or handle from search_catalog or browse_store.",
    );
  }
};

async function fetchAndFormatProduct(
  id: string,
  catalog:
    | {
        selected_options?: ReadonlyArray<{ name: string; value: string }>;
        navigate?: boolean;
      }
    | undefined,
  context: ShopifyWebMcpToolContext,
) {
  const rawSelectedOptions = catalog?.selected_options;
  const selectedOptions = rawSelectedOptions?.length ? [...rawSelectedOptions] : undefined;
  const product = await fetchProduct(id, {
    selected_options: selectedOptions,
    routes: context.routes,
  });
  if (!product) return productNotFoundResult(id);

  if (catalog?.navigate === true) {
    return navigateToProductResult(product, context);
  }

  return productResult(product, Boolean(selectedOptions?.length));
}

function productNotFoundResult(id: string) {
  return toolError(
    `Product "${id}" was not found.`,
    "Call search_catalog or browse_store to find an available product.",
  );
}

function navigateToProductResult(product: ProductDetails, context: ShopifyWebMcpToolContext) {
  const url = product.url;
  const navigated = !isCurrentUrl(url);
  if (navigated) setTimeout(() => context.navigate(url), 0);

  // Intentionally keep keyFields minimal in navigation mode: dumping the full
  // variants table here primes the agent to act on the product data (e.g. call
  // a host navigation tool to "open" it), which is exactly what we don't want
  // after a successful navigation.
  return navigationResult(
    {
      summary: navigated ? `Showing ${product.title}.` : `Already showing ${product.title}.`,
      url,
      navigated,
      keyFields: `Product page URL: ${url}`,
    },
    product,
  );
}

function isCurrentUrl(url: string) {
  if (typeof window === "undefined") return false;
  const current = new URL(window.location.href);
  return current.pathname + current.search === url;
}

function productResult(product: ProductDetails, hasSelectedOptions: boolean) {
  return toolResult(
    `${product.title} has ${product.variant_count} variant${product.variant_count !== 1 ? "s" : ""}.`,
    product,
    formatVariantKeyFields(product),
    productNextSteps(product, hasSelectedOptions),
  );
}

function currentProductHandle() {
  if (typeof window === "undefined") return "";

  return productHandleFromRoute(window.location.href);
}

function formatVariantKeyFields(product: ProductDetails) {
  if (!product.variants.length) return null;

  const available = product.variants.filter((variant) => variant.availability.available);
  const variants = available.length ? available : product.variants.slice(0, 10);

  return (
    "Variants:\n" +
    variants
      .map((variant) => {
        const options = variant.options
          .map((option) => `${option.name}: ${option.value}`)
          .join(", ");
        const price = formatUcpMoney(variant.price) || "price unavailable";
        const availability = variant.availability.available ? "available" : "unavailable";
        return `- ${variant.title} (id: ${variant.id}) - ${options || "no options"} - ${price} - ${availability}`;
      })
      .join("\n")
  );
}

function productNextSteps(product: ProductDetails, hasSelectedOptions: boolean) {
  const availableVariants = product.variants.filter((variant) => variant.availability.available);
  const viewIntentHint =
    "TO VIEW (show/open/go to): call show_variant with catalog.selected_options set to whatever options the user specified (even partial like just Color) \u2014 do NOT ask for missing options.";

  if (availableVariants.length && hasSelectedOptions) {
    return (
      `${viewIntentHint} ` +
      "TO ADD TO CART: use the matching variants[].id from this result with update_cart line_items[].item.id."
    );
  }

  if (availableVariants.length) {
    const truncationNote = product.available_options_truncated
      ? " (available_options is truncated \u2014 narrow with catalog.selected_options if needed)."
      : "";
    return (
      `${viewIntentHint}${truncationNote} ` +
      "TO ADD TO CART: if the user did not request specific options, use variants[0].id or the product handle with update_cart. " +
      "If they requested specific options, pick one complete available_options entry (or call get_product again with catalog.selected_options) to get the exact variants[].id."
    );
  }

  if (product.available_options_count > 0) {
    return (
      `${viewIntentHint} ` +
      "TO ADD TO CART: you need a full option combination \u2014 pick one complete available_options entry, or ask the user for missing options, then call get_product again with catalog.selected_options set to that full combination to get the exact variants[].id."
    );
  }

  if (product.available_options_truncated) {
    return "Available option combinations were truncated. Call get_product again with catalog.selected_options for any options the user already specified to narrow the result before choosing a variant.";
  }

  return "No available option combinations matched. Ask the user to choose different product options or search for another product.";
}
