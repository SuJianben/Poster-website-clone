(() => {
  const SELECTOR = 'scrolling-promotion';

  function init(scroller) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const promotion = scroller.querySelector(':scope > .promotion');
    if (!promotion) return;

    if (scroller.hasAttribute('data-source-speed')) {
      const sourcePixelsPerSecond = 3740.75 / 60;
      const syncSourceSpeed = () => {
        const duration = Math.max(8, promotion.getBoundingClientRect().width / sourcePixelsPerSecond);
        scroller.style.setProperty('--duration', `${duration.toFixed(2)}s`);
      };

      syncSourceSpeed();
      promotion.querySelectorAll('img').forEach((image) => image.addEventListener('load', syncSourceSpeed, { once: true }));
      new ResizeObserver(syncSourceSpeed).observe(promotion);
    }

    promotion.classList.add('promotion--animated');

    const repeatTimes = Number(scroller.dataset.repeats || 10);
    for (let index = 0; index < repeatTimes; index += 1) {
      const clone = promotion.cloneNode(true);
      if (window.Shopify?.designMode) {
        const editorMarkedElements = [
          ...(clone.matches('[data-shopify-editor-block], [data-shopify-editor-block-content]') ? [clone] : []),
          ...clone.querySelectorAll('[data-shopify-editor-block], [data-shopify-editor-block-content]')
        ];
        editorMarkedElements.forEach((element) => {
          element.removeAttribute('data-shopify-editor-block');
          element.removeAttribute('data-shopify-editor-block-content');
        });
      }
      scroller.append(clone);
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
