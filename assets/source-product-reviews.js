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
    let currentPage = 1;

    filterButton?.addEventListener('click', () => {
      const isOpen = filterButton.getAttribute('aria-expanded') === 'true';
      filterButton.setAttribute('aria-expanded', String(!isOpen));
      filterMenu.hidden = isOpen;
    });

    filterMenu?.addEventListener('click', (event) => {
      const option = event.target.closest('button[data-value]');
      if (!option) return;
      filterButton.firstChild.textContent = `${option.textContent.trim()} `;
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

    root.querySelectorAll('[data-sprv-page]').forEach((button) => button.addEventListener('click', () => {
      const value = button.dataset.sprvPage;
      if (value === 'previous') currentPage = Math.max(1, currentPage - 1);
      else if (value === 'next') currentPage = Math.min(10, currentPage + 1);
      else currentPage = Number(value);
      root.querySelectorAll('[data-sprv-page]').forEach((item) => {
        const active = Number(item.dataset.sprvPage) === currentPage;
        item.classList.toggle('is-active', active);
        if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
      });
      cards?.classList.add('is-loading');
      window.setTimeout(() => cards?.classList.remove('is-loading'), 180);
      emit(root, 'source_product_review_page', { page: currentPage });
    }));

    root.querySelectorAll('[data-sprv-helpful]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.voted === 'true') return;
      button.dataset.voted = 'true';
      const count = button.querySelector('span');
      count.textContent = String(Number(count.textContent) + 1);
      emit(root, 'source_product_review_helpful', { vote: button.dataset.sprvHelpful });
    }));

    root.querySelector('[data-sprv-write]')?.addEventListener('click', () => emit(root, 'source_product_review_write_click'));
  });
})();

