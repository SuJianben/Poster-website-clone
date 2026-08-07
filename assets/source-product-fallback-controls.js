(() => {
  const SELECTOR = 'product-info[id^="MainProduct"]';

  function track(eventName, detail = {}) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...detail });
  }

  function initialize(root) {
    if (!root || root.dataset.fallbackControlsReady === 'true') return;
    root.dataset.fallbackControlsReady = 'true';

    root.addEventListener('change', (event) => {
      const propertyInput = event.target.closest('[data-source-property-input]');
      if (!propertyInput) return;
      const optionName = propertyInput.name.replace(/^properties\[/, '').replace(/\]$/, '');
      const label = root.querySelector(`[data-source-property-label="${CSS.escape(optionName)}"]`)
        || propertyInput.closest('fieldset')?.querySelector('[data-source-property-label]');
      if (label) label.textContent = propertyInput.value;
      track('product_fallback_option_change', {
        product_id: root.dataset.productId,
        option_name: propertyInput.name,
        option_value: propertyInput.value
      });
    });

    root.addEventListener('click', (event) => {
      const sizeGuideButton = event.target.closest('[data-source-product-size-guide]');
      if (sizeGuideButton) {
        root.parentElement?.querySelector('[data-source-product-size-modal]')?.showModal();
        track('product_size_guide_open', { product_id: root.dataset.productId });
      }

      if (event.target.closest('[data-source-product-size-close]')) {
        event.target.closest('dialog')?.close();
      }

      const unitButton = event.target.closest('[data-unit]');
      if (!unitButton) return;
      const group = unitButton.closest('.unit-toggle');
      group?.querySelectorAll('[data-unit]').forEach((button) => button.classList.toggle('active', button === unitButton));
      root.querySelectorAll('[data-source-unit-label]').forEach((label) => {
        const input = document.getElementById(label.closest('label')?.getAttribute('for'));
        const cmValue = input?.dataset.cmValue || input?.value || '';
        label.textContent = unitButton.dataset.unit === 'in' ? cmToInches(cmValue) : cmValue;
      });
    });
  }

  function cmToInches(value) {
    return value.replace(/(\d+(?:[.,]\d+)?)/g, (number) => {
      const converted = Number(number.replace(',', '.')) / 2.54;
      return Number.isInteger(converted) ? converted : converted.toFixed(1);
    });
  }

  function initializeAll(scope = document) {
    scope.querySelectorAll(SELECTOR).forEach(initialize);
  }

  document.addEventListener('DOMContentLoaded', () => initializeAll());
  document.addEventListener('shopify:section:load', (event) => initializeAll(event.target));
})();
