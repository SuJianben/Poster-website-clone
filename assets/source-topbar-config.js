(() => {
  const SELECTOR = '[data-source-topbar-config]';

  function setText(container, selector, value) {
    const target = container.querySelector(selector);
    if (target) target.textContent = value;
  }

  function applyTopbarConfig(container) {
    if (container.dataset.sourceTopbarConfigured === 'true') return;

    container.dataset.sourceTopbarConfigured = 'true';
    setText(container, '.topbar__left .topbar__text p.highlight-text', container.dataset.leftBadge);
    setText(container, '.topbar__left .topbar__text p:not(.highlight-text)', container.dataset.leftText);
    setText(container, '.topbar__center .topbar__text p.highlight-text', container.dataset.centerBadge);
    setText(container, '.topbar__center .topbar__text p:not(.highlight-text)', container.dataset.centerText);
  }

  const init = (scope = document) => scope.querySelectorAll(SELECTOR).forEach(applyTopbarConfig);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
