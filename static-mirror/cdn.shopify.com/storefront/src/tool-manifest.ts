import type { FromSchema, JSONSchema } from "json-schema-to-ts";

import type { DefaultWebMcpTool, WebMcpToolExecute } from "./types";

type ShopifyWebMcpToolManifestEntry<TName extends string> = Pick<
  DefaultWebMcpTool,
  "description" | "inputSchema" | "outputSchema"
> & {
  name: TName;
};

type ShopifyWebMcpToolManifest = Record<string, ShopifyWebMcpToolManifestEntry<string>>;

const ucpMoneySchema = {
  type: "object",
  properties: {
    amount: { type: "integer" },
    currency: { type: "string" },
  },
} as const;

const nullableUcpMoneySchema = {
  type: ["object", "null"],
  properties: ucpMoneySchema.properties,
} as const;

const productOptionSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    values: { type: "array", items: { type: "string" } },
  },
} as const;

const variantOptionSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    value: { type: "string" },
  },
} as const;

const productSummarySchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description: "Storefront API Product GID. Pass as catalog.id to get_product.",
    },
    title: { type: "string" },
    handle: {
      type: "string",
      description: "Product handle. Can be passed to update_cart as line_items[].handle.",
    },
    url: { type: "string" },
    price_range: nullableUcpMoneySchema,
    image: { type: "string" },
    available: { type: "boolean" },
    variant_count: { type: "integer" },
    options: {
      type: "array",
      description:
        "Product option names and possible values. These values do not guarantee every combination is purchasable; call get_product for available variants.",
      items: productOptionSchema,
    },
    product_type: { type: "string" },
    vendor: { type: "string" },
  },
} as const;

const cartLineItemVariantSchema = {
  type: "object",
  description:
    "Product + variant information for the line, sufficient to name and link to the item without an extra get_product call.",
  properties: {
    id: {
      type: "string",
      description:
        "Storefront API ProductVariant GID. Pass to update_cart as line_items[].item.id to add this variant.",
    },
    title: {
      type: "string",
      description: 'Product title (e.g. "Classic Hoodie").',
    },
    variant_title: {
      type: "string",
      description:
        'Variant title (e.g. "Large / Black"). Empty or "Default Title" for single-variant products.',
    },
    handle: { type: "string" },
    url: {
      type: "string",
      description: "Direct URL to the product page with the variant preselected.",
    },
    image: { type: "string" },
    unit_price: nullableUcpMoneySchema,
  },
} as const;

const cartLineItemSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description:
        "Cart line GID from get_cart. Pass back to update_cart as line_items[].id to update or remove this line.",
    },
    item: cartLineItemVariantSchema,
    quantity: { type: "integer" },
    line_price: {
      ...nullableUcpMoneySchema,
      description: "Total price for the line (quantity × unit_price).",
    },
  },
} as const;

const updateCartAddedLineItemSchema = {
  type: "object",
  properties: {
    item: cartLineItemVariantSchema,
    quantity: {
      type: "integer",
      description:
        "Actual quantity on the cart line after the mutation. May differ from requested_quantity if the line merged with an existing entry or availability capped the add.",
    },
    requested_quantity: {
      type: "integer",
      description: "Quantity the caller asked to add.",
    },
  },
} as const;

