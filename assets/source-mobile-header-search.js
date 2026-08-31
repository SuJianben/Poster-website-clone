(() => {
  // Mobile search uses Shopify's server-rendered predictive results.
  const mobileQuery = window.matchMedia('(max-width: 1023px)');

  function initHeaderSearch(header) {
    if (header.dataset.sourceMobileSearchReady === 'true') return;

    const panel = header.querySelector('.header__search');
    const nativePredictiveSearch = panel?.querySelector('predictive-search');

    if (mobileQuery.matches && nativePredictiveSearch) {
      const searchShell = document.createElement('div');
      [...nativePredictiveSearch.attributes].forEach(({ name, value }) => {
        searchShell.setAttribute(name, value);
      });
      searchShell.classList.add('source-predictive-search-shell');
      [...nativePredictiveSearch.childNodes].forEach((child) => {
        searchShell.append(child.cloneNode(true));
      });
      nativePredictiveSearch.replaceWith(searchShell);
    }

    const trigger = header.querySelector('.custom-search .search__icon-search');
    const input = panel?.querySelector('input[type="search"]');
    const reset = panel?.querySelector('.search__reset');
    const close = panel?.querySelector('.header__search-close');
    const resultsPanel = panel?.querySelector('.search__content');
    const resultsContainer = resultsPanel?.querySelector('[role="listbox"]');
    const cache = new Map();
    let requestTimer;
    let requestController;

    if (!panel || !input) return;

    if (resultsContainer?.id) {
      input.setAttribute('aria-controls', resultsContainer.id);
      input.setAttribute('aria-owns', resultsContainer.id);
    }

    const setResultsHeight = () => {
      if (!resultsPanel || !mobileQuery.matches) return;
      const top = resultsPanel.getBoundingClientRect().top;
      resultsPanel.style.maxHeight = `${Math.max(180, window.innerHeight - top)}px`;
    };

    const hideResults = () => {
      if (!resultsPanel) return;
      resultsPanel.classList.remove('source-mobile-predictive-active');
      resultsPanel.classList.add('hidden');
      resultsPanel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    };

    const showResults = () => {
      if (!resultsPanel) return;
      resultsPanel.classList.remove('hidden');
      resultsPanel.hidden = false;
      resultsPanel.classList.add('source-mobile-predictive-active');
      input.setAttribute('aria-expanded', 'true');
      setResultsHeight();
    };

    const renderResults = (markup) => {
      if (!resultsContainer) return;
      const documentFragment = new DOMParser().parseFromString(markup, 'text/html');
      const renderedResults = documentFragment.querySelector('[data-source-predictive-results]');
      resultsContainer.replaceChildren(
        ...[...(renderedResults?.childNodes || [])].map((child) => child.cloneNode(true))
      );

      if (!resultsContainer.childElementCount) {
        const empty = document.createElement('p');
        empty.className = 'source-predictive-empty';
        empty.textContent = 'Keine Ergebnisse gefunden.';
        resultsContainer.append(empty);
      }
      showResults();
    };

    const loadResults = async (query) => {
      if (cache.has(query)) {
        renderResults(cache.get(query));
        return;
      }

      requestController?.abort();
      requestController = new AbortController();
      const root = window.Shopify?.routes?.root || '/';
      const url = new URL(`${root}search/suggest`, window.location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('section_id', 'predictive-search');
      url.searchParams.set('resources[type]', 'query,product,collection,page,article');
      url.searchParams.set('resources[limit]', '10');
      url.searchParams.set('resources[options][unavailable_products]', 'last');

      try {
        const response = await fetch(url, {
          headers: { Accept: 'text/html' },
          signal: requestController.signal,
        });
        if (!response.ok) throw new Error(`Predictive search failed: ${response.status}`);
        const markup = await response.text();
        cache.set(query, markup);
        if (input.value.trim() === query) renderResults(markup);
      } catch (error) {
        if (error.name !== 'AbortError') {
          renderResults('');
        }
      }
    };

    const syncReset = () => {
      if (!reset) return;
      const hasValue = input.value.trim().length > 0;
      reset.hidden = !hasValue;
      panel.classList.toggle('source-mobile-search-filled', hasValue);
    };

    input.addEventListener('input', () => {
      syncReset();
      window.clearTimeout(requestTimer);
      const query = input.value.trim();
      if (!query || !mobileQuery.matches) {
        requestController?.abort();
        hideResults();
        return;
      }
      requestTimer = window.setTimeout(() => loadResults(query), 180);
    });

    panel.querySelector('form')?.addEventListener('reset', () => {
      window.requestAnimationFrame(() => {
        syncReset();
        hideResults();
        input.focus();
      });
    });

    const setOpen = (isOpen) => {
      panel.classList.toggle('mobile-search-active', isOpen);
      trigger?.setAttribute('aria-expanded', String(isOpen));
      if (!isOpen) hideResults();
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
    window.addEventListener('resize', setResultsHeight, { passive: true });

    syncReset();
    hideResults();
    header.dataset.sourceMobileSearchReady = 'true';
  }

  const init = (scope = document) => {
    const headers = scope.matches?.('.header') ? [scope] : [...scope.querySelectorAll('.header')];
    headers.forEach(initHeaderSearch);
  };

  init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
