(() => {
  document.querySelectorAll('[data-srw-page] form.srw-form').forEach((form) => {
    if (form.dataset.srwReady === 'true') return;
    form.dataset.srwReady = 'true';
    const root = form.closest('[data-srw-page]');
    const emit = (action, detail = {}) => root?.dispatchEvent(new CustomEvent('source_review_write', { bubbles: true, detail: { action, ...detail } }));
    const ratingInput = form.querySelector('[data-srw-rating-input]');
    const ratingButtons = [...form.querySelectorAll('[data-srw-rating]')];
    const status = form.querySelector('[data-srw-status]');
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
    form.addEventListener('submit', () => {
      status.textContent = 'Wird gesendet...';
      emit('submit');
    });
  });
})();

