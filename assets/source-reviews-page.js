(() => {
  const root = document.querySelector('[data-srp-page]');
  if (!root || root.dataset.srpPageReady === 'true') return;
  root.dataset.srpPageReady = 'true';

  const cards = [...root.querySelectorAll('[data-srp-review]')];

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

})();
