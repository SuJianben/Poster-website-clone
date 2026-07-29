import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import {
  formatUcpMoney,
  getCartFromActions,
  getCartItemCount,
  moneyV2ToUcpMoney,
  navigationResult,
  toolError,
} from "./shared";

export const createCheckout: ShopifyWebMcpToolExecutor<"createCheckout"> = async (
  _params,
  context,
) => {
  try {
    const cart = await getCartFromActions();
    const itemCount = getCartItemCount(cart);

    if (itemCount === 0) {
      return toolError(
        "Cart is empty. Add items before checking out.",
        "Use search_catalog or update_cart to add products first.",
      );
    }

    const totalPrice = moneyV2ToUcpMoney(cart.cost?.totalAmount);
    const checkoutRoute = context.routes.checkout();
    const navigated = !isCurrentUrl(checkoutRoute);
    if (navigated) setTimeout(() => context.navigate(checkoutRoute), 0);

    const totalSuffix = totalPrice ? ` totaling ${formatUcpMoney(totalPrice)}` : "";
    const summary = navigated
      ? `Taken you to checkout with ${itemCount} item${itemCount !== 1 ? "s" : ""}${totalSuffix}.`
      : `Already on the checkout page with ${itemCount} item${itemCount !== 1 ? "s" : ""}${totalSuffix}.`;

    return navigationResult(
      {
        summary,
        url: checkoutRoute,
        navigated,
      },
      {
        navigating_to: checkoutRoute,
        item_count: itemCount,
        total_price: totalPrice,
      },
    );
  } catch (error) {
    return toolError(
      error instanceof Error ? error.message : "Failed to initiate checkout",
      "Call get_cart to verify cart contents, then retry.",
    );
  }
};

function isCurrentUrl(url: string) {
  if (typeof window === "undefined") return false;
  const current = new URL(window.location.href);
  return current.pathname + current.search === url;
}
