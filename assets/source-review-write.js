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
      setQueryValue(form.querySelector('[name="review_product_id"]'), 'product_id');
      setQueryValue(form.querySelector('[name="review_product_handle"]'), 'product_handle');
      setQueryValue(form.querySelector('[name="review_product_title"]'), 'product_title');
    };
    hydrateProductFields();
    if (submissionId && !submissionId.value) submissionId.value = createSubmissionId();
    if (startedAt && !startedAt.value) startedAt.value = String(Date.now());
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
    form.addEventListener('submit', (event) => {
      if (!endpoint) {
        if (status) status.textContent = 'Wird gesendet...';
        emit('submit', { mode: 'shopify_contact' });
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

