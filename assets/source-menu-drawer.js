(() => {
  const DRAWER_SELECTOR = '#MenuDrawer';
  const OPEN_CLASS = 'source-menu-drawer-open';
  const CLOSE_DELAY = 340;

  const getTriggers = (drawer) => [...document.querySelectorAll('.menu-drawer-button')]
    .filter((button) => button.getAttribute('aria-controls') === drawer.id);

  const iconMarkup = {
    close: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M18.75 5.25 5.25 18.75M18.75 18.75 5.25 5.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    search: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M10.875 18.75C15.224 18.75 18.75 15.224 18.75 10.875S15.224 3 10.875 3 3 6.526 3 10.875s3.526 7.875 7.875 7.875Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m16.443 16.445 4.557 4.557" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    account: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 15c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6ZM2.906 20.251A10.5 10.5 0 0 1 12 15a10.5 10.5 0 0 1 9.094 5.251" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cart: '<svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="M6.875 18.125a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM15 18.125a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" fill="currentColor"/><path d="M1.25 2.5h1.875l2.871 10.334a1.25 1.25 0 0 0 1.204.916h7.722a1.25 1.25 0 0 0 1.205-.916l1.998-7.209H3.993" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const createAction = ({ source, href, label, icon }) => {
    const action = source?.cloneNode(true) || document.createElement('a');
    action.classList.add('source-menu-drawer__header-action');
    action.removeAttribute('id');
    action.href = source?.getAttribute('href') || href;
    action.setAttribute('aria-label', source?.getAttribute('aria-label') || label);
    action.querySelectorAll('cart-count').forEach((count) => count.remove());
    if (!action.querySelector('svg')) action.innerHTML = icon;
    return action;
  };

  const createDrawerHeader = (drawer) => {
    const content = drawer.querySelector(':scope > .drawer__inner > .drawer__content');
    if (!content || content.querySelector('.source-menu-drawer__header')) return;

    const header = document.createElement('div');
    header.className = 'source-menu-drawer__header';
    header.setAttribute('aria-label', 'Menü');

    const closeButton = document.createElement('button');
    closeButton.className = 'source-menu-drawer__close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Menü schließen');
    closeButton.setAttribute('data-source-menu-drawer-close', '');
    closeButton.innerHTML = iconMarkup.close;

    const logoSource = document.querySelector('.header__logo > a');
    const brand = logoSource?.cloneNode(true) || document.createElement('a');
    brand.classList.add('source-menu-drawer__brand');
    brand.removeAttribute('id');
    brand.href = logoSource?.getAttribute('href') || '/';
    if (!logoSource) {
      brand.setAttribute('aria-label', 'Startseite');
      brand.innerHTML = '<span class="source-menu-drawer__brand-fallback">DOTCOM CANVAS</span>';
    }

    const actions = document.createElement('div');
    actions.className = 'source-menu-drawer__header-actions';
    const search = createAction({
      source: document.querySelector('.header__icons--right .custom-search > a'),
      href: '/search',
      label: 'Suchen',
      icon: iconMarkup.search
    });
    const account = createAction({
      source: document.querySelector('.header__icons--right .account-button'),
      href: '/account/login',
      label: 'Konto',
      icon: iconMarkup.account
    });
    const cartSource = document.querySelector('.header__icons--right .cart-icon');
    const cart = createAction({
      source: cartSource,
      href: '/cart',
      label: 'Warenkorb',
      icon: iconMarkup.cart
    });
    cart.classList.add('source-menu-drawer__cart');

    const cartCount = document.createElement('span');
    cartCount.className = 'source-menu-drawer__cart-count';
    const sourceCartCount = cartSource?.querySelector('cart-count');
    const syncCartCount = () => {
      const value = sourceCartCount?.textContent?.trim() || '';
      cartCount.textContent = value;
      cartCount.hidden = !value || value === '0';
    };
    syncCartCount();
    if (sourceCartCount) {
      new MutationObserver(syncCartCount).observe(sourceCartCount, {
        characterData: true,
        childList: true,
        subtree: true
      });
    }
    cart.append(cartCount);
    actions.append(search, account, cart);
    header.append(closeButton, brand, actions);
    content.prepend(header);

    closeButton.addEventListener('click', () => closeDrawer(drawer, { restoreFocus: true }));
  };

  const closeDrawer = (drawer, { restoreFocus = false } = {}) => {
    if (!drawer || drawer.hidden) return;

    drawer.removeAttribute('open');
    drawer.classList.remove(OPEN_CLASS);
    drawer.querySelectorAll('details[is="menu-drawer-details"][open]').forEach((details) => {
      details.open = false;
    });
    document.body.classList.remove('source-menu-drawer-active');

    getTriggers(drawer).forEach((button) => button.setAttribute('aria-expanded', 'false'));
    window.setTimeout(() => {
      if (!drawer.hasAttribute('open')) drawer.hidden = true;
    }, CLOSE_DELAY);

    if (restoreFocus) getTriggers(drawer)[0]?.focus();
  };

  const openDrawer = (drawer) => {
    if (!drawer || !drawer.hidden) return;

    drawer.hidden = false;
    document.body.classList.add('source-menu-drawer-active');
    getTriggers(drawer).forEach((button) => button.setAttribute('aria-expanded', 'true'));

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
    createDrawerHeader(drawer);
    getTriggers(drawer).forEach((button) => {
      button.setAttribute('type', 'button');
      button.setAttribute('aria-expanded', 'false');
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

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer(drawer, { restoreFocus: true });
    });
  };

  const init = (scope) => initDrawer(scope);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(document));
  else init(document);
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
