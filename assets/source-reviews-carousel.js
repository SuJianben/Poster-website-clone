(() => {
  const SELECTOR = '[data-source-reviews-carousel]';

  function init(carousel) {
    if (carousel.dataset.sourceReviewsReady === 'true') return;

    const track = carousel.querySelector('.source-reviews-carousel__track');
    const pages = Array.from(carousel.querySelectorAll('.source-reviews-carousel__page'));
    const cards = Array.from(carousel.querySelectorAll('.source-reviews-card'));
    if (!track || pages.length < 2 || cards.length < 2) return;

    carousel.dataset.sourceReviewsReady = 'true';
    let index = 0;
    const mobileQuery = window.matchMedia('(max-width: 690px)');
    const viewport = carousel.querySelector('.source-reviews-carousel__viewport');
    let dragStart = null;
    let dragDelta = 0;
    let dragged = false;
    const counter = document.createElement('span');
    counter.className = 'source-reviews-carousel__counter';
    counter.setAttribute('aria-live', 'polite');
    carousel.querySelector('.source-reviews-carousel__header').prepend(counter);

    const isMobile = () => mobileQuery.matches;
    const slideCount = () => (isMobile() ? cards.length : pages.length);

    carousel.addEventListener('source:reviews:select', (event) => {
      const cardIndex = Number(event.detail?.index);
      if (!Number.isFinite(cardIndex)) return;
      index = isMobile() ? cardIndex : Math.floor(cardIndex / 3);
      render();
      cards[cardIndex]?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });

    const render = () => {
      const count = slideCount();
      if (index >= count) index = 0;
      track.style.transform = `translate3d(-${index * (100 / count)}%, 0, 0)`;
      carousel.dataset.sourceReviewsPage = String(index + 1);
      counter.textContent = `${index + 1}/${count}`;
    };

    carousel.querySelector('[data-source-reviews-prev]').addEventListener('click', () => {
      const count = slideCount();
      index = index === 0 ? count - 1 : index - 1;
      render();
    });

    carousel.querySelector('[data-source-reviews-next]').addEventListener('click', () => {
      const count = slideCount();
      index = index === count - 1 ? 0 : index + 1;
      render();
    });

    render();
    mobileQuery.addEventListener?.('change', () => {
      index = 0;
      render();
    });

    if (viewport) {
      viewport.addEventListener('pointerdown', (event) => {
        if (!isMobile() || (event.pointerType === 'mouse' && event.button !== 0)) return;
        dragStart = event.clientX;
        dragDelta = 0;
        dragged = false;
        track.classList.add('is-dragging');
        viewport.setPointerCapture?.(event.pointerId);
      });
      viewport.addEventListener('pointermove', (event) => {
        if (dragStart === null) return;
        dragDelta = event.clientX - dragStart;
        if (Math.abs(dragDelta) > 6) dragged = true;
        const count = slideCount();
        const offset = (dragDelta / viewport.clientWidth) * (100 / count);
        track.style.transform = `translate3d(calc(-${index * (100 / count)}% + ${offset}%), 0, 0)`;
      });
      const finishDrag = () => {
        if (dragStart === null) return;
        const count = slideCount();
        if (Math.abs(dragDelta) > Math.max(36, viewport.clientWidth * 0.14)) {
          index = dragDelta < 0 ? (index + 1) % count : (index - 1 + count) % count;
        }
        dragStart = null;
        dragDelta = 0;
        track.classList.remove('is-dragging');
        render();
      };
      viewport.addEventListener('pointerup', finishDrag);
      viewport.addEventListener('pointercancel', finishDrag);
      viewport.addEventListener('lostpointercapture', finishDrag);
      viewport.addEventListener('click', (event) => {
        if (dragged) {
          event.preventDefault();
          event.stopPropagation();
          dragged = false;
        }
      }, true);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(SELECTOR).forEach(init);
  });
})();
