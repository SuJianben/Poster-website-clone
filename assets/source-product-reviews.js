(() => {
  const SELECTOR = '[data-sprv-root]';
  const instances = new WeakMap();

  const getRoots = (scope) => {
    const roots = Array.from(scope.querySelectorAll(SELECTOR));
    if (scope.matches?.(SELECTOR)) roots.unshift(scope);
    return roots;
  };

  const initialize = (scope = document) => {
    getRoots(scope).forEach((root) => {
      if (root.dataset.sprvReady === 'true') return;
      root.dataset.sprvReady = 'true';

      const abortController = new AbortController();
      const { signal } = abortController;
      const filter = root.querySelector('[data-sprv-filter]');
      const filterButton = root.querySelector('[data-sprv-filter-button]');
      const filterMenu = root.querySelector('[data-sprv-filter-menu]');
      const cards = root.querySelector('[data-sprv-cards]');
      const carouselProgress = root.querySelector('[data-sprv-carousel-progress]');
      const pagination = root.querySelector('[data-sprv-pagination]');
      const pageButtons = [...root.querySelectorAll('[data-sprv-page]')];
      const pageSize = Math.max(1, Number(root.dataset.sprvPageSize) || 12);
      let currentPage = 1;
      let activeFilter = root.dataset.sprvDefaultFilter || filterButton?.dataset.sprvFilter || 'recent';
      let filteredCards = [];

      const emit = (name, detail = {}) => {
        window.dispatchEvent(new CustomEvent(name, { detail: { sectionId: root.dataset.sectionId, ...detail } }));
      };

      const getReviewCards = () => cards
        ? [...cards.querySelectorAll('[data-sprv-review-card]')]
        : [];

      const getHelpfulCount = (card) => Number(
        card.querySelector('[data-sprv-helpful="up"] span')?.textContent
          || card.dataset.sprvHelpful
          || 0
      );

      const getTotalPages = () => Math.max(1, Math.ceil(filteredCards.length / pageSize));

      const setFilterButtonLabel = (label) => {
        if (!filterButton || !label) return;
        const labelNode = [...filterButton.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
        if (labelNode) labelNode.textContent = `${label} `;
        else filterButton.insertBefore(document.createTextNode(`${label} `), filterButton.firstChild);
        filterButton.setAttribute('aria-label', `Filter reviews: ${label}`);
      };

      const updateCarouselProgress = () => {
        if (!cards || !carouselProgress) return;
        const maxScroll = cards.scrollWidth - cards.clientWidth;
        const visibleRatio = cards.scrollWidth > 0
          ? Math.min(100, (cards.clientWidth / cards.scrollWidth) * 100)
          : 100;
        const progress = maxScroll > 0
          ? visibleRatio + (cards.scrollLeft / maxScroll) * (100 - visibleRatio)
          : 100;
        carouselProgress.style.width = `${progress}%`;
      };

      const updatePagination = () => {
        const totalPages = getTotalPages();
        const showPagination = totalPages > 1;
        const compactPagination = window.matchMedia('(max-width: 749px)').matches;
        const firstVisiblePage = Math.max(1, currentPage - 1);
        const lastVisiblePage = Math.min(totalPages, currentPage + 1);

        if (pagination) pagination.hidden = !showPagination;

        pageButtons.forEach((button) => {
          const page = Number(button.dataset.sprvPage);
          if (Number.isNaN(page)) {
            button.hidden = !showPagination;
            button.disabled = button.dataset.sprvPage === 'previous'
              ? currentPage === 1
              : currentPage === totalPages;
            return;
          }

          const active = page === currentPage;
          button.classList.toggle('is-active', active);
          if (active) button.setAttribute('aria-current', 'page');
          else button.removeAttribute('aria-current');
          button.hidden = !showPagination || page > totalPages || (compactPagination && (page < firstVisiblePage || page > lastVisiblePage));
        });
      };

      const renderCurrentPage = (shouldAnimate = true) => {
        if (!cards) return;

        const totalPages = getTotalPages();
        currentPage = Math.min(Math.max(1, currentPage), totalPages);
        const firstIndex = (currentPage - 1) * pageSize;
        const lastIndex = firstIndex + pageSize;
        const visibleCards = new Set(filteredCards.slice(firstIndex, lastIndex));

        getReviewCards().forEach((card) => {
          card.hidden = !visibleCards.has(card);
        });

        cards.scrollTo({
          left: 0,
          behavior: shouldAnimate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'
        });
        updatePagination();
        window.requestAnimationFrame(updateCarouselProgress);
      };

      const applyFilter = (value, label, shouldAnimate = true) => {
        if (!cards) return;

        activeFilter = value;
        const reviewCards = getReviewCards();
        const comparators = {
          recent: (first, second) => {
            const firstDate = Date.parse(first.dataset.sprvDate || '') || 0;
            const secondDate = Date.parse(second.dataset.sprvDate || '') || 0;
            return secondDate - firstDate;
          },
          'highest-rating': (first, second) => Number(second.dataset.sprvRating) - Number(first.dataset.sprvRating),
          'lowest-rating': (first, second) => Number(first.dataset.sprvRating) - Number(second.dataset.sprvRating),
          'most-votes': (first, second) => getHelpfulCount(second) - getHelpfulCount(first)
        };

        filteredCards = reviewCards.filter((card) => value !== 'photos' || card.dataset.sprvHasPhoto === 'true');
        const compare = comparators[value] || comparators.recent;
        filteredCards.sort(compare).forEach((card) => cards.appendChild(card));
        currentPage = 1;
        cards.classList.toggle('is-loading', shouldAnimate);
        renderCurrentPage(shouldAnimate);

        if (label) setFilterButtonLabel(label);
        filterButton?.setAttribute('data-sprv-filter', value);
        filterMenu?.querySelectorAll('button[data-value]').forEach((option) => {
          const isActive = option.dataset.value === value;
          if (isActive) option.setAttribute('aria-current', 'true');
          else option.removeAttribute('aria-current');
        });
        root.querySelector('[data-sprv-filter-status]')?.replaceChildren(
          document.createTextNode(`${filteredCards.length} reviews shown. ${label || ''}`.trim())
        );
        window.requestAnimationFrame(() => cards.classList.remove('is-loading'));
      };

      const updateReviewExpanders = () => {
        root.querySelectorAll('[data-sprv-review-expand]').forEach((button) => {
          const card = button.closest('[data-sprv-review-card]');
          const body = card?.querySelector('[data-sprv-review-body]');
          if (!body || body.classList.contains('is-expanded')) return;
          button.hidden = body.scrollHeight <= body.clientHeight + 1;
        });
      };

      cards?.addEventListener('scroll', () => window.requestAnimationFrame(updateCarouselProgress), { passive: true, signal });
      window.addEventListener('resize', updateCarouselProgress, { passive: true, signal });
      window.addEventListener('resize', updateReviewExpanders, { passive: true, signal });
      window.addEventListener('resize', updatePagination, { passive: true, signal });

      root.querySelectorAll('[data-sprv-review-expand]').forEach((button) => button.addEventListener('click', () => {
        const card = button.closest('[data-sprv-review-card]');
        const body = card?.querySelector('[data-sprv-review-body]');
        if (!body) return;
        const isExpanded = body.classList.toggle('is-expanded');
        button.setAttribute('aria-expanded', String(isExpanded));
        button.textContent = isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen';
      }, { signal }));

      filterButton?.addEventListener('click', () => {
        const isOpen = filterButton.getAttribute('aria-expanded') === 'true';
        filterButton.setAttribute('aria-expanded', String(!isOpen));
        if (filterMenu) filterMenu.hidden = isOpen;
      }, { signal });

      filterMenu?.addEventListener('click', (event) => {
        const option = event.target.closest('button[data-value]');
        if (!option) return;
        applyFilter(option.dataset.value, option.textContent.trim());
        filterButton?.setAttribute('aria-expanded', 'false');
        if (filterMenu) filterMenu.hidden = true;
        emit('source_product_review_filter', { filter: option.dataset.value });
      }, { signal });

      document.addEventListener('click', (event) => {
        if (filter && !filter.contains(event.target)) {
          filterButton?.setAttribute('aria-expanded', 'false');
          if (filterMenu) filterMenu.hidden = true;
        }
      }, { signal });

      pageButtons.forEach((button) => button.addEventListener('click', () => {
        const value = button.dataset.sprvPage;
        const totalPages = getTotalPages();
        if (value === 'previous') currentPage = Math.max(1, currentPage - 1);
        else if (value === 'next') currentPage = Math.min(totalPages, currentPage + 1);
        else currentPage = Number(value);
        renderCurrentPage();
        emit('source_product_review_page', { page: currentPage });
      }, { signal }));

      root.querySelectorAll('[data-sprv-helpful]').forEach((button) => button.addEventListener('click', () => {
        if (button.dataset.voted === 'true') return;
        button.dataset.voted = 'true';
        const count = button.querySelector('span');
        if (count) count.textContent = String(Number(count.textContent) + 1);
        if (activeFilter === 'most-votes') applyFilter(activeFilter, filterButton?.textContent.trim(), false);
        emit('source_product_review_helpful', { vote: button.dataset.sprvHelpful });
      }, { signal }));

      instances.set(root, {
        destroy() {
          abortController.abort();
          delete root.dataset.sprvReady;
        }
      });

      updateReviewExpanders();
      applyFilter(activeFilter, filterButton?.textContent.trim(), false);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialize());
  } else {
    initialize();
  }

  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  document.addEventListener('shopify:section:unload', (event) => {
    getRoots(event.target).forEach((root) => {
      instances.get(root)?.destroy();
      instances.delete(root);
    });
  });
})();
