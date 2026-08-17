(() => {
  const emit = (root, name, detail = {}) => {
    window.dispatchEvent(new CustomEvent(name, { detail: { sectionId: root.dataset.sectionId, ...detail } }));
  };

  document.querySelectorAll('[data-sprv-root]').forEach((root) => {
    if (root.dataset.sprvReady === 'true') return;
    root.dataset.sprvReady = 'true';

    const filter = root.querySelector('[data-sprv-filter]');
    const filterButton = root.querySelector('[data-sprv-filter-button]');
    const filterMenu = root.querySelector('[data-sprv-filter-menu]');
    const cards = root.querySelector('[data-sprv-cards]');
    const carouselProgress = root.querySelector('[data-sprv-carousel-progress]');
    const pageButtons = [...root.querySelectorAll('[data-sprv-page]')];
    const totalPages = 10;
    let currentPage = 1;
    let activeFilter = filterButton?.dataset.sprvFilter || 'photos';

    const getReviewCards = () => cards
      ? [...cards.querySelectorAll('[data-sprv-review-card]')]
      : [];

    const getHelpfulCount = (card) => Number(
      card.querySelector('[data-sprv-helpful="up"] span')?.textContent
        || card.dataset.sprvHelpful
        || 0
    );

    const setFilterButtonLabel = (label) => {
      if (!filterButton) return;
      const labelNode = [...filterButton.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (labelNode) labelNode.textContent = `${label} `;
      else filterButton.insertBefore(document.createTextNode(`${label} `), filterButton.firstChild);
      filterButton.setAttribute('aria-label', `Filter reviews: ${label}`);
    };

    const updateCarouselProgress = () => {
      if (!cards || !carouselProgress) return;
      const maxScroll = cards.scrollWidth - cards.clientWidth;
      const visibleRatio = Math.min(100, (cards.clientWidth / cards.scrollWidth) * 100);
      const progress = maxScroll > 0
        ? visibleRatio + (cards.scrollLeft / maxScroll) * (100 - visibleRatio)
        : 100;
      carouselProgress.style.width = `${progress}%`;
    };

    cards?.addEventListener('scroll', () => window.requestAnimationFrame(updateCarouselProgress), { passive: true });
    window.addEventListener('resize', updateCarouselProgress);
    updateCarouselProgress();

    const applyFilter = (value, label, shouldAnimate = true) => {
      if (!cards) return;

      activeFilter = value;
      const reviewCards = getReviewCards();
      const visibleCards = reviewCards.filter((card) => value !== 'photos' || card.dataset.sprvHasPhoto === 'true');
      const comparators = {
        recent: (a, b) => Date.parse(b.dataset.sprvDate) - Date.parse(a.dataset.sprvDate),
        'highest-rating': (a, b) => Number(b.dataset.sprvRating) - Number(a.dataset.sprvRating),
        'lowest-rating': (a, b) => Number(a.dataset.sprvRating) - Number(b.dataset.sprvRating),
        'most-votes': (a, b) => getHelpfulCount(b) - getHelpfulCount(a)
      };
      const compare = comparators[value] || comparators.recent;

      cards.classList.toggle('is-loading', shouldAnimate);
      reviewCards.forEach((card) => {
        card.hidden = !visibleCards.includes(card);
      });
      visibleCards.sort(compare).forEach((card) => cards.appendChild(card));
      cards.scrollTo({
        left: 0,
        behavior: shouldAnimate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'
      });
      window.requestAnimationFrame(() => {
        updateCarouselProgress();
        cards.classList.remove('is-loading');
      });

      if (label) setFilterButtonLabel(label);
      filterButton?.setAttribute('data-sprv-filter', value);
      filterMenu?.querySelectorAll('button[data-value]').forEach((option) => {
        const isActive = option.dataset.value === value;
        if (isActive) option.setAttribute('aria-current', 'true');
        else option.removeAttribute('aria-current');
      });
      root.querySelector('[data-sprv-filter-status]')?.replaceChildren(
        document.createTextNode(`${visibleCards.length} reviews shown. ${label || ''}`.trim())
      );
    };

    const updateReviewExpanders = () => {
      root.querySelectorAll('[data-sprv-review-expand]').forEach((button) => {
        const card = button.closest('[data-sprv-review-card]');
        const body = card?.querySelector('[data-sprv-review-body]');
        if (!body || body.classList.contains('is-expanded')) return;
        button.hidden = body.scrollHeight <= body.clientHeight + 1;
      });
    };

    root.querySelectorAll('[data-sprv-review-expand]').forEach((button) => button.addEventListener('click', () => {
      const card = button.closest('[data-sprv-review-card]');
      const body = card?.querySelector('[data-sprv-review-body]');
      if (!body) return;
      const isExpanded = body.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(isExpanded));
      button.textContent = isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen';
    }));

    window.addEventListener('resize', updateReviewExpanders);
    window.requestAnimationFrame(updateReviewExpanders);

    const updatePagination = () => {
      const compactPagination = window.matchMedia('(max-width: 749px)').matches;
      let firstVisiblePage = Math.max(1, currentPage - 1);
      let lastVisiblePage = Math.min(totalPages, currentPage + 1);
      if (currentPage <= 2) {
        firstVisiblePage = 1;
        lastVisiblePage = Math.min(totalPages, 3);
      } else if (currentPage >= totalPages - 1) {
        firstVisiblePage = Math.max(1, totalPages - 2);
        lastVisiblePage = totalPages;
      }

      pageButtons.forEach((item) => {
        const page = Number(item.dataset.sprvPage);
        if (Number.isNaN(page)) {
          item.hidden = false;
          item.disabled = compactPagination && (item.dataset.sprvPage === 'previous'
            ? currentPage === 1
            : currentPage === totalPages);
          return;
        }

        const active = page === currentPage;
        item.classList.toggle('is-active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
        item.hidden = compactPagination && (page < firstVisiblePage || page > lastVisiblePage);
      });
    };

    window.addEventListener('resize', updatePagination);

    filterButton?.addEventListener('click', () => {
      const isOpen = filterButton.getAttribute('aria-expanded') === 'true';
      filterButton.setAttribute('aria-expanded', String(!isOpen));
      filterMenu.hidden = isOpen;
    });

    filterMenu?.addEventListener('click', (event) => {
      const option = event.target.closest('button[data-value]');
      if (!option) return;
      applyFilter(option.dataset.value, option.textContent.trim());
      filterButton.setAttribute('aria-expanded', 'false');
      filterMenu.hidden = true;
      emit(root, 'source_product_review_filter', { filter: option.dataset.value });
    });

    document.addEventListener('click', (event) => {
      if (filter && !filter.contains(event.target)) {
        filterButton?.setAttribute('aria-expanded', 'false');
        if (filterMenu) filterMenu.hidden = true;
      }
    });

    pageButtons.forEach((button) => button.addEventListener('click', () => {
      const value = button.dataset.sprvPage;
      if (value === 'previous') currentPage = Math.max(1, currentPage - 1);
      else if (value === 'next') currentPage = Math.min(totalPages, currentPage + 1);
      else currentPage = Number(value);
      updatePagination();
      cards?.classList.add('is-loading');
      window.setTimeout(() => cards?.classList.remove('is-loading'), 180);
      emit(root, 'source_product_review_page', { page: currentPage });
    }));

    root.querySelectorAll('[data-sprv-helpful]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.voted === 'true') return;
      button.dataset.voted = 'true';
      const count = button.querySelector('span');
      count.textContent = String(Number(count.textContent) + 1);
      if (activeFilter === 'most-votes') applyFilter(activeFilter, filterButton?.textContent.trim(), false);
      emit(root, 'source_product_review_helpful', { vote: button.dataset.sprvHelpful });
    }));

    updatePagination();
    applyFilter(activeFilter, filterButton?.textContent.trim(), false);
    root.querySelector('[data-sprv-write]')?.addEventListener('click', () => emit(root, 'source_product_review_write_click'));
  });
})();

