(() => {
  const SELECTOR = '[data-source-topbar-config]';

  function mountLocalization(container) {
    if (container.dataset.sourceLocalizationMounted === 'true') return;

    const template = container.querySelector('template[data-source-topbar-localization]');
    const current = container.querySelector('.topbar__right .topbar__country');
    const replacement = template?.content.firstElementChild?.cloneNode(true);
    if (!template || !current || !replacement) return;

    current.replaceWith(replacement);
    container.dataset.sourceLocalizationMounted = 'true';
  }

  const init = (scope = document) => scope.querySelectorAll(SELECTOR).forEach(mountLocalization);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
