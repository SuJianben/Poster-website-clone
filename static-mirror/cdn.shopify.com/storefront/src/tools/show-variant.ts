import { productHandleFromRoute } from "../routing";
import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import type { ShopifyWebMcpToolContext } from "../types";
import { fetchProduct } from "./catalog";
import type { ProductDetails } from "./catalog";
import { navigationResult, toolError } from "./shared";

const PRODUCT_VARIANT_GID_PREFIX = "gid://shopify/ProductVariant/";

type VariantOption = { name: string; value: string };
type VariantResolution =
  | { variantId: string; options: VariantOption[] }
  | { error: ReturnType<typeof toolError> };

export const showVariant: ShopifyWebMcpToolExecutor<"showVariant"> = async (params, context) => {
  const validated = validateShowVariantParams(params);
  if ("error" in validated) return validated.error;
  const { handle, rawVariantId, selectedOptions } = validated;

  const resolution = await resolveVariantId(handle, rawVariantId, selectedOptions, context);
  if ("error" in resolution) return resolution.error;
  const { variantId, resolvedOptions } = resolution;

  const url = productVariantUrl(context.routes.product(handle), handle, variantId);
  const navigated = !isCurrentUrl(url);
  if (navigated) setTimeout(() => context.navigate(url), 0);

  return buildShowVariantResult({ handle, variantId, url, navigated, resolvedOptions });
};

function validateShowVariantParams(params: {
  catalog: {
    handle?: string;
    variant_id?: string | number;
    selected_options?: ReadonlyArray<{ name?: string; value?: string } | undefined>;
  };
}):
  | {
      handle: string;
      rawVariantId: string | number | undefined;
      selectedOptions: VariantOption[];
    }
  | { error: ReturnType<typeof toolError> } {
  const rawVariantId = params.catalog.variant_id;
  const selectedOptions = normalizeSelectedOptions(params.catalog.selected_options);

  if (rawVariantId == null && !selectedOptions.length) {
    return {
      error: toolError(
        "Provide either catalog.variant_id or catalog.selected_options.",
        "For a specific variant, pass variant_id from get_product variants[].id. For a partial match like a color only, pass selected_options.",
      ),
    };
  }

  const handle = productHandle(params.catalog.handle);
  if (!handle) {
    return {
      error: toolError(
        "Product handle is required.",
        "Pass catalog.handle, or call show_variant from a product page.",
      ),
    };
  }

  if (!isValidProductHandle(handle)) {
    return {
      error: toolError(
        `Product handle "${handle}" is not valid.`,
        "Use a product handle from search_catalog, browse_store, or get_product.",
      ),
    };
  }

  return { handle, rawVariantId: rawVariantId ?? undefined, selectedOptions };
}

async function resolveVariantId(
  handle: string,
  rawVariantId: string | number | undefined,
  selectedOptions: VariantOption[],
  context: ShopifyWebMcpToolContext,
): Promise<
  | { variantId: string; resolvedOptions: VariantOption[] | undefined }
  | { error: ReturnType<typeof toolError> }
> {
  const directVariantId = rawVariantId != null ? normalizeVariantId(rawVariantId) : "";
  if (directVariantId) {
    return { variantId: directVariantId, resolvedOptions: undefined };
  }

  if (selectedOptions.length) {
    const resolved = await resolveVariantFromOptions(handle, selectedOptions, context);
    if ("error" in resolved) return resolved;
    return { variantId: resolved.variantId, resolvedOptions: resolved.options };
  }

  return {
    error: toolError(
      "Product variant_id could not be resolved.",
      "Call get_product to find an available variants[].id, then retry show_variant.",
    ),
  };
}

function buildShowVariantResult(args: {
  handle: string;
  variantId: string;
  url: string;
  navigated: boolean;
  resolvedOptions: VariantOption[] | undefined;
}) {
  const { handle, variantId, url, navigated, resolvedOptions } = args;
  const optionsDescription = resolvedOptions?.length
    ? ` (${resolvedOptions.map((option) => `${option.name}: ${option.value}`).join(", ")})`
    : "";

  return navigationResult(
    {
      summary: navigated
        ? `Showing the selected variant${optionsDescription}.`
        : `Already showing the selected variant${optionsDescription}.`,
      url,
      navigated,
      keyFields: `Product page URL: ${url}\nVariant id: ${variantId}`,
    },
    {
      handle,
      variant_id: variantId,
      url,
      navigated,
      selected_options: resolvedOptions,
    },
  );
}

