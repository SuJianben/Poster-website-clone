(() => {
  const DATA_SELECTOR = 'script[data-source-footer-icons-overrides]';

  function replaceText(element, value) {
    if (element && value) element.textContent = value;
  }

  function createSourceIconMap(section) {
    return Array.from(section.querySelectorAll('.multicolumn-card__image svg')).reduce((icons, icon) => {
      const iconClass = Array.from(icon.classList).find((name) => name.startsWith('icon-') && name !== 'icon--medium' && name !== 'icon--thick');
      if (iconClass) icons[iconClass.replace('icon-', '')] ||= icon.cloneNode(true);
      return icons;
    }, {});
  }

  function replaceIcon(card, iconName, iconMap) {
    if (!iconName || !iconMap[iconName]) return;
    const currentIcon = card.querySelector('.multicolumn-card__image svg');
    if (currentIcon) currentIcon.replaceWith(iconMap[iconName].cloneNode(true));
  }

  function replaceDescription(card, value) {
    if (!value) return;
    let description = card.querySelector('.multicolumn-card__text');
    if (!description) {
      description = document.createElement('div');
      description.className = 'multicolumn-card__text rich-text__text rte text-base text-subtext';
      description.append(document.createElement('p'));
      card.querySelector('.multicolumn-card__info')?.append(description);
    }
    replaceText(description.querySelector('p') || description, value);
  }

  function applyItem(card, item, iconMap) {
    if (!card) return;
    window.sourceThemeEditorApplyAttributes?.(card, item.shopifyAttributes);
    replaceIcon(card, item.icon, iconMap);
    replaceText(card.querySelector('.multicolumn-card__title'), item.title);
    replaceDescription(card, item.text);
  }

  function applyOverrides(dataElement) {
    let data;
    try {
      data = JSON.parse(dataElement.textContent);
    } catch {
      return;
    }

    const section = dataElement.closest('.shopify-section');
    if (!section) return;

    const heading = section.querySelector('.section__heading motion-element');
    const headingPrefix = data.headingPrefix && data.headingHighlight && !/\s$/.test(data.headingPrefix)
      ? `${data.headingPrefix} `
      : data.headingPrefix;
    replaceText(Array.from(heading?.childNodes || []).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()), headingPrefix);
    replaceText(heading?.querySelector('.highlight-text'), data.headingHighlight);

    const iconMap = createSourceIconMap(section);
    const cards = section.querySelectorAll('.multicolumn__items > .f-column');
    data.items.forEach((item, index) => applyItem(cards[item.index ?? index], item, iconMap));
  }

  function initialize() {
    document.querySelectorAll(DATA_SELECTOR).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
