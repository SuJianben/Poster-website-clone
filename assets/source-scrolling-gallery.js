(() => {
  const SELECTOR = 'scrolling-promotion';

  function init(scroller) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const promotion = scroller.querySelector(':scope > .promotion');
    if (!promotion) return;

    promotion.classList.add('promotion--animated');

    const repeatTimes = Number(scroller.dataset.repeats || 10);
    for (let index = 0; index < repeatTimes; index += 1) {
      scroller.append(promotion.cloneNode(true));
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        scroller.classList.toggle('scrolling-promotion--paused', !entry.isIntersecting);
      },
      { rootMargin: '0px 0px 50px 0px' },
    );

    observer.observe(scroller);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(SELECTOR).forEach(init);
  });
})();
