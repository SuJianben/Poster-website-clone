(() => {
  const initHomeReveal = () => {
    const sectionRoot = document.querySelector('[data-source-home-reveal-anchor]')?.closest('.site-wrapper')
      || document.querySelector('.site-wrapper')
      || document.body;
    if (!sectionRoot || sectionRoot.dataset.sourceHomeRevealInitialized === 'true') return;

    const textSelector = [
      '.section__header--text',
      '.section__header--buttons',
      '.slideshow-with-product__text',
      '.slideshow-with-product__product .product-card__info',
      '[class*="source-mobile-"][class*="__header"] h2',
      '[class*="source-mobile-"][class*="__tabs"]'
    ].join(',');
    const textNodes = [...sectionRoot.querySelectorAll(textSelector)];
    if (!textNodes.length) return;
    sectionRoot.dataset.sourceHomeRevealInitialized = 'true';

    const reveal = (element) => element.classList.add('is-revealed');

    if (!('IntersectionObserver' in window)) {
      textNodes.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });

    textNodes.forEach((element, index) => {
      element.dataset.sourceHomeTextReveal = '';
      element.style.setProperty('--source-home-reveal-delay', `${Math.min(index * 70, 350)}ms`);
      observer.observe(element);
    });
  };

  document.addEventListener('DOMContentLoaded', initHomeReveal);
  document.addEventListener('shopify:section:load', initHomeReveal);
  window.setTimeout(initHomeReveal, 120);
})();
