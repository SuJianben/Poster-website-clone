document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-variant-select]');
  if (!select) return;
  const form = select.closest('form.product-form');
  const variant = JSON.parse(select.selectedOptions[0].dataset.variant);
  form.querySelector('[name="id"]').value = variant.id;
  const price = form.closest('[data-product-section]').querySelector('[data-product-price]');
  if (price) price.textContent = new Intl.NumberFormat(document.documentElement.lang || 'en', { style: 'currency', currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'USD' }).format(variant.price / 100);
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = !variant.available;
  submit.textContent = variant.available ? 'Add to cart' : 'Sold out';
  const url = new URL(window.location.href); url.searchParams.set('variant', variant.id); history.replaceState({}, '', url);
  window.PosterTheme.track('product_variant_select', { variant_id: variant.id, source_module: 'product_page' });
});
