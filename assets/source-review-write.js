(() => {
  document.querySelectorAll('[data-srw-form]').forEach((form) => {
    if (form.dataset.srwReady === 'true') return;
    form.dataset.srwReady = 'true';
    const root = form.closest('[data-srw-page]');
    const emit = (action, detail = {}) => root?.dispatchEvent(new CustomEvent('source_review_write', { bubbles: true, detail: { action, ...detail } }));
    const ratingInput = form.querySelector('[data-srw-rating-input]');
    const ratingButtons = [...form.querySelectorAll('[data-srw-rating]')];
    const status = form.querySelector('[data-srw-status]');
    ratingButtons.forEach((button) => button.addEventListener('click', () => {
      const value = Number(button.dataset.srwRating);
      ratingInput.value = String(value);
      ratingButtons.forEach((item) => {
        const selected = Number(item.dataset.srwRating) <= value;
        item.classList.toggle('is-selected', selected);
        item.textContent = selected ? '★' : '☆';
        item.setAttribute('aria-pressed', String(Number(item.dataset.srwRating) === value));
      });
      emit('rating_select', { value });
    }));
    form.querySelectorAll('[data-srw-scale]').forEach((scale) => scale.addEventListener('change', (event) => {
      const input = event.target.closest('input');
      if (!input) return;
      scale.querySelectorAll('.srw-scale__option').forEach((option) => option.classList.toggle('is-selected', option.contains(input)));
      emit('scale_select', { field: input.name, value: input.value });
    }));
    form.querySelector('[data-srw-upload-input]')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      const label = form.querySelector('[data-srw-upload-label]');
      if (file && label) label.textContent = file.name;
      emit('image_select', { selected: Boolean(file) });
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      status.textContent = 'Vielen Dank! Deine Bewertung ist bereit zur Übermittlung.';
      emit('submit_ready');
    });
  });
})();

