(() => {
  const selector = '[data-source-footer-overrides]';

  function updateText(element, value) {
    if (element && value) element.textContent = value;
  }

  function updateAddress(element, value) {
    if (!element) return;
    if (!value) {
      element.replaceChildren();
      return;
    }
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
    if (!Array.isArray(config.links) || !config.links.length) {
      menuBlock.hidden = true;
      return;
    }
    menuBlock.hidden = false;

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

  function applyNativeStoreData(scope) {
    scope.querySelectorAll('template[data-source-footer-localization]').forEach((template) => {
      const section = template.closest('.shopify-section') || document;
      const target = section.querySelector('.footer__localization');
      if (!target) return;
      target.querySelectorAll(':scope > .country-switcher, :scope > .language-switcher').forEach((node) => node.remove());
      target.append(template.content.cloneNode(true));
    });
    scope.querySelectorAll('template[data-source-footer-payments]').forEach((template) => {
      const section = template.closest('.shopify-section') || document;
      const target = section.querySelector('.footer__payment');
      if (target) target.replaceChildren(template.content.cloneNode(true));
    });
  }

  function applyOverrides(script) {
    let config;
    try {
      config = JSON.parse(script.textContent);
    } catch (_) {
      return;
    }

    const section = script.closest('.shopify-section') || document;
    const copyrightLink = section.querySelector('.footer__copyright a');
    if (copyrightLink) {
      copyrightLink.textContent = config.shopName || '';
      copyrightLink.href = '/';
    }
    const menuBlocks = section.querySelectorAll('.footer-block--menu');
    const menuConfigs = [config.menus?.service, config.menus?.information, config.menus?.collaboration, config.menus?.general];
    menuBlocks.forEach((block, index) => updateMenu(block, menuConfigs[index]));

    const contactBlock = section.querySelector('.footer-block--contact_information');
    if (contactBlock) {
      const hasContact = Boolean(config.contact?.address || config.contact?.email);
      contactBlock.hidden = !hasContact;
      if (hasContact) contactBlock.style.removeProperty('display');
      else contactBlock.style.setProperty('display', 'none', 'important');
      updateText(contactBlock.querySelector('.footer-block__heading'), config.contact?.heading);
      updateAddress(contactBlock.querySelector('.footer-info__address span'), config.contact?.address);
      const email = contactBlock.querySelector('.footer-info__email a');
      if (email && config.contact?.email) {
        email.textContent = config.contact.email;
        email.href = `mailto:${config.contact.email}`;
        const emailRow = email.closest('.footer-info__email');
        emailRow?.removeAttribute('hidden');
        emailRow?.style.removeProperty('display');
      } else {
        const emailRow = email?.closest('.footer-info__email');
        emailRow?.setAttribute('hidden', '');
        emailRow?.style.setProperty('display', 'none', 'important');
      }
    }

    const awardsBlock = section.querySelector('.footer-block--image_text');
    if (config.awardsImage) {
      const image = awardsBlock?.querySelector('img');
      awardsBlock?.removeAttribute('hidden');
      awardsBlock?.style.removeProperty('display');
      if (image) {
        image.src = config.awardsImage;
        image.removeAttribute('srcset');
        image.closest('picture')?.querySelectorAll('source').forEach((source) => source.remove());
      }
    } else {
      awardsBlock?.setAttribute('hidden', '');
      awardsBlock?.style.setProperty('display', 'none', 'important');
    }

    Object.entries(config.social || {}).forEach(([network, url]) => {
      const link = section.querySelector(`.social__link:has(.icon-${network})`);
      if (!link) return;
      link.hidden = !url;
      if (url) {
        link.href = url;
        link.style.removeProperty('display');
      } else {
        link.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function initialize(scope = document) {
    applyNativeStoreData(scope);
    scope.querySelectorAll(selector).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', () => initialize());
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
