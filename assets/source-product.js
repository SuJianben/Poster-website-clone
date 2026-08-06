(() => {
  const formatMoney = (cents) => new Intl.NumberFormat(document.documentElement.lang || 'de-DE', {
    style: 'currency', currency: window.Shopify?.currency?.active || 'EUR'
  }).format(Number(cents) / 100);

  const initGallery = (gallery) => {
    const thumbs = [...gallery.querySelectorAll('[data-source-product-thumb]')];
    const slides = [...gallery.querySelectorAll('[data-source-product-slide]')];
    const activate = (index) => {
      thumbs.forEach((thumb) => {
        const active = Number(thumb.dataset.mediaIndex) === index;
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-current', String(active));
      });
      slides.forEach((slide) => slide.classList.toggle('is-active', Number(slide.dataset.mediaIndex) === index));
    };
    thumbs.forEach((thumb) => thumb.addEventListener('click', () => activate(Number(thumb.dataset.mediaIndex))));
  };

  const initPurchase = (purchase) => {
    const form = purchase.querySelector('[data-source-product-form]');
    const variants = JSON.parse(purchase.parentElement.querySelector('[data-source-product-variants]')?.textContent || '[]');
    if (!form || !variants.length) return;

    const variantInput = form.querySelector('[data-source-product-variant-id]');
    const price = purchase.querySelector('[data-source-product-current-price]');
    const comparePrice = purchase.querySelector('[data-source-product-compare-price]');
    const submit = form.querySelector('[data-source-product-submit]');
    const status = form.querySelector('[data-source-product-status]');

    const getOptions = () => [...form.querySelectorAll('[data-source-product-option]')]
      .map((fieldset) => fieldset.querySelector('[data-source-product-option-input]:checked')?.value || '');

    const matchingVariant = () => variants.find((variant) => variant.options.every((option, index) => option === getOptions()[index]));

    const update = () => {
      const variant = matchingVariant();
      form.querySelectorAll('[data-source-product-option]').forEach((fieldset) => {
        const selected = fieldset.querySelector('[data-source-product-option-input]:checked');
        fieldset.querySelector('[data-source-product-option-label]').textContent = selected?.value || '';
      });
      form.querySelectorAll('[data-source-product-option-input]').forEach((input) => {
        input.closest('.source-product-form__value')?.classList.toggle('is-selected', input.checked);
      });
      if (!variant) return;
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
    form.querySelectorAll('[data-source-product-quantity]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = form.querySelector('[data-source-product-quantity-input]');
        input.value = Math.max(1, Number(input.value || 1) + Number(button.dataset.sourceProductQuantity));
      });
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submit.disabled) return;
      status.textContent = '';
      submit.disabled = true;
      try {
        const response = await fetch('/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
        if (!response.ok) throw new Error('Could not add item');
        status.dataset.state = 'success';
        status.textContent = 'Zum Warenkorb hinzugefügt.';
        document.querySelector('[aria-controls="CartDrawer"]')?.click();
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = 'Der Artikel konnte nicht zum Warenkorb hinzugefügt werden.';
      } finally {
        submit.disabled = false;
      }
    });
    update();
  };

  const init = () => {
    document.querySelectorAll('[data-source-product-gallery]').forEach(initGallery);
    document.querySelectorAll('[data-source-product-purchase]').forEach(initPurchase);
  };
  document.addEventListener('DOMContentLoaded', init);
})();
