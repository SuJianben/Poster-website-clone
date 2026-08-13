(() => {
  const SELECTOR = 'product-info[id^="MainProduct"]';

  const track = (event, detail = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...detail });
  };

  const cmToInches = (value) => value.replace(/(\d+(?:[.,]\d+)?)/g, (number) => {
    const converted = Number(number.replace(',', '.')) / 2.54;
    return Number.isInteger(converted) ? converted : converted.toFixed(1);
  });

  const initialize = (root) => {
    if (!root || root.dataset.sourceControlsReady === 'true') return;
    root.dataset.sourceControlsReady = 'true';
    root.addEventListener('click', (event) => {
      const sizeGuideButton = event.target.closest('[data-source-product-size-guide]');
      if (sizeGuideButton) {
        root.querySelector('[data-source-product-size-modal]')?.showModal();
        track('product_size_guide_open', { product_id: root.dataset.productId });
      }
      if (event.target.closest('[data-source-product-size-close]')) event.target.closest('dialog')?.close();

      const unitButton = event.target.closest('[data-unit]');
      if (!unitButton) return;
      const group = unitButton.closest('.unit-toggle');
      group?.querySelectorAll('[data-unit]').forEach((button) => button.classList.toggle('active', button === unitButton));
      root.querySelectorAll('[data-source-unit-label]').forEach((label) => {
        const input = document.getElementById(label.closest('label')?.getAttribute('for'));
        const cmValue = input?.dataset.cmValue || input?.value || '';
        label.textContent = unitButton.dataset.unit === 'in' ? cmToInches(cmValue) : cmValue;
      });
      track('product_size_unit_change', { product_id: root.dataset.productId, unit: unitButton.dataset.unit });
    });
  };

  const initializeAll = (scope = document) => scope.querySelectorAll(SELECTOR).forEach(initialize);
  document.addEventListener('DOMContentLoaded', () => initializeAll());
  document.addEventListener('shopify:section:load', (event) => initializeAll(event.target));
})();
