(() => {
  function initializeCollection(root) {
    if (!root || root.dataset.sourceCollectionReady === 'true') return;
    root.dataset.sourceCollectionReady = 'true';

    const drawer = root.querySelector('[data-source-facet-drawer]');
    const openButtons = root.querySelectorAll('[data-source-open-facets]');
    const closeButtons = root.querySelectorAll('[data-source-close-facets]');
    const grid = root.querySelector('[data-source-products-list]');

    const setDrawer = (open) => {
      if (!drawer) return;
      drawer.hidden = !open;
      drawer.toggleAttribute('open', open);
      drawer.toggleAttribute('active', open);
      document.body.classList.toggle('modal-show', open);
    };

    openButtons.forEach((button) => button.addEventListener('click', () => setDrawer(true)));
    closeButtons.forEach((button) => button.addEventListener('click', () => setDrawer(false)));
    document.addEventListener('keyup', (event) => {
      if (event.code === 'Escape') setDrawer(false);
    });

    root.querySelectorAll('[data-source-layout]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!grid) return;
        const layout = button.dataset.sourceLayout;
        grid.dataset.layout = layout;
        root.querySelectorAll('[data-source-layout]').forEach((control) => {
          const active = control === button;
          control.classList.toggle('is-active', active);
          control.setAttribute('aria-pressed', String(active));
        });
      });
    });

    root.querySelectorAll('[data-source-room-view]').forEach((input) => {
      input.addEventListener('change', () => root.classList.toggle('source-collection--room-view', input.checked));
    });

    root.querySelectorAll('[data-source-facet-form]').forEach((form) => {
      form.addEventListener('change', () => form.requestSubmit());
    });
  }

  function initialize() {
    document.querySelectorAll('[data-source-collection]').forEach(initializeCollection);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
