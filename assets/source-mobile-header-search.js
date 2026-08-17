(() => {
  const mobileQuery = window.matchMedia('(max-width: 1023px)');

  function initHeaderSearch(header) {
    if (header.dataset.sourceMobileSearchReady === 'true') return;

    const panel = header.querySelector('.header__search');
    const trigger = header.querySelector('.custom-search .search__icon-search');
    const input = panel?.querySelector('input[type="search"]');
    const reset = panel?.querySelector('.search__reset');
    const close = panel?.querySelector('.header__search-close');

    if (!panel || !input) return;

    const syncReset = () => {
      if (!reset) return;
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
      if (isOpen && mobileQuery.matches) {
        window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
      }
    };

    trigger?.setAttribute('aria-expanded', String(panel.classList.contains('mobile-search-active')));
    trigger?.addEventListener('click', (event) => {
      if (!mobileQuery.matches) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(!panel.classList.contains('mobile-search-active'));
    });

    close?.addEventListener('click', (event) => {
      if (!mobileQuery.matches) return;
      event.preventDefault();
      setOpen(false);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !mobileQuery.matches) return;
      setOpen(false);
      trigger?.focus({ preventScroll: true });
    });

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
