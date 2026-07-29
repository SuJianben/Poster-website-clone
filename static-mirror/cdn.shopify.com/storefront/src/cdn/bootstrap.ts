import { registerShopifyWebMcpTools } from "../registration";

(function init() {
  if (typeof window === "undefined") return;

  registerShopifyWebMcpTools();
})();
