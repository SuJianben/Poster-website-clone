(() => {
  const mobileQuery = window.matchMedia('(max-width: 1023px)');

  function initHeaderSearch(header) {
    if (header.dataset.sourceMobileSearchReady === 'true') return;

    const panel = header.querySelector('.header__search');
    const trigger = header.querySelector('.custom-search .search__icon-search');
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

    const setOpen = (isOpen) => {
      panel.classList.toggle('mobile-search-active', isOpen);
      trigger?.setAttribute('aria-expanded', String(isOpen));
    };

    trigger?.setAttribute('aria-expanded', String(panel.classList.contains('mobile-search-active')));
    trigger?.addEventListener('click', (event) => {
      if (!mobileQuery.matches) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(!panel.classList.contains('mobile-search-active'));
    });

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !mobileQuery.matches) return;
      setOpen(false);
      trigger?.focus({ preventScroll: true });
    });

    new MutationObserver(() => {
      if (mobileQuery.matches && panel.classList.contains('mobile-search-active')) {
        window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
      }
    }).observe(panel, { attributes: true, attributeFilter: ['class'] });

    mobileQuery.addEventListener('change', (event) => {
      if (!event.matches) setOpen(false);
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
