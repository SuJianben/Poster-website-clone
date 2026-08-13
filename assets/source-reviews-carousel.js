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

    const isMobile = () => mobileQuery.matches;
    const slideCount = () => (isMobile() ? cards.length : pages.length);

    const render = () => {
      const count = slideCount();
      if (index >= count) index = 0;
      track.style.transform = `translate3d(-${index * (100 / count)}%, 0, 0)`;
      carousel.dataset.sourceReviewsPage = String(index + 1);
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
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(SELECTOR).forEach(init);
  });
})();
