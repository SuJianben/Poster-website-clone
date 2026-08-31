(() => {
  const DATA_SELECTOR = 'script[data-source-secondary-collection-overrides]';
  const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

  function replaceText(element, value) {
    if (element) element.textContent = value || '';
  }

  function updateImage(image, source, alt) {
    if (!image) return;
    image.src = source || EMPTY_IMAGE;
    image.removeAttribute('srcset');
    image.alt = alt || '';
  }

  function replaceCardTitle(element, value) {
    if (!element) return;
    const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = value || '';
    } else {
      element.prepend(document.createTextNode(value || ''));
    }
  }

  function applyCard(card, data) {
    if (!card) return;

    window.sourceThemeEditorApplyAttributes?.(card, data.shopifyAttributes);

    const link = card.querySelector('.collection-card__wrapper');
    const title = card.querySelector('.collection-card__title span');
    const resolvedTitle = data.title || data.collection?.title;

    replaceCardTitle(title, resolvedTitle);
    if (link) {
      if (data.collection?.url) link.href = data.collection.url;
      else link.removeAttribute('href');
    }
    updateImage(card.querySelector('img'), data.collection?.image, resolvedTitle || data.collection?.title);
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

    replaceText(section.querySelector('.section__heading motion-element'), data.heading);
    const cards = section.querySelectorAll('.collection-list__items > .f-column');
    cards.forEach((card, index) => {
      card.hidden = index >= data.cards.length || !data.cards[index]?.collection;
    });
    data.cards.forEach((card, index) => applyCard(cards[card.index ?? index], card));
  }

  function initialize() {
    document.querySelectorAll(DATA_SELECTOR).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
