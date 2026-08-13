(() => {
  const product = document.querySelector('[data-swp-product]');
  if (!product) return;
  const thumbs = [...product.querySelectorAll('[data-swp-media-index]')];
  const mainImage = product.querySelector('[data-swp-main-image]');
  const zoom = product.querySelector('[data-swp-zoom]');
  const zoomImage = product.querySelector('[data-swp-zoom-image]');
  const track = product.querySelector('[data-swp-thumb-track]');
  let activeIndex = 0;
  let thumbOffset = 0;

  const setActiveMedia = (nextIndex) => {
    activeIndex = (nextIndex + thumbs.length) % thumbs.length;
    const thumb = thumbs[activeIndex];
    const url = thumb.dataset.swpMediaUrl;
    mainImage.src = url;
    zoomImage.src = url;
    thumbs.forEach((item, index) => {
      const active = index === activeIndex;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
  };

  thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => setActiveMedia(index)));
  product.querySelectorAll('[data-swp-next]').forEach((button) => button.addEventListener('click', () => setActiveMedia(activeIndex + 1)));
  product.querySelectorAll('[data-swp-previous]').forEach((button) => button.addEventListener('click', () => setActiveMedia(activeIndex - 1)));
  product.querySelector('[data-swp-open-zoom]').addEventListener('click', () => zoom.showModal());
  product.querySelector('[data-swp-close-zoom]').addEventListener('click', () => zoom.close());
  zoom.addEventListener('click', (event) => { if (event.target === zoom) zoom.close(); });
  document.addEventListener('keydown', (event) => {
    if (!zoom.open) return;
    if (event.key === 'Escape') zoom.close();
    if (event.key === 'ArrowRight') setActiveMedia(activeIndex + 1);
    if (event.key === 'ArrowLeft') setActiveMedia(activeIndex - 1);
  });

  product.querySelectorAll('[data-swp-thumb-scroll]').forEach((button) => button.addEventListener('click', () => {
    thumbOffset = Math.max(-Math.max(0, (thumbs.length - 6) * 92), Math.min(0, thumbOffset + Number(button.dataset.swpThumbScroll) * -92));
    track.style.transform = `translateY(${thumbOffset}px)`;
  }));

  product.querySelectorAll('[data-swp-choice="material"]').forEach((button) => button.addEventListener('click', () => {
    product.querySelectorAll('[data-swp-choice="material"]').forEach((item) => item.classList.toggle('is-selected', item === button));
    product.querySelector('[data-swp-material-label]').textContent = button.dataset.swpValue;
  }));
  product.querySelectorAll('[data-swp-choice="size"]').forEach((button) => button.addEventListener('click', () => {
    product.querySelectorAll('[data-swp-choice="size"]').forEach((item) => item.classList.toggle('is-selected', item === button));
    const unit = product.querySelector('[data-swp-unit].is-selected').dataset.swpUnit;
    product.querySelector('[data-swp-size-label]').textContent = unit === 'cm' ? button.dataset.swpCm : button.dataset.swpIn;
  }));
  product.querySelectorAll('[data-swp-unit]').forEach((button) => button.addEventListener('click', () => {
    product.querySelectorAll('[data-swp-unit]').forEach((item) => item.classList.toggle('is-selected', item === button));
    const selected = product.querySelector('[data-swp-choice="size"].is-selected');
    product.querySelector('[data-swp-size-label]').textContent = button.dataset.swpUnit === 'cm' ? selected.dataset.swpCm : selected.dataset.swpIn;
  }));

  const sizeGuide = product.querySelector('[data-swp-size-guide]');
  product.querySelector('[data-swp-open-size-guide]').addEventListener('click', () => sizeGuide.showModal());
  product.querySelector('[data-swp-close-size-guide]').addEventListener('click', () => sizeGuide.close());
  sizeGuide.addEventListener('click', (event) => { if (event.target === sizeGuide) sizeGuide.close(); });

  product.querySelectorAll('[data-swp-accordion-trigger]').forEach((trigger) => trigger.addEventListener('click', () => {
    const item = trigger.closest('.swp-accordion');
    const open = !item.classList.contains('is-open');
    item.closest('[data-swp-accordions]').querySelectorAll('.swp-accordion').forEach((accordion) => {
      accordion.classList.toggle('is-open', accordion === item && open);
      accordion.querySelector('[data-swp-accordion-trigger]').setAttribute('aria-expanded', String(accordion === item && open));
    });
  }));

  const addButton = product.querySelector('[data-swp-add-to-cart]');
  const addLabel = product.querySelector('[data-swp-add-label]');
  const feedback = product.querySelector('[data-swp-cart-feedback]');
  addButton.addEventListener('click', () => {
    if (addButton.classList.contains('is-loading')) return;
    addButton.classList.add('is-loading'); addLabel.textContent = 'Adding…'; feedback.textContent = '';
    window.setTimeout(() => { addButton.classList.remove('is-loading'); addButton.classList.add('is-success'); addLabel.textContent = 'Added'; feedback.textContent = 'Added to your preview cart.'; window.setTimeout(() => { addButton.classList.remove('is-success'); addLabel.textContent = 'Add To Cart'; }, 1400); }, 600);
  });
})();
