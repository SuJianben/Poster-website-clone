(() => {
  const root = document.querySelector('[data-srp-page]');
  if (!root || root.dataset.srpPageReady === 'true') return;
  root.dataset.srpPageReady = 'true';

  const form = root.querySelector('[data-srp-form]');
  const formTitle = root.querySelector('[data-srp-form-title]');
  const cards = [...root.querySelectorAll('[data-srp-review]')];
  const questions = root.querySelector('[data-srp-questions]');
  const grid = root.querySelector('[data-srp-grid]');
  const pagination = root.querySelector('.srp-widget__pagination');
  const controls = root.querySelector('[data-srp-review-controls]');

  root.querySelectorAll('[data-srp-open-form]').forEach((button) => {
    button.addEventListener('click', () => {
      form.hidden = false;
      formTitle.textContent = button.dataset.srpOpenForm === 'question' ? 'Ask a question' : 'Write a review';
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  root.querySelector('[data-srp-close-form]')?.addEventListener('click', () => { form.hidden = true; });
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    form.reset();
    form.hidden = true;
    root.dispatchEvent(new CustomEvent('source:reviews:submit', { bubbles: true }));
  });

  root.querySelectorAll('[data-srp-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const showReviews = button.dataset.srpTab === 'reviews';
      root.querySelectorAll('[data-srp-tab]').forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      grid.hidden = !showReviews;
      pagination.hidden = !showReviews;
      controls.hidden = !showReviews;
      questions.hidden = showReviews;
    });
  });

  root.querySelector('[data-srp-sort]')?.addEventListener('change', (event) => {
    const onlyPhotos = event.target.value === 'photos';
    cards.forEach((card) => { card.hidden = onlyPhotos && card.dataset.srpPhoto !== 'true'; });
    root.dispatchEvent(new CustomEvent('source:reviews:filter', {
      bubbles: true,
      detail: { sort: event.target.value }
    }));
  });

  root.querySelectorAll('[data-srp-helpful]').forEach((button) => {
    button.addEventListener('click', () => button.classList.toggle('is-selected'));
  });

  root.querySelectorAll('[data-srp-rating-input] button').forEach((button) => {
    button.addEventListener('click', () => {
      root.querySelectorAll('[data-srp-rating-input] button').forEach((star) => {
        star.classList.toggle('is-selected', Number(star.dataset.value) <= Number(button.dataset.value));
      });
    });
  });
})();
