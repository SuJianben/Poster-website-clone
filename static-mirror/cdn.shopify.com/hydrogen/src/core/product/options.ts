import type {
  ProductInput,
  ProductOptionValueFrom,
  ProductVariantFrom,
  ProductVariantInput,
  SelectedOption,
  VariantOptionState,
  VariantOptionValueState,
} from "./state";

const OPTION_VALUE_SEPARATOR = ",";
const INCLUSIVE_RANGE_END_OFFSET = 1;

export type DecodedVariantCache = Map<string, Set<string>>;

/**
 * Extracts selected product options from search params.
 *
 * Each query parameter is treated as an option name/value pair
 * (e.g. `?Color=Red&Size=M` → `[{name:"Color",value:"Red"},{name:"Size",value:"M"}]`).
 *
 * When `allowedOptionNames` is provided, the search params are filtered to only
 * entries whose decoded param name exactly matches a product option name.
 * Passing an empty array filters out every option.
 *
 * Pass the result to `createProductFormStore` or `useProductForm` to pre-select
 * the variant that matches the current URL.
 *
 * @example
 * ```ts
 * // Loader (React Router / Remix)
 * const selectedOptions = getSelectedProductOptions({
 *   searchParams: new URL(request.url).searchParams,
 * });
 *
 * // Filter to known product option names when product data is available
 * const selectedOptions = getSelectedProductOptions({
 *   searchParams,
 *   allowedOptionNames: product.options.map((option) => option.name),
 * });
 * ```
 */
export function getSelectedProductOptions({
  searchParams,
  allowedOptionNames,
}: {
  searchParams: URLSearchParams;
  allowedOptionNames?: readonly string[];
}): SelectedOption[] {
  const allowedOptionNameSet = allowedOptionNames ? new Set(allowedOptionNames) : null;
  const selectedOptions: SelectedOption[] = [];

  for (const [name, value] of searchParams.entries()) {
    if (allowedOptionNameSet && !allowedOptionNameSet.has(name)) continue;
    selectedOptions.push({ name, value });
  }

  return selectedOptions;
}

export function getAdjacentAndFirstSelectableVariants<TProduct extends ProductInput>(
  product: TProduct,
): ProductVariantFrom<TProduct>[] {
  // Shopify returns a bounded set, not the whole matrix. Treat it as a concrete-variant cache.
  const variants = new Map<string, ProductVariantFrom<TProduct>>();

  for (const option of product.options) {
    for (const value of option.optionValues) {
      if (isConcreteProductVariant<TProduct>(value.firstSelectableVariant)) {
        addVariant(variants, value.firstSelectableVariant, product.options);
      }
    }
  }

  for (const variant of product.adjacentVariants) {
    if (isConcreteProductVariant<TProduct>(variant)) addVariant(variants, variant, product.options);
  }

  if (isConcreteProductVariant<TProduct>(product.selectedOrFirstAvailableVariant)) {
    addVariant(variants, product.selectedOrFirstAvailableVariant, product.options);
  }

  return [...variants.values()];
}

export function buildProductOptions<TProduct extends ProductInput>(
  product: TProduct,
  selectedOptions: SelectedOption[],
  cache?: DecodedVariantCache,
): VariantOptionState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>>[] {
  const selectedOptionMap = selectedOptionsToMap(selectedOptions);
  const optionIndexByName = new Map(product.options.map((option, index) => [option.name, index]));
  const optionValueIndex = buildOptionValueIndex(product);
  const variants = mapVariants(product);

  return product.options.map((option) => ({
    name: option.name,
    values: option.optionValues.map((value) =>
      buildProductOptionValue({
        cache,
        option,
        optionIndexByName,
        optionValueIndex,
        product,
        selectedOptionMap,
        value,
        variants,
      }),
    ),
  }));
}

export function selectedOptionsToMap(selectedOptions: SelectedOption[]): Record<string, string> {
  const map: Record<string, string> = Object.create(null);
  for (const option of selectedOptions) {
    map[option.name] = option.value;
  }
  return map;
}

function selectedOptionsKey(
  selectedOptions: SelectedOption[],
  productOptions: Array<{ name: string }>,
): string {
  return JSON.stringify(
    selectedOptionsFromMap({ options: productOptions }, selectedOptionsToMap(selectedOptions)),
  );
}

