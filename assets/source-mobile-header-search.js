(() => {
  const mobileQuery = window.matchMedia('(max-width: 1023px)');

  function initHeaderSearch(header) {
    if (header.dataset.sourceMobileSearchReady === 'true') return;

    const panel = header.querySelector('.header__search');
    const input = panel?.querySelector('input[type="search"]');
    const reset = panel?.querySelector('.search__reset');

    if (!panel || !input || !reset) return;

    const syncReset = () => {
      const hasValue = input.value.trim().length > 0;
      reset.hidden = !hasValue;
      panel.classList.toggle('source-mobile-search-filled', hasValue);
    };

    input.addEventListener('input', syncReset);
    panel.querySelector('form')?.addEventListener('reset', () => {
      window.requestAnimationFrame(() => {
        syncReset();
        input.focus();
      });
    });

    new MutationObserver(() => {
      if (mobileQuery.matches && panel.classList.contains('mobile-search-active')) {
        window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
      }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });

    mobileQuery.addEventListener('change', (event) => {
      if (!event.matches) panel.classList.remove('mobile-search-active');
    });

    syncReset();
    header.dataset.sourceMobileSearchReady = 'true';
  }

  const init = (scope = document) => {
    const headers = scope.matches?.('.header') ? [scope] : [...scope.querySelectorAll('.header')];
    headers.forEach(initHeaderSearch);
  };

  init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
