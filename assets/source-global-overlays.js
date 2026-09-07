/*
 * Collection and product templates normally load the theme's SpotlightPick
 * custom element, which already owns the drawer lifecycle.  Error pages and
 * a few lightweight templates do not load that bundle, so provide a small
 * fallback there.  The guard is important: binding this fallback when the
 * custom element is present would make one click toggle the drawer twice.
 */
(() => {
  const ACTIVE_CLASS = 'modal-show';
  const TRANSITION_MS = 300;

  function initSpotlightFallback() {
    const trigger = document.querySelector('[data-toggle-spotlight]');
    const drawerId = trigger?.getAttribute('aria-controls');
    const drawer = drawerId ? document.getElementById(drawerId) : null;
    if (!trigger || !drawer) return;

    // The native element binds the same controls itself. Never add a second
    // listener on collection/product pages where that element is available.
    if (window.customElements?.get('spotlight-pick')) return;
    if (drawer.dataset.sourceOverlayReady === 'true') return;
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
    document.addEventListener('DOMContentLoaded', initSpotlightFallback, { once: true });
  } else {
    initSpotlightFallback();
  }
})();
