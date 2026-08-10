(() => {
  const product = document.querySelector('[data-spx-product]');
  if (!product) return;

  const mainImage = product.querySelector('[data-spx-main-image]');
  const zoom = product.querySelector('[data-spx-zoom]');
  const zoomImage = product.querySelector('[data-spx-zoom-image]');
  const thumbTrack = product.querySelector('[data-spx-thumb-track]');
  const thumbs = [...product.querySelectorAll('[data-spx-image]')];
  let activeIndex = 0;
  let thumbOffset = 0;

  const setActiveImage = (index) => {
    activeIndex = (index + thumbs.length) % thumbs.length;
    const thumb = thumbs[activeIndex];
    mainImage.src = thumb.dataset.spxImage;
    zoomImage.src = thumb.dataset.spxImage.replace('width=1620', 'width=1946');
    thumbs.forEach((item, itemIndex) => {
      const isActive = itemIndex === activeIndex;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
  };

  thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => setActiveImage(index)));
  product.querySelectorAll('[data-spx-next]').forEach((button) => button.addEventListener('click', () => setActiveImage(activeIndex + 1)));
  product.querySelectorAll('[data-spx-previous]').forEach((button) => button.addEventListener('click', () => setActiveImage(activeIndex - 1)));
  product.querySelectorAll('[data-spx-open-zoom]').forEach((button) => button.addEventListener('click', () => zoom.showModal()));
  product.querySelector('[data-spx-close-zoom]').addEventListener('click', () => zoom.close());
  zoom.addEventListener('click', (event) => { if (event.target === zoom) zoom.close(); });
  document.addEventListener('keydown', (event) => {
    if (!zoom.open) return;
    if (event.key === 'Escape') zoom.close();
    if (event.key === 'ArrowRight') setActiveImage(activeIndex + 1);
    if (event.key === 'ArrowLeft') setActiveImage(activeIndex - 1);
  });
  product.querySelectorAll('[data-spx-thumb-scroll]').forEach((button) => button.addEventListener('click', () => {
    const step = thumbs[0] ? thumbs[0].getBoundingClientRect().height + Number.parseFloat(getComputedStyle(thumbTrack).gap || '0') : 0;
    const maxOffset = Math.max(0, (thumbs.length - 6) * step);
    thumbOffset = Math.max(-maxOffset, Math.min(0, thumbOffset - Number(button.dataset.spxThumbScroll) * step));
    thumbTrack.style.transform = `translateY(${thumbOffset}px)`;
  }));

  product.querySelectorAll('[data-spx-option]').forEach((option) => {
    option.addEventListener('click', () => {
      const group = option.dataset.spxOption;
      product.querySelectorAll(`[data-spx-option="${group}"]`).forEach((item) => item.classList.toggle('is-selected', item === option));
      const output = product.querySelector(group === 'material' ? '[data-spx-material]' : '[data-spx-size]');
      if (output) output.textContent = option.dataset.spxValue;
    });
  });

  product.querySelectorAll('[data-spx-accordion]').forEach((accordion) => {
    accordion.addEventListener('toggle', () => {
      if (!accordion.open) return;
      product.querySelectorAll('[data-spx-accordion]').forEach((item) => {
        if (item !== accordion) item.removeAttribute('open');
      });
    });
  });
})();
