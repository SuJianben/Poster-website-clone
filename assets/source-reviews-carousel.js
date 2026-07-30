(() => {
  const SELECTOR = '[data-source-reviews-carousel]';

  function init(carousel) {
    if (carousel.dataset.sourceReviewsReady === 'true') return;

    const track = carousel.querySelector('.source-reviews-carousel__track');
    const pages = Array.from(carousel.querySelectorAll('.source-reviews-carousel__page'));
    if (!track || pages.length < 2) return;

    carousel.dataset.sourceReviewsReady = 'true';
    let index = 0;

    const render = () => {
      track.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
      carousel.dataset.sourceReviewsPage = String(index + 1);
    };

    carousel.querySelector('[data-source-reviews-prev]').addEventListener('click', () => {
      index = index === 0 ? pages.length - 1 : index - 1;
      render();
    });

    carousel.querySelector('[data-source-reviews-next]').addEventListener('click', () => {
      index = index === pages.length - 1 ? 0 : index + 1;
      render();
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(SELECTOR).forEach(init);
  });
})();
