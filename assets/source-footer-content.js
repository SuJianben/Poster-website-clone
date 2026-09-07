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

  function updatePhone(container, value) {
    if (!container) return;
    let row = container.querySelector('.footer-info__phone');
    if (!value) {
      row?.remove();
      return;
    }
    if (!row) {
      row = document.createElement('div');
      row.className = 'footer-info__item footer-info__phone';
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('width', '20');
      icon.setAttribute('height', '20');
      icon.setAttribute('viewBox', '0 0 20 20');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<path d="M6.1 2.5h2.1l1.1 3.4-1.4 1.4c.8 1.7 2.2 3.1 3.9 3.9l1.4-1.4 3.4 1.1V13c0 1.1-.9 2-2 2C8.6 15 5 11.4 5 7.1c0-1.1.9-2 2-2Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>';
      row.append(icon, document.createElement('a'));
      container.append(row);
    }
    const link = row.querySelector('a');
    if (link) {
      link.textContent = value;
      link.href = `tel:${value.replace(/[^+\d]/g, '')}`;
    }
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
      const hasContact = Boolean(config.contact?.address || config.contact?.email || config.contact?.phone);
      contactBlock.hidden = !hasContact;
      if (hasContact) contactBlock.style.removeProperty('display');
      else contactBlock.style.setProperty('display', 'none', 'important');
      updateText(contactBlock.querySelector('.footer-block__heading'), config.contact?.heading);
      updateAddress(contactBlock.querySelector('.footer-info__address span'), config.contact?.address);
      updatePhone(contactBlock.querySelector('.footer-block__contact-info'), config.contact?.phone);
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

  function applySwedishBenefitText(scope) {
    const root = scope.querySelector('#shopify-section-sections--28031812927754__multicolumn_icon_rTKNUF')
      || document.querySelector('#shopify-section-sections--28031812927754__multicolumn_icon_rTKNUF');
    if (!root) return;
    const decode = (value) => {
      const node = document.createElement('textarea');
      node.innerHTML = value;
      return node.value;
    };
    const benefits = [
      ['30 dagars &ouml;ppet k&ouml;p', 'Handla tryggt &#8211; returnera om det inte passar.'],
      ['Fri frakt p&aring; alla best&auml;llningar &ouml;ver 499 kr', ''],
      ['Snabb och s&auml;ker leverans', 'Leverans inom 12&#8211;15 arbetsdagar.'],
      ['100 % s&auml;kra betalningar', 'Betala med PayPal, kort eller Klarna'],
      ['V&auml;nlig kundservice', 'Kontakta oss via v&aring;r kontaktsida']
    ];
    root.querySelectorAll('.multicolumn-card').forEach((card, index) => {
      const benefit = benefits[index];
      if (!benefit) return;
      const title = card.querySelector('.multicolumn-card__title');
      const text = card.querySelector('.multicolumn-card__text');
      if (title) title.textContent = decode(benefit[0]);
      if (text && benefit[1]) text.textContent = decode(benefit[1]);
    });
  }

  function initialize(scope = document) {
    applyNativeStoreData(scope);
    scope.querySelectorAll(selector).forEach(applyOverrides);
    applySwedishBenefitText(scope);
  }

  document.addEventListener('DOMContentLoaded', () => initialize());
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
