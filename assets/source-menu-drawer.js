(() => {
  const DRAWER_SELECTOR = '#MenuDrawer';
  const OPEN_CLASS = 'source-menu-drawer-open';
  const CLOSE_DELAY = 820;
  const CLOSE_ICON = '<svg class="source-menu-drawer__close-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M18.75 5.25 5.25 18.75M18.75 18.75 5.25 5.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  const getTriggers = (drawer) => [...document.querySelectorAll('.menu-drawer-button')]
    .filter((button) => button.getAttribute('aria-controls') === drawer.id);

  const getHostHeader = (drawer) => drawer.closest('header');

  const syncHeaderHeight = (drawer) => {
    const headerTop = getHostHeader(drawer)?.querySelector('.header__top');
    const headerBottom = Math.ceil(headerTop?.getBoundingClientRect().bottom || 56);
    drawer.style.setProperty('--source-menu-drawer-header-height', `${headerBottom}px`);
  };

  const updateTriggerState = (drawer, isOpen) => {
    getTriggers(drawer).forEach((button) => {
      if (!button.dataset.sourceMenuDrawerDefaultLabel) {
        button.dataset.sourceMenuDrawerDefaultLabel = button.getAttribute('aria-label') || 'Menu';
      }
      if (!button.dataset.sourceMenuDrawerDefaultMarkup) {
        button.dataset.sourceMenuDrawerDefaultMarkup = button.innerHTML;
      }
      button.classList.toggle('source-menu-drawer-toggle-active', isOpen);
      button.innerHTML = isOpen ? CLOSE_ICON : button.dataset.sourceMenuDrawerDefaultMarkup;
      button.setAttribute('aria-expanded', String(isOpen));
      button.setAttribute(
        'aria-label',
        isOpen ? 'Menu schliessen' : button.dataset.sourceMenuDrawerDefaultLabel
      );
    });
  };

  const updateHostState = (drawer, isOpen) => {
    if (isOpen) syncHeaderHeight(drawer);
    updateTriggerState(drawer, isOpen);
  };

  const setSubmenuState = (details, isOpen) => {
    if (!details) return;

    const parent = details.closest('[data-parent]');
    if (isOpen) {
      parent?.querySelectorAll(':scope > ul > li > details[is="menu-drawer-details"]').forEach((otherDetails) => {
        if (otherDetails === details) return;
        otherDetails.open = false;
        otherDetails.classList.remove('active');
        otherDetails.querySelector(':scope > summary')?.setAttribute('aria-expanded', 'false');
      });
    }

    details.open = isOpen;
    details.classList.toggle('active', isOpen);
    parent?.classList.toggle('active', isOpen);
    details.querySelector(':scope > summary')?.setAttribute('aria-expanded', String(isOpen));
  };

  const closeSubmenu = (details) => {
    if (!details) return;

    details.querySelectorAll('details[open]').forEach((nestedDetails) => {
      nestedDetails.open = false;
      nestedDetails.classList.remove('active');
    });
    setSubmenuState(details, false);
  };

  const closeDrawer = (drawer, { restoreFocus = false } = {}) => {
    if (!drawer || drawer.hidden) return;

    drawer.removeAttribute('open');
    drawer.classList.remove(OPEN_CLASS);
    drawer.querySelectorAll('details[is="menu-drawer-details"]').forEach((details) => {
      closeSubmenu(details);
    });
    document.documentElement.classList.remove('source-menu-drawer-active');
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
    document.documentElement.classList.add('source-menu-drawer-active');
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
      button.addEventListener('click', (event) => {
        // The bundled theme also listens for this click. Handle it first so it
        // cannot open a competing drawer state without the active body class.
        event.preventDefault();
        event.stopImmediatePropagation();
        if (drawer.hidden) openDrawer(drawer);
        else closeDrawer(drawer);
      }, true);
    });

    drawer.querySelector('.fixed-overlay')?.addEventListener('click', () => closeDrawer(drawer));
    drawer.addEventListener('click', (event) => {
      if (event.target === drawer) closeDrawer(drawer);
    });
    drawer.addEventListener('click', (event) => {
      const backButton = event.target.closest('.menu-drawer__item-back-link');
      if (backButton && drawer.contains(backButton)) {
        event.preventDefault();
        const details = backButton.closest('details[is="menu-drawer-details"]');
        closeSubmenu(details);
        return;
      }

      const summary = event.target.closest('details[is="menu-drawer-details"] > summary');
      if (summary && drawer.contains(summary)) {
        event.preventDefault();
        const details = summary.parentElement;
        setSubmenuState(details, !details.open);
      }
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
