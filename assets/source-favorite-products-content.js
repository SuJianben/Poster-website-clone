(() => {
  const DATA_SELECTOR = 'script[data-source-favorite-overrides]';

  function replaceText(element, value) {
    if (element && value) element.textContent = value;
  }

  function replaceMultilineText(element, value) {
    if (!element || !value) return;

    element.replaceChildren();
    value.split(/\r?\n/).forEach((line, index) => {
      if (index) element.append(document.createElement('br'));
      element.append(document.createTextNode(line));
    });
  }

  function updateImage(image, source, alt) {
    if (!image || !source) return;
    image.src = source;
    image.removeAttribute('srcset');
    if (alt) image.alt = alt;
  }

  function applyProduct(slide, product) {
    if (!slide || !product) return;

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
    if (!source) return;
    const mediaSlide = root.querySelector(`.favorite-products__media .swiper-slide[data-index="${index}"]`);
    const productSlide = root.querySelector(`.favorite-products__products > .swiper-wrapper > .swiper-slide[data-index="${index}"]`);
    updateImage(mediaSlide?.querySelector('img'), source);
    updateImage(productSlide?.querySelector('.favorite-product__bg img'), source);
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

    data.slides.forEach((slideData) => {
      const testimonialSlide = root.querySelector(`.favorite-products__testimonials .swiper-slide[data-index="${slideData.index}"]`);
      if (testimonialSlide) {
        replaceText(testimonialSlide.querySelector('.testimonial__content h2'), slideData.title);
        replaceMultilineText(testimonialSlide.querySelector('.testimonial__content h4'), slideData.body);
        replaceText(testimonialSlide.querySelector('.testimonial__name'), slideData.name);
        replaceText(testimonialSlide.querySelector('.testimonial__bio span'), slideData.location);
      }

      const productSlide = root.querySelector(`.favorite-products__products > .swiper-wrapper > .swiper-slide[data-index="${slideData.index}"]`);
      applyProduct(productSlide, slideData.product);
      applyScene(root, slideData.index, slideData.sceneImage);
    });
  }

  function initialize() {
    document.querySelectorAll(DATA_SELECTOR).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
