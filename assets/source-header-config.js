(() => {
  const SELECTOR = '[data-source-header-config]';
  const SOURCE_MENU_SIZE = 6;

  function setMenuLabel(node, label) {
    const textTarget = node.querySelector('.menu__item-text') || node;
    const labelTarget = textTarget.querySelector('.reversed-link') || textTarget;

    [...textTarget.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) child.remove();
    });

    labelTarget.textContent = label;
    if (labelTarget === textTarget) textTarget.prepend(labelTarget.firstChild);
  }

  function applyNavigation(config) {
    if (!Array.isArray(config) || config.length !== SOURCE_MENU_SIZE) return;

    const items = [...document.querySelectorAll('.header__navigation > nav > ul > li')];
    if (items.length !== SOURCE_MENU_SIZE) return;

    config.forEach((link, index) => {
      const item = items[index];
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
      applyNavigation(JSON.parse(configNode.dataset.navigation || '[]'));
    } catch (_error) {
      // A missing or incomplete backend navigation deliberately leaves source markup intact.
    }

    configNode.dataset.sourceHeaderConfigReady = 'true';
  }

  const init = (scope = document) => scope.querySelectorAll(SELECTOR).forEach(applyConfig);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
