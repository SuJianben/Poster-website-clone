(() => {
  const triggerSelector = '.menu-drawer-button[aria-controls="MenuDrawer"]';
  const drawerId = 'MenuDrawer';
  const openClass = 'modal-show';
  const transitionMs = 300;

  const init = () => {
    const trigger = document.querySelector(triggerSelector);
    const drawer = document.getElementById(drawerId);
    if (!trigger || !drawer || drawer.dataset.sourceMobileMenuReady === 'true') return;

    drawer.dataset.sourceMobileMenuReady = 'true';
    let previousFocus = null;

    const track = (action) => {
      const detail = { event: 'source_mobile_menu', action };
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(detail);
      drawer.dispatchEvent(new CustomEvent('source_mobile_menu', { bubbles: true, detail }));
    };

    const close = () => {
      if (!drawer.hasAttribute('open')) return;
      drawer.removeAttribute('active');
      drawer.removeAttribute('open');
      drawer.setAttribute('inert', '');
      document.body.classList.remove(openClass);
      trigger.setAttribute('aria-expanded', 'false');
      window.setTimeout(() => {
        if (!drawer.hasAttribute('open')) drawer.hidden = true;
        previousFocus?.focus();
      }, transitionMs);
      track('close');
    };

    const open = () => {
      if (drawer.hasAttribute('open')) return;
      previousFocus = trigger;
      drawer.hidden = false;
      drawer.removeAttribute('inert');
      drawer.setAttribute('open', '');
      document.body.classList.add(openClass);
      trigger.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(() => drawer.setAttribute('active', ''));
      track('open');
    };

    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      drawer.hasAttribute('open') ? close() : open();
    });

    drawer.querySelector('.fixed-overlay')?.addEventListener('click', close);
    drawer.addEventListener('click', (event) => {
      if (event.target.closest('a[href]')) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('shopify:section:load', init);
})();
