import type { ShopifyWebMcpToolExecutor } from "../tool-manifest";
import { callBackendTool } from "./backend";

export const searchShopPoliciesAndFaqs: ShopifyWebMcpToolExecutor<"searchShopPoliciesAndFaqs"> = (
  args,
) => callBackendTool("search_shop_policies_and_faqs", args);
