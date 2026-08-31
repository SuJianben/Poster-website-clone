(() => {
  const sectionSelector = '[data-sp-search-section]';

  function initSearchSection(section) {
    if (section.dataset.sourceSearchReady === 'true') return;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get('q') && currentUrl.searchParams.get('type') !== 'product') {
      currentUrl.searchParams.set('type', 'product');
      currentUrl.searchParams.set('options[prefix]', 'last');
      window.location.replace(currentUrl.toString());
      return;
    }

    const form = section.querySelector('[data-sp-search-form]');
    const input = section.querySelector('[data-sp-search-input]');
    const reset = section.querySelector('[data-sp-search-reset]');
    const filterToggle = section.querySelector('[data-sp-search-filter-toggle]');
    const filterClosers = section.querySelectorAll('[data-sp-search-filter-close]');
    const sort = section.querySelector('[data-sp-search-sort]');
    const sortForm = section.querySelector('[data-sp-search-sort-form]');
    const grid = section.querySelector('[data-sp-search-grid]');
    const layoutButtons = section.querySelectorAll('[data-sp-search-layout]');

    const syncReset = () => {
      if (!input || !reset) return;
      const hasValue = input.value.trim().length > 0;
      reset.hidden = !hasValue;
      form?.classList.toggle('is-filled', hasValue);
    };

    if (input) input.addEventListener('input', syncReset);
    if (form) {
      form.addEventListener('reset', () => {
        window.requestAnimationFrame(() => {
          syncReset();
          input?.focus();
        });
      });
    }
    syncReset();

    const setFacetsOpen = (isOpen) => {
      section.classList.toggle('sp-search--facets-open', isOpen);
      filterToggle?.setAttribute('aria-expanded', String(isOpen));
    };

    filterToggle?.addEventListener('click', () => {
      setFacetsOpen(!section.classList.contains('sp-search--facets-open'));
    });
    filterClosers.forEach((button) => button.addEventListener('click', () => setFacetsOpen(false)));

    sort?.addEventListener('change', () => {
      if (typeof sortForm?.requestSubmit === 'function') {
        sortForm.requestSubmit();
      } else {
        sortForm?.submit();
      }
    });

    layoutButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (!grid) return;
        const layout = button.dataset.spSearchLayout;
        if (!layout) return;

        grid.dataset.layout = layout;
        layoutButtons.forEach((control) => {
          const isActive = control === button;
          control.classList.toggle('is-active', isActive);
          control.setAttribute('aria-pressed', String(isActive));
        });
      });
    });

    section.dataset.sourceSearchReady = 'true';
  }

  const init = (scope = document) => {
    const sections = scope.matches?.(sectionSelector) ? [scope] : [...scope.querySelectorAll(sectionSelector)];
    sections.forEach(initSearchSection);
  };

  init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