export const SHOPIFY_WEBMCP_TOOL_MANIFEST = {
  searchCatalog: {
    name: "search_catalog",
    description:
      "Search the store catalog for products, collections, articles, and pages. Does NOT add anything to the cart; use update_cart for cart changes. If the user asks for a specific product variant, call get_product after search_catalog to inspect available variants, then show_variant to display one.",
    inputSchema: {
      type: "object",
      required: ["catalog"],
      properties: {
        catalog: {
          type: "object",
          required: ["query"],
          properties: {
            query: { type: "string", description: "Search query string." },
            pagination: {
              type: "object",
              properties: {
                limit: {
                  type: "integer",
                  description: "Max results per type (1-10). Defaults to 5.",
                  default: 5,
                  minimum: 1,
                  maximum: 10,
                },
              },
            },
          },
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        products: { type: "array", items: productSummarySchema },
        collections: { type: "array" },
        articles: { type: "array" },
        pages: { type: "array" },
        search_url: { type: "string", description: "Full search results page URL." },
      },
    },
  },
  browseStore: {
    name: "browse_store",
    description:
      "Browse OR navigate to store collections. " +
      "Set navigate=true whenever the user wants to be taken to a collection page in the browser " +
      '(triggers: "browse to", "go to", "show me", "open", "take me to", "navigate to" a collection or category). ' +
      "With navigate=false (default), returns collection or product data without changing the page — use this only when the user is asking a question about the catalog, not asking to view it. " +
      "Without a collection handle, lists all collections. " +
      'With a handle, returns products from that collection; use "all" to browse everything. ' +
      "Does NOT add anything to the cart; use update_cart for cart changes. " +
      "Prefer this over search_catalog when the user names a category, collection, or wants to explore. " +
      "When navigate=true succeeds the browser is ALREADY on the collection page — do NOT navigate again by ANY means (no other webmcp tool; no other host tool that changes the page URL, opens a URL, loads a page, or fetches a page, regardless of its name; no constructing or retyping URLs yourself) and do NOT tell the user to click links to get there; just answer them referencing the returned url exactly as given.",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description:
            'Collection handle to browse (e.g. "best-sellers", "new-arrivals"). Omit to list all collections. Use "all" to browse every product.',
        },
        navigate: {
          type: "boolean",
          description:
            "When true, navigate the browser to the collection page after loading data. " +
            'Set true for user intents like "browse to", "go to", "show me", "open", "take me to" a collection. ' +
            "Requires a collection handle. Defaults to false.",
        },
        sort_by: {
          type: "string",
          description:
            "Sort order. Options: best-selling (default), price-ascending, price-descending, title-ascending, title-descending, created-descending, created-ascending.",
        },
        page: {
          type: "number",
          description:
            "Page number for pagination (starts at 1). Each page returns up to 30 products.",
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        collections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              handle: { type: "string" },
              url: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        products: {
          type: "array",
          items: productSummarySchema,
        },
        collection_title: { type: "string" },
        page: { type: "number" },
        sort_by: { type: "string" },
        navigated: { type: "boolean" },
        url: { type: "string" },
      },
    },
  },
  getProduct: {
    name: "get_product",
    description:
      "Get product details, OR navigate the browser to the product page. " +
      "Set catalog.navigate=true whenever the user wants to see/view the product in the browser " +
      '(triggers: "show me", "open", "view", "go to", "take me to", "navigate to" a product). ' +
      "Set catalog.navigate=false (default) only when you need data (description, options, variants, prices, availability) to answer a question or to prepare an update_cart call — the browser stays on the current page. " +
      "Defaults to the current page's product if no catalog.id is provided. " +
      "Does NOT add anything to the cart; use update_cart for that. " +
      'For a specific variant (color/size/etc.), use show_variant instead — it accepts partial option selections like "purple" without needing every option. ' +
      "When catalog.navigate=true succeeds the browser is ALREADY on the product page — do NOT navigate again by ANY means (no other webmcp tool; no other host tool that changes the page URL, opens a URL, loads a page, or fetches a page, regardless of its name; no constructing or retyping URLs yourself) and do NOT tell the user to click links to get there; just answer them referencing the returned url exactly as given.",
    inputSchema: {
      type: "object",
      properties: {
        catalog: {
          type: "object",
          description: "Product detail parameters.",
          properties: {
            id: {
              type: "string",
              description:
                "Storefront API Product GID, product handle, or product URL path. Custom app product paths and Shopify standard /products/<handle> paths are supported. The id field from search_catalog or browse_store can be passed directly. If omitted, uses the current page's product.",
            },
            navigate: {
              type: "boolean",
              description:
                "When true, navigate the browser to the product page after fetching details. " +
                'Set true for user intents like "show me", "open", "view", "go to", "take me to" a product. ' +
                "Defaults to false. If the user specified partial options (e.g. only a color), prefer show_variant with selected_options instead.",
            },
            selected_options: {
              type: "array",
              description:
                "Known product option selections to filter available_options. Use exact option names and values from search_catalog options or a prior get_product available_options entry.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: 'Option name, e.g. "Size" or "Color".' },
                  value: {
                    type: "string",
                    description: 'Option value, e.g. "160cm" or "Fiberglass".',
                  },
                },
                required: ["name", "value"],
              },
            },
          },
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Storefront API Product GID." },
        title: { type: "string" },
        handle: { type: "string" },
        description: {
          type: "object",
          properties: {
            html: { type: "string" },
          },
        },
        vendor: { type: "string" },
        type: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        url: { type: "string" },
        price_range: {
          type: "object",
          properties: {
            min: nullableUcpMoneySchema,
            max: nullableUcpMoneySchema,
          },
        },
        available: { type: "boolean" },
        options: {
          type: "array",
          description:
            "All product option names and possible values. Use available_options to identify purchasable combinations.",
          items: productOptionSchema,
        },
        variants: {
          type: "array",
          description:
            "Resolved variant records. When catalog.selected_options contains a complete option combination, this contains the matching variant. Pass an available variant id to update_cart as line_items[].item.id.",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description:
                  "Storefront API ProductVariant GID. Pass to show_variant as catalog.variant_id to display it, or update_cart as line_items[].item.id to add it.",
              },
              title: { type: "string" },
              options: {
                type: "array",
                items: variantOptionSchema,
              },
              price: nullableUcpMoneySchema,
              list_price: nullableUcpMoneySchema,
              availability: {
                type: "object",
                properties: { available: { type: "boolean" } },
              },
              sku: { type: "string" },
            },
          },
        },
        available_options: {
          type: "array",
          description:
            "Available option combinations, optionally filtered by catalog.selected_options. Use one full combination to call get_product again when variants[] is empty.",
          items: {
            type: "array",
            items: variantOptionSchema,
          },
        },
        available_options_count: {
          type: "integer",
          description: "Total available option combinations matching catalog.selected_options.",
        },
        available_options_truncated: {
          type: "boolean",
          description: "True when more available option combinations exist than were returned.",
        },
        available_options_filter: {
          type: "array",
          description: "The selected_options filter applied to available_options, when provided.",
          items: variantOptionSchema,
        },
        images: { type: "array", items: { type: "string" } },
      },
    },
  },
  showVariant: {
    name: "show_variant",
    description:
      "Navigate the browser to a product page, with a specific variant OR a partial option filter selected. " +
      'Use for view intents: "show me", "open", "view", "go to", "take me to" a specific product configuration. ' +
      "Accepts EITHER variant_id (fully specified variant) OR selected_options (partial, e.g. only Color=Purple) — with partial options the first matching available variant is picked automatically, so DO NOT ask the user for missing options when their intent is to view. " +
      "Does NOT add anything to the cart; use update_cart for cart changes. " +
      "For cart operations you still need a full variant_id — call get_product with the full option combination first. " +
      'When this tool succeeds the browser is ALREADY on the exact variant page with the variant pre-selected — do NOT navigate again by ANY means (no other webmcp tool like get_product with navigate=true / browse_store / repeat show_variant; no other host tool that changes the page URL, opens a URL, loads a page, or fetches a page, regardless of its name; no constructing or retyping URLs yourself), do NOT tell the user to click a Color/Size swatch or an "Add to cart" button to get there, and do NOT suggest they open the URL themselves. Just reply referencing the returned url exactly as given.',
    inputSchema: {
      type: "object",
      required: ["catalog"],
      properties: {
        catalog: {
          type: "object",
          description:
            "Provide EITHER variant_id OR selected_options. Handle is required unless the user is already on the product page.",
          properties: {
            handle: {
              type: "string",
              description: "Product handle. If omitted, uses the current product page's handle.",
            },
            variant_id: {
              type: ["string", "number"],
              description:
                'ProductVariant ID from get_product variants[].id, e.g. "gid://shopify/ProductVariant/123", or the numeric variant ID. Use when the user picked a specific fully-specified variant. Omit when using selected_options.',
            },
            selected_options: {
              type: "array",
              description:
                'Partial (or full) option selections, e.g. [{"name":"Color","value":"Purple"}]. ' +
                'Use when the user names some options but not all (e.g. "show me the purple shoe" — pass only Color). ' +
                "The first matching available variant will be selected automatically. " +
                "Use exact option names and values from get_product available_options or search_catalog options.",
              items: variantOptionSchema,
            },
          },
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        handle: { type: "string" },
        variant_id: { type: "string" },
        url: { type: "string" },
        navigated: { type: "boolean" },
        selected_options: {
          type: "array",
          description: "The option selections that were resolved to a variant, if provided.",
          items: variantOptionSchema,
        },
      },
    },
  },
  getCart: {
    name: "get_cart",
    description:
      "Get the current shopping cart contents — line items with product titles, variant titles, handles, URLs, images, unit prices, quantities, and totals. Everything needed to describe the cart to the user in natural language, without a follow-up get_product call per line. Works from any page.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Cart GID." },
        item_count: { type: "integer" },
        total_price: nullableUcpMoneySchema,
        currency: { type: "string" },
        line_items: {
          type: "array",
          items: cartLineItemSchema,
        },
      },
    },
  },
  updateCart: {
    name: "update_cart",
    description:
      "Add products to the cart, update line item quantities, or remove items. Use line_items[].item.id with a ProductVariant GID when the exact variant is known. Use line_items[].id from get_cart to update or remove an existing line. Use handle or query only when adding the selected or first available variant.",
    inputSchema: {
      type: "object",
      required: ["cart"],
      properties: {
        cart: {
          type: "object",
          required: ["line_items"],
          properties: {
            line_items: {
              type: "array",
              description: "Items to add or update (1-10).",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description:
                      "Existing cart line id from get_cart. Use to update or remove an existing line. Omit when adding new items.",
                  },
                  item: {
                    type: "object",
                    description: "The merchandise to add.",
                    properties: {
                      id: {
                        type: "string",
                        description:
                          'ProductVariant GID from get_product variants[].id, e.g. "gid://shopify/ProductVariant/123".',
                      },
                    },
                  },
                  handle: {
                    type: "string",
                    description:
                      "Product handle. Adds the selected or first available variant; call get_product first if the user requested specific options.",
                  },
                  query: {
                    type: "string",
                    description:
                      "Search query to find and add the selected or first available variant. For specific variants, call search_catalog/get_product first and pass item.id.",
                  },
                  quantity: {
                    type: "integer",
                    description:
                      "Quantity. Defaults to 1 for adds and updates. Set to 0 with an existing line id to remove it.",
                    default: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        updated: { type: "boolean" },
        item_count: { type: "integer" },
        total_price: nullableUcpMoneySchema,
        line_items: {
          type: "array",
          description:
            "Items added by this mutation, with product/variant details filled in from the post-mutation cart.",
          items: updateCartAddedLineItemSchema,
        },
        unresolved_items: { type: "array" },
        resolved_items: {
          type: "array",
          description:
            "Present only on the clarification-needed path (nothing was applied). Items that could have been added, with pre-mutation lookup titles when available.",
          items: updateCartAddedLineItemSchema,
        },
        warnings: { type: "array", items: { type: "string" } },
      },
    },
  },
  cancelCart: {
    name: "cancel_cart",
    description:
      "Remove all items from the cart in one step. Use when the user wants to empty their cart or start over.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: {
      type: "object",
      properties: {
        cleared: { type: "boolean" },
        previous_item_count: { type: "number" },
      },
    },
  },
  createCheckout: {
    name: "proceed_to_checkout",
    description:
      "Proceed to checkout. Verifies the cart is not empty, then navigates to the checkout page. " +
      "When this tool succeeds the browser is ALREADY on the checkout page — do NOT navigate again by ANY means (no other webmcp tool; no other host tool that changes the page URL, opens a URL, loads a page, or fetches a page, regardless of its name; no constructing or retyping URLs yourself) and do NOT tell the user to click a checkout button or open the URL themselves; just answer them referencing the returned url exactly as given.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    outputSchema: {
      type: "object",
      properties: {
        navigating_to: { type: "string" },
        item_count: { type: "integer" },
        total_price: nullableUcpMoneySchema,
      },
    },
  },
  manageOrders: {
    name: "manage_orders",
    description:
      "Navigate to the customer's order history page. Use when the user asks about past orders, order status, tracking, or returns. The user will be prompted to log in if not already authenticated. " +
      "When this tool succeeds the browser is ALREADY on the order history page — do NOT navigate again by ANY means (no other webmcp tool; no other host tool that changes the page URL, opens a URL, loads a page, or fetches a page, regardless of its name; no constructing or retyping URLs yourself) and do NOT tell the user to click a link or open the URL themselves; just answer them referencing the returned url exactly as given.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  searchShopPoliciesAndFaqs: {
    name: "search_shop_policies_and_faqs",
    description:
      "Used to get facts about the stores policies, products, or services.\n" +
      "Some examples of questions you can ask are:\n" +
      "  - What is your return policy?\n" +
      "  - What is your shipping policy?\n" +
      "  - What is your phone number?\n" +
      '  - What are your hours of operation?"\n',
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A natural language query.",
        },
        context: {
          type: "string",
          description:
            "Additional information about the request such as user demographics, mood, location, or other relevant details that could help in tailoring the response appropriately.",
        },
      },
      required: ["query"],
    },
  },
} as const satisfies ShopifyWebMcpToolManifest;

