(() => {
  const DATA_SELECTOR = 'script[data-source-announcement-overrides]';
  const STARS = '★★★★★';
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

  function applyReview(card, review) {
    if (!card) return;

    window.sourceThemeEditorApplyAttributes?.(card, review.shopifyAttributes);

    replaceText(card.querySelector('.source-reviews-card__date'), review.date);
    replaceText(card.querySelector('.source-reviews-card__title'), review.title);
    replaceText(card.querySelector('.source-reviews-card__message'), review.message);
    replaceText(card.querySelector('.source-reviews-card__author'), review.author);

    const starElement = card.querySelector('.source-reviews-card__stars');
    if (review.rating) {
      const stars = STARS.slice(0, review.rating);
      replaceText(starElement, stars);
      starElement?.setAttribute('aria-label', `${review.rating} von 5 Sternen`);
    } else {
      replaceText(starElement);
      starElement?.removeAttribute('aria-label');
    }

    const titleLink = card.querySelector('.source-reviews-card__title');
    const productLink = review.link || review.product?.url;
    if (titleLink) {
      if (productLink) titleLink.href = productLink;
      else titleLink.removeAttribute('href');
    }

    const productElement = card.querySelector('.source-reviews-card__product');
    productElement?.toggleAttribute('hidden', !review.product);
    replaceText(card.querySelector('.source-reviews-card__product-name'), review.product?.title);
    updateImage(card.querySelector('.source-reviews-card__product img'), review.product?.image, review.product?.title);
  }

  function applyOverrides(dataElement) {
    let data;
    try {
      data = JSON.parse(dataElement.textContent);
    } catch {
      return;
    }

    const section = dataElement.closest('.shopify-section');
    const carousel = section?.querySelector('[data-source-reviews-carousel]');
    if (!carousel) return;

    replaceText(carousel.querySelector('.source-reviews-carousel__title'), data.heading);
    replaceText(carousel.querySelector('.source-reviews-carousel__summary span:last-child'), data.reviewCount);

    const cards = carousel.querySelectorAll('.source-reviews-card');
    cards.forEach((card, index) => {
      const review = data.reviews[index];
      card.hidden = !review || !(review.title || review.message || review.author || review.product);
    });
    data.reviews.forEach((review) => applyReview(cards[review.index], review));

    if (section.dataset.sourceAnnouncementEditorReady !== 'true') {
      section.dataset.sourceAnnouncementEditorReady = 'true';
      section.addEventListener('shopify:block:select', (event) => {
        const blockId = event.detail?.blockId;
        const review = data.reviews.find((item) => item.blockId === blockId);
        if (!review) return;
        carousel.dispatchEvent(new CustomEvent('source:reviews:select', {
          detail: { index: review.index }
        }));
      });
    }
  }

  function initialize() {
    document.querySelectorAll(DATA_SELECTOR).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
