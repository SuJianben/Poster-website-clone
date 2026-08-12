(() => {
  const createModal = (summary, photoButtons, emit) => {
    const modal = document.createElement('div');
    modal.className = 'srp-summary-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Customer Review Photos');
    modal.innerHTML = `
      <div class="srp-summary-modal__dialog" role="region" aria-roledescription="carousel">
        <button type="button" class="srp-summary-modal__nav srp-summary-modal__nav--prev" aria-label="Previous Photo">‹</button>
        <div class="srp-summary-modal__media"></div>
        <div class="srp-summary-modal__content">
          <button type="button" class="srp-summary-modal__close" aria-label="Close"></button>
          <time class="srp-summary-modal__date"></time>
          <h2 class="srp-summary-modal__reviewer"></h2>
          <span class="srp-summary-modal__verified"></span>
          <div class="srp-summary-modal__stars" aria-label="5 out of 5 stars">★★★★★</div>
          <h3 class="srp-summary-modal__title"></h3>
          <p class="srp-summary-modal__body"></p>
          <div class="srp-summary-modal__product" hidden><img alt=""><span></span></div>
        </div>
        <button type="button" class="srp-summary-modal__nav srp-summary-modal__nav--next" aria-label="Next Photo">›</button>
      </div>`;
    document.body.appendChild(modal);

    const media = modal.querySelector('.srp-summary-modal__media');
    const reviewer = modal.querySelector('.srp-summary-modal__reviewer');
    const verified = modal.querySelector('.srp-summary-modal__verified');
    const date = modal.querySelector('.srp-summary-modal__date');
    const title = modal.querySelector('.srp-summary-modal__title');
    const body = modal.querySelector('.srp-summary-modal__body');
    const product = modal.querySelector('.srp-summary-modal__product');
    const productImage = product.querySelector('img');
    const productTitle = product.querySelector('span');
    let activeIndex = 0;
    let closeTimer;

    const render = () => {
      const button = photoButtons[activeIndex];
      const image = button.querySelector('img');
      media.replaceChildren();
      if (button.dataset.video) {
        const video = document.createElement('video');
        video.src = button.dataset.video;
        video.poster = image.currentSrc || image.src;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        media.appendChild(video);
      } else {
        const preview = document.createElement('img');
        preview.src = image.currentSrc || image.src;
        preview.alt = image.alt;
        media.appendChild(preview);
      }
      reviewer.textContent = button.dataset.reviewer || '';
      verified.textContent = button.dataset.verified || '';
      date.textContent = button.dataset.date || '';
      title.textContent = button.dataset.title || '';
      body.textContent = button.dataset.body || '';
      productTitle.textContent = button.dataset.product || '';
      productImage.src = button.dataset.productImage || image.currentSrc || image.src;
      productImage.alt = button.dataset.product || image.alt;
      product.hidden = !button.dataset.product;
    };

    const open = (index) => {
      window.clearTimeout(closeTimer);
      activeIndex = index;
      render();
      modal.hidden = false;
      document.documentElement.classList.add('srp-summary-modal-open');
      window.setTimeout(() => {
        modal.classList.add('is-open');
        modal.querySelector('.srp-summary-modal__close').focus();
      }, 20);
      emit('photo_open', { index });
    };
    const close = () => {
      modal.classList.remove('is-open');
      document.documentElement.classList.remove('srp-summary-modal-open');
      closeTimer = window.setTimeout(() => {
        modal.hidden = true;
        media.replaceChildren();
        photoButtons[activeIndex].focus();
      }, 210);
      emit('photo_close', { index: activeIndex });
    };
    const move = (step) => {
      activeIndex = (activeIndex + step + photoButtons.length) % photoButtons.length;
      render();
      emit('photo_change', { index: activeIndex });
    };

    photoButtons.forEach((button, index) => button.addEventListener('click', () => open(index)));
    modal.querySelector('.srp-summary-modal__close').addEventListener('click', close);
    modal.querySelector('.srp-summary-modal__nav--prev').addEventListener('click', () => move(-1));
    modal.querySelector('.srp-summary-modal__nav--next').addEventListener('click', () => move(1));
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', (event) => {
      if (modal.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    });
  };

  document.querySelectorAll('[data-source-review-summary]').forEach((summary) => {
    if (summary.dataset.summaryReady === 'true') return;
    summary.dataset.summaryReady = 'true';
    const host = summary.closest('[data-srp-page], [data-sprv-root]') || summary;
    const emit = (action, detail = {}) => host.dispatchEvent(new CustomEvent('sp_reviews:summary', {
      bubbles: true,
      detail: { action, ...detail }
    }));
    const cards = [...host.querySelectorAll('[data-srp-review]')];
    const ratings = summary.querySelector('.srp-widget__ratings');
    const ratingButtons = [...summary.querySelectorAll('[data-srp-rating-filter]')];
    ratingButtons.forEach((button) => button.addEventListener('click', () => {
      const rating = button.dataset.srpRatingFilter;
      const reset = button.classList.contains('is-active');
      ratings?.classList.toggle('is-filtering', !reset);
      ratingButtons.forEach((item) => {
        const selected = !reset && item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      const matches = cards.filter((card) => card.dataset.srpRating === rating);
      cards.forEach((card) => { card.hidden = !reset && matches.length > 0 && card.dataset.srpRating !== rating; });
      host.querySelector('[data-srp-grid]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      emit('rating_filter', { rating: reset ? 'all' : rating });
    }));
    const photoButtons = [...summary.querySelectorAll('[data-srp-summary-photo]')];
    if (photoButtons.length) createModal(summary, photoButtons, emit);
  });
})();

