(() => {
  const DRAWER_SELECTOR = '#MenuDrawer';
  const OPEN_CLASS = 'source-menu-drawer-open';
  const HOST_OPEN_CLASS = 'source-menu-drawer-host-active';
  const CLOSE_DELAY = 340;

  const getTriggers = (drawer) => [...document.querySelectorAll('.menu-drawer-button')]
    .filter((button) => button.getAttribute('aria-controls') === drawer.id);

  const getHostHeader = (drawer) => drawer.closest('header');

  const syncHeaderHeight = (drawer) => {
    const headerTop = getHostHeader(drawer)?.querySelector('.header__top');
    const height = Math.ceil(headerTop?.getBoundingClientRect().height || 56);
    drawer.style.setProperty('--source-menu-drawer-header-height', `${height}px`);
  };

  const updateTriggerState = (drawer, isOpen) => {
    getTriggers(drawer).forEach((button) => {
      if (!button.dataset.sourceMenuDrawerDefaultLabel) {
        button.dataset.sourceMenuDrawerDefaultLabel = button.getAttribute('aria-label') || 'Menu';
      }
      button.classList.toggle('source-menu-drawer-toggle-active', isOpen);
      button.setAttribute('aria-expanded', String(isOpen));
      button.setAttribute(
        'aria-label',
        isOpen ? 'Menu schliessen' : button.dataset.sourceMenuDrawerDefaultLabel
      );
    });
  };

  const updateHostState = (drawer, isOpen) => {
    const header = getHostHeader(drawer);
    header?.classList.toggle(HOST_OPEN_CLASS, isOpen);
    if (isOpen) syncHeaderHeight(drawer);
    updateTriggerState(drawer, isOpen);
  };

  const closeDrawer = (drawer, { restoreFocus = false } = {}) => {
    if (!drawer || drawer.hidden) return;

    drawer.removeAttribute('open');
    drawer.classList.remove(OPEN_CLASS);
    drawer.querySelectorAll('details[is="menu-drawer-details"][open]').forEach((details) => {
      details.open = false;
    });
    document.body.classList.remove('source-menu-drawer-active');
    updateHostState(drawer, false);

    window.setTimeout(() => {
      if (!drawer.hasAttribute('open')) drawer.hidden = true;
    }, CLOSE_DELAY);

    if (restoreFocus) getTriggers(drawer)[0]?.focus();
  };

  const openDrawer = (drawer) => {
    if (!drawer || !drawer.hidden) return;

    drawer.hidden = false;
    document.body.classList.add('source-menu-drawer-active');
    updateHostState(drawer, true);

    window.requestAnimationFrame(() => {
      drawer.setAttribute('open', '');
      drawer.classList.add(OPEN_CLASS);
    });
  };

  const initDrawer = (scope = document) => {
    const drawer = scope.querySelector?.(DRAWER_SELECTOR) || document.querySelector(DRAWER_SELECTOR);
    if (!drawer || drawer.dataset.sourceMenuDrawerReady === 'true') return;

    drawer.dataset.sourceMenuDrawerReady = 'true';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    updateTriggerState(drawer, false);
    getTriggers(drawer).forEach((button) => {
      button.setAttribute('type', 'button');
      button.addEventListener('click', () => {
        if (drawer.hidden) openDrawer(drawer);
        else closeDrawer(drawer);
      });
    });

    drawer.querySelector('.fixed-overlay')?.addEventListener('click', () => closeDrawer(drawer));
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer) closeDrawer(drawer);
    });
    drawer.querySelectorAll('.menu-drawer__item-back-link').forEach((button) => {
      button.addEventListener('click', () => {
        const details = button.closest('details[is="menu-drawer-details"]');
        if (details) details.open = false;
      });
    });

    window.addEventListener('resize', () => {
      if (!drawer.hidden) syncHeaderHeight(drawer);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer(drawer, { restoreFocus: true });
    });
  };

  const init = (scope) => initDrawer(scope);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(document));
  else init(document);
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