export type ShopifyWebMcpToolKey = keyof typeof SHOPIFY_WEBMCP_TOOL_MANIFEST;
export type ShopifyWebMcpDefaultToolName =
  (typeof SHOPIFY_WEBMCP_TOOL_MANIFEST)[ShopifyWebMcpToolKey]["name"];

type FromWebMcpSchema<TSchema> = TSchema extends JSONSchema
  ? FromSchema<TSchema, { keepDefaultedPropertiesOptional: true }>
  : never;

type ShopifyWebMcpToolArgs<TKey extends ShopifyWebMcpToolKey> = FromWebMcpSchema<
  (typeof SHOPIFY_WEBMCP_TOOL_MANIFEST)[TKey]["inputSchema"]
>;

type ShopifyWebMcpToolOutput<TKey extends ShopifyWebMcpToolKey> =
  (typeof SHOPIFY_WEBMCP_TOOL_MANIFEST)[TKey] extends { outputSchema: infer TOutputSchema }
    ? FromWebMcpSchema<TOutputSchema>
    : unknown;

export type ShopifyWebMcpToolExecutor<TKey extends ShopifyWebMcpToolKey> = WebMcpToolExecute<
  ShopifyWebMcpToolArgs<TKey>,
  ShopifyWebMcpToolOutput<TKey>
>;
