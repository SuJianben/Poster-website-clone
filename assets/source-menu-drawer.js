(() => {
  const DRAWER_SELECTOR = '#MenuDrawer';
  const OPEN_CLASS = 'source-menu-drawer-open';
  const MOUNTED_CLASS = 'source-menu-drawer-mounted';
  const CLOSE_DELAY = 820;

  const getTriggers = (drawer) => [...document.querySelectorAll('.menu-drawer-button')]
    .filter((button) => button.getAttribute('aria-controls') === drawer.id);

  const getHostHeader = (drawer) => drawer.sourceMenuDrawerHostHeader
    || drawer.closest('header')
    || getTriggers(drawer)[0]?.closest('header');

  const mountDrawer = (drawer) => {
    if (!drawer.sourceMenuDrawerOriginalParent) {
      drawer.sourceMenuDrawerOriginalParent = drawer.parentNode;
      drawer.sourceMenuDrawerOriginalNextSibling = drawer.nextSibling;
    }
    if (drawer.parentNode !== document.body) document.body.appendChild(drawer);
    drawer.classList.add(MOUNTED_CLASS);
  };

  const restoreDrawer = (drawer) => {
    const parent = drawer.sourceMenuDrawerOriginalParent;
    const nextSibling = drawer.sourceMenuDrawerOriginalNextSibling;
    if (!parent?.isConnected) return;
    if (nextSibling?.parentNode === parent) parent.insertBefore(drawer, nextSibling);
    else parent.appendChild(drawer);
  };

  const syncHeaderHeight = (drawer) => {
    const headerTop = getHostHeader(drawer)?.querySelector('.header__top');
    const headerRect = headerTop?.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const headerOffset = headerRect?.bottom > 0 && headerRect.bottom < viewportHeight
      ? headerRect.bottom
      : headerRect?.height || 56;
    drawer.style.setProperty('--source-menu-drawer-header-height', `${Math.ceil(headerOffset)}px`);
  };

  const releaseDrawerLayout = (drawer) => {
    document.documentElement.classList.remove('source-menu-drawer-active');
    document.body.classList.remove('source-menu-drawer-active');
    drawer.classList.remove(MOUNTED_CLASS);
    drawer.hidden = true;
    restoreDrawer(drawer);
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

    window.clearTimeout(drawer.sourceMenuDrawerCloseTimer);

    drawer.removeAttribute('open');
    drawer.classList.remove(OPEN_CLASS);
    drawer.querySelectorAll('details[is="menu-drawer-details"]').forEach((details) => {
      closeSubmenu(details);
    });
    updateHostState(drawer, false);

    drawer.sourceMenuDrawerCloseTimer = window.setTimeout(() => {
      if (!drawer.hasAttribute('open')) {
        releaseDrawerLayout(drawer);
      }
    }, CLOSE_DELAY);

    if (restoreFocus) getTriggers(drawer)[0]?.focus();
  };

  const openDrawer = (drawer) => {
    if (!drawer || drawer.hasAttribute('open')) return;

    window.clearTimeout(drawer.sourceMenuDrawerCloseTimer);
    mountDrawer(drawer);
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
    drawer.sourceMenuDrawerHostHeader = drawer.closest('header');
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
        if (drawer.hasAttribute('open')) closeDrawer(drawer);
        else openDrawer(drawer);
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
