(() => {
  document.querySelectorAll('[data-srw-page] form.srw-form').forEach((form) => {
    if (form.dataset.srwReady === 'true') return;
    form.dataset.srwReady = 'true';
    const root = form.closest('[data-srw-page]');
    const endpoint = root?.dataset.srwReviewEndpoint?.trim();
    const emit = (action, detail = {}) => root?.dispatchEvent(new CustomEvent('source_review_write', { bubbles: true, detail: { action, ...detail } }));
    const ratingInput = form.querySelector('[data-srw-rating-input]');
    const ratingButtons = [...form.querySelectorAll('[data-srw-rating]')];
    const status = form.querySelector('.srw-form__status') || form.querySelector('[data-srw-status]');
    const submitButton = form.querySelector('button[type="submit"]');
    const submissionId = form.querySelector('[data-srw-submission-id]');
    const startedAt = form.querySelector('[data-srw-started-at]');
    const productIdField = form.querySelector('[data-srw-product-id]');
    const productHandleField = form.querySelector('[name="review_product_handle"]');
    const productTitleField = form.querySelector('[name="review_product_title"]');
    const productUrlField = form.querySelector('[name="review_product_url"]');
    const productPicker = form.querySelector('[data-srw-product-picker]');
    const createSubmissionId = () => {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
      return `rvw_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    };
    const query = new URLSearchParams(window.location.search);
    const setQueryValue = (field, key) => {
      const value = query.get(key);
      if (value && field && !field.value) field.value = value;
    };
    const hydrateProductFields = () => {
      setQueryValue(productIdField, 'product_id');
      setQueryValue(form.querySelector('[name="review_product_handle"]'), 'product_handle');
      setQueryValue(form.querySelector('[name="review_product_title"]'), 'product_title');
      const productUrl = form.querySelector('[name="review_product_url"]');
      const handle = form.querySelector('[name="review_product_handle"]')?.value;
      if (productUrl && !productUrl.value && handle) {
        productUrl.value = new URL(`/products/${encodeURIComponent(handle)}`, window.location.origin).href;
      }
      if (productPicker && productIdField?.value) productPicker.value = productIdField.value;
    };
    hydrateProductFields();
    if (submissionId && !submissionId.value) submissionId.value = createSubmissionId();
    if (startedAt && !startedAt.value) startedAt.value = String(Date.now());
    productPicker?.addEventListener('change', () => {
      const option = productPicker.selectedOptions[0];
      if (!option?.dataset.productId) return;
      productIdField.value = option.dataset.productId;
      productHandleField.value = option.dataset.productHandle || '';
      productTitleField.value = option.dataset.productTitle || '';
      productUrlField.value = option.dataset.productUrl || '';
      emit('product_select', { productId: productIdField.value, productHandle: productHandleField.value });
    });
    const setRating = (value) => {
      ratingInput.value = String(value);
      ratingButtons.forEach((item) => {
        const selected = Number(item.dataset.srwRating) <= value;
        item.classList.toggle('is-selected', selected);
        item.innerHTML = selected ? '&#9733;' : '&#9734;';
        item.setAttribute('aria-pressed', String(Number(item.dataset.srwRating) === value));
      });
    };
    setRating(Number(ratingInput.value) || 5);
    ratingButtons.forEach((button) => button.addEventListener('click', () => {
      const value = Number(button.dataset.srwRating);
      setRating(value);
      emit('rating_select', { value });
    }));
    form.querySelectorAll('[data-srw-scale]').forEach((scale) => scale.addEventListener('change', (event) => {
      const input = event.target.closest('input');
      if (!input) return;
      scale.querySelectorAll('.srw-scale__option').forEach((option) => option.classList.toggle('is-selected', option.contains(input)));
      emit('scale_select', { field: input.name, value: input.value });
    }));
    const targetFrame = form.dataset.srwAppsScriptForm === undefined
      ? null
      : document.getElementById(form.getAttribute('target'));
    if (targetFrame) {
      targetFrame.addEventListener('load', () => {
        if (form.dataset.srwNativeSubmitting !== 'true') return;
        if (status) status.textContent = 'Submitted for approval. It will appear after you publish it in the review sheet.';
        if (submitButton) submitButton.disabled = false;
        form.dataset.srwNativeSubmitting = 'complete';
        emit('submit_success', { mode: 'apps_script' });
      });
    }
    form.addEventListener('submit', (event) => {
      if (!productIdField?.value) {
        event.preventDefault();
        if (status) status.textContent = 'Bitte wähle zuerst ein Produkt aus.';
        productPicker?.focus();
        emit('submit_error', { reason: 'missing_product' });
        return;
      }
      if (!endpoint) {
        if (status) status.textContent = 'Wird gesendet...';
        emit('submit', { mode: 'shopify_contact' });
        return;
      }

      // The Liquid form already targets a hidden iframe when an endpoint is
      // configured. Let the browser perform the native POST so this still
      // works if this asset fails to load and avoids CORS/no-cors ambiguity.
      if (targetFrame) {
        form.dataset.srwNativeSubmitting = 'true';
        if (submitButton) submitButton.disabled = true;
        if (status) status.textContent = 'Submitting for approval...';
        emit('submit', { mode: 'apps_script' });
        return;
      }

      event.preventDefault();
      if (submitButton) submitButton.disabled = true;
      if (status) status.textContent = 'Submitting for approval...';
      const payload = new FormData(form);
      payload.append('review_payload_version', '1');
      emit('submit', { mode: 'apps_script' });

      // Apps Script web apps do not reliably expose CORS response headers. The
      // endpoint receives an opaque, fire-and-forget POST; the sheet is the
      // source of truth for approval.
      fetch(endpoint, { method: 'POST', body: payload, mode: 'no-cors', keepalive: true })
        .then(() => {
          if (status) status.textContent = 'Submitted for approval. It will appear after you publish it in the review sheet.';
          form.reset();
          hydrateProductFields();
          if (submissionId) submissionId.value = createSubmissionId();
          if (startedAt) startedAt.value = String(Date.now());
          setRating(5);
          emit('submit_success', { mode: 'apps_script' });
        })
        .catch(() => {
          if (status) status.textContent = 'The review could not be submitted. Please try again.';
          emit('submit_error', { mode: 'apps_script' });
        })
        .finally(() => {
          if (submitButton) submitButton.disabled = false;
        });
    });
  });
})();

