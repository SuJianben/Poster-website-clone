import { STOREFRONT_API_VERSION } from "#hydrogen/core/constants";
import { decodeEncodedVariant } from "#hydrogen/core/product/options";
import { gql, type StorefrontQueryString } from "#hydrogen/graphql";
import type {
  ProductCollectionSortKeys,
  ProductSortKeys,
} from "#hydrogen/graphql/generated/storefront-api-types";

import { productHandleFromRoute } from "../routing";
import type { ShopifyWebMcpRoutes } from "../types";
import { isString, moneyV2ToUcpMoney, type UcpMoney } from "./shared";

type Image = { url?: string | null; altText?: string | null };

type ProductOption = { name: string; values: string[] };
type VariantOption = { name: string; value: string };

type Product = {
  id?: string;
  title?: string;
  handle?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  availableForSale?: boolean;
  onlineStoreUrl?: string | null;
  featuredImage?: Image | null;
  priceRange?: {
    minVariantPrice?: { amount?: string; currencyCode?: string };
    maxVariantPrice?: { amount?: string; currencyCode?: string };
  };
  variantCount?: number;
  selectedOrFirstAvailableVariant?: ProductVariant | null;
  variantBySelectedOptions?: ProductVariant | null;
  encodedVariantAvailability?: string | null;
  options?: ProductOption[];
  images?: Image[];
};

type ProductVariant = {
  id?: string;
  title?: string;
  availableForSale?: boolean;
  price?: { amount?: string; currencyCode?: string } | null;
  compareAtPrice?: { amount?: string; currencyCode?: string } | null;
  sku?: string | null;
  selectedOptions?: VariantOption[];
};

type Collection = {
  title?: string;
  handle?: string;
  description?: string;
  onlineStoreUrl?: string | null;
};

export type CollectionBrowseResult = {
  collection?: Collection | null;
  products: Product[];
  title: string;
};

type Article = {
  title?: string;
  handle?: string;
  excerpt?: string | null;
  onlineStoreUrl?: string | null;
};

type Page = {
  title?: string;
  handle?: string;
  onlineStoreUrl?: string | null;
};

type ProductSummary = {
  id: string;
  title: string;
  handle: string;
  url: string;
  price_range: UcpMoney | null;
  image: string;
  available: boolean;
  variant_count: number;
  options: ProductOption[];
  product_type?: string;
  vendor?: string;
};

export type ProductDetails = Omit<ProductSummary, "price_range"> & {
  description: { html: string };
  type: string;
  tags: string[];
  price_range: { min: UcpMoney | null; max: UcpMoney | null };
  variants: Array<{
    id: string;
    title: string;
    options: VariantOption[];
    price: UcpMoney | null;
    list_price: UcpMoney | null;
    availability: { available: boolean };
    sku?: string;
  }>;
  available_options: VariantOption[][];
  available_options_count: number;
  available_options_truncated: boolean;
  available_options_filter?: VariantOption[];
  images: string[];
};

type ProductLookupResult = {
  product: { title: string; handle: string };
  variant: {
    merchandise_id: string;
    title: string;
  };
};

export type CartLineDetails = {
  id: string;
  quantity: number;
  line_price: UcpMoney | null;
  item: {
    id: string;
    title: string;
    variant_title: string;
    handle: string;
    url: string;
    image: string;
    unit_price: UcpMoney | null;
  };
};

export type CartDetails = {
  id: string;
  item_count: number;
  total_price: UcpMoney | null;
  currency: string;
  line_items: CartLineDetails[];
};

type ProductDetailsOptions = {
  selected_options?: VariantOption[];
  routes: ShopifyWebMcpRoutes;
};

type SfapiGraphQLResponse<TData> = {
  data?: TData | null;
  errors?: Array<{ message?: string }>;
};
type StorefrontApiResponse<TQuery extends StorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer Data, infer _Variables, string> ? Data : never;
type StorefrontApiVariables<TQuery extends StorefrontQueryString> =
  TQuery extends StorefrontQueryString<infer _Data, infer Variables, string> ? Variables : never;

