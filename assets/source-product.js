(() => {
  const money = (cents) => {
    const currency = window.Shopify?.currency?.active || 'EUR';
    const locale = document.documentElement.lang || 'de-DE';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(cents) / 100);
  };

  const track = (event, detail = {}) => {
    window.dataLayer?.push({ event, ...detail });
    document.dispatchEvent(new CustomEvent(event, { detail }));
  };

  const initGallery = (gallery) => {
    const slides = [...gallery.querySelectorAll('[data-source-product-slide]')];
    const thumbs = [...gallery.querySelectorAll('[data-source-product-thumb]')];
    const thumbViewport = gallery.querySelector('[data-source-product-thumbs]');
    const status = gallery.querySelector('[data-source-product-gallery-status]');
    const lightbox = gallery.querySelector('[data-source-product-lightbox]');
    const lightboxImage = gallery.querySelector('[data-source-product-lightbox-image]');
    let active = Math.max(0, slides.findIndex((slide) => !slide.hidden));
    let lightboxIndex = active;
    let pointerStart = null;

    const scrollThumbIntoView = (thumb, smooth) => {
      if (!thumbViewport || !thumb) return;
      const item = thumb.closest('.product__thumbs-item') || thumb;
      const top = item.offsetTop;
      const bottom = top + item.offsetHeight;
      if (top < thumbViewport.scrollTop) thumbViewport.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
      else if (bottom > thumbViewport.scrollTop + thumbViewport.clientHeight) thumbViewport.scrollTo({ top: bottom - thumbViewport.clientHeight, behavior: smooth ? 'smooth' : 'auto' });
    };

    const select = (index, smooth = false) => {
      if (!slides.length) return;
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const selected = slideIndex === active;
        slide.hidden = !selected;
        slide.classList.toggle('is-active', selected);
      });
      thumbs.forEach((thumb, thumbIndex) => {
        const selected = thumbIndex === active;
        thumb.setAttribute('aria-current', String(selected));
        thumb.closest('.product__thumbs-item')?.classList.toggle('swiper-slide-thumb-active', selected);
        if (selected) scrollThumbIntoView(thumb, smooth);
      });
      if (status) status.textContent = `Bild ${active + 1} von ${slides.length}`;
      track('product_gallery_change', { media_index: active + 1, media_count: slides.length });
    };

    const imageAt = (index) => slides[index]?.querySelector('img');
    const openLightbox = (index) => {
      if (!lightbox || !lightboxImage || !slides.length) return;
      lightboxIndex = (index + slides.length) % slides.length;
      const image = imageAt(lightboxIndex);
      if (!image) return;
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt || '';
      if (typeof lightbox.showModal === 'function') lightbox.showModal();
      else lightbox.setAttribute('open', '');
      track('product_gallery_zoom_open', { media_index: lightboxIndex + 1 });
    };

    thumbs.forEach((thumb) => thumb.addEventListener('click', () => select(Number(thumb.dataset.mediaIndex), true)));
    slides.forEach((slide) => slide.querySelector('[data-source-product-zoom]')?.addEventListener('click', () => openLightbox(Number(slide.dataset.mediaIndex))));
    gallery.querySelector('[data-source-product-prev]')?.addEventListener('click', () => select(active - 1, true));
    gallery.querySelector('[data-source-product-next]')?.addEventListener('click', () => select(active + 1, true));
    gallery.querySelector('[data-source-product-thumb-prev]')?.addEventListener('click', () => select(active - 1, true));
    gallery.querySelector('[data-source-product-thumb-next]')?.addEventListener('click', () => select(active + 1, true));
    gallery.querySelector('[data-source-product-lightbox-close]')?.addEventListener('click', () => lightbox?.close());
    gallery.querySelector('[data-source-product-lightbox-prev]')?.addEventListener('click', () => openLightbox(lightboxIndex - 1));
    gallery.querySelector('[data-source-product-lightbox-next]')?.addEventListener('click', () => openLightbox(lightboxIndex + 1));
    lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') select(active - 1, true);
      if (event.key === 'ArrowRight') select(active + 1, true);
    });
    gallery.addEventListener('pointerdown', (event) => { pointerStart = event.clientX; });
    gallery.addEventListener('pointerup', (event) => {
      if (pointerStart == null) return;
      const distance = event.clientX - pointerStart;
      pointerStart = null;
      if (Math.abs(distance) > 45) select(active + (distance < 0 ? 1 : -1), true);
    });
    select(active);
  };

  const inchesFromCm = (label) => label.replace(/(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?/i, (_, width, height) => {
    const convert = (value) => Math.round(Number(String(value).replace(',', '.')) / 2.54);
    return `${convert(width)}\" × ${convert(height)}\"`;
  });

  const initPurchase = (purchase) => {
    const form = purchase.querySelector('[data-source-product-form]');
    const variantsNode = purchase.querySelector('[data-source-product-variants]') || document.querySelector('[data-source-product-variants]');
    const variants = JSON.parse(variantsNode?.textContent || '[]');
    if (!form || !variants.length) return;

    const variantId = form.querySelector('[data-source-product-variant-id]');
    const currentPrice = purchase.querySelector('[data-source-product-current-price]');
    const comparePrice = purchase.querySelector('[data-source-product-compare-price]');
    const submit = form.querySelector('[data-source-product-submit]');
    const status = form.querySelector('[data-source-product-status]');
    const optionGroups = [...form.querySelectorAll('[data-source-product-option]')];
    const selectedOptions = () => optionGroups.map((group) => group.querySelector('[data-source-product-option-input]:checked')?.value || '');
    const matchedVariant = () => variants.find((variant) => variant.options.every((option, index) => option === selectedOptions()[index]));

    const updateProperties = () => {
      form.querySelectorAll('.source-fallback-option').forEach((group) => {
        const selected = group.querySelector('[data-source-property-input]:checked');
        const label = group.querySelector('[data-source-property-label]');
        if (label && selected) label.textContent = selected.value;
      });
    };

    const updateVariant = () => {
      const variant = matchedVariant();
      optionGroups.forEach((group) => {
        const selected = group.querySelector('[data-source-product-option-input]:checked');
        const label = group.querySelector('[data-source-product-option-label]');
        if (label) label.textContent = selected?.value || '';
      });
      updateProperties();
      if (!variant) {
        submit.disabled = true;
        submit.querySelector('span').textContent = 'Nicht verfügbar';
        return;
      }
      variantId.value = variant.id;
      currentPrice.textContent = money(variant.price);
      const onSale = Number(variant.compare_at_price) > Number(variant.price);
      comparePrice.hidden = !onSale;
      comparePrice.textContent = onSale ? money(variant.compare_at_price) : '';
      submit.disabled = !variant.available;
      submit.querySelector('span').textContent = variant.available ? 'In den Warenkorb legen' : 'Ausverkauft';
      const url = new URL(location.href);
      url.searchParams.set('variant', variant.id);
      history.replaceState({}, '', url);
      track('product_variant_change', { product_id: form.querySelector('[name="product-id"]')?.value, variant_id: variant.id, options: variant.options });
    };

    form.querySelectorAll('[data-source-product-option-input]').forEach((input) => input.addEventListener('change', updateVariant));
    form.querySelectorAll('[data-source-property-input]').forEach((input) => input.addEventListener('change', updateProperties));

    form.querySelectorAll('[data-source-product-quantity]').forEach((button) => button.addEventListener('click', () => {
      const input = form.querySelector('[data-source-product-quantity-input]');
      input.value = Math.max(1, Number(input.value || 1) + Number(button.dataset.sourceProductQuantity));
    }));
    form.querySelector('[data-source-product-quantity-input]')?.addEventListener('change', (event) => { event.target.value = Math.max(1, Number(event.target.value || 1)); });

    form.querySelectorAll('[data-unit]').forEach((button) => button.addEventListener('click', () => {
      const unit = button.dataset.unit;
      form.querySelectorAll('[data-unit]').forEach((item) => item.classList.toggle('active', item === button));
      form.querySelectorAll('[data-source-unit-label]').forEach((label) => {
        const input = label.closest('label')?.previousElementSibling;
        const original = input?.dataset.cmValue || label.textContent;
        label.textContent = unit === 'in' ? inchesFromCm(original) : original;
      });
      track('product_size_unit_change', { unit });
    }));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      status.textContent = '';
      status.dataset.state = '';
      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/add.js`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (!response.ok) throw new Error('cart_add_failed');
        status.dataset.state = 'success';
        status.textContent = 'Zum Warenkorb hinzugefügt.';
        track('product_add_to_cart', { product_id: form.querySelector('[name="product-id"]')?.value, variant_id: variantId.value });
        document.querySelector('[aria-controls="CartDrawer"]')?.click();
        document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = 'Der Artikel konnte nicht zum Warenkorb hinzugefügt werden.';
      } finally {
        updateVariant();
      }
    });

    updateVariant();
  };

  const initSizeGuide = () => {
    document.querySelectorAll('[data-source-product-size-modal]').forEach((modal) => {
      document.querySelectorAll('[data-source-product-size-guide]').forEach((button) => button.addEventListener('click', () => {
        if (typeof modal.showModal === 'function') modal.showModal();
        else modal.setAttribute('open', '');
        track('product_size_guide_open');
      }));
      modal.querySelector('[data-source-product-size-close]')?.addEventListener('click', () => modal.close());
      modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });
    });
  };

  const init = () => {
    document.querySelectorAll('[data-source-product-gallery]').forEach(initGallery);
    document.querySelectorAll('[data-source-product-purchase]').forEach(initPurchase);
    initSizeGuide();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
