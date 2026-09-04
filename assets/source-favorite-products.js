(() => {
  const ROOT_SELECTOR = 'favorite-products[data-enable-slider="true"]';
  const TRANSITION_MS = 300;
  const SLIDE_DURATION_MS = 680;
  const SLIDE_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';

  function slidesFor(root, selector) {
    return Array.from(root.querySelectorAll(`${selector} > .swiper-wrapper > .swiper-slide:not([hidden])`));
  }

  function render(root, index) {
    const testimonialSlides = slidesFor(root, '.favorite-products__testimonials .swiper');
    const productSlides = slidesFor(root, '.favorite-products__products');
    const mediaSlides = slidesFor(root, '.favorite-products__media .swiper');
    const total = testimonialSlides.length;
    const nextIndex = Math.max(0, Math.min(index, total - 1));

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const transformTransition = reduceMotion
      ? 'none'
      : `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;
    const fadeTransition = reduceMotion
      ? 'none'
      : `opacity ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;

    [
      root.querySelector('.favorite-products__testimonials .swiper-wrapper'),
      root.querySelector('.favorite-products__products > .swiper-wrapper'),
      root.querySelector('.favorite-products__media .swiper-wrapper'),
    ].filter(Boolean).forEach((track) => {
      track.style.transition = transformTransition;
      track.style.willChange = 'transform';
      track.style.transform = `translate3d(-${nextIndex * 100}%, 0, 0)`;
    });

    [
      root.querySelectorAll('.favorite-products__testimonials .swiper-slide:not([hidden])'),
      root.querySelectorAll('.favorite-products__media .swiper-slide:not([hidden])'),
    ].forEach((slides) => {
      slides.forEach((slide) => {
        slide.style.transition = fadeTransition;
        slide.style.opacity = slide.dataset.index === String(nextIndex) ? '1' : '0.72';
      });
    });

    productSlides.forEach((slide, slideIndex) => {
      slide.classList.toggle('source-favorite-active', slideIndex === nextIndex);
    });

    const pagination = root.querySelector('.swiper-pagination');
    if (pagination) {
      pagination.innerHTML = `<span class="swiper-pagination-current">${nextIndex + 1}</span><span class="swiper-pagination-separator"> / </span><span class="swiper-pagination-total">${total}</span>`;
      pagination.setAttribute('aria-label', `${nextIndex + 1} von ${total}`);
    }

    root.querySelector('.swiper-button-prev').disabled = nextIndex === 0;
    root.querySelector('.swiper-button-next').disabled = nextIndex === total - 1;
    root.dataset.sourceFavoriteIndex = String(nextIndex);
  }

  function init(root) {
    if (root.dataset.sourceFavoriteReady === 'true') return;

    const testimonials = slidesFor(root, '.favorite-products__testimonials .swiper');
    if (!testimonials.length) return;

    root.dataset.sourceFavoriteReady = 'true';
    root.classList.add('source-favorite-ready');

    root.addEventListener('source:favorite:select', (event) => {
      const index = Number(event.detail?.index);
      if (Number.isFinite(index)) render(root, index);
    });

    root.querySelector('.swiper-button-prev').addEventListener('click', () => {
      render(root, Number(root.dataset.sourceFavoriteIndex || 0) - 1);
    });
    root.querySelector('.swiper-button-next').addEventListener('click', () => {
      render(root, Number(root.dataset.sourceFavoriteIndex || 0) + 1);
    });

    let dragStartX = 0;
    let dragStartY = 0;
    let dragging = false;

    root.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('.swiper-controls')) return;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragging = true;
      root.setPointerCapture?.(event.pointerId);
    }, { passive: true });

    root.addEventListener('pointerup', (event) => {
      if (!dragging) return;
      dragging = false;
      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;

      const current = Number(root.dataset.sourceFavoriteIndex || 0);
      render(root, current + (deltaX < 0 ? 1 : -1));
    }, { passive: true });

    root.addEventListener('pointercancel', () => {
      dragging = false;
    }, { passive: true });

    render(root, 0);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(ROOT_SELECTOR).forEach(init);
  });

  window.setTimeout(() => {
    document.querySelectorAll(ROOT_SELECTOR).forEach(init);
  }, TRANSITION_MS);
})();
