(() => {
  const DRAWER_ID = 'CartDrawer';
  const TRANSITION_MS = 250;

  function init() {
    const drawer = document.getElementById(DRAWER_ID);
    if (!drawer || drawer.dataset.sourceDrawerReady === 'true') return;

    drawer.dataset.sourceDrawerReady = 'true';
    let activeElement = null;

    const close = () => {
      if (!drawer.hasAttribute('open')) return;
      drawer.removeAttribute('active');
      drawer.removeAttribute('open');
      drawer.setAttribute('inert', '');
      document.body.classList.remove('modal-show');
      window.setTimeout(() => {
        if (!drawer.hasAttribute('open')) drawer.hidden = true;
        activeElement?.focus();
      }, TRANSITION_MS);
    };

    const open = (trigger) => {
      if (drawer.hasAttribute('open')) return;
      activeElement = trigger;
      drawer.hidden = false;
      drawer.removeAttribute('inert');
      drawer.setAttribute('open', '');
      document.body.classList.add('modal-show');
      window.requestAnimationFrame(() => drawer.setAttribute('active', ''));
      drawer.querySelector('.drawer__close-btn')?.focus();
    };

    document.querySelectorAll(`[aria-controls="${DRAWER_ID}"]`).forEach((control) => {
      control.addEventListener('click', (event) => {
        event.preventDefault();
        drawer.hasAttribute('open') ? close() : open(control);
      });
    });

    drawer.querySelector('.fixed-overlay')?.addEventListener('click', close);
    drawer.querySelector('.drawer__close-btn')?.addEventListener('click', close);
    document.addEventListener('keyup', (event) => {
      if (event.code === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
