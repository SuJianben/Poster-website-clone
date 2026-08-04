(() => {
  const selector = '[data-source-footer-custom-overrides]';

  function applyOverrides(script) {
    let config;
    try {
      config = JSON.parse(script.textContent);
    } catch (_) {
      return;
    }

    const section = script.closest('.shopify-section') || document;
    const image = section.querySelector('.massive-footer-logo-image');
    if (!image) return;

    if (config.image) {
      image.src = config.image;
      image.removeAttribute('srcset');
    }
    if (config.alt) image.alt = config.alt;

    if (config.link && !image.parentElement.matches('a')) {
      const link = document.createElement('a');
      link.href = config.link;
      image.before(link);
      link.append(image);
    }
  }

  function initialize(scope = document) {
    scope.querySelectorAll(selector).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', () => initialize());
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
