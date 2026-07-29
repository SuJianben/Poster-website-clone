import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import type { ShopifyWebMcpRoutes } from "../types";
import type { CartDetails, CartLineDetails } from "./catalog";
import { fetchCartDetails } from "./catalog";
import type { Cart } from "./shared";
import {
  formatUcpMoney,
  getCartFromActions,
  moneyV2ToUcpMoney,
  toolError,
  toolResult,
} from "./shared";

export const getCart: ShopifyWebMcpToolExecutor<"getCart"> = async (_params, context) => {
  try {
    const cart = await getCartFromActions();

    // Fast path: no cart or empty cart. Skip the SFAPI round-trip; nothing
    // to enrich, and we have all the answer we need locally.
    const itemCount = cart.totalQuantity ?? 0;
    if (itemCount === 0 || !cart.id) {
      return emptyCartResult(cart);
    }

    // Standard Actions returns cart id + line ids + costs and nothing else —
    // no variant title, product title, handle, image, or url. Any tool
    // response that just says "cart line CartLine/12345 has 2 units" is
    // useless to the model. Fetch the enriched view from SFAPI, which
    // already carries everything we need in one shot.
    const enriched = await fetchCartDetails(cart.id, context.routes);
    if (enriched) return populatedCartResult(enriched);

    // Fall back to the local-only view if SFAPI failed for any reason
    // (network, cart id mismatch, ...). Same shape as before the enrichment
    // work — item counts and line ids remain accurate.
    return populatedCartResult(localCartDetails(cart, context.routes));
  } catch (error) {
    return toolError(
      error instanceof Error ? error.message : "Failed to fetch cart",
      "Try again - this is usually a transient error.",
    );
  }
};

const emptyCartResult = (cart: Cart) => {
  const empty: CartDetails = {
    id: cart.id ?? "",
    item_count: 0,
    total_price: moneyV2ToUcpMoney(cart.cost?.totalAmount),
    currency: cart.cost?.totalAmount?.currencyCode ?? "",
    line_items: [],
  };
  return toolResult(
    "Cart is empty.",
    empty,
    null,
    "Use search_catalog or browse_store to help the user find products to add. Then call update_cart with cart.line_items.",
  );
};

const populatedCartResult = (data: CartDetails) =>
  toolResult(
    populatedCartSummary(data),
    data,
    cartLineItemKeyFields(data.line_items),
    "To modify quantities, call update_cart with the line_items[].id from this response and the new quantity. To remove an item, call update_cart with quantity 0. To proceed, use proceed_to_checkout.",
  );

const populatedCartSummary = (data: CartDetails) => {
  const itemList = data.line_items.slice(0, 3).map(cartLineItemLabel).join(", ");
  const more = data.line_items.length > 3 ? ` and ${data.line_items.length - 3} more` : "";
  const plural = data.item_count === 1 ? "" : "s";
  const total = formatUcpMoney(data.total_price) || "unknown total";

  return `Cart has ${data.item_count} item${plural} totaling ${total}: ${itemList}${more}.`;
};

const cartLineItemKeyFields = (items: CartLineDetails[]) =>
  "Cart line items:\n" + items.map(cartLineItemKeyField).join("\n");

const cartLineItemKeyField = (lineItem: CartLineDetails) => {
  const price = formatUcpMoney(lineItem.line_price) || "price unavailable";
  return `- ${lineItem.id}: "${cartLineItemLabel(lineItem)}" - ${price}`;
};

const cartLineItemLabel = (lineItem: CartLineDetails) => {
  const title = lineItem.item.title || lineItem.item.handle || lineItem.item.id || "item";
  const variant = lineItem.item.variant_title;
  const variantSuffix = variant && variant !== "Default Title" ? ` (${variant})` : "";
  return `${title}${variantSuffix} x${lineItem.quantity}`;
};

/**
 * Best-effort mapping when SFAPI enrichment fails: preserves cart line ids
 * and quantities/totals from Standard Actions so `update_cart` still has
 * something to work with, but leaves the naming fields empty. The
 * `cartLineItemLabel` fallback ("item x N") is deliberately ugly so it's
 * obvious in a report when this degraded path fires.
 */
function localCartDetails(cart: Cart, _routes: ShopifyWebMcpRoutes): CartDetails {
  return {
    id: cart.id ?? "",
    item_count: cart.totalQuantity ?? 0,
    total_price: moneyV2ToUcpMoney(cart.cost?.totalAmount),
    currency: cart.cost?.totalAmount?.currencyCode ?? "",
    line_items: (cart.lines?.nodes ?? []).map((line) => ({
      id: line.id ?? "",
      quantity: line.quantity ?? 0,
      line_price: moneyV2ToUcpMoney(line.cost?.totalAmount),
      item: {
        id: "",
        title: "",
        variant_title: "",
        handle: "",
        url: "",
        image: "",
        unit_price: null,
      },
    })),
  };
}
