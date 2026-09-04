(() => {
  const SELECTOR = '[data-source-header-config]';

  function setMenuLabel(node, label) {
    const textTarget = node.querySelector('.menu__item-text') || node;
    const labelTarget = textTarget.querySelector('.reversed-link') || textTarget;
    const textNodes = [...labelTarget.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE);

    if (textNodes.length > 0) {
      textNodes[0].nodeValue = label;
      textNodes.slice(1).forEach((child) => child.remove());
    } else {
      labelTarget.prepend(document.createTextNode(label));
    }
  }

  function applyNavigation(config) {
    if (!Array.isArray(config) || config.length === 0) return;

    const items = [...document.querySelectorAll('.header__navigation > nav > ul > li')];
    if (items.length === 0) return;

    items.forEach((item, index) => {
      const link = config[index];
      item.hidden = !link;
      if (!link) return;

      const summary = item.querySelector(':scope > details > summary');
      const anchor = item.querySelector(':scope > a');
      if (summary) {
        summary.dataset.link = link.url;
        setMenuLabel(summary, link.title);
      } else if (anchor) {
        anchor.href = link.url;
        setMenuLabel(anchor, link.title);
      }
    });
  }

  function applyDesktopNavigation(configNode) {
    const template = configNode.parentElement?.querySelector('template[data-source-header-desktop-menu]');
    const navigation = configNode.parentElement?.querySelector('.header__navigation > nav')
      || document.querySelector('.header__navigation > nav');
    const list = navigation?.querySelector(':scope > ul');
    if (!template || !list) return null;

    const replacement = template.content.firstElementChild?.cloneNode(true);
    if (!replacement) return null;

    list.replaceWith(replacement);
    replacement.dataset.sourceDesktopMenuRendered = 'true';
    return replacement;
  }

  function applyMobileNavigation(configNode) {
    const template = configNode.parentElement?.querySelector('template[data-source-header-mobile-menu]');
    const drawer = configNode.parentElement?.querySelector('#MenuDrawer') || document.querySelector('#MenuDrawer');
    const list = drawer?.querySelector('.menu-drawer__menus > ul');
    if (!template || !list) return;

    const replacement = template.content.firstElementChild?.cloneNode(true);
    if (!replacement) return;

    list.replaceWith(replacement);
    replacement.dataset.sourceMobileMenuRendered = 'true';
  }

  function applyMegaMenus(configNode, navigationScope) {
    const megaConfig = configNode.parentElement?.querySelector('template[data-source-header-mega-config]');
    if (megaConfig) {
      const panels = megaConfig.content.querySelectorAll('template[data-source-header-mega-panel]');
      const items = [...document.querySelectorAll('.header__navigation > nav > ul > li')];
      panels.forEach((panelTemplate) => {
        const index = Number(panelTemplate.dataset.menuIndex);
        const menu = items[index]?.querySelector(':scope > details[is="details-mega"]');
        const currentPanel = menu?.querySelector(':scope > .mega-menu');
        const replacement = panelTemplate.content.firstElementChild?.cloneNode(true);
        if (!menu || !currentPanel || !replacement) return;

        currentPanel.replaceWith(replacement);
        menu.dispatchEvent(new CustomEvent('source-mega-menu:refresh'));
      });
    }

    document.dispatchEvent(new CustomEvent('source:mega-menu:init', {
      detail: { scope: navigationScope || document }
    }));
  }

  function getLogoWidth(value, fallback, min, max) {
    const width = Number.parseInt(value, 10);
    if (!Number.isFinite(width)) return fallback;
    return Math.min(Math.max(width, min), max);
  }

  function getHeaderScope(configNode) {
    return configNode.closest('.shopify-section') || configNode.parentElement || document;
  }

  function applyLogoConfig(configNode) {
    const headerScope = getHeaderScope(configNode);
    const logoAnchor = headerScope.querySelector('.header__logo > a') || document.querySelector('.header__logo > a');
    if (!logoAnchor) return;

    const logo = configNode.dataset.logo;
    const mobileLogo = configNode.dataset.logoMobile;
    const shopName = configNode.dataset.shopName || 'Store';
    const desktopWidth = getLogoWidth(configNode.dataset.logoWidth, 400, 80, 500);
    const mobileWidth = getLogoWidth(configNode.dataset.logoWidthMobile, 200, 60, 280);
    const logoSection = logoAnchor.closest('.shopify-section') || (headerScope instanceof HTMLElement ? headerScope : null);
    const images = [...logoAnchor.querySelectorAll('img.logo')];
    let fallback = logoAnchor.querySelector('[data-source-header-logo-text]');

    if (logoSection) {
      logoSection.style.setProperty('--logo-width', `${desktopWidth}px`);
      logoSection.style.setProperty('--logo-width-mobile', `${mobileWidth}px`);
    }
    logoAnchor.style.setProperty('--source-header-logo-width', `${desktopWidth}px`);
    logoAnchor.style.setProperty('--source-header-logo-width-mobile', `${mobileWidth}px`);
    logoAnchor.dataset.sourceHeaderLogo = 'true';
    logoAnchor.setAttribute('aria-label', shopName);

    if (logo) {
      images.forEach((image) => {
        image.hidden = false;
        image.removeAttribute('aria-hidden');
        const imageSource = image.classList.contains('header__logo--mobile') && mobileLogo ? mobileLogo : logo;
        image.src = imageSource;
        image.srcset = imageSource;
        image.alt = shopName;
      });
      fallback?.remove();
      logoAnchor.classList.remove('source-header-logo--text');
      logoAnchor.classList.add('header__logo--image');
      return;
    }

    images.forEach((image) => {
      image.hidden = true;
      image.setAttribute('aria-hidden', 'true');
    });

    if (!fallback) {
      fallback = document.createElement('span');
      fallback.className = 'source-header-logo-text';
      fallback.dataset.sourceHeaderLogoText = 'true';
      logoAnchor.append(fallback);
    }

    fallback.textContent = shopName;
    logoAnchor.classList.remove('header__logo--image');
    logoAnchor.classList.add('source-header-logo--text');
  }

  function applyConfig(configNode) {
    if (configNode.dataset.sourceHeaderConfigReady === 'true') return;

    const logoLink = configNode.dataset.logoLink;
    const headerScope = getHeaderScope(configNode);
    const logoAnchor = headerScope.querySelector('.header__logo > a') || document.querySelector('.header__logo > a');
    applyLogoConfig(configNode);
    if (logoLink && logoAnchor) logoAnchor.href = logoLink;

    headerScope.querySelectorAll('.header__search input[type="search"]').forEach((input) => {
      input.placeholder = configNode.dataset.searchPlaceholder;
    });

    try {
      const navigation = JSON.parse(configNode.dataset.navigation || '[]');
      const desktopNavigation = applyDesktopNavigation(configNode);
      if (!desktopNavigation) applyNavigation(navigation);
      applyMobileNavigation(configNode);
      applyMegaMenus(configNode, desktopNavigation);
    } catch (_error) {
      // A missing or incomplete backend navigation deliberately leaves source markup intact.
    }

    configNode.dataset.sourceHeaderConfigReady = 'true';
  }

  const init = (scope = document) => scope.querySelectorAll(SELECTOR).forEach(applyConfig);
  init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
