(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const PANEL_SELECTOR = '.tabs__panel.featured-collection__content';

  function cardsFor(panel) {
    return Array.from(panel.querySelectorAll('.featured-collection__items > .f-column'));
  }

  function animateVisibleCards(panel) {
    const visibleCards = cardsFor(panel).filter(
      (card) => window.getComputedStyle(card).display !== 'none',
    );

    visibleCards.forEach((card, index) => {
      card.style.setProperty('--source-tab-enter-delay', `${index * 55}ms`);
    });

    panel.classList.remove('source-tabs-entering');
    void panel.offsetWidth;
    panel.classList.add('source-tabs-entering');
  }

  function setPage(panel, page, shouldAnimate = false) {
    const cards = cardsFor(panel);
    const perPage = window.matchMedia('(min-width: 768px)').matches ? 5 : 2;
    const totalPages = Math.max(1, Math.ceil(cards.length / perPage));
    const currentPage = Math.min(Math.max(page, 0), totalPages - 1);

    cards.forEach((card, index) => {
      const visible = index >= currentPage * perPage && index < (currentPage + 1) * perPage;
      card.style.setProperty('display', visible ? 'block' : 'none', 'important');
    });

    panel.dataset.staticPage = String(currentPage);

    const progress = panel.querySelector('.swiper-pagination');
    if (progress) {
      let progressFill = progress.querySelector('.swiper-pagination-progressbar-fill');
      if (!progressFill) {
        progressFill = document.createElement('span');
        progressFill.className = 'swiper-pagination-progressbar-fill';
        progress.append(progressFill);
      }
      progressFill.style.transform = `scaleX(${(currentPage + 1) / totalPages})`;
    }

    panel.querySelectorAll('.swiper-button-prev').forEach((button) => {
      button.disabled = currentPage === 0;
    });
    panel.querySelectorAll('.swiper-button-next').forEach((button) => {
      button.disabled = currentPage === totalPages - 1;
    });

    if (shouldAnimate) {
      animateVisibleCards(panel);
    }
  }

  function bindPager(panel) {
    if (panel.dataset.staticPagerBound === 'true') return;
    panel.dataset.staticPagerBound = 'true';
    panel.querySelectorAll('.swiper-button-prev').forEach((button) => {
      button.addEventListener('click', () =>
        setPage(panel, Number(panel.dataset.staticPage || 0) - 1, true),
      );
    });
    panel.querySelectorAll('.swiper-button-next').forEach((button) => {
      button.addEventListener('click', () =>
        setPage(panel, Number(panel.dataset.staticPage || 0) + 1, true),
      );
    });
    setPage(panel, 0);
  }

  function panelFromTemplate(container, index) {
    const template = container.querySelector(`template[data-index="${index}"]`);
    if (!template) return null;
    const fragment = template.content.cloneNode(true);
    return fragment.querySelector(PANEL_SELECTOR);
  }

  function init(tabRoot) {
    const tabs = Array.from(tabRoot.querySelectorAll('.tabs__btn[data-index]'));
    const panels = tabRoot.querySelector('.tabs__panels');
    if (!tabs.length || !panels) return;

    tabRoot.classList.add('source-tabs-ready');
    let currentPanel = panels.querySelector(PANEL_SELECTOR);
    const panelCache = new Map([[currentPanel.dataset.index, currentPanel]]);
    bindPager(currentPanel);

    const activate = (index) => {
      if (currentPanel?.dataset.index !== index) {
        let replacement = panelCache.get(index);
        if (!replacement) {
          replacement = panelFromTemplate(panels, index);
          if (replacement) {
            panelCache.set(index, replacement);
          }
        }
        if (!replacement) return;
        currentPanel.replaceWith(replacement);
        currentPanel = replacement;
        bindPager(currentPanel);
      }

      tabs.forEach((tab) => {
        const active = tab.dataset.index === index;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      setPage(currentPanel, 0, true);
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab.dataset.index)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[is="product-tabs"]').forEach(init);
  });
})();