async function resolveVariantFromOptions(
  handle: string,
  selectedOptions: VariantOption[],
  context: ShopifyWebMcpToolContext,
): Promise<VariantResolution> {
  try {
    const product = await fetchProduct(handle, {
      selected_options: selectedOptions,
      routes: context.routes,
    });
    if (!product) return { error: productNotFoundError(handle) };

    const direct = pickAvailableVariant(product);
    if (direct) return direct;

    const fallback = await resolveFromFirstAvailableCombo(product, handle, context);
    if (fallback) return fallback;

    return {
      error: toolError(
        "No available variant matched the selected options.",
        "Call get_product with the same selected_options to see available_options, then pick one and retry.",
      ),
    };
  } catch (error) {
    return {
      error: toolError(
        error instanceof Error ? error.message : "Failed to resolve variant from selected_options.",
        "Call get_product first to inspect available variants, then retry show_variant with a variant_id.",
      ),
    };
  }
}

function pickAvailableVariant(
  product: ProductDetails,
): { variantId: string; options: VariantOption[] } | null {
  const available = product.variants.filter((variant) => variant.availability.available);
  const pick = available[0] ?? product.variants[0];
  if (!pick?.id) return null;
  return { variantId: normalizeVariantId(pick.id), options: pick.options };
}

async function resolveFromFirstAvailableCombo(
  product: ProductDetails,
  handle: string,
  context: ShopifyWebMcpToolContext,
): Promise<{ variantId: string; options: VariantOption[] } | null> {
  const firstCombo = product.available_options?.[0];
  if (!firstCombo?.length) return null;

  const resolved = await fetchProduct(handle, {
    selected_options: firstCombo,
    routes: context.routes,
  });
  const first =
    resolved?.variants?.find((v) => v.availability.available) ?? resolved?.variants?.[0];
  if (!first?.id) return null;
  return { variantId: normalizeVariantId(first.id), options: first.options };
}

function productNotFoundError(handle: string) {
  return toolError(
    `Product "${handle}" was not found.`,
    "Call search_catalog or browse_store to find an available product.",
  );
}

function normalizeSelectedOptions(
  options: ReadonlyArray<{ name?: string; value?: string } | undefined> | undefined,
): VariantOption[] {
  if (!options?.length) return [];
  return options
    .map((option) => ({
      name: String(option?.name ?? "").trim(),
      value: String(option?.value ?? "").trim(),
    }))
    .filter((option) => option.name && option.value);
}

function normalizeVariantId(variantId: string | number) {
  const value = String(variantId).trim();
  if (!value) return "";

  const candidate = value.startsWith(PRODUCT_VARIANT_GID_PREFIX)
    ? value.slice(PRODUCT_VARIANT_GID_PREFIX.length)
    : value;

  return /^\d+$/.test(candidate) ? candidate : "";
}

function productHandle(handle: string | undefined) {
  return handle?.trim() ? normalizeProductHandle(handle) : currentProductHandle();
}

function normalizeProductHandle(handle: string | undefined) {
  const value = handle?.trim();
  if (!value) return "";

  return productHandleFromRoute(value) || decodeHandle(value);
}

function currentProductHandle() {
  if (typeof window === "undefined") return "";

  return productHandleFromRoute(window.location.href);
}

function isValidProductHandle(handle: string) {
  return Boolean(handle) && !/[/?#\\]/.test(handle) && handle !== "." && handle !== "..";
}

function decodeHandle(handle: string) {
  try {
    return decodeURIComponent(handle);
  } catch {
    return "";
  }
}

function productVariantUrl(productRoute: string, handle: string, variantId: string) {
  const targetUrl = new URL(productRoute, currentOrigin());
  targetUrl.searchParams.set("variant", variantId);

  if (currentProductHandle() === handle) {
    const sellingPlan = currentLocation().searchParams.get("selling_plan");
    if (sellingPlan) targetUrl.searchParams.set("selling_plan", sellingPlan);
  }

  return targetUrl.pathname + targetUrl.search;
}

function isCurrentUrl(url: string) {
  const current = currentLocation();
  return current.pathname + current.search === url;
}

function currentLocation() {
  if (typeof window === "undefined") return new URL("https://shopify.local/");

  return new URL(window.location.href);
}

function currentOrigin() {
  if (typeof window === "undefined") return "https://shopify.local";

  return window.location.origin;
}
