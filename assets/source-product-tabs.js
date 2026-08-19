(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const PANEL_SELECTOR = '.tabs__panel.featured-collection__content';
  const MOBILE_BESTSELLERS_SELECTOR = '[data-mobile-bestsellers]';
  const mobileBreakpoint = window.matchMedia('(max-width: 767.98px)');

  function cardsFor(panel) {
    return Array.from(panel.querySelectorAll('.featured-collection__items > .f-column'));
  }

  function animateTabPanel(panel) {
    panel.classList.remove('source-tabs-entering');
    void panel.offsetWidth;
    panel.classList.add('source-tabs-entering');
  }

  function syncPromotionCardHeight(panel) {
    const cards = cardsFor(panel);
    const promotionSlide = cards.find((card) => card.querySelector('.card-media'));
    const promotionCard = promotionSlide?.querySelector('.card-media');
    const productHeights = cards
      .filter((card) => card.querySelector('.product-card'))
      .map((card) => card.getBoundingClientRect().height);

    if (!promotionCard || !productHeights.length) return;

    promotionCard.style.height = 'auto';
    promotionCard.style.height = `${Math.max(...productHeights)}px`;
  }

  function setPage(panel, position) {
    const cards = cardsFor(panel);
    const perPage = window.matchMedia('(min-width: 768px)').matches ? 5 : 2;
    const totalPositions = Math.max(1, cards.length - perPage + 1);
    const currentPosition = Math.min(Math.max(position, 0), totalPositions - 1);
    const track = panel.querySelector('.featured-collection__items');

    if (track && cards.length) {
      const cardWidth = cards[0].getBoundingClientRect().width;
      const columnGap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
      track.style.transform = `translate3d(-${currentPosition * (cardWidth + columnGap)}px, 0, 0)`;
    }

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
    requestAnimationFrame(() => syncPromotionCardHeight(panel));
    panel.querySelectorAll('img').forEach((image) => {
      image.addEventListener('load', () => syncPromotionCardHeight(panel), { once: true });
    });
  }

  function panelFromTemplate(container, index) {
    const template = container.querySelector(`template[data-index="${index}"]`);
    if (!template) return null;
    const fragment = template.content.cloneNode(true);
    return fragment.querySelector(PANEL_SELECTOR);
  }

  function descendantsOrSelf(container, selector) {
    const elements = [];
    if (container instanceof Element && container.matches(selector)) elements.push(container);
    elements.push(...container.querySelectorAll(selector));
    return elements;
  }

  function init(tabRoot) {
    if (tabRoot.dataset.sourceTabsReady === 'true') return;

    const tabs = Array.from(tabRoot.querySelectorAll('.tabs__btn[data-index]'));
    const panels = tabRoot.querySelector('.tabs__panels');
    if (!tabs.length || !panels) return;

    const sectionRoot = tabRoot.closest('.shopify-section');
    const abortController = new AbortController();
    const { signal } = abortController;

    let currentPanel = panels.querySelector(PANEL_SELECTOR);
    if (!currentPanel) return;

    tabRoot.dataset.sourceTabsReady = 'true';
    tabRoot.classList.add('source-tabs-ready');
    const panelCache = new Map([[currentPanel.dataset.index, currentPanel]]);
    bindPager(currentPanel);

    const activate = (index, shouldAnimate = true) => {
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
      if (shouldAnimate) animateTabPanel(currentPanel);
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => activate(tab.dataset.index), { signal });
    });

    window.addEventListener('resize', () => syncPromotionCardHeight(currentPanel), { signal });
    sectionRoot?.addEventListener('shopify:section:unload', () => abortController.abort(), {
      once: true
    });
  }

  function initMobileBestsellers(container = document) {
    descendantsOrSelf(container, MOBILE_BESTSELLERS_SELECTOR).forEach((mobileSection) => {
      if (mobileSection.dataset.sourceMobileBestsellersReady === 'true') return;

      const tabs = Array.from(mobileSection.querySelectorAll('[data-mobile-tab]'));
      const panels = Array.from(mobileSection.querySelectorAll('[data-mobile-panel]'));
      if (!tabs.length || !panels.length) return;

      const sectionRoot = mobileSection.closest('.shopify-section');
      const abortController = new AbortController();
      const { signal } = abortController;
      mobileSection.dataset.sourceMobileBestsellersReady = 'true';

      const syncProgress = (panel) => {
        const track = panel.querySelector('.source-mobile-bestsellers__track');
        const indicator = panel.querySelector('.source-mobile-bestsellers__progress span');
        if (!track || !indicator) return;

        const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
        const progress = maxScroll ? track.scrollLeft / maxScroll : 0;
        indicator.style.width = `${18 + progress * 82}%`;
        indicator.style.transform = 'none';
      };

      const activate = (index, shouldAnimate = true) => {
        tabs.forEach((tab) => {
          const active = tab.dataset.mobileTab === index;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', String(active));
        });

        panels.forEach((panel) => {
          const active = panel.dataset.mobilePanel === index;
          panel.classList.toggle('is-active', active);
          if (!active) return;

          if (shouldAnimate) {
            panel.classList.remove('source-mobile-bestsellers__panel--entering');
            void panel.offsetWidth;
            panel.classList.add('source-mobile-bestsellers__panel--entering');
          } else {
            panel.classList.remove('source-mobile-bestsellers__panel--entering');
          }

          requestAnimationFrame(() => syncProgress(panel));
        });
      };

      panels.forEach((panel) => {
        const track = panel.querySelector('.source-mobile-bestsellers__track');
        if (!track) return;
        track.addEventListener('scroll', () => syncProgress(panel), { passive: true, signal });
        requestAnimationFrame(() => syncProgress(panel));
      });

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => activate(tab.dataset.mobileTab), { signal });
      });

      window.addEventListener(
        'resize',
        () => panels.forEach((panel) => syncProgress(panel)),
        { signal }
      );
      sectionRoot?.addEventListener('shopify:section:unload', () => abortController.abort(), {
        once: true
      });
    });
  }

  function initAll(container = document) {
    descendantsOrSelf(container, '[is="product-tabs"]').forEach(init);
    initMobileBestsellers(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => initAll(event.target));
})();