export function selectedOptionsFromMap(
  product: { options: Array<{ name: string }> },
  selectedOptionMap: Record<string, string>,
): SelectedOption[] {
  const selectedOptions: SelectedOption[] = [];
  for (const option of product.options) {
    const value = selectedOptionMap[option.name];
    if (value !== undefined) selectedOptions.push({ name: option.name, value });
  }
  return selectedOptions;
}

function mapVariants<TProduct extends ProductInput>(
  product: TProduct,
): Map<string, ProductVariantFrom<TProduct>> {
  const variants = new Map<string, ProductVariantFrom<TProduct>>();
  for (const variant of getAdjacentAndFirstSelectableVariants(product)) {
    variants.set(selectedOptionsKey(variant.selectedOptions, product.options), variant);
  }
  return variants;
}

function addVariant<TVariant extends ProductVariantInput>(
  variants: Map<string, TVariant>,
  variant: TVariant,
  productOptions: Array<{ name: string }>,
): void {
  variants.set(selectedOptionsKey(variant.selectedOptions, productOptions), variant);
}

function buildProductOptionValue<TProduct extends ProductInput>({
  cache,
  option,
  optionIndexByName,
  optionValueIndex,
  product,
  selectedOptionMap,
  value,
  variants,
}: {
  cache?: DecodedVariantCache;
  option: TProduct["options"][number];
  optionIndexByName: Map<string, number>;
  optionValueIndex: Map<string, Map<string, number>>;
  product: TProduct;
  selectedOptionMap: Record<string, string>;
  value: ProductOptionValueFrom<TProduct>;
  variants: Map<string, ProductVariantFrom<TProduct>>;
}): VariantOptionValueState<ProductVariantFrom<TProduct>, ProductOptionValueFrom<TProduct>> {
  const targetOptionMap = { ...selectedOptionMap, [option.name]: value.name };
  const targetSelectedOptions = selectedOptionsFromMap(product, targetOptionMap);
  const key = selectedOptionsKey(targetSelectedOptions, product.options);
  const variant = variants.get(key) ?? null;
  const firstSelectableVariant = isConcreteProductVariant<TProduct>(value.firstSelectableVariant)
    ? value.firstSelectableVariant
    : null;
  const encoding = buildEncodingArray(targetOptionMap, product, optionValueIndex);
  const optionIndex = optionIndexByName.get(option.name) ?? 0;
  const topDownEncoding = encoding.slice(0, optionIndex + 1);
  const selected = selectedOptionMap[option.name] === value.name;

  return {
    name: value.name,
    swatch: value.swatch,
    selected,
    exists: resolveEncodedStatus(product.encodedVariantExistence, topDownEncoding, true, cache),
    available: resolveEncodedStatus(
      product.encodedVariantAvailability,
      topDownEncoding,
      variant?.availableForSale ?? false,
      cache,
    ),
    variant,
    selectedOptions: variant?.selectedOptions ?? targetSelectedOptions,
    handle: getOptionValueHandle(selected, product.handle, variant, firstSelectableVariant),
  };
}

function getOptionValueHandle<TVariant extends ProductVariantInput>(
  selected: boolean,
  productHandle: string,
  variant: TVariant | null,
  firstSelectableVariant: TVariant | null,
): string {
  if (selected) return productHandle;
  return variant?.product?.handle ?? firstSelectableVariant?.product?.handle ?? productHandle;
}

function buildOptionValueIndex<TProduct extends ProductInput>(
  product: TProduct,
): Map<string, Map<string, number>> {
  return new Map(
    product.options.map((option) => [
      option.name,
      new Map(option.optionValues.map((value, index) => [value.name, index])),
    ]),
  );
}

function buildEncodingArray<TProduct extends ProductInput>(
  selectedOptionMap: Record<string, string>,
  product: TProduct,
  optionValueIndex = buildOptionValueIndex(product),
): number[] {
  const encoding: number[] = [];

  for (const option of product.options) {
    const selectedValue = selectedOptionMap[option.name];
    if (selectedValue === undefined) continue;
    const index = optionValueIndex.get(option.name)?.get(selectedValue);
    if (index !== undefined) encoding.push(index);
  }

  return encoding;
}

function resolveEncodedStatus(
  encodedField: string | null | undefined,
  targetEncoding: number[],
  fallback: boolean,
  cache?: DecodedVariantCache,
): boolean {
  if (!encodedField) return fallback;
  return isOptionValueCombinationInEncodedVariant(targetEncoding, encodedField, cache);
}

