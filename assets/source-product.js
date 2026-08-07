(() => {
  const formatMoney = (cents) => {
    const currency = window.Shopify?.currency?.active || 'EUR';
    const locale = document.documentElement.lang || 'de-DE';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(cents) / 100);
  };

  const initGallery = (gallery) => {
    const thumbs = [...gallery.querySelectorAll('[data-source-product-thumb]')];
    const slides = [...gallery.querySelectorAll('[data-source-product-slide]')];
    const prev = gallery.querySelector('[data-source-product-prev]');
    const next = gallery.querySelector('[data-source-product-next]');
    const thumbPrev = gallery.querySelector('[data-source-product-thumb-prev]');
    const thumbNext = gallery.querySelector('[data-source-product-thumb-next]');
    const thumbList = gallery.querySelector('[data-source-product-thumbs]');
    const lightbox = gallery.querySelector('[data-source-product-lightbox]');
    const lightboxImage = gallery.querySelector('[data-source-product-lightbox-image]');
    let activeIndex = Math.max(0, slides.findIndex((slide) => !slide.hidden));
    let lightboxIndex = activeIndex;

    const updateArrows = () => {
      const disabled = slides.length < 2;
      if (prev) prev.disabled = disabled;
      if (next) next.disabled = disabled;
      if (thumbPrev) thumbPrev.disabled = disabled;
      if (thumbNext) thumbNext.disabled = disabled;
    };

    const activate = (index, moveFocus = false) => {
      if (!slides.length) return;
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === activeIndex;
        slide.hidden = !active;
        slide.classList.toggle('is-active', active);
      });
      thumbs.forEach((thumb, thumbIndex) => {
        const active = thumbIndex === activeIndex;
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-current', String(active));
        if (active && thumbList) thumb.scrollIntoView({ block: 'nearest', behavior: moveFocus ? 'smooth' : 'auto' });
      });
      updateArrows();
    };

    const imageFor = (index) => slides[index]?.querySelector('img');
    const openLightbox = (index) => {
      if (!lightbox || !lightboxImage) return;
      lightboxIndex = (index + slides.length) % slides.length;
      const image = imageFor(lightboxIndex);
      if (!image) return;
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt || '';
      if (typeof lightbox.showModal === 'function') lightbox.showModal();
      else lightbox.setAttribute('open', '');
    };

    thumbs.forEach((thumb) => thumb.addEventListener('click', () => activate(Number(thumb.dataset.mediaIndex), true)));
    slides.forEach((slide) => slide.querySelector('[data-source-product-zoom]')?.addEventListener('click', () => openLightbox(Number(slide.dataset.mediaIndex))));
    prev?.addEventListener('click', () => activate(activeIndex - 1, true));
    next?.addEventListener('click', () => activate(activeIndex + 1, true));
    thumbPrev?.addEventListener('click', () => activate(activeIndex - 1, true));
    thumbNext?.addEventListener('click', () => activate(activeIndex + 1, true));
    gallery.querySelector('[data-source-product-lightbox-close]')?.addEventListener('click', () => lightbox?.close());
    gallery.querySelector('[data-source-product-lightbox-prev]')?.addEventListener('click', () => openLightbox(lightboxIndex - 1));
    gallery.querySelector('[data-source-product-lightbox-next]')?.addEventListener('click', () => openLightbox(lightboxIndex + 1));
    lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') activate(activeIndex - 1);
      if (event.key === 'ArrowRight') activate(activeIndex + 1);
    });
    activate(activeIndex);
  };

  const initPurchase = (purchase) => {
    const form = purchase.querySelector('[data-source-product-form]');
    const variantsNode = purchase.parentElement.parentElement.querySelector('[data-source-product-variants]') || document.querySelector('[data-source-product-variants]');
    const variants = JSON.parse(variantsNode?.textContent || '[]');
    if (!form || !variants.length) return;

    const variantInput = form.querySelector('[data-source-product-variant-id]');
    const price = purchase.querySelector('[data-source-product-current-price]');
    const comparePrice = purchase.querySelector('[data-source-product-compare-price]');
    const submit = form.querySelector('[data-source-product-submit]');
    const status = form.querySelector('[data-source-product-status]');
    const optionGroups = [...form.querySelectorAll('[data-source-product-option]')];
    const getOptions = () => optionGroups.map((group) => group.querySelector('[data-source-product-option-input]:checked')?.value || '');
    const matchingVariant = () => variants.find((variant) => variant.options.every((option, index) => option === getOptions()[index]));

    const update = () => {
      const variant = matchingVariant();
      optionGroups.forEach((group) => {
        const selected = group.querySelector('[data-source-product-option-input]:checked');
        const label = group.querySelector('[data-source-product-option-label]');
        if (label) label.textContent = selected?.value || '';
      });
      if (!variant) {
        submit.disabled = true;
        return;
      }
      variantInput.value = variant.id;
      price.textContent = formatMoney(variant.price);
      const hasCompareAt = Number(variant.compare_at_price) > Number(variant.price);
      comparePrice.hidden = !hasCompareAt;
      comparePrice.textContent = hasCompareAt ? formatMoney(variant.compare_at_price) : '';
      submit.disabled = !variant.available;
      submit.querySelector('span').textContent = variant.available ? 'In den Warenkorb legen' : 'Ausverkauft';
      history.replaceState({}, '', `${location.pathname}?variant=${variant.id}`);
    };

    form.querySelectorAll('[data-source-product-option-input]').forEach((input) => input.addEventListener('change', update));
    form.querySelectorAll('[data-source-product-quantity]').forEach((button) => button.addEventListener('click', () => {
      const input = form.querySelector('[data-source-product-quantity-input]');
      input.value = Math.max(1, Number(input.value || 1) + Number(button.dataset.sourceProductQuantity));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }));
    form.querySelector('[data-source-product-quantity-input]')?.addEventListener('change', (event) => { event.target.value = Math.max(1, Number(event.target.value || 1)); });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      status.textContent = '';
      status.dataset.state = '';
      submit.disabled = true;
      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
        if (!response.ok) throw new Error('Could not add item');
        status.dataset.state = 'success';
        status.textContent = 'Zum Warenkorb hinzugefügt.';
        document.querySelector('[aria-controls="CartDrawer"]')?.click();
        document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = 'Der Artikel konnte nicht zum Warenkorb hinzugefügt werden.';
      } finally {
        submit.disabled = false;
        update();
      }
    });
    update();
  };

  const initModals = () => {
    document.querySelectorAll('[data-source-product-size-modal]').forEach((modal) => {
      document.querySelectorAll('[data-source-product-size-guide]').forEach((button) => button.addEventListener('click', () => {
        if (typeof modal.showModal === 'function') modal.showModal(); else modal.setAttribute('open', '');
      }));
      modal.querySelector('[data-source-product-size-close]')?.addEventListener('click', () => modal.close());
      modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });
    });
  };

  const init = () => {
    document.querySelectorAll('[data-source-product-gallery]').forEach(initGallery);
    document.querySelectorAll('[data-source-product-purchase]').forEach(initPurchase);
    initModals();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
