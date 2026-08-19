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

  function applyConfig(configNode) {
    if (configNode.dataset.sourceHeaderConfigReady === 'true') return;

    const logo = configNode.dataset.logo;
    const logoLink = configNode.dataset.logoLink;
    const logoAnchor = document.querySelector('.header__logo > a');
    if (logo && logoAnchor) {
      logoAnchor.querySelectorAll('img').forEach((image) => {
        image.src = logo;
        image.srcset = logo;
      });
    }
    if (logoLink && logoAnchor) logoAnchor.href = logoLink;

    document.querySelectorAll('.header__search input[type="search"]').forEach((input) => {
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
