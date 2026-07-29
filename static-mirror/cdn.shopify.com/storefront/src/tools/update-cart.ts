import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import type { ShopifyWebMcpRoutes } from "../types";
import type { CartDetails, CartLineDetails } from "./catalog";
import { fetchCartDetails, lookupProductForCart } from "./catalog";
import type { UcpMoney } from "./shared";
import {
  actionResult,
  assertCartActionResult,
  extractActionWarnings,
  formatUcpMoney,
  getCartItemCount,
  getStandardActions,
  moneyV2ToUcpMoney,
  toolError,
  toolResult,
} from "./shared";

type UpdateCartArgs = Parameters<ShopifyWebMcpToolExecutor<"updateCart">>[0];

type ResolvedLineItem =
  | {
      type: "update";
      id: string;
      quantity: number;
    }
  | {
      type: "add";
      merchandiseId: string;
      quantity: number;
      productTitle?: string;
      variantTitle?: string;
    }
  | {
      type: "unresolved";
      item: number;
      reason: string;
      query?: string;
      handle?: string;
    };

type AddedLineItem = {
  item: {
    id: string;
    title: string;
    variant_title: string;
    handle: string;
    url: string;
    image: string;
    unit_price: UcpMoney | null;
  };
  quantity: number;
  requested_quantity: number;
};

export const updateCart: ShopifyWebMcpToolExecutor<"updateCart"> = async (params, context) => {
  const lineItems = params.cart?.line_items;
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return toolError("No line_items provided.", "Call update_cart with cart.line_items.");
  }

  const requested = lineItems.slice(0, 10);

  try {
    const resolved = await Promise.all(
      requested.map((lineItem, index) => resolveLineItem(lineItem ?? {}, index)),
    );
    const unresolved = resolved.filter(isUnresolvedLineItem);
    if (unresolved.length) return unresolvedResult(unresolved, resolved, requested.length);

    const mutations = resolved.filter(isMutationLineItem);
    const actions = getStandardActions();
    const result = await actions.updateCart({
      lines: mutations.map((lineItem) =>
        lineItem.type === "update"
          ? { id: lineItem.id, quantity: lineItem.quantity }
          : { merchandiseId: lineItem.merchandiseId, quantity: lineItem.quantity },
      ),
    });
    assertCartActionResult(result);

    const warnings = extractActionWarnings(result);
    const cart = result.cart ?? {};
    const totalPrice = moneyV2ToUcpMoney(cart.cost?.totalAmount);
    const adds = mutations.filter(isAddLineItem);
    const addedItems = await enrichAddedItems(adds, cart.id, context.routes);
    return actionResult(updateSummary(mutations, getCartItemCount(cart), totalPrice, warnings), {
      updated: true,
      item_count: getCartItemCount(cart),
      total_price: totalPrice,
      line_items: addedItems,
      warnings: warnings.length ? warnings : undefined,
    });
  } catch (error) {
    return toolError(
      error instanceof Error ? error.message : "Cart update failed",
      "Call get_cart to verify cart state, then retry update_cart with explicit line_items[].id or line_items[].item.id.",
    );
  }
};

async function resolveLineItem(
  lineItem: NonNullable<NonNullable<UpdateCartArgs["cart"]>["line_items"]>[number],
  index: number,
): Promise<ResolvedLineItem> {
  const quantity = normalizeQuantity(lineItem.quantity, Boolean(lineItem.id));

  if (lineItem.id) {
    return { type: "update", id: lineItem.id, quantity };
  }

  if (lineItem.item?.id) {
    return {
      type: "add",
      merchandiseId: lineItem.item.id,
      quantity,
    };
  }

  const lookup = await lookupProductForCart({
    handle: lineItem.handle,
    query: lineItem.query,
  });

  if (!lookup) {
    return {
      type: "unresolved",
      item: index + 1,
      reason: lineItem.handle
        ? `Could not resolve product handle "${lineItem.handle}".`
        : lineItem.query
          ? `Could not find a product for query "${lineItem.query}".`
          : "Missing item.id, handle, or query.",
      query: lineItem.query,
      handle: lineItem.handle,
    };
  }

  return {
    type: "add",
    merchandiseId: lookup.variant.merchandise_id,
    quantity,
    productTitle: lookup.product.title,
    variantTitle: lookup.variant.title,
  };
}

function normalizeQuantity(quantity: number | undefined, isUpdate: boolean) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(isUpdate ? 0 : 1, Math.floor(parsed));
}

