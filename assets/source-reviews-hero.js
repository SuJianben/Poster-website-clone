(() => {
  const SELECTOR = '[data-srp-hero-copy]';

  const reveal = (element) => {
    if (element.dataset.srpHeroReady === 'true') return;
    element.dataset.srpHeroReady = 'true';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => element.classList.add('is-animated'));
    });
  };

  const observe = (element) => {
    if (!('IntersectionObserver' in window)) {
      reveal(element);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        reveal(element);
      },
      { threshold: 0.25 }
    );

    observer.observe(element);
  };

  const init = (scope = document) => {
    scope.querySelectorAll(SELECTOR).forEach(observe);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
