(() => {
  const triggerSelector = '.js-open-atelier-drawer-card';

  function init() {
    const wrapper = document.querySelector('[data-source-atelier-drawer]');
    const drawer = wrapper?.querySelector('.atelier-drawer');
    const overlay = wrapper?.querySelector('.atelier-drawer-overlay');
    if (!drawer || !overlay || wrapper.dataset.ready === 'true') return;

    wrapper.dataset.ready = 'true';
    let trigger = null;
    const title = drawer.querySelector('[data-atelier-drawer-title]');
    const intro = drawer.querySelector('[data-atelier-drawer-intro]');
    const defaultTitle = title?.textContent || '';
    const defaultIntro = intro?.innerHTML || '';

    const setDefaultContent = () => {
      if (title) title.textContent = defaultTitle;
      if (intro) intro.innerHTML = defaultIntro;
    };

    const setTriggerContent = (nextTrigger) => {
      setDefaultContent();

      const customTitle = nextTrigger.dataset.atelierTitle?.trim();
      const customDescription = nextTrigger.dataset.atelierDescription?.trim();

      if (customTitle && title) title.textContent = customTitle;
      if (customDescription && intro) intro.textContent = customDescription;
    };

    const close = () => {
      if (!drawer.classList.contains('is-open')) return;
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('is-visible');
      document.body.style.overflow = '';
      trigger?.focus();
    };

    const open = (nextTrigger) => {
      trigger = nextTrigger;
      setTriggerContent(nextTrigger);
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      overlay.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
      drawer.querySelector('[data-atelier-close]')?.focus();
    };

    document.addEventListener('click', (event) => {
      const cardTrigger = event.target.closest(triggerSelector);
      if (cardTrigger) {
        event.preventDefault();
        open(cardTrigger);
      }
    });
    wrapper.querySelectorAll('[data-atelier-close]').forEach((button) => button.addEventListener('click', close));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
