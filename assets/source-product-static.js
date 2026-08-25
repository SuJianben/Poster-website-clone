(() => {
  const initProduct = (scope = document) => {
  const product = scope.matches?.('[data-spx-product]') ? scope : scope.querySelector('[data-spx-product]');
  if (!product || product.dataset.spxInitialized === 'true') return;
  product.dataset.spxInitialized = 'true';

  const mainImage = product.querySelector('[data-spx-main-image]');
  const zoom = product.querySelector('[data-spx-zoom]');
  const zoomImage = product.querySelector('[data-spx-zoom-image]');
  const thumbTrack = product.querySelector('[data-spx-thumb-track]');
  const thumbs = [...product.querySelectorAll('[data-spx-image]')];
  const previousButtons = [...product.querySelectorAll('[data-spx-previous]')];
  const nextButtons = [...product.querySelectorAll('[data-spx-next]')];
  const thumbScrollButtons = [...product.querySelectorAll('[data-spx-thumb-scroll]')];
  const backToTopButton = product.querySelector('[data-spx-back-to-top]');
  const thumbWindow = thumbTrack?.closest('.spx-product__thumb-window');
  const viewer = product.querySelector('[data-spx-viewer]');
  const zoomStage = product.querySelector('.spx-product__zoom-stage');
  let activeIndex = Math.max(0, thumbs.findIndex((thumb) => thumb.classList.contains('is-active')));
  let unframedImageIndex = activeIndex;
  const unframedImageByContext = new Map();
  const toFrameMediaKey = (value) => String(value || '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const normalizeFrameTone = (value) => {
    const label = String(value || '').trim().toLocaleLowerCase();
    if (!label || /(^|\s)(none|ohne|rahmenlos|unframed)(\s|$)|no\s*frame|without\s*(a\s*)?frame/.test(label)) return 'none';
    if (/white|weiss|weiß/.test(label)) return 'white';
    if (/black|schwarz/.test(label)) return 'black';
    if (/silver|silber/.test(label)) return 'silver';
    if (/gold/.test(label)) return 'gold';
    return 'natural';
  };
  const getFrameMediaContext = () => [...product.querySelectorAll('[data-spx-variant-option]')]
    .filter((group) => !group.hasAttribute('data-spx-frame-option'))
    .map((group) => toFrameMediaKey(group.querySelector('[data-spx-option-output]')?.textContent))
    .filter(Boolean);
  const getFrameMediaContextKey = () => getFrameMediaContext().join('|') || 'default';
  const findFrameMediaIndex = (frameTone, context = getFrameMediaContext()) => {
    const matches = thumbs
      .map((thumb, index) => ({ thumb, index }))
      .filter(({ thumb }) => thumb.dataset.spxFrameMediaTone === frameTone);
    if (!matches.length) return -1;

    const contextualMatch = context.length
      ? matches.find(({ thumb }) => context.every((key) => thumb.dataset.spxFrameMediaKey.includes(key)))
      : null;
    return (contextualMatch || matches[0]).index;
  };
  const rememberUnframedImage = (index) => {
    if (index < 0) return;
    unframedImageIndex = index;
    unframedImageByContext.set(getFrameMediaContextKey(), index);
  };
  const restoreUnframedImage = () => {
    const taggedImageIndex = findFrameMediaIndex('none');
    const imageIndex = taggedImageIndex >= 0
      ? taggedImageIndex
      : unframedImageByContext.get(getFrameMediaContextKey()) ?? unframedImageIndex;
    setActiveImage(imageIndex);
  };
  let thumbOffset = 0;
  let zoomCloseTimer;
  let suppressViewerClick = false;

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
    if (!mainImage || !zoomImage || !thumbs.length) return;
    const nextIndex = Math.max(0, Math.min(thumbs.length - 1, index));
    if (nextIndex === activeIndex && mainImage.src) return;
    activeIndex = nextIndex;
    const thumb = thumbs[activeIndex];
    if (!thumb) return;
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

  const addSwipeNavigation = (element, suppressClick = false) => {
    if (!element || thumbs.length < 2) return;
    let pointerStart;
    let isHorizontalSwipe = false;

    element.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary) return;
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      isHorizontalSwipe = false;
      element.setPointerCapture?.(event.pointerId);
    });

    element.addEventListener('pointermove', (event) => {
      if (!pointerStart || event.pointerId !== pointerStart.id) return;
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      isHorizontalSwipe = Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY);
    });

    element.addEventListener('pointerup', (event) => {
      if (!pointerStart || event.pointerId !== pointerStart.id) return;
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      pointerStart = null;
      element.releasePointerCapture?.(event.pointerId);

      if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (suppressClick) suppressViewerClick = true;
      setActiveImage(activeIndex + (deltaX < 0 ? 1 : -1), deltaX < 0 ? 1 : -1);
    });

    element.addEventListener('pointercancel', () => {
      pointerStart = null;
      isHorizontalSwipe = false;
    });

    element.addEventListener('click', (event) => {
      if (!isHorizontalSwipe) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      isHorizontalSwipe = false;
    }, true);
  };

  const initRevealMotion = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const revealables = [
      product.querySelector('.spx-product__gallery'),
      ...product.querySelectorAll('[data-analytics-block-type]'),
      product.querySelector('.spx-product__accordions')
    ].filter(Boolean);

    const reveal = (element) => {
      element.classList.add('is-revealed');
    };

    if (!('IntersectionObserver' in window)) {
      revealables.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    revealables.forEach((element, index) => {
      element.dataset.spxReveal = '';
      element.style.setProperty('--spx-reveal-delay', `${Math.min(index * 70, 420)}ms`);
      observer.observe(element);
    });
  };

  viewer?.addEventListener('click', (event) => {
    if (!suppressViewerClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressViewerClick = false;
  }, true);

  addSwipeNavigation(viewer, true);
  addSwipeNavigation(zoomStage);
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
  initRevealMotion();

  const variantPicker = product.querySelector('[data-spx-variant-picker]');
  if (variantPicker) {
    const variantData = variantPicker.querySelector('[data-spx-variant-data]');
    const variantMediaData = product.querySelector('[data-spx-variant-media-data]');
    const variantIdInput = variantPicker.querySelector('[data-spx-variant-id]');
    const optionGroups = [...variantPicker.querySelectorAll('[data-spx-variant-option]')];
    const frameOptionGroup = optionGroups.find((group) => group.hasAttribute('data-spx-frame-option'));
    let variants = [];
    let variantMedia = {};

    try {
      variants = JSON.parse(variantData?.textContent || '[]');
    } catch (error) {
      console.warn('Unable to read product variant data.', error);
    }

    try {
      variantMedia = JSON.parse(variantMediaData?.textContent || '{}');
    } catch (error) {
      console.warn('Unable to read product variant media data.', error);
    }

    const optionValuesForVariant = (variant) => variant.options || [variant.option1, variant.option2, variant.option3].filter(Boolean);
    const selectedValues = optionGroups.map((group) => group.querySelector('[data-spx-option-output]')?.textContent.trim() || '');
    const getSelectedFrameTone = () => {
      if (!frameOptionGroup) return 'none';
      const frameOptionIndex = optionGroups.indexOf(frameOptionGroup);
      const selectedControl = frameOptionGroup.querySelector('[data-spx-variant-value].is-selected');
      const selectedValue = selectedControl?.dataset.optionValue
        || frameOptionGroup.querySelector('[data-spx-variant-select]')?.value
        || selectedValues[frameOptionIndex];
      return selectedControl?.dataset.spxFrameTone || normalizeFrameTone(selectedValue);
    };

    const syncVariantMedia = (variant) => {
      if (!variant || !thumbs.length) return -1;

      const mappedMedia = variantMedia[String(variant.id)] || {};
      const mediaIds = [
        mappedMedia.mediaId,
        mappedMedia.imageId
      ].filter((id) => id !== null && id !== undefined && id !== '');

      const matchingIndex = thumbs.findIndex((thumb) => mediaIds.some((id) => (
        String(id) === thumb.dataset.spxMediaId || String(id) === thumb.dataset.spxImageId
      )));
      if (matchingIndex >= 0) setActiveImage(matchingIndex);
      return matchingIndex;
    };

    const syncVariantState = () => {
      const selectedVariant = variants.find((variant) => optionValuesForVariant(variant).every((value, index) => value === selectedValues[index]));
      if (variantIdInput) variantIdInput.value = selectedVariant?.id || '';

      const dynamicPrice = product.querySelector('[data-spx-dynamic-price] [data-spx-price-output]');
      if (selectedVariant && dynamicPrice) {
        const currency = window.Shopify?.currency?.active || 'EUR';
        dynamicPrice.textContent = new Intl.NumberFormat(document.documentElement.lang || 'en', {
          style: 'currency',
          currency
        }).format(selectedVariant.price / 100);
      }

      optionGroups.forEach((group, optionIndex) => {
        group.querySelectorAll('[data-spx-variant-value]').forEach((control) => {
          const candidate = [...selectedValues];
          candidate[optionIndex] = control.dataset.optionValue;
          const available = variants.some((variant) => {
            if (!variant.available) return false;
            const values = optionValuesForVariant(variant);
            return values.every((value, index) => index === optionIndex ? value === candidate[index] : value === selectedValues[index]);
          });
          control.disabled = !available;
        });
      });

      const selectedFrameTone = getSelectedFrameTone();
      const variantMediaIndex = syncVariantMedia(selectedVariant);
      if (variantMediaIndex >= 0) {
        if (selectedFrameTone === 'none') rememberUnframedImage(variantMediaIndex);
      } else if (frameOptionGroup) {
        if (selectedFrameTone === 'none') {
          restoreUnframedImage();
        } else {
          const taggedFrameImageIndex = findFrameMediaIndex(selectedFrameTone);
          if (taggedFrameImageIndex >= 0) setActiveImage(taggedFrameImageIndex);
        }
      }

      product.dispatchEvent(new CustomEvent('spx:variant-change', {
        bubbles: true,
        detail: { variant: selectedVariant || null, options: [...selectedValues] }
      }));
    };

    optionGroups.forEach((group, optionIndex) => {
      const output = group.querySelector('[data-spx-option-output]');
      group.querySelectorAll('[data-spx-variant-value]').forEach((control) => control.addEventListener('click', () => {
        selectedValues[optionIndex] = control.dataset.optionValue;
        group.querySelectorAll('[data-spx-variant-value]').forEach((item) => {
          const selected = item === control;
          item.classList.toggle('is-selected', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
        if (output) output.textContent = selectedValues[optionIndex];
        syncVariantState();
      }));

      group.querySelector('[data-spx-variant-select]')?.addEventListener('change', (event) => {
        selectedValues[optionIndex] = event.currentTarget.value;
        if (output) output.textContent = selectedValues[optionIndex];
        syncVariantState();
      });
    });

    syncVariantState();
  }

  const manualFramePicker = product.querySelector('[data-spx-manual-frame-picker]');
  if (manualFramePicker) {
    const manualFrameControls = [...manualFramePicker.querySelectorAll('[data-spx-manual-frame-value]')];
    const manualFrameOutput = manualFramePicker.querySelector('[data-spx-manual-frame-output]');
    const manualFrameProperty = manualFramePicker.querySelector('[data-spx-manual-frame-property]');

    const syncManualFrameImage = (frameTone) => {
      if (frameTone === 'none') {
        restoreUnframedImage();
        return;
      }

      const taggedImageIndex = findFrameMediaIndex(frameTone);
      if (taggedImageIndex >= 0) {
        setActiveImage(taggedImageIndex);
      }
    };

    const setManualFrame = (control) => {
      if (!control) return;

      const frameTone = control.dataset.spxFrameTone || 'none';
      const frameLabel = control.dataset.spxFrameLabel || control.getAttribute('aria-label') || '';

      manualFrameControls.forEach((item) => {
        const selected = item === control;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      if (manualFrameOutput) manualFrameOutput.textContent = frameLabel;
      if (manualFrameProperty) {
        manualFrameProperty.value = frameLabel;
        manualFrameProperty.disabled = frameTone === 'none';
      }
      syncManualFrameImage(frameTone);

      product.dispatchEvent(new CustomEvent('spx:frame-change', {
        bubbles: true,
        detail: { tone: frameTone, label: frameLabel, source: 'manual' }
      }));
    };

    manualFrameControls.forEach((control) => control.addEventListener('click', () => setManualFrame(control)));
    setManualFrame(manualFrameControls.find((control) => control.classList.contains('is-selected')) || manualFrameControls[0]);
    product.addEventListener('spx:variant-change', () => {
      setManualFrame(manualFrameControls.find((control) => control.classList.contains('is-selected')) || manualFrameControls[0]);
    });
  }

  const sizeGuide = product.querySelector('[data-spx-size-guide-dialog]');
  product.querySelector('[data-spx-size-guide]')?.addEventListener('click', () => sizeGuide?.showModal());
  product.querySelector('[data-spx-close-size-guide]')?.addEventListener('click', () => sizeGuide?.close());
  sizeGuide?.addEventListener('click', (event) => { if (event.target === sizeGuide) sizeGuide.close(); });

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

  if (backToTopButton) {
    const syncBackToTopVisibility = () => {
      backToTopButton.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.65);
    };
    backToTopButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', syncBackToTopVisibility, { passive: true });
    syncBackToTopVisibility();
  }
  };

  initProduct();
  document.addEventListener('shopify:section:load', (event) => initProduct(event.target));
})();
