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
    const searchIcon = panel?.querySelector('.search__icon-search svg');
    const cache = new Map();
    let requestTimer;
    let requestController;
    let localSearchData = { products: [], collections: [] };

    if (!panel || !input) return;

    try {
      localSearchData = JSON.parse(document.getElementById('SourceMobileSearchData')?.textContent || '{}');
    } catch (error) {
      localSearchData = { products: [], collections: [] };
    }

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

    const createJsonResult = (item, type) => {
      const link = document.createElement('a');
      link.className = 'source-predictive-result';
      link.setAttribute('role', 'option');

      if (type === 'query') {
        const queryText = item.text || item.styled_text || '';
        link.href = `${window.Shopify?.routes?.root || '/'}search?q=${encodeURIComponent(queryText)}`;
        if (searchIcon) {
          const icon = searchIcon.cloneNode(true);
          icon.classList.add('source-predictive-result__icon');
          link.append(icon);
        }
        link.append(document.createTextNode(queryText));
        return link;
      }

      link.href = item.url || '#';
      link.append(document.createTextNode(item.title || ''));
      return link;
    };

    const appendJsonGroup = (title, items, type) => {
      if (!resultsContainer || !items?.length) return;
      const group = document.createElement('section');
      group.className = 'source-predictive-group';
      const heading = document.createElement('h3');
      heading.className = 'source-predictive-group__title';
      heading.textContent = title;
      group.append(heading);
      const list = document.createElement('div');
      list.className = 'source-predictive-group__list';
      items.forEach((item) => list.append(createJsonResult(item, type)));
      group.append(list);
      resultsContainer.append(group);
    };

    const renderJsonResults = (data) => {
      if (!resultsContainer) return;
      const results = data?.resources?.results || {};
      const hasResults = [
        results.queries,
        results.collections,
        results.articles,
        results.pages,
        results.products,
      ].some((items) => items?.length);
      if (!hasResults) {
        if (!resultsContainer.childElementCount) renderResults('');
        return;
      }
      resultsContainer.replaceChildren();
      appendJsonGroup('Vorschläge', results.queries, 'query');
      appendJsonGroup('Sammlungen', results.collections, 'collection');
      appendJsonGroup('Artikel und Seiten', [...(results.articles || []), ...(results.pages || [])], 'page');
      appendJsonGroup('Produkte', results.products, 'product');
      if (!resultsContainer.childElementCount) renderResults('');
      else showResults();
    };

    const renderLocalResults = (query) => {
      if (!resultsContainer) return false;
      const normalizedQuery = query.toLocaleLowerCase();
      const matches = (item) => item.title?.toLocaleLowerCase().includes(normalizedQuery);
      const products = (localSearchData.products || []).filter(matches).slice(0, 10);
      const collections = (localSearchData.collections || []).filter(matches).slice(0, 10);
      const seen = new Set();
      const queries = [...products, ...collections]
        .filter((item) => {
          const key = item.title.toLocaleLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 8)
        .map((item) => ({ text: item.title }));

      resultsContainer.replaceChildren();
      appendJsonGroup('Vorschläge', queries, 'query');
      appendJsonGroup('Sammlungen', collections, 'collection');
      appendJsonGroup('Produkte', products, 'product');
      if (!resultsContainer.childElementCount) return false;
      showResults();
      return true;
    };

    const addPreviewParams = (url) => {
      const currentParams = new URLSearchParams(window.location.search);
      ['preview_theme_id', 'preview_token', '_fd', 'pb'].forEach((name) => {
        const value = currentParams.get(name);
        if (value) url.searchParams.set(name, value);
      });
      return url;
    };

    const loadResults = async (query) => {
      if (cache.has(query)) {
        const cachedResult = cache.get(query);
        if (typeof cachedResult === 'string') renderResults(cachedResult);
        else renderJsonResults(cachedResult);
        return;
      }

      requestController?.abort();
      requestController = new AbortController();
      const root = window.Shopify?.routes?.root || '/';
      const url = addPreviewParams(new URL(`${root}search/suggest`, window.location.origin));
      url.searchParams.set('q', query);
      url.searchParams.set('section_id', 'predictive-search');
      url.searchParams.set('resources[type]', 'query,product,collection,page,article');
      url.searchParams.set('resources[limit]', '10');
      url.searchParams.set('resources[options][unavailable_products]', 'last');

      try {
        const response = await fetch(url, {
          headers: { Accept: 'text/html' },
          credentials: 'same-origin',
          signal: requestController.signal,
        });
        if (!response.ok) throw new Error(`Predictive search failed: ${response.status}`);
        const markup = await response.text();
        const parsedMarkup = new DOMParser().parseFromString(markup, 'text/html');
        const renderedMarkup = parsedMarkup.querySelector('[data-source-predictive-results]');
        if (!renderedMarkup?.childElementCount) {
          throw new Error('Predictive search section was not rendered');
        }
        cache.set(query, markup);
        if (input.value.trim() === query) renderResults(markup);
      } catch (error) {
        if (error.name === 'AbortError') return;
        const fallbackUrl = addPreviewParams(new URL(`${root}search/suggest.json`, window.location.origin));
        fallbackUrl.searchParams.set('q', query);
        fallbackUrl.searchParams.set('resources[type]', 'query,product,collection,page,article');
        fallbackUrl.searchParams.set('resources[limit]', '10');
        try {
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
            signal: requestController.signal,
          });
          if (!fallbackResponse.ok) throw new Error(`Predictive search fallback failed: ${fallbackResponse.status}`);
          const data = await fallbackResponse.json();
          cache.set(query, data);
          if (input.value.trim() === query) renderJsonResults(data);
        } catch (fallbackError) {
          if (fallbackError.name !== 'AbortError' && !resultsContainer?.childElementCount) renderResults('');
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
      renderLocalResults(query);
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