function unresolvedResult(
  unresolved: Extract<ResolvedLineItem, { type: "unresolved" }>[],
  resolved: ResolvedLineItem[],
  requestedCount: number,
) {
  const resolvedAdds = resolved.filter(isAddLineItem);
  const keyFields = unresolved.map((item) => `- Item ${item.item}: ${item.reason}`).join("\n");

  return toolResult(
    `Need clarification for ${unresolved.length} of ${requestedCount} line_item${requestedCount === 1 ? "" : "s"}. Nothing changed.`,
    {
      updated: false,
      unresolved_items: unresolved,
      // Nothing was applied to the cart, so there's no post-mutation cart
      // state to fetch from SFAPI — report what we have (any pre-mutation
      // lookup titles filled in via handle/query resolution, otherwise
      // empty) rather than paying for an unrelated round-trip.
      resolved_items: resolvedAdds.map(baselineAddedLineItem),
    },
    keyFields,
    "Call search_catalog or get_product to find explicit product or variant ids, then call update_cart again. For specific variant requests, prefer line_items[].item.id from get_product variants[].id.",
  );
}

/**
 * After a successful mutation, enrich the added items with per-variant
 * product info (title, variant title, handle, url, image, unit price) from
 * the Storefront API. Without this, callers that supplied only a
 * ProductVariant GID (`item.id`) end up with empty title/variant_title
 * fields in the response — the model then can't name the item back to the
 * user ("Added [variant GID] to your cart" instead of
 * "Added Large Black Hoodie to your cart").
 *
 * Same primitive `get_cart` uses: `fetchCartDetails` reads the post-mutation
 * cart from SFAPI in one round-trip and gives us every field we need.
 *
 * Falls back to the pre-mutation lookup data if the SFAPI query is
 * unavailable or the cart id is missing; the response shape stays
 * consistent either way.
 */
async function enrichAddedItems(
  adds: Array<Extract<ResolvedLineItem, { type: "add" }>>,
  cartId: string | undefined,
  routes: ShopifyWebMcpRoutes,
): Promise<AddedLineItem[]> {
  const baseline = adds.map(baselineAddedLineItem);
  if (!cartId || adds.length === 0) return baseline;

  let cartDetails: CartDetails | null;
  try {
    cartDetails = await fetchCartDetails(cartId, routes);
  } catch {
    return baseline;
  }
  if (!cartDetails) return baseline;

  const byVariantId = new Map<string, CartLineDetails>();
  for (const line of cartDetails.line_items) {
    if (line.item.id) byVariantId.set(line.item.id, line);
  }

  return adds.map((add, index) => {
    const line = byVariantId.get(add.merchandiseId);
    if (!line) return baseline[index];
    return {
      // Prefer the freshly-fetched line details but keep the caller's
      // requested quantity separate — Shopify may have merged with an
      // existing line, so cart.item.quantity is not what we requested to add.
      item: line.item,
      quantity: line.quantity,
      requested_quantity: add.quantity,
    };
  });
}

function baselineAddedLineItem(add: Extract<ResolvedLineItem, { type: "add" }>): AddedLineItem {
  return {
    item: {
      id: add.merchandiseId,
      title: add.productTitle ?? "",
      variant_title: add.variantTitle ?? "",
      handle: "",
      url: "",
      image: "",
      unit_price: null,
    },
    quantity: add.quantity,
    requested_quantity: add.quantity,
  };
}

function updateSummary(
  lineItems: Array<Extract<ResolvedLineItem, { type: "add" | "update" }>>,
  itemCount: number,
  totalPrice: ReturnType<typeof moneyV2ToUcpMoney>,
  warnings: string[],
) {
  const adds = lineItems.filter(isAddLineItem);
  const updates = lineItems.filter(isUpdateLineItem);
  const addedQuantity = adds.reduce((sum, item) => sum + item.quantity, 0);
  const parts = [];
  if (adds.length) {
    parts.push(
      `${warnings.length ? "Requested to add" : "Added"} ${addedQuantity} item${addedQuantity === 1 ? "" : "s"} across ${adds.length} product${adds.length === 1 ? "" : "s"}`,
    );
  }
  if (updates.length) {
    parts.push(`updated ${updates.length} line${updates.length === 1 ? "" : "s"}`);
  }

  const cartSummary = `Cart now has ${itemCount} item${itemCount === 1 ? "" : "s"}${totalPrice ? ` totaling ${formatUcpMoney(totalPrice)}` : ""}.`;
  const warningNote = warnings.length ? ` Warnings: ${warnings.join("; ")}.` : "";
  return `${parts.join(" and ")}. ${cartSummary}${warningNote}`;
}

function isUnresolvedLineItem(
  lineItem: ResolvedLineItem,
): lineItem is Extract<ResolvedLineItem, { type: "unresolved" }> {
  return lineItem.type === "unresolved";
}

function isMutationLineItem(
  lineItem: ResolvedLineItem,
): lineItem is Extract<ResolvedLineItem, { type: "add" | "update" }> {
  return lineItem.type === "add" || lineItem.type === "update";
}

function isAddLineItem(
  lineItem: ResolvedLineItem,
): lineItem is Extract<ResolvedLineItem, { type: "add" }> {
  return lineItem.type === "add";
}

function isUpdateLineItem(
  lineItem: ResolvedLineItem,
): lineItem is Extract<ResolvedLineItem, { type: "update" }> {
  return lineItem.type === "update";
}
