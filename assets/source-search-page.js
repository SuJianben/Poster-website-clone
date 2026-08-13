(() => {
  const SELECTORS = {
    section: '[data-sp-search-section]',
    input: '[data-sp-search-input]',
    reset: '[data-sp-search-reset]',
    filterToggle: '[data-sp-search-filter-toggle]',
    filterClose: '[data-sp-search-filter-close]',
    layout: '[data-sp-search-layout]',
    grid: '[data-sp-search-grid]',
    sort: '[data-sp-search-sort]',
    sortForm: '[data-sp-search-sort-form]'
  };

  const EVENT_PREFIX = 'sp_search';

  const track = (name, detail = {}) => {
    document.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}:${name}`, { detail }));
  };

  class SourceSearchPage {
    constructor(section) {
      this.section = section;
      this.input = section.querySelector(SELECTORS.input);
      this.reset = section.querySelector(SELECTORS.reset);
      this.filterToggle = section.querySelector(SELECTORS.filterToggle);
      this.grid = section.querySelector(SELECTORS.grid);
      this.sort = section.querySelector(SELECTORS.sort);
      this.bind();
      this.syncReset();
    }

    bind() {
      this.input?.addEventListener('input', () => this.syncReset());
      this.reset?.addEventListener('click', () => {
        window.requestAnimationFrame(() => {
          this.syncReset();
          this.input?.focus();
          track('clear');
        });
      });

      this.filterToggle?.addEventListener('click', () => this.setFacets(true));
      this.section.querySelectorAll(SELECTORS.filterClose).forEach((button) => {
        button.addEventListener('click', () => this.setFacets(false));
      });

      this.section.querySelectorAll(SELECTORS.layout).forEach((button) => {
        button.addEventListener('click', () => this.setLayout(button.dataset.spSearchLayout));
      });

      this.sort?.addEventListener('change', () => {
        track('sort', { value: this.sort.value });
        this.sort.closest(SELECTORS.sortForm)?.submit();
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.section.classList.contains('has-open-facets')) {
          this.setFacets(false);
        }
      });
    }

    syncReset() {
      if (!this.reset || !this.input) return;
      this.reset.hidden = this.input.value.length === 0;
    }

    setFacets(open) {
      this.section.classList.toggle('has-open-facets', open);
      this.filterToggle?.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('sp-search-lock', open && window.innerWidth < 768);
      track(open ? 'filter_open' : 'filter_close');
    }

    setLayout(layout) {
      if (!this.grid || !['grid', 'list'].includes(layout)) return;
      this.grid.dataset.layout = layout;
      this.section.querySelectorAll(SELECTORS.layout).forEach((button) => {
        const active = button.dataset.spSearchLayout === layout;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      track('layout_change', { layout });
    }
  }

  const init = (root = document) => {
    root.querySelectorAll(SELECTORS.section).forEach((section) => {
      if (section.dataset.spSearchReady === 'true') return;
      section.dataset.spSearchReady = 'true';
      new SourceSearchPage(section);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
