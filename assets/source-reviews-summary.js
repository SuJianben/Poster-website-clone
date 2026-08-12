(() => {
  const root = document.querySelector('[data-srp-page]');
  if (!root) return;

  const analytics = (action, detail = {}) => {
    root.dispatchEvent(new CustomEvent('sp_reviews:summary', {
      bubbles: true,
      detail: { action, ...detail }
    }));
  };

  const cards = [...root.querySelectorAll('[data-srp-review]')];
  const ratingButtons = [...root.querySelectorAll('[data-srp-rating-filter]')];

  ratingButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const rating = button.dataset.srpRatingFilter;
      const isReset = button.classList.contains('is-active');

      ratingButtons.forEach((item) => item.classList.toggle('is-active', item === button && !isReset));
      cards.forEach((card) => {
        card.hidden = !isReset && card.dataset.srpRating !== rating;
      });

      analytics('rating_filter', { rating: isReset ? 'all' : rating });
    });
  });

  const photoButtons = [...root.querySelectorAll('[data-srp-summary-photo]')];
  if (!photoButtons.length) return;

  let activeIndex = 0;
  const lightbox = document.createElement('div');
  lightbox.className = 'srp-summary-lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Customer photo preview');
  lightbox.innerHTML = `
    <button type="button" class="srp-summary-lightbox__close" aria-label="Close">×</button>
    <button type="button" class="srp-summary-lightbox__prev" aria-label="Previous photo">‹</button>
    <img class="srp-summary-lightbox__image" alt="">
    <button type="button" class="srp-summary-lightbox__next" aria-label="Next photo">›</button>
  `;
  document.body.appendChild(lightbox);

  const preview = lightbox.querySelector('.srp-summary-lightbox__image');
  const render = () => {
    const image = photoButtons[activeIndex].querySelector('img');
    preview.src = image.currentSrc || image.src;
    preview.alt = image.alt;
  };
  const open = (index) => {
    activeIndex = index;
    render();
    lightbox.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    lightbox.querySelector('.srp-summary-lightbox__close').focus();
    analytics('photo_open', { index });
  };
  const close = () => {
    lightbox.hidden = true;
    document.documentElement.style.overflow = '';
    photoButtons[activeIndex].focus();
  };
  const move = (step) => {
    activeIndex = (activeIndex + step + photoButtons.length) % photoButtons.length;
    render();
    analytics('photo_change', { index: activeIndex });
  };

  photoButtons.forEach((button, index) => button.addEventListener('click', () => open(index)));
  lightbox.querySelector('.srp-summary-lightbox__close').addEventListener('click', close);
  lightbox.querySelector('.srp-summary-lightbox__prev').addEventListener('click', () => move(-1));
  lightbox.querySelector('.srp-summary-lightbox__next').addEventListener('click', () => move(1));
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) close(); });
  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });
})();

