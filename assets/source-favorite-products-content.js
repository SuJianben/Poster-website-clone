(() => {
  const DATA_SELECTOR = 'script[data-source-favorite-overrides]';
  const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

  function replaceText(element, value) {
    if (element) element.textContent = value || '';
  }

  function replaceMultilineText(element, value) {
    if (!element) return;

    element.replaceChildren();
    if (!value) return;
    value.split(/\r?\n/).forEach((line, index) => {
      if (index) element.append(document.createElement('br'));
      element.append(document.createTextNode(line));
    });
  }

  function updateImage(image, source, alt) {
    if (!image) return;
    image.src = source || EMPTY_IMAGE;
    image.removeAttribute('srcset');
    image.alt = alt || '';
  }

  function applyProduct(slide, product) {
    if (!slide) return;

    if (!product) {
      slide.querySelectorAll('.product-card a[href]').forEach((link) => link.removeAttribute('href'));
      updateImage(slide.querySelector('.product-card__image--main img'));
      slide.querySelector('.product-card__image--second')?.classList.add('hidden');
      replaceText(slide.querySelector('.product-card__title .reversed-link__text'));
      replaceText(slide.querySelector('.product-card__material'));
      replaceText(slide.querySelector('.f-price-item--regular'));
      return;
    }

    slide.querySelectorAll('.product-card a[href]').forEach((link) => {
      link.href = product.url;
      link.setAttribute('aria-label', product.title);
    });
    updateImage(slide.querySelector('.product-card__image--main img'), product.primaryImage, product.title);

    const secondImage = slide.querySelector('.product-card__image--second');
    if (product.secondaryImage) {
      updateImage(secondImage?.querySelector('img'), product.secondaryImage, product.title);
      secondImage?.classList.remove('hidden');
    } else {
      secondImage?.classList.add('hidden');
    }

    replaceText(slide.querySelector('.product-card__title .reversed-link__text'), product.title);
    replaceText(slide.querySelector('.product-card__material'), product.material);
    const price = `${product.priceVaries ? 'Ab ' : ''}${product.price}`;
    replaceText(slide.querySelector('.f-price-item--regular'), price);
  }

  function applyScene(root, index, source) {
    const mediaSlide = root.querySelector(`.favorite-products__media .swiper-slide[data-index="${index}"]`);
    const productSlide = root.querySelector(`.favorite-products__products > .swiper-wrapper > .swiper-slide[data-index="${index}"]`);
    updateImage(mediaSlide?.querySelector('img'), source);
    updateImage(productSlide?.querySelector('.favorite-product__bg img'), source);
  }

  function setSlideVisibility(root, index, visible) {
    [
      `.favorite-products__testimonials .swiper-slide[data-index="${index}"]`,
      `.favorite-products__products > .swiper-wrapper > .swiper-slide[data-index="${index}"]`,
      `.favorite-products__media .swiper-slide[data-index="${index}"]`,
    ].forEach((selector) => {
      const slide = root.querySelector(selector);
      if (slide) {
        slide.hidden = !visible;
        if (visible) slide.style.removeProperty('display');
        else slide.style.setProperty('display', 'none', 'important');
      }
    });
  }

  function applyOverrides(dataElement) {
    let data;
    try {
      data = JSON.parse(dataElement.textContent);
    } catch {
      return;
    }

    const section = dataElement.closest('.shopify-section');
    const root = section?.querySelector('favorite-products');
    if (!root) return;

    replaceText(root.querySelector('.favorite-products__testimonials .section__heading'), data.heading);

    const capturedSlideCount = root.querySelectorAll('.favorite-products__testimonials .swiper-slide[data-index]').length;
    for (let index = data.slides.length; index < capturedSlideCount; index += 1) {
      setSlideVisibility(root, index, false);
    }

    data.slides.forEach((slideData) => {
      const hasContent = Boolean(
        slideData.title || slideData.body || slideData.name || slideData.location ||
        slideData.sceneImage || slideData.product
      );
      setSlideVisibility(root, slideData.index, hasContent);

      const testimonialSlide = root.querySelector(`.favorite-products__testimonials .swiper-slide[data-index="${slideData.index}"]`);
      if (testimonialSlide) {
        replaceText(testimonialSlide.querySelector('.testimonial__content h2'), slideData.title);
        replaceMultilineText(testimonialSlide.querySelector('.testimonial__content h4'), slideData.body);
        replaceText(testimonialSlide.querySelector('.testimonial__name'), slideData.name);
        replaceText(testimonialSlide.querySelector('.testimonial__bio span'), slideData.location);
      }

      const productSlide = root.querySelector(`.favorite-products__products > .swiper-wrapper > .swiper-slide[data-index="${slideData.index}"]`);
      window.sourceThemeEditorApplyAttributes?.(productSlide, slideData.shopifyAttributes);
      applyProduct(productSlide, slideData.product);
      applyScene(root, slideData.index, slideData.sceneImage);
    });

    if (section.dataset.sourceFavoriteEditorReady !== 'true') {
      section.dataset.sourceFavoriteEditorReady = 'true';
      section.addEventListener('shopify:block:select', (event) => {
        const blockId = event.detail?.blockId;
        const slide = data.slides.find((item) => item.blockId === blockId);
        if (!slide) return;
        root.dispatchEvent(new CustomEvent('source:favorite:select', {
          detail: { index: slide.index }
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