const SFAPI_ENDPOINT = `/api/${STOREFRONT_API_VERSION}/graphql.json`;
const DEFAULT_PRODUCT_LIMIT = 30;
const DEFAULT_COLLECTION_LIMIT = 50;
const AVAILABLE_OPTIONS_LIMIT = 50;
const PRODUCT_GID_PREFIX = "gid://shopify/Product/";

const MONEY_FRAGMENT = gql(`
  fragment WebMcpMoney on MoneyV2 {
    amount
    currencyCode
  }
`);

const PRODUCT_CARD_FRAGMENT = gql(
  `
    fragment WebMcpProductCard on Product {
      id
      title
      handle
      vendor
      productType
      availableForSale
      onlineStoreUrl
      featuredImage {
        url
        altText
      }
      priceRange {
        minVariantPrice {
          ...WebMcpMoney
        }
      }
      variantsCount {
        count
      }
      options {
        name
        values
      }
    }
  `,
  [MONEY_FRAGMENT],
);

const PRODUCT_FOR_CART_FRAGMENT = gql(`
  fragment WebMcpProductForCart on Product {
    title
    handle
    selectedOrFirstAvailableVariant {
      id
      title
      availableForSale
    }
  }
`);

const CART_DETAILS_FRAGMENT = gql(
  `
    fragment WebMcpCartDetails on Cart {
      id
      totalQuantity
      cost {
        totalAmount {
          ...WebMcpMoney
        }
      }
      lines(first: 250) {
        nodes {
          id
          quantity
          cost {
            totalAmount {
              ...WebMcpMoney
            }
          }
          merchandise {
            __typename
            ... on ProductVariant {
              id
              title
              image {
                url
                altText
              }
              price {
                ...WebMcpMoney
              }
              product {
                id
                title
                handle
                onlineStoreUrl
              }
            }
          }
        }
      }
    }
  `,
  [MONEY_FRAGMENT],
);

const PRODUCT_VARIANT_FRAGMENT = gql(
  `
    fragment WebMcpProductVariant on ProductVariant {
      id
      title
      availableForSale
      sku
      price {
        ...WebMcpMoney
      }
      compareAtPrice {
        ...WebMcpMoney
      }
      selectedOptions {
        name
        value
      }
    }
  `,
  [MONEY_FRAGMENT],
);

const PRODUCT_DETAILS_FRAGMENT = gql(
  `
    fragment WebMcpProductDetails on Product {
      id
      title
      handle
      descriptionHtml
      vendor
      productType
      tags
      availableForSale
      onlineStoreUrl
      featuredImage {
        url
        altText
      }
      priceRange {
        minVariantPrice {
          ...WebMcpMoney
        }
        maxVariantPrice {
          ...WebMcpMoney
        }
      }
      variantsCount {
        count
      }
      encodedVariantAvailability
      selectedOrFirstAvailableVariant {
        ...WebMcpProductVariant
      }
      options {
        name
        values
      }
      images(first: 20) {
        nodes {
          url
          altText
        }
      }
    }
  `,
  [PRODUCT_VARIANT_FRAGMENT],
);

