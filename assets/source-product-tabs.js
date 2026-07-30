(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const PANEL_SELECTOR = '.tabs__panel.featured-collection__content';

  function cardsFor(panel) {
    return Array.from(panel.querySelectorAll('.featured-collection__items > .f-column'));
  }

  function animateTabPanel(panel) {
    panel.classList.remove('source-tabs-entering');
    void panel.offsetWidth;
    panel.classList.add('source-tabs-entering');
  }

  function setPage(panel, position) {
    const cards = cardsFor(panel);
    const perPage = window.matchMedia('(min-width: 768px)').matches ? 5 : 2;
    const totalPositions = Math.max(1, cards.length - perPage + 1);
    const currentPosition = Math.min(Math.max(position, 0), totalPositions - 1);

    cards.forEach((card, index) => {
      const visible = index >= currentPosition && index < currentPosition + perPage;
      card.style.setProperty('display', visible ? 'block' : 'none', 'important');
    });

    panel.dataset.staticPage = String(currentPosition);

    const progress = panel.querySelector('.swiper-pagination');
    if (progress) {
      progress.classList.add('swiper-pagination-progressbar', 'swiper-pagination-horizontal');
      let progressFill = progress.querySelector('.swiper-pagination-progressbar-fill');
      if (!progressFill) {
        progressFill = document.createElement('span');
        progressFill.className = 'swiper-pagination-progressbar-fill';
        progress.append(progressFill);
      }
      progressFill.style.transform = `scaleX(${(currentPosition + 1) / totalPositions})`;
    }

    panel.querySelectorAll('.swiper-button-prev').forEach((button) => {
      button.disabled = currentPosition === 0;
    });
    panel.querySelectorAll('.swiper-button-next').forEach((button) => {
      button.disabled = currentPosition === totalPositions - 1;
    });
  }

  function bindPager(panel) {
    if (panel.dataset.staticPagerBound === 'true') return;
    panel.dataset.staticPagerBound = 'true';
    panel.querySelectorAll('.swiper-button-prev').forEach((button) => {
      button.addEventListener('click', () => setPage(panel, Number(panel.dataset.staticPage || 0) - 1));
    });
    panel.querySelectorAll('.swiper-button-next').forEach((button) => {
      button.addEventListener('click', () => setPage(panel, Number(panel.dataset.staticPage || 0) + 1));
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
      setPage(currentPanel, 0);
      animateTabPanel(currentPanel);
    };

    tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab.dataset.index)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[is="product-tabs"]').forEach(init);
  });
})();
