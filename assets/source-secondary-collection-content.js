(() => {
  const DATA_SELECTOR = 'script[data-source-secondary-collection-overrides]';

  function replaceText(element, value) {
    if (element && value) element.textContent = value;
  }

  function updateImage(image, source, alt) {
    if (!image || !source) return;
    image.src = source;
    image.removeAttribute('srcset');
    if (alt) image.alt = alt;
  }

  function replaceCardTitle(element, value) {
    if (!element || !value) return;
    const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = value;
    } else {
      element.prepend(document.createTextNode(value));
    }
  }

  function applyCard(card, data) {
    if (!card) return;

    const link = card.querySelector('.collection-card__wrapper');
    const title = card.querySelector('.collection-card__title span');
    const resolvedTitle = data.title || data.collection?.title;

    replaceCardTitle(title, resolvedTitle);
    if (link && data.collection?.url) link.href = data.collection.url;
    if (data.collection) updateImage(card.querySelector('img'), data.collection.image, resolvedTitle || data.collection.title);
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
    data.cards.forEach((card, index) => applyCard(cards[card.index ?? index], card));
  }

  function initialize() {
    document.querySelectorAll(DATA_SELECTOR).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
