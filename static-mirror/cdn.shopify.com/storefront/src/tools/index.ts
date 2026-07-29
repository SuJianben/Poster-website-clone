import type {
  SHOPIFY_WEBMCP_TOOL_MANIFEST,
  ShopifyWebMcpDefaultToolName,
  ShopifyWebMcpToolExecutor,
  ShopifyWebMcpToolKey,
} from "../tool-manifest";
import { browseStore } from "./browse-store";
import { cancelCart } from "./cancel-cart";
import { createCheckout } from "./create-checkout";
import { getCart } from "./get-cart";
import { getProduct } from "./get-product";
import { manageOrders } from "./manage-orders";
import { searchCatalog } from "./search-catalog";
import { searchShopPoliciesAndFaqs } from "./search-shop-policies-and-faqs";
import { showVariant } from "./show-variant";
import { updateCart } from "./update-cart";

/**
 * Default WebMCP tool executors keyed by the public tool names declared in
 * SHOPIFY_WEBMCP_TOOL_MANIFEST. Every manifest entry should have a matching
 * executor here, and the executor type is inferred from that tool's schemas.
 */
export const defaultToolExecutors = {
  browse_store: browseStore,
  cancel_cart: cancelCart,
  proceed_to_checkout: createCheckout,
  get_cart: getCart,
  get_product: getProduct,
  manage_orders: manageOrders,
  search_catalog: searchCatalog,
  search_shop_policies_and_faqs: searchShopPoliciesAndFaqs,
  show_variant: showVariant,
  update_cart: updateCart,
} satisfies ShopifyWebMcpToolExecutors;

type ShopifyWebMcpToolExecutors = {
  [TName in ShopifyWebMcpDefaultToolName]: ShopifyWebMcpToolExecutor<
    ShopifyWebMcpToolKeyForName<TName>
  >;
};

type ShopifyWebMcpToolKeyForName<TName extends ShopifyWebMcpDefaultToolName> = {
  [TKey in ShopifyWebMcpToolKey]: (typeof SHOPIFY_WEBMCP_TOOL_MANIFEST)[TKey]["name"] extends TName
    ? TKey
    : never;
}[ShopifyWebMcpToolKey];