const SEARCH_CATALOG_QUERY = gql(
  `
    query WebMcpSearchCatalog($query: String!, $types: [PredictiveSearchType!], $limit: Int!) {
      predictiveSearch(query: $query, types: $types, limit: $limit) {
        products {
          ...WebMcpProductCard
        }
        collections {
          title
          handle
          description
          onlineStoreUrl
        }
        articles {
          title
          handle
          excerpt
          onlineStoreUrl
        }
        pages {
          title
          handle
          onlineStoreUrl
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

const LIST_COLLECTIONS_QUERY = gql(`
  query WebMcpListCollections($first: Int!) {
    collections(first: $first) {
      nodes {
        title
        handle
        description
        onlineStoreUrl
      }
    }
  }
`);

const BROWSE_PRODUCTS_QUERY = gql(
  `
    query WebMcpBrowseProducts($first: Int!, $sortKey: ProductSortKeys, $reverse: Boolean!) {
      products(first: $first, sortKey: $sortKey, reverse: $reverse) {
        nodes {
          ...WebMcpProductCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

const BROWSE_COLLECTION_PRODUCTS_QUERY = gql(
  `
    query WebMcpBrowseCollectionProducts(
      $handle: String!
      $first: Int!
      $sortKey: ProductCollectionSortKeys
      $reverse: Boolean!
    ) {
      collection(handle: $handle) {
        title
        handle
        description
        onlineStoreUrl
        products(first: $first, sortKey: $sortKey, reverse: $reverse) {
          nodes {
            ...WebMcpProductCard
          }
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

const PRODUCT_BY_HANDLE_QUERY = gql(
  `
    query WebMcpProductByHandle(
      $handle: String!
      $selectedOptions: [SelectedOptionInput!]!
      $hasSelectedOptions: Boolean!
    ) {
      product(handle: $handle) {
        ...WebMcpProductDetails
        variantBySelectedOptions(
          selectedOptions: $selectedOptions
          caseInsensitiveMatch: true
        ) @include(if: $hasSelectedOptions) {
          ...WebMcpProductVariant
        }
      }
    }
  `,
  [PRODUCT_DETAILS_FRAGMENT],
);

const PRODUCT_BY_ID_QUERY = gql(
  `
    query WebMcpProductById(
      $id: ID!
      $selectedOptions: [SelectedOptionInput!]!
      $hasSelectedOptions: Boolean!
    ) {
      node(id: $id) {
        __typename
        ... on Product {
          ...WebMcpProductDetails
          variantBySelectedOptions(
            selectedOptions: $selectedOptions
            caseInsensitiveMatch: true
          ) @include(if: $hasSelectedOptions) {
            ...WebMcpProductVariant
          }
        }
      }
    }
  `,
  [PRODUCT_DETAILS_FRAGMENT],
);

const PRODUCT_FOR_CART_BY_HANDLE_QUERY = gql(
  `
    query WebMcpProductForCartByHandle($handle: String!) {
      product(handle: $handle) {
        ...WebMcpProductForCart
      }
    }
  `,
  [PRODUCT_FOR_CART_FRAGMENT],
);

const CART_DETAILS_QUERY = gql(
  `
    query WebMcpCartDetails($id: ID!) {
      cart(id: $id) {
        ...WebMcpCartDetails
      }
    }
  `,
  [CART_DETAILS_FRAGMENT],
);

const SEARCH_PRODUCT_FOR_CART_QUERY = gql(
  `
    query WebMcpSearchProductForCart($query: String!) {
      predictiveSearch(query: $query, types: [PRODUCT], limit: 1) {
        products {
          ...WebMcpProductForCart
        }
      }
    }
  `,
  [PRODUCT_FOR_CART_FRAGMENT],
);

type SearchCatalogResult = StorefrontApiResponse<typeof SEARCH_CATALOG_QUERY>;
type ListCollectionsResult = StorefrontApiResponse<typeof LIST_COLLECTIONS_QUERY>;
type BrowseProductsResult = StorefrontApiResponse<typeof BROWSE_PRODUCTS_QUERY>;
type BrowseCollectionProductsResult = StorefrontApiResponse<
  typeof BROWSE_COLLECTION_PRODUCTS_QUERY
>;
type ProductByHandleResult = StorefrontApiResponse<typeof PRODUCT_BY_HANDLE_QUERY>;

type SfapiPredictiveSearch = NonNullable<SearchCatalogResult["predictiveSearch"]>;
type SfapiProductCard = BrowseProductsResult["products"]["nodes"][number];
type SfapiProductDetails = NonNullable<ProductByHandleResult["product"]>;
type SfapiProductVariant = {
  id?: string;
  title?: string;
  availableForSale?: boolean;
  sku?: string | null;
  price?: { amount?: string; currencyCode?: string } | null;
  compareAtPrice?: { amount?: string; currencyCode?: string } | null;
  selectedOptions?: Array<{ name?: string; value?: string }>;
};
type SfapiCartVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
};
type SfapiCartProduct = {
  title: string;
  handle: string;
  selectedOrFirstAvailableVariant?: SfapiCartVariant | null;
};
type SfapiImage = SfapiProductDetails["images"]["nodes"][number];
type SfapiMoney = { amount?: string; currencyCode?: string };
type SfapiProduct = {
  id?: string;
  title?: string;
  handle?: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  availableForSale?: boolean;
  onlineStoreUrl?: string | null;
  featuredImage?: SfapiProductCard["featuredImage"] | SfapiProductDetails["featuredImage"];
  priceRange?: {
    minVariantPrice?: SfapiMoney;
    maxVariantPrice?: SfapiMoney;
  };
  variantsCount?: SfapiProductCard["variantsCount"] | SfapiProductDetails["variantsCount"];
  selectedOrFirstAvailableVariant?: SfapiProductVariant | null;
  variantBySelectedOptions?: SfapiProductVariant | null;
  encodedVariantAvailability?: string | null;
  options?: SfapiProductCard["options"] | SfapiProductDetails["options"];
  images?: { nodes?: SfapiImage[] };
};
type SfapiCollection = ListCollectionsResult["collections"]["nodes"][number] &
  Partial<NonNullable<BrowseCollectionProductsResult["collection"]>>;
type SfapiArticle = SfapiPredictiveSearch["articles"][number];
type SfapiPage = SfapiPredictiveSearch["pages"][number];

export async function searchCatalog(query: string, limit: number) {
  const data = await fetchStorefrontApi(SEARCH_CATALOG_QUERY, {
    query,
    types: ["PRODUCT", "COLLECTION", "ARTICLE", "PAGE"],
    limit,
  });

  return {
    predictiveSearch: mapSfapiPredictiveSearch(data.predictiveSearch),
  };
}

export async function listCollections() {
  const data = await fetchStorefrontApi(LIST_COLLECTIONS_QUERY, {
    first: DEFAULT_COLLECTION_LIMIT,
  });

  return {
    collections: {
      nodes: data.collections?.nodes?.map(mapSfapiCollection) ?? [],
    },
  };
}

export async function browseProducts(options: {
  page: number;
  sortBy: string;
}): Promise<CollectionBrowseResult> {
  const data = await fetchStorefrontApi(BROWSE_PRODUCTS_QUERY, {
    first: productsToFetch(options.page),
    ...productSort(options.sortBy),
  });

  return {
    products: pageProducts(data.products?.nodes ?? [], options.page).map(mapSfapiProduct),
    title: "All products",
  };
}

export async function browseCollectionProducts(options: {
  handle: string;
  page: number;
  sortBy: string;
}): Promise<CollectionBrowseResult> {
  const handle = options.handle.trim();
  const data = await fetchStorefrontApi(BROWSE_COLLECTION_PRODUCTS_QUERY, {
    handle,
    first: productsToFetch(options.page),
    ...collectionProductSort(options.sortBy),
  });
  const collection = data.collection ? mapSfapiCollection(data.collection) : null;

  return {
    collection,
    products: pageProducts(data.collection?.products?.nodes ?? [], options.page).map(
      mapSfapiProduct,
    ),
    title: collection?.title ?? handle,
  };
}

export async function fetchProduct(
  identifier: string,
  options: ProductDetailsOptions,
): Promise<ProductDetails | null> {
  const productId = catalogId(identifier);
  if (!productId) return null;
  const selectedOptions = normalizeSelectedOptions(options.selected_options);
  const hasSelectedOptions = selectedOptions.length > 0;

  if (isProductGid(productId)) {
    const data = await fetchStorefrontApi(PRODUCT_BY_ID_QUERY, {
      id: productId,
      selectedOptions,
      hasSelectedOptions,
    });
    const node = data.node;
    return node?.__typename === "Product"
      ? mapProductDetails(mapSfapiProduct(node), options)
      : null;
  }

  const data = await fetchStorefrontApi(PRODUCT_BY_HANDLE_QUERY, {
    handle: productId,
    selectedOptions,
    hasSelectedOptions,
  });
  return data.product ? mapProductDetails(mapSfapiProduct(data.product), options) : null;
}

/**
 * Fetch a cart's full contents from the Storefront API by cart id.
 *
 * The `getCart` Standard Action returns only cart line ids + quantities +
 * costs — no product, variant, image, or handle information. Any tool that
 * wants to give the model human-meaningful cart state ("What's in my cart?"
 * → "a Large Black Hoodie") has to enrich via the SFAPI, and this is that
 * enrichment. Returns null when the cart id is unknown to SFAPI.
 */
export async function fetchCartDetails(
  cartId: string,
  routes: ShopifyWebMcpRoutes,
): Promise<CartDetails | null> {
  const trimmedId = cartId.trim();
  if (!trimmedId) return null;

  const data = await fetchStorefrontApi(CART_DETAILS_QUERY, { id: trimmedId });
  const cart = data.cart;
  if (!cart) return null;

  return {
    id: cart.id ?? trimmedId,
    item_count: cart.totalQuantity ?? 0,
    total_price: moneyV2ToUcpMoney(cart.cost?.totalAmount),
    currency: cart.cost?.totalAmount?.currencyCode ?? "",
    line_items: (cart.lines?.nodes ?? []).map((line) => mapCartLineDetails(line, routes)),
  };
}

export async function lookupProductForCart(params: {
  handle?: string;
  query?: string;
}): Promise<ProductLookupResult | null> {
  if (params.handle?.trim()) {
    const data = await fetchStorefrontApi(PRODUCT_FOR_CART_BY_HANDLE_QUERY, {
      handle: params.handle.trim(),
    });
    return data.product ? mapProductLookup(data.product) : null;
  }

  if (params.query?.trim()) {
    const data = await fetchStorefrontApi(SEARCH_PRODUCT_FOR_CART_QUERY, {
      query: params.query.trim(),
    });
    const product = data.predictiveSearch?.products?.[0];
    return product ? mapProductLookup(product) : null;
  }

  return null;
}

async function fetchStorefrontApi<TQuery extends StorefrontQueryString>(
  query: TQuery,
  variables: StorefrontApiVariables<TQuery>,
): Promise<StorefrontApiResponse<TQuery>> {
  const response = await fetch(SFAPI_ENDPOINT, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Storefront API request failed (${response.status})`);

  const payload: SfapiGraphQLResponse<StorefrontApiResponse<TQuery>> = await response.json();
  if (payload.errors?.length) {
    throw new Error(
      payload.errors
        .map((error) => error.message)
        .filter(Boolean)
        .join(", "),
    );
  }
  if (!payload.data) throw new Error("Storefront API response did not include data.");
  return payload.data;
}

function productsToFetch(page: number) {
  return Math.min(Math.max(1, page) * DEFAULT_PRODUCT_LIMIT, 250);
}

function pageProducts<TProduct>(products: TProduct[], page: number) {
  const start = (Math.max(1, page) - 1) * DEFAULT_PRODUCT_LIMIT;
  return products.slice(start, start + DEFAULT_PRODUCT_LIMIT);
}

function productSort(sortBy: string): { sortKey: ProductSortKeys; reverse: boolean } {
  switch (sortBy) {
    case "price-ascending":
      return { sortKey: "PRICE", reverse: false };
    case "price-descending":
      return { sortKey: "PRICE", reverse: true };
    case "title-ascending":
      return { sortKey: "TITLE", reverse: false };
    case "title-descending":
      return { sortKey: "TITLE", reverse: true };
    case "created-ascending":
      return { sortKey: "CREATED_AT", reverse: false };
    case "created-descending":
      return { sortKey: "CREATED_AT", reverse: true };
    case "best-selling":
    default:
      return { sortKey: "BEST_SELLING", reverse: false };
  }
}

function collectionProductSort(sortBy: string): {
  sortKey: ProductCollectionSortKeys;
  reverse: boolean;
} {
  switch (sortBy) {
    case "price-ascending":
      return { sortKey: "PRICE", reverse: false };
    case "price-descending":
      return { sortKey: "PRICE", reverse: true };
    case "title-ascending":
      return { sortKey: "TITLE", reverse: false };
    case "title-descending":
      return { sortKey: "TITLE", reverse: true };
    case "created-ascending":
      return { sortKey: "CREATED", reverse: false };
    case "created-descending":
      return { sortKey: "CREATED", reverse: true };
    case "best-selling":
    default:
      return { sortKey: "BEST_SELLING", reverse: false };
  }
}

function mapSfapiPredictiveSearch(
  results:
    | {
        products?: SfapiProduct[];
        collections?: SfapiCollection[];
        articles?: SfapiArticle[];
        pages?: SfapiPage[];
      }
    | null
    | undefined,
) {
  return {
    products: (results?.products ?? []).map(mapSfapiProduct),
    collections: (results?.collections ?? []).map(mapSfapiCollection),
    articles: (results?.articles ?? []).map(mapSfapiArticle),
    pages: (results?.pages ?? []).map(mapSfapiPage),
  };
}

function mapSfapiProduct(product: SfapiProduct): Product {
  const selectedOrFirstAvailableVariant = product.selectedOrFirstAvailableVariant
    ? mapSfapiVariant(product.selectedOrFirstAvailableVariant)
    : null;
  const variantBySelectedOptions = product.variantBySelectedOptions
    ? mapSfapiVariant(product.variantBySelectedOptions)
    : null;
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    descriptionHtml: product.descriptionHtml,
    vendor: product.vendor,
    productType: product.productType,
    tags: product.tags,
    availableForSale: product.availableForSale,
    onlineStoreUrl: product.onlineStoreUrl,
    featuredImage: product.featuredImage ?? null,
    priceRange: product.priceRange,
    variantCount: product.variantsCount?.count ?? 0,
    selectedOrFirstAvailableVariant,
    variantBySelectedOptions,
    encodedVariantAvailability: product.encodedVariantAvailability,
    options: mapSfapiOptions(product.options),
    images: sfapiImages(product.images?.nodes),
  };
}

type SfapiCartLine = NonNullable<
  NonNullable<StorefrontApiResponse<typeof CART_DETAILS_QUERY>["cart"]>["lines"]["nodes"]
>[number];

function mapCartLineDetails(line: SfapiCartLine, routes: ShopifyWebMcpRoutes): CartLineDetails {
  return {
    id: line.id ?? "",
    quantity: line.quantity ?? 0,
    line_price: moneyV2ToUcpMoney(line.cost?.totalAmount),
    item: mapCartLineItemDetail(line, routes),
  };
}

function mapCartLineItemDetail(
  line: SfapiCartLine,
  routes: ShopifyWebMcpRoutes,
): CartLineDetails["item"] {
  const variant = normalizeCartLineVariant(line);
  const product = variant.product;
  return {
    id: variant.id,
    title: product.title,
    variant_title: variant.title,
    handle: product.handle,
    url: cartLineUrl(
      { handle: product.handle, onlineStoreUrl: product.onlineStoreUrl },
      variant.id,
      routes,
    ),
    image: variant.image,
    unit_price: moneyV2ToUcpMoney(variant.price),
  };
}

/**
 * Extract the variant + product fields we care about from a raw SFAPI cart
 * line, applying defaults so the caller never has to null-check. Split
 * from `mapCartLineItemDetail` to keep each function's cyclomatic
 * complexity within the repo's oxlint budget.
 */
function normalizeCartLineVariant(line: SfapiCartLine) {
  const merchandise = line.merchandise;
  const variant = merchandise?.__typename === "ProductVariant" ? merchandise : null;
  return {
    id: variant?.id ?? "",
    title: variant?.title ?? "",
    image: variant?.image?.url ?? "",
    price: variant?.price,
    product: normalizeCartLineProduct(variant?.product),
  };
}

function normalizeCartLineProduct(
  product:
    | {
        id?: string;
        title?: string;
        handle?: string;
        onlineStoreUrl?: string | null;
      }
    | null
    | undefined,
) {
  return {
    id: product?.id ?? "",
    title: product?.title ?? "",
    handle: product?.handle ?? "",
    onlineStoreUrl: product?.onlineStoreUrl,
  };
}

function cartLineUrl(
  productItem: OnlineStoreUrlItem,
  variantId: string,
  routes: ShopifyWebMcpRoutes,
) {
  const productPath = resolveUrl(productItem, (h) => routes.product(h));
  if (!productPath) return "";
  const numericVariantId = variantId.split("/").pop();
  if (!numericVariantId) return productPath;
  const separator = productPath.includes("?") ? "&" : "?";
  return `${productPath}${separator}variant=${encodeURIComponent(numericVariantId)}`;
}

function mapProductLookup(product: SfapiCartProduct): ProductLookupResult | null {
  const variant = product.selectedOrFirstAvailableVariant;
  if (!variant?.id || !variant.availableForSale) return null;

  return {
    product: {
      title: product.title,
      handle: product.handle,
    },
    variant: {
      merchandise_id: variant.id,
      title: variant.title,
    },
  };
}

function mapSfapiOptions(options: SfapiProduct["options"]): ProductOption[] {
  return (
    options?.map((option) => ({
      name: option.name ?? "",
      values: option.values ?? [],
    })) ?? []
  );
}

function mapSfapiSelectedOptions(
  selectedOptions: Array<{ name?: string; value?: string }> | undefined,
): VariantOption[] {
  return (
    selectedOptions?.map((option) => ({
      name: option.name ?? "",
      value: option.value ?? "",
    })) ?? []
  );
}

function sfapiImages(images: SfapiImage[] | undefined): Image[] {
  return images?.filter(isPresent) ?? [];
}

function mapSfapiVariant(variant: SfapiProductVariant): ProductVariant {
  return {
    id: variant.id ?? "",
    title: variant.title ?? "",
    availableForSale: Boolean(variant.availableForSale),
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    sku: variant.sku,
    selectedOptions: mapSfapiSelectedOptions(variant.selectedOptions),
  };
}

function isPresent<TValue>(value: TValue | null | undefined): value is TValue {
  return value != null;
}

function mapSfapiCollection(collection: SfapiCollection): Collection {
  return {
    title: collection.title,
    handle: collection.handle,
    description: collection.description,
    onlineStoreUrl: collection.onlineStoreUrl,
  };
}

function mapSfapiArticle(article: SfapiArticle): Article {
  return {
    title: article.title,
    handle: article.handle,
    excerpt: article.excerpt,
    onlineStoreUrl: article.onlineStoreUrl,
  };
}

function mapSfapiPage(page: SfapiPage): Page {
  return {
    title: page.title,
    handle: page.handle,
    onlineStoreUrl: page.onlineStoreUrl,
  };
}

export function mapProductSummary(product: Product, routes: ShopifyWebMcpRoutes): ProductSummary {
  const handle = productHandle(product);

  return {
    id: product.id ?? "",
    title: product.title ?? "",
    handle,
    url: productSummaryUrl(product, handle, routes),
    price_range: moneyV2ToUcpMoney(product.priceRange?.minVariantPrice),
    image: imageUrl(product.featuredImage),
    available: Boolean(product.availableForSale),
    variant_count: product.variantCount ?? 0,
    options: product.options ?? [],
    product_type: product.productType ?? "",
    vendor: product.vendor ?? "",
  };
}

function productSummaryUrl(product: Product, handle: string, routes: ShopifyWebMcpRoutes) {
  return resolveUrl({ handle, onlineStoreUrl: product.onlineStoreUrl }, (resolvedHandle) =>
    routes.product(resolvedHandle),
  );
}

function mapProductDetails(product: Product, options: ProductDetailsOptions): ProductDetails {
  const summary = mapProductSummary(product, options.routes);
  const productOptions = product.options ?? [];
  const selectedOptions = normalizeSelectedOptions(options.selected_options);
  const availableOptions = productAvailableOptions(productOptions, product, selectedOptions);
  const variants = productDetailsVariants(product, selectedOptions);

  return {
    ...summary,
    description: { html: product.descriptionHtml ?? "" },
    type: product.productType ?? "",
    tags: product.tags ?? [],
    price_range: {
      min: moneyV2ToUcpMoney(product.priceRange?.minVariantPrice),
      max: moneyV2ToUcpMoney(product.priceRange?.maxVariantPrice),
    },
    variants: variants.map(mapProductVariant),
    available_options: availableOptions.options,
    available_options_count: availableOptions.count,
    available_options_truncated: availableOptions.truncated,
    available_options_filter: selectedOptions.length ? selectedOptions : undefined,
    images: product.images?.map(imageUrl).filter(isString) ?? [],
  };
}

function productDetailsVariants(product: Product, selectedOptions: VariantOption[]) {
  if (selectedOptions.length) {
    return product.variantBySelectedOptions ? [product.variantBySelectedOptions] : [];
  }

  return product.selectedOrFirstAvailableVariant ? [product.selectedOrFirstAvailableVariant] : [];
}

function productAvailableOptions(
  options: ProductOption[],
  product: Product,
  selectedOptions: VariantOption[],
) {
  const decodedCombinations = decodeEncodedVariant(product.encodedVariantAvailability);
  const matchingOptions: ProductDetails["available_options"] = [];

  for (const combination of decodedCombinations) {
    const mappedCombination = mapOptionCombination(options, combination);
    if (!mappedCombination) continue;
    if (!selectedOptionsMatch(mappedCombination, selectedOptions)) continue;

    matchingOptions.push(mappedCombination);
  }

  const shouldReturnOptions =
    selectedOptions.length > 0 || matchingOptions.length <= AVAILABLE_OPTIONS_LIMIT;
  const availableOptions = shouldReturnOptions
    ? matchingOptions.slice(0, AVAILABLE_OPTIONS_LIMIT)
    : [];

  return {
    options: availableOptions,
    count: matchingOptions.length,
    truncated: matchingOptions.length > availableOptions.length,
  };
}

function mapOptionCombination(options: ProductOption[], combination: number[]) {
  if (!options.length || combination.length !== options.length) return null;

  const selectedOptions: VariantOption[] = [];
  for (const [index, option] of options.entries()) {
    const value = option.values[combination[index]];
    if (!value) return null;
    selectedOptions.push({ name: option.name, value });
  }

  return selectedOptions;
}

function selectedOptionsMatch(combination: VariantOption[], selectedOptions: VariantOption[]) {
  return selectedOptions.every((selectedOption) =>
    combination.some((option) => selectedOptionMatches(option, selectedOption)),
  );
}

function selectedOptionMatches(variantOption: VariantOption, requestedOption: VariantOption) {
  return (
    normalizeOptionText(variantOption.name) === normalizeOptionText(requestedOption.name) &&
    normalizeOptionText(variantOption.value) === normalizeOptionText(requestedOption.value)
  );
}

function normalizeSelectedOptions(selectedOptions: ProductDetailsOptions["selected_options"]) {
  return (
    selectedOptions
      ?.map((option) => ({
        name: option.name?.trim() ?? "",
        value: option.value?.trim() ?? "",
      }))
      .filter((option) => option.name && option.value) ?? []
  );
}

function normalizeOptionText(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function mapProductVariant(variant: ProductVariant): ProductDetails["variants"][number] {
  return {
    id: variant.id ?? "",
    title: variant.title ?? "",
    options: variant.selectedOptions ?? [],
    price: moneyV2ToUcpMoney(variant.price),
    list_price: moneyV2ToUcpMoney(variant.compareAtPrice),
    availability: { available: Boolean(variant.availableForSale) },
    sku: variant.sku ?? undefined,
  };
}

export function mapCollection(collection: Collection, routes: ShopifyWebMcpRoutes) {
  const handle = collection.handle ?? "";
  return {
    title: collection.title ?? "",
    handle,
    url: resolveUrl(collection, (collectionHandle) => routes.collection(collectionHandle)),
    description: collection.description ?? "",
  };
}

export function mapArticle(article: Article) {
  return {
    title: article.title ?? "",
    handle: article.handle ?? "",
    url: resolveUrl(article),
    excerpt: article.excerpt ?? "",
  };
}

export function mapPage(page: Page) {
  return {
    title: page.title ?? "",
    handle: page.handle ?? "",
    url: resolveUrl(page),
  };
}

type OnlineStoreUrlItem = {
  handle?: string | null;
  onlineStoreUrl?: string | null;
};

function resolveUrl(item: OnlineStoreUrlItem, fallbackUrl?: (handle: string) => string) {
  const onlineStoreUrl = localStorefrontPath(item.onlineStoreUrl);
  if (onlineStoreUrl) return onlineStoreUrl;

  const handle = item.handle?.trim();
  if (!handle) return "";

  return fallbackUrl?.(handle) ?? "";
}

export function catalogId(id: string | undefined) {
  const value = id?.trim();
  if (!value) return "";

  return productHandleFromRoute(value) || value;
}

function isProductGid(id: string) {
  return id.startsWith(PRODUCT_GID_PREFIX);
}

function productHandle(product: Product) {
  return product.handle ?? productHandleFromRoute(localStorefrontPath(product.onlineStoreUrl));
}

function localStorefrontPath(url: string | null | undefined) {
  if (!url) return "";
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    return url.replace(parsed.origin, "");
  } catch {
    return url;
  }
}

function imageUrl(image: Image | null | undefined) {
  return image?.url ?? "";
}
