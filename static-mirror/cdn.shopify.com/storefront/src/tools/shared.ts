import type { ShopifyGlobal } from "#hydrogen/globals";

import type { WebMcpToolResult } from "../types";

type ShopifyStandardActions = ShopifyGlobal["actions"];
type UpdateCartResult = Awaited<ReturnType<ShopifyStandardActions["updateCart"]>>;

export type CartLine = {
  id?: string;
  quantity?: number;
  cost?: {
    totalAmount?: { amount?: string; currencyCode?: string };
  };
  merchandise?: {
    id?: string;
    title?: string;
    image?: { url?: string };
    product?: {
      id?: string;
      title?: string;
      handle?: string;
      vendor?: string;
      productType?: string;
    };
  };
};

export type Cart = {
  id?: string;
  totalQuantity?: number;
  cost?: {
    totalAmount?: { amount?: string; currencyCode?: string };
  };
  lines?: { nodes?: CartLine[] };
};

export type UcpMoney = {
  amount: number;
  currency: string;
};

export const toolResult = <TStructuredContent>(
  summary: string,
  data: TStructuredContent,
  keyFields?: string | null,
  nextSteps?: string,
): WebMcpToolResult<TStructuredContent> => {
  let text = summary;
  if (keyFields) text += `\n\n${keyFields}`;
  if (nextSteps) text += `\n\nNext steps: ${nextSteps}`;
  return { content: [{ type: "text", text }], structuredContent: data };
};

export const actionResult = <TStructuredContent>(
  summary: string,
  data: TStructuredContent,
): WebMcpToolResult<TStructuredContent> => {
  return {
    content: [
      {
        type: "text",
        text: `Suggested response: ${summary}\n\nNow respond to the user with a friendly message. If you completed multiple steps, recap the full journey.`,
      },
    ],
    structuredContent: data,
  };
};

/**
 * Result for tools that navigate the browser to a URL. The text response
 * tells the agent that navigation is complete and that no further navigation
 * tool should be called — it should just reply to the user, referencing the
 * URL where the browser now is.
 */
export const navigationResult = <TStructuredContent>(
  args: {
    summary: string;
    url: string;
    navigated: boolean;
    keyFields?: string | null;
  },
  data: TStructuredContent,
): WebMcpToolResult<TStructuredContent> => {
  const { summary, url, navigated, keyFields } = args;
  const state = navigated
    ? `The browser has ALREADY been navigated to ${url}. The user is on that page now. Navigation is complete.`
    : `The browser is ALREADY at ${url}. The user is on that page now. No navigation was needed.`;

  const doNots =
    "Do NOT navigate the browser again by ANY means unless the user asks to go somewhere else. " +
    "This includes: any webmcp navigation tool (browse_store, get_product with navigate=true, show_variant, proceed_to_checkout, manage_orders); " +
    "any other tool exposed by the host that changes the page URL, opens a URL, loads a page, or fetches a page (regardless of its name); " +
    "and constructing, guessing, or retyping URLs yourself. " +
    "The URL above is the ONLY correct URL for this destination — do NOT modify it, singularize/pluralize path segments, or type a similar-looking URL. " +
    "Do NOT tell the user to click links or buttons or open a URL — they are already there.";

  let text = `Suggested response: ${summary}\n\n${state}\n\n${doNots}\n\nRespond to the user in a friendly way, referencing what they can see on the page.`;
  if (keyFields) text += `\n\n${keyFields}`;

  return { content: [{ type: "text", text }], structuredContent: data };
};

export const toolError = (errorMsg: string, recovery?: string): WebMcpToolResult<never> => {
  let text = `Error: ${errorMsg}`;
  if (recovery) text += `\nRecovery: ${recovery}`;
  return {
    content: [{ type: "text", text }],
    structuredContent: { error: errorMsg },
    isError: true,
  };
};

export const getStandardActions = (): ShopifyStandardActions => {
  const actions = window.Shopify?.actions;
  if (!actions?.getCart || !actions.updateCart) {
    throw new Error(
      "Standard Actions are not available. Ensure Shopify Standard Actions are available before calling cart tools.",
    );
  }

  return actions;
};

export const getCartFromActions = async (actions = getStandardActions()): Promise<Cart> => {
  const result = await actions.getCart();
  return result.cart ?? {};
};

export const assertCartActionResult = (result: UpdateCartResult): void => {
  const errors = result.userErrors?.map((error) => error.message).filter(Boolean);
  if (errors?.length) throw new Error(errors.join(", "));
};

export const extractActionWarnings = (result: UpdateCartResult): string[] =>
  result.warnings?.map((warning) => warning.message).filter(isString) ?? [];

export const getCartLines = (cart: Cart): CartLine[] => cart.lines?.nodes ?? [];

export const getCartItemCount = (cart: Cart): number => cart.totalQuantity ?? 0;

const currencyMinorDecimalsCache = new Map<string, number>();

export const currencyMinorDecimals = (currency: string | undefined): number => {
  const currencyCode = String(currency ?? "").toUpperCase();
  if (!currencyCode) return 2;

  const cached = currencyMinorDecimalsCache.get(currencyCode);
  if (cached != null) return cached;

  try {
    const decimals =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    currencyMinorDecimalsCache.set(currencyCode, decimals);
    return decimals;
  } catch {
    return 2;
  }
};

export const moneyV2ToUcpMoney = (
  money: { amount?: string | number; currencyCode?: string } | null | undefined,
): UcpMoney | null => {
  if (money?.amount == null || !money.currencyCode) return null;

  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return null;

  return {
    amount: Math.round(amount * 10 ** currencyMinorDecimals(money.currencyCode)),
    currency: money.currencyCode,
  };
};

export const formatUcpMoney = (money: UcpMoney | null | undefined) => {
  if (!money) return "";

  const decimals = currencyMinorDecimals(money.currency);
  const amount = money.amount / 10 ** decimals;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: money.currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(decimals)} ${money.currency}`;
  }
};

export const isString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;
