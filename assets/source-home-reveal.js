(() => {
  const initHomeReveal = () => {
    const anchor = document.querySelector('[data-source-home-reveal-anchor]');
    if (!anchor || anchor.dataset.sourceHomeRevealInitialized === 'true') return;
    anchor.dataset.sourceHomeRevealInitialized = 'true';

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const sectionRoot = anchor.closest('main') || document.querySelector('#MainContent') || anchor.closest('.shopify-section')?.parentElement;
    if (!sectionRoot) return;

    const sections = [...sectionRoot.children].filter((element) => element.classList?.contains('shopify-section'));
    if (!sections.length) return;

    const reveal = (section) => section.classList.add('is-revealed');

    if (!('IntersectionObserver' in window)) {
      sections.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });

    sections.forEach((section, index) => {
      section.dataset.sourceHomeReveal = '';
      section.style.setProperty('--source-home-reveal-delay', `${Math.min(index * 70, 350)}ms`);
      observer.observe(section);
    });
  };

  document.addEventListener('DOMContentLoaded', initHomeReveal);
  document.addEventListener('shopify:section:load', initHomeReveal);
})();
