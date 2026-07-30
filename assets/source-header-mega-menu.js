(() => {
  const SELECTOR = "header details[is='details-mega']";
  const OPEN_DELAY = 100;
  const CLOSE_DELAY = 150;
  const TRANSITION_DURATION = 500;

  function initMenu(menu) {
    if (menu.dataset.sourceMegaMenuReady === 'true') return;

    const summary = menu.querySelector(':scope > summary');
    const content = menu.querySelector(':scope > .mega-menu');
    const panel = content?.querySelector(':scope > .mega-menu__container');
    const wrapper = content?.querySelector('.mega-menu__wrapper');
    if (!summary || !content || !panel || !wrapper) return;

    menu.dataset.sourceMegaMenuReady = 'true';
    let openTimer;
    let closeTimer;
    let hideTimer;

    const clearTimers = () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
      window.clearTimeout(hideTimer);
    };

    const updateBodyState = () => {
      document.body.classList.remove('has-dropdown-menu');
    };

    const hide = () => {
      clearTimers();
      menu.classList.remove('source-mega-menu-open');
      summary.removeAttribute('open');
      content.removeAttribute('open');
      hideTimer = window.setTimeout(() => {
        if (!menu.classList.contains('source-mega-menu-open')) menu.removeAttribute('open');
      }, TRANSITION_DURATION);
      updateBodyState();
    };

    const show = () => {
      clearTimers();
      document.querySelectorAll(SELECTOR).forEach((otherMenu) => {
        if (otherMenu !== menu && otherMenu.classList.contains('source-mega-menu-open')) {
          otherMenu.dispatchEvent(new CustomEvent('source-mega-menu:close'));
        }
      });
      menu.setAttribute('open', '');
      summary.setAttribute('open', '');
      content.setAttribute('open', '');
      menu.classList.add('source-mega-menu-open');
      updateBodyState();
    };

    const selectSidebarItem = (item) => {
      const sidebar = item.closest('menu-sidebar');
      if (!sidebar) return;

      sidebar.querySelectorAll('.menu-sidebar__toggle.is-visible').forEach((visibleItem) => {
        visibleItem.classList.remove('is-visible');
      });
      item.classList.add('is-visible');

      const itemContent = item.nextElementSibling;
      if (itemContent) {
        wrapper.style.setProperty('--sidebar-height', `${itemContent.scrollHeight}px`);
      }
    };

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      if (menu.classList.contains('source-mega-menu-open')) hide();
      else show();
    });

    menu.addEventListener('mouseenter', () => {
      window.clearTimeout(closeTimer);
      openTimer = window.setTimeout(show, OPEN_DELAY);
    });

    menu.addEventListener('mouseleave', () => {
      window.clearTimeout(openTimer);
      closeTimer = window.setTimeout(hide, CLOSE_DELAY);
    });

    menu.addEventListener('source-mega-menu:close', hide);

    menu.querySelectorAll('menu-sidebar .menu-sidebar__toggle').forEach((item) => {
      item.addEventListener('mouseenter', () => selectSidebarItem(item));
      item.addEventListener('click', (event) => {
        event.preventDefault();
        selectSidebarItem(item);
      });
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target)) hide();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hide();
    });

    const initialItem = menu.querySelector('menu-sidebar .menu-sidebar__toggle.is-visible');
    if (initialItem) selectSidebarItem(initialItem);
  }

  const initMenus = () => {
    document.querySelectorAll(SELECTOR).forEach(initMenu);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMenus);
  else initMenus();
})();
