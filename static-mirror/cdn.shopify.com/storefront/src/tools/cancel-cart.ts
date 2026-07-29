import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import {
  actionResult,
  assertCartActionResult,
  extractActionWarnings,
  getCartFromActions,
  getCartItemCount,
  getCartLines,
  getStandardActions,
  toolError,
} from "./shared";

export const cancelCart: ShopifyWebMcpToolExecutor<"cancelCart"> = async () => {
  try {
    const actions = getStandardActions();
    const cart = await getCartFromActions(actions);
    const previousCount = getCartItemCount(cart);
    if (previousCount === 0) {
      return actionResult("Cart is already empty.", { cleared: true, previous_item_count: 0 });
    }

    const lines = getCartLines(cart)
      .filter((line) => line.id)
      .map((line) => ({ id: line.id, quantity: 0 }));

    const result = await actions.updateCart({ lines });
    assertCartActionResult(result);

    const warnings = extractActionWarnings(result);
    const warningNote = warnings.length ? ` Warnings: ${warnings.join("; ")}.` : "";

    return actionResult(
      `Cart cleared. Removed ${previousCount} item${previousCount !== 1 ? "s" : ""}.${warningNote}`,
      {
        cleared: true,
        previous_item_count: previousCount,
        ...(warnings.length && { warnings }),
      },
    );
  } catch (error) {
    return toolError(
      error instanceof Error ? error.message : "Failed to clear cart",
      "Try update_cart with each line_items[].id and quantity 0 to remove items individually.",
    );
  }
};
