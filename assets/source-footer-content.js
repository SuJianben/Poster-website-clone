(() => {
  const selector = '[data-source-footer-overrides]';

  function updateText(element, value) {
    if (element && value) element.textContent = value;
  }

  function updateAddress(element, value) {
    if (!element || !value) return;
    const fragment = document.createDocumentFragment();
    value.split(/\r?\n/).forEach((line, index) => {
      if (index) fragment.append(document.createElement('br'));
      fragment.append(document.createTextNode(line));
    });
    element.replaceChildren(fragment);
  }

  function updateMenu(menuBlock, config) {
    if (!menuBlock || !config) return;
    updateText(menuBlock.querySelector('.footer-block__heading'), config.heading);
    if (!Array.isArray(config.links) || !config.links.length) return;

    const list = menuBlock.querySelector('.linklist');
    const templateItem = list && list.querySelector('li');
    if (!list || !templateItem) return;

    const fragment = document.createDocumentFragment();
    config.links.forEach((link) => {
      const item = templateItem.cloneNode(true);
      const anchor = item.querySelector('a');
      const label = item.querySelector('.reversed-link__text') || anchor;
      if (!anchor || !label) return;
      anchor.href = link.url || '#';
      label.textContent = link.title || '';
      fragment.append(item);
    });
    list.replaceChildren(fragment);
  }

  function applyOverrides(script) {
    let config;
    try {
      config = JSON.parse(script.textContent);
    } catch (_) {
      return;
    }

    const section = script.closest('.shopify-section') || document;
    const menuBlocks = section.querySelectorAll('.footer-block--menu');
    const menuConfigs = [config.menus?.service, config.menus?.information, config.menus?.collaboration, config.menus?.general];
    menuBlocks.forEach((block, index) => updateMenu(block, menuConfigs[index]));

    const contactBlock = section.querySelector('.footer-block--contact_information');
    if (contactBlock) {
      updateText(contactBlock.querySelector('.footer-block__heading'), config.contact?.heading);
      updateAddress(contactBlock.querySelector('.footer-info__address span'), config.contact?.address);
      const email = contactBlock.querySelector('.footer-info__email a');
      if (email && config.contact?.email) {
        email.textContent = config.contact.email;
        email.href = `mailto:${config.contact.email}`;
      }
    }

    if (config.awardsImage) {
      const image = section.querySelector('.footer-block--image_text img');
      if (image) {
        image.src = config.awardsImage;
        image.removeAttribute('srcset');
        image.closest('picture')?.querySelectorAll('source').forEach((source) => source.remove());
      }
    }

    Object.entries(config.social || {}).forEach(([network, url]) => {
      if (!url) return;
      const link = section.querySelector(`.social__link:has(.icon-${network})`);
      if (link) link.href = url;
    });
  }

  function initialize(scope = document) {
    scope.querySelectorAll(selector).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', () => initialize());
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
