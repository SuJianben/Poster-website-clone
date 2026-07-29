import type { ShopifyGlobal } from "#hydrogen/globals";

import { DEFAULT_ROUTES } from "./routing";
import { SHOPIFY_WEBMCP_TOOL_MANIFEST } from "./tool-manifest";
import { defaultToolExecutors } from "./tools";
import type {
  DefaultWebMcpTool,
  RegisteredWebMcpTool,
  ShopifyWebMcpToolContext,
  WebMcpModelContext,
} from "./types";

const WEBMCP_REGISTERED = Symbol.for("shopify.webmcp.registered");

type ShopifyWebMcpRuntimeGlobal = Partial<Pick<ShopifyGlobal, "navigate">>;

/**
 * Registration configs are assembled in manifest order so the manifest remains
 * the single source of truth for tool metadata and ordering.
 */
const defaults = Object.values(SHOPIFY_WEBMCP_TOOL_MANIFEST).map((tool) => ({
  ...tool,
  execute: defaultToolExecutors[tool.name],
})) satisfies DefaultWebMcpTool[];

/**
 * Registers Shopify WebMCP tools with the active browser model context.
 *
 * @returns `true` when this call registered tools, or `false` when no model
 * context is available or Shopify WebMCP tools were already registered.
 */
export function registerShopifyWebMcpTools(): boolean {
  const modelContext = getDefaultModelContext();
  if (!modelContext || hasRegisteredWebMcpTools()) return false;

  const context: ShopifyWebMcpToolContext = {
    routes: DEFAULT_ROUTES,
    navigate: shopifyNavigate,
  };

  const registrationResults: Array<void | Promise<void>> = [];

  for (const tool of defaults) {
    const registeredTool = bindToolContext(tool, context);
    registrationResults.push(modelContext.registerTool(registeredTool));
  }

  markRegisteredWebMcpTools();
  void Promise.allSettled(registrationResults);

  return true;
}

function shopifyNavigate(url: string) {
  const shopifyWindow: { Shopify?: ShopifyWebMcpRuntimeGlobal } = window;
  const navigate = shopifyWindow.Shopify?.navigate;
  if (navigate) return navigate(url);

  window.location.href = url;
}

function getDefaultModelContext(): WebMcpModelContext | null {
  if (typeof document !== "undefined" && "modelContext" in document) {
    const modelContext: WebMcpModelContext | undefined = document.modelContext;
    return modelContext ?? null;
  }

  if (typeof navigator !== "undefined" && "modelContext" in navigator) {
    const modelContext: WebMcpModelContext | undefined = navigator.modelContext;
    return modelContext ?? null;
  }

  return null;
}

function hasRegisteredWebMcpTools() {
  if (typeof window === "undefined") return false;

  return Reflect.get(window, WEBMCP_REGISTERED) === true;
}

function markRegisteredWebMcpTools() {
  if (typeof window === "undefined") return;

  Reflect.set(window, WEBMCP_REGISTERED, true);
}

/**
 * Adapts an internal Shopify executor, which receives shared routing and
 * navigation helpers, to the model-context API that calls tools with args only.
 */
function bindToolContext(
  tool: DefaultWebMcpTool,
  context: ShopifyWebMcpToolContext,
): RegisteredWebMcpTool {
  const { execute, ...toolConfig } = tool;

  return {
    ...toolConfig,
    execute: (args) => execute(args, context),
  };
}

declare global {
  interface Document {
    modelContext?: WebMcpModelContext;
  }

  interface Navigator {
    modelContext?: WebMcpModelContext;
  }
}
