(() => {
  const initHomeReveal = () => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const sectionRoot = document.querySelector('#MainContent') || document.querySelector('main');
    if (!sectionRoot || sectionRoot.dataset.sourceHomeRevealInitialized === 'true') return;

    const sections = [...sectionRoot.children].filter((element) => element.classList?.contains('shopify-section'));
    if (!sections.length) return;
    sectionRoot.dataset.sourceHomeRevealInitialized = 'true';

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
  window.setTimeout(initHomeReveal, 120);
})();
