(() => {
  const product = document.querySelector('[data-spx-product]');
  if (!product) return;

  const mainImage = product.querySelector('[data-spx-main-image]');
  const zoom = product.querySelector('[data-spx-zoom]');
  const zoomImage = product.querySelector('[data-spx-zoom-image]');
  const thumbTrack = product.querySelector('[data-spx-thumb-track]');
  const thumbs = [...product.querySelectorAll('[data-spx-image]')];
  const previousButtons = [...product.querySelectorAll('[data-spx-previous]')];
  const nextButtons = [...product.querySelectorAll('[data-spx-next]')];
  const thumbScrollButtons = [...product.querySelectorAll('[data-spx-thumb-scroll]')];
  const thumbWindow = thumbTrack?.closest('.spx-product__thumb-window');
  let activeIndex = 0;
  let thumbOffset = 0;
  let zoomCloseTimer;

  const setDisabled = (buttons, disabled) => buttons.forEach((button) => {
    button.disabled = disabled;
    button.classList.toggle('is-disabled', disabled);
    button.setAttribute('aria-disabled', String(disabled));
  });

  const syncViewerControls = () => {
    setDisabled(previousButtons, activeIndex === 0);
    setDisabled(nextButtons, activeIndex === thumbs.length - 1);
  };

  const syncThumbControls = () => {
    if (!thumbTrack || !thumbWindow) return;
    const maxOffset = Math.max(0, thumbTrack.scrollHeight - thumbWindow.clientHeight);
    const canMove = maxOffset > 0;
    const previous = thumbScrollButtons.filter((button) => Number(button.dataset.spxThumbScroll) < 0);
    const next = thumbScrollButtons.filter((button) => Number(button.dataset.spxThumbScroll) > 0);
    setDisabled(previous, !canMove || thumbOffset === 0);
    setDisabled(next, !canMove || Math.abs(thumbOffset) >= maxOffset);
  };

  const setActiveImage = (index, direction = 0) => {
    const nextIndex = Math.max(0, Math.min(thumbs.length - 1, index));
    if (nextIndex === activeIndex && mainImage.src) return;
    activeIndex = nextIndex;
    const thumb = thumbs[activeIndex];
    mainImage.src = thumb.dataset.spxImage;
    mainImage.animate(
      [
        { opacity: 0.35, transform: `translateX(${direction > 0 ? '2%' : direction < 0 ? '-2%' : '0'})` },
        { opacity: 1, transform: 'translateX(0)' }
      ],
      { duration: 300, easing: 'cubic-bezier(.3,1,.3,1)' }
    );
    zoomImage.src = thumb.dataset.spxImage.replace('width=1620', 'width=1946');
    if (zoom.open) {
      zoomImage.animate(
        [
          { opacity: 0, transform: `translateX(${direction > 0 ? '18px' : direction < 0 ? '-18px' : '0'}) scale(.985)` },
          { opacity: 1, transform: 'translateX(0) scale(1)' }
        ],
        { duration: 320, easing: 'cubic-bezier(.3,1,.3,1)' }
      );
    }
    thumbs.forEach((item, itemIndex) => {
      const isActive = itemIndex === activeIndex;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
    syncViewerControls();
  };

  thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => setActiveImage(index)));
  nextButtons.forEach((button) => button.addEventListener('click', () => setActiveImage(activeIndex + 1, 1)));
  previousButtons.forEach((button) => button.addEventListener('click', () => setActiveImage(activeIndex - 1, -1)));
  const openZoom = () => {
    window.clearTimeout(zoomCloseTimer);
    if (!zoom.open) zoom.showModal();
    zoom.classList.remove('is-closing');
    zoom.classList.add('is-opening');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => zoom.classList.remove('is-opening')));
  };

  const closeZoom = () => {
    if (!zoom.open || zoom.classList.contains('is-closing')) return;
    zoom.classList.remove('is-opening');
    zoom.classList.add('is-closing');
    zoomCloseTimer = window.setTimeout(() => zoom.close(), 400);
  };

  product.querySelectorAll('[data-spx-open-zoom]').forEach((button) => button.addEventListener('click', openZoom));
  product.querySelector('[data-spx-close-zoom]').addEventListener('click', closeZoom);
  zoom.addEventListener('click', (event) => { if (event.target === zoom) closeZoom(); });
  zoom.addEventListener('cancel', (event) => { event.preventDefault(); closeZoom(); });
  zoom.addEventListener('close', () => {
    window.clearTimeout(zoomCloseTimer);
    zoom.classList.remove('is-opening', 'is-closing');
  });
  document.addEventListener('keydown', (event) => {
    if (!zoom.open) return;
    if (event.key === 'Escape') { event.preventDefault(); closeZoom(); }
    if (event.key === 'ArrowRight') setActiveImage(activeIndex + 1, 1);
    if (event.key === 'ArrowLeft') setActiveImage(activeIndex - 1, -1);
  });
  thumbScrollButtons.forEach((button) => button.addEventListener('click', () => {
    const step = thumbs[0] ? thumbs[0].getBoundingClientRect().height + Number.parseFloat(getComputedStyle(thumbTrack).gap || '0') : 0;
    const maxOffset = Math.max(0, thumbTrack.scrollHeight - thumbWindow.clientHeight);
    thumbOffset = Math.max(-maxOffset, Math.min(0, thumbOffset - Number(button.dataset.spxThumbScroll) * step));
    thumbTrack.style.transform = `translateY(${thumbOffset}px)`;
    syncThumbControls();
  }));

  syncViewerControls();
  requestAnimationFrame(syncThumbControls);

  let selectedUnit = 'cm';
  const renderSizeLabels = () => {
    product.querySelectorAll('[data-spx-option="size"]').forEach((option) => {
      const label = option.querySelector('[data-spx-size-label]');
      if (label) label.textContent = option.dataset[`spxSize${selectedUnit === 'cm' ? 'Cm' : 'In'}`];
    });
    const selected = product.querySelector('[data-spx-option="size"].is-selected');
    const output = product.querySelector('[data-spx-size]');
    if (selected && output) output.textContent = selected.dataset[`spxSize${selectedUnit === 'cm' ? 'Cm' : 'In'}`];
  };

  product.querySelectorAll('[data-spx-option]').forEach((option) => {
    option.addEventListener('click', () => {
      const group = option.dataset.spxOption;
      product.querySelectorAll(`[data-spx-option="${group}"]`).forEach((item) => item.classList.toggle('is-selected', item === option));
      const output = product.querySelector(group === 'material' ? '[data-spx-material]' : '[data-spx-size]');
      if (output) output.textContent = group === 'size' ? option.dataset[`spxSize${selectedUnit === 'cm' ? 'Cm' : 'In'}`] : option.dataset.spxValue;
    });
  });

  product.querySelectorAll('[data-spx-unit]').forEach((button) => button.addEventListener('click', () => {
    selectedUnit = button.dataset.spxUnit;
    product.querySelectorAll('[data-spx-unit]').forEach((item) => item.classList.toggle('is-selected', item === button));
    renderSizeLabels();
  }));
  renderSizeLabels();

  const sizeGuide = product.querySelector('[data-spx-size-guide-dialog]');
  product.querySelector('[data-spx-size-guide]')?.addEventListener('click', () => sizeGuide?.showModal());
  product.querySelector('[data-spx-close-size-guide]')?.addEventListener('click', () => sizeGuide?.close());
  sizeGuide?.addEventListener('click', (event) => { if (event.target === sizeGuide) sizeGuide.close(); });

  const cartButton = product.querySelector('[data-spx-cart-button]');
  const cartLabel = product.querySelector('[data-spx-cart-label]');
  cartButton?.addEventListener('click', () => {
    if (cartButton.disabled) return;
    cartButton.disabled = true;
    cartButton.classList.add('is-loading');
    window.setTimeout(() => {
      cartButton.classList.remove('is-loading');
      cartButton.classList.add('is-success');
      cartLabel.textContent = 'Added to Cart';
      window.setTimeout(() => {
        cartButton.disabled = false;
        cartButton.classList.remove('is-success');
        cartLabel.textContent = 'Add To Cart';
      }, 1350);
    }, 460);
  });

  const accordions = [...product.querySelectorAll('[data-spx-accordion]')];
  const accordionMotionDuration = 520;

  const setAccordionExpanded = (accordion, expanded) => {
    accordion.setAttribute('aria-expanded', String(expanded));
    accordion.querySelector('summary')?.setAttribute('aria-expanded', String(expanded));
  };

  const finishAccordionClose = (accordion) => {
    window.clearTimeout(accordion._spxCloseTimer);
    accordion.classList.remove('is-closing');
    accordion.removeAttribute('open');
    setAccordionExpanded(accordion, false);
  };

  const closeAccordion = (accordion) => {
    if (!accordion.open || accordion.classList.contains('is-closing')) return;
    accordion.classList.remove('is-opening');
    accordion.classList.add('is-closing');
    setAccordionExpanded(accordion, false);
    accordion._spxCloseTimer = window.setTimeout(() => finishAccordionClose(accordion), accordionMotionDuration);
  };

  const openAccordion = (accordion) => {
    window.clearTimeout(accordion._spxCloseTimer);
    accordion.classList.remove('is-closing');
    accordions.forEach((item) => {
      if (item !== accordion) closeAccordion(item);
    });
    if (accordion.open) {
      setAccordionExpanded(accordion, true);
      return;
    }
    accordion.setAttribute('open', '');
    accordion.classList.add('is-opening');
    setAccordionExpanded(accordion, true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => accordion.classList.remove('is-opening'));
    });
  };

  accordions.forEach((accordion) => {
    setAccordionExpanded(accordion, accordion.open);
    accordion.querySelector('summary')?.addEventListener('click', (event) => {
      event.preventDefault();
      if (accordion.open && !accordion.classList.contains('is-closing')) closeAccordion(accordion);
      else openAccordion(accordion);
    });
  });
})();
