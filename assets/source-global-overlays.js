(() => {
  const ACTIVE_CLASS = 'modal-show';
  const TRANSITION_MS = 300;

  function initSpotlightDrawer() {
    const trigger = document.querySelector('[data-toggle-spotlight]');
    const drawerId = trigger?.getAttribute('aria-controls');
    const drawer = drawerId ? document.getElementById(drawerId) : null;
    if (!trigger || !drawer || drawer.dataset.sourceOverlayReady === 'true') return;

    drawer.dataset.sourceOverlayReady = 'true';
    let activeElement = null;

    const close = () => {
      if (!drawer.hasAttribute('open')) return;
      drawer.removeAttribute('active');
      drawer.removeAttribute('open');
      drawer.setAttribute('inert', '');
      document.body.classList.remove(ACTIVE_CLASS);
      window.setTimeout(() => {
        if (!drawer.hasAttribute('open')) drawer.hidden = true;
        activeElement?.focus();
      }, TRANSITION_MS);
    };

    const open = (source) => {
      if (drawer.hasAttribute('open')) return;
      activeElement = source;
      drawer.hidden = false;
      drawer.removeAttribute('inert');
      drawer.setAttribute('open', '');
      document.body.classList.add(ACTIVE_CLASS);
      window.requestAnimationFrame(() => drawer.setAttribute('active', ''));
      drawer.querySelector('.drawer__close-btn')?.focus();
    };

    trigger.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-teaser]')) {
        event.preventDefault();
        trigger.classList.add('hidden');
        return;
      }
      event.preventDefault();
      drawer.hasAttribute('open') ? close() : open(trigger);
    });

    drawer.querySelector('.fixed-overlay')?.addEventListener('click', close);
    drawer.querySelector('.drawer__close-btn')?.addEventListener('click', close);
    document.addEventListener('keyup', (event) => {
      if (event.code === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpotlightDrawer);
  } else {
    initSpotlightDrawer();
  }
})();