function isOptionValueCombinationInEncodedVariant(
  targetOptionValueCombination: number[],
  encodedVariantField: string,
  cache?: DecodedVariantCache,
): boolean {
  if (targetOptionValueCombination.length === 0) return false;

  let decoded = cache?.get(encodedVariantField);
  if (!decoded) {
    decoded = new Set<string>();
    for (const optionValue of decodeEncodedVariant(encodedVariantField)) {
      for (let i = 0; i < optionValue.length; i++) {
        decoded.add(optionValue.slice(0, i + 1).join(OPTION_VALUE_SEPARATOR));
      }
    }
    cache?.set(encodedVariantField, decoded);
  }

  return decoded.has(targetOptionValueCombination.join(OPTION_VALUE_SEPARATOR));
}

export function decodeEncodedVariant(encodedVariantField: string | null | undefined): number[][] {
  if (!encodedVariantField) return [];
  if (!encodedVariantField.startsWith("v1_")) {
    if (typeof console !== "undefined") {
      console.warn(`[hydrogen] Unsupported variant encoding: "${encodedVariantField}"`);
    }
    return [];
  }
  return decodeV1EncodedVariant(encodedVariantField.replace(/^v1_/, ""));
}

function decodeV1EncodedVariant(encodedVariantField: string): number[][] {
  const tokenizer = /[ :,-]/g;
  const state: DecodeV1State = {
    currentOptionValue: [],
    decodedOptions: [],
    depth: 0,
    index: 0,
    rangeStart: null,
  };
  let token: RegExpExecArray | null;

  while ((token = tokenizer.exec(encodedVariantField))) {
    processDecodeV1Token(encodedVariantField, state, token, tokenizer);
  }

  pushFinalDecodeV1Value(encodedVariantField, state);

  return state.decodedOptions;
}

type DecodeV1State = {
  currentOptionValue: number[];
  decodedOptions: number[][];
  depth: number;
  index: number;
  rangeStart: number | null;
};

function isConcreteProductVariant<TProduct extends ProductInput>(
  variant: ProductVariantInput | null | undefined,
): variant is ProductVariantFrom<TProduct> {
  return variant !== null && variant !== undefined;
}

function processDecodeV1Token(
  encodedVariantField: string,
  state: DecodeV1State,
  token: RegExpExecArray,
  tokenizer: RegExp,
): void {
  const operation = token[0];
  const optionValueIndex =
    Number.parseInt(encodedVariantField.slice(state.index, token.index), 10) || 0;

  pushDecodeV1Range(state, optionValueIndex);
  state.currentOptionValue[state.depth] = optionValueIndex;

  if (operation === "-") {
    state.rangeStart = optionValueIndex;
  } else if (operation === ":") {
    state.depth++;
  } else {
    processDecodeV1Separator(encodedVariantField, state, token, operation);
  }

  state.index = tokenizer.lastIndex;
}

function processDecodeV1Separator(
  encodedVariantField: string,
  state: DecodeV1State,
  token: RegExpExecArray,
  operation: string,
): void {
  if (shouldPushDecodeV1Option(encodedVariantField, token, operation)) {
    state.decodedOptions.push([...state.currentOptionValue]);
  }

  if (operation !== ",") return;

  state.currentOptionValue.pop();
  state.depth--;
}

function shouldPushDecodeV1Option(
  encodedVariantField: string,
  token: RegExpExecArray,
  operation: string,
): boolean {
  return operation === " " || (operation === "," && encodedVariantField[token.index - 1] !== ",");
}

function pushFinalDecodeV1Value(encodedVariantField: string, state: DecodeV1State): void {
  const finalIndex = encodedVariantField.match(/\d+$/g)?.[0];
  if (finalIndex === undefined) return;

  const finalValueIndex = Number.parseInt(finalIndex, 10);
  if (state.rangeStart !== null) {
    pushDecodeV1Range(state, finalValueIndex + INCLUSIVE_RANGE_END_OFFSET);
    return;
  }

  state.currentOptionValue[state.depth] = finalValueIndex;
  state.decodedOptions.push([...state.currentOptionValue]);
}

function pushDecodeV1Range(state: DecodeV1State, rangeEndExclusive: number): void {
  const rangeStart = state.rangeStart;
  if (rangeStart === null) return;

  for (let value = rangeStart; value < rangeEndExclusive; value++) {
    state.currentOptionValue[state.depth] = value;
    state.decodedOptions.push([...state.currentOptionValue]);
  }

  state.rangeStart = null;
}
