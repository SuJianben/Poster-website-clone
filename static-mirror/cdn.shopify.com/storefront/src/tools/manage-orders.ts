import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import { navigationResult } from "./shared";

export const manageOrders: ShopifyWebMcpToolExecutor<"manageOrders"> = (_params, context) => {
  const route = context.routes.accountOrders();
  const navigated = !isCurrentUrl(route);
  if (navigated) setTimeout(() => context.navigate(route), 10);

  const summary = navigated
    ? "Taken you to your order history. You may need to log in if not already authenticated."
    : "Already on your order history page. You may need to log in if not already authenticated.";

  return navigationResult(
    {
      summary,
      url: route,
      navigated,
    },
    {
      navigating_to: route,
    },
  );
};

function isCurrentUrl(url: string) {
  if (typeof window === "undefined") return false;
  const current = new URL(window.location.href);
  return current.pathname + current.search === url;
}
