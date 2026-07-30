(() => {
  const SELECTOR = "header details[is='details-mega']";
  const OPEN_DELAY = 100;
  const CLOSE_DELAY = 150;
  const TRANSITION_DURATION = 500;

  function initMenu(menu) {
    if (menu.dataset.sourceMegaMenuReady === 'true') return;

    const summary = menu.querySelector(':scope > summary');
    let content;
    let panel;
    let wrapper;
    const refreshPanel = () => {
      content = menu.querySelector(':scope > .mega-menu');
      panel = content?.querySelector(':scope > .mega-menu__container');
      wrapper = content?.querySelector('.mega-menu__wrapper');
      return Boolean(content && panel && wrapper);
    };
    if (!summary || !refreshPanel()) return;

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
      menu.classList.add('source-mega-menu-closing');
      summary.removeAttribute('open');
      content.removeAttribute('open');
      hideTimer = window.setTimeout(() => {
        if (!menu.classList.contains('source-mega-menu-open')) {
          menu.classList.remove('source-mega-menu-closing');
          menu.removeAttribute('open');
        }
      }, TRANSITION_DURATION);
      updateBodyState();
    };

    const show = () => {
      clearTimers();
      if (!refreshPanel()) return;
      document.querySelectorAll(SELECTOR).forEach((otherMenu) => {
        if (otherMenu !== menu && otherMenu.classList.contains('source-mega-menu-open')) {
          otherMenu.dispatchEvent(new CustomEvent('source-mega-menu:close'));
        }
      });
      menu.setAttribute('open', '');
      menu.classList.remove('source-mega-menu-closing');
      summary.setAttribute('open', '');
      content.setAttribute('open', '');
      menu.classList.add('source-mega-menu-open');
      updateBodyState();
    };

    const selectSidebarItem = (item) => {
      const sidebar = item.closest('menu-sidebar');
      if (!sidebar) return;

      sidebar.querySelectorAll('.menu-sidebar__item').forEach((sidebarItem) => {
        sidebarItem.open = sidebarItem.contains(item);
      });
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

    menu.addEventListener('mouseover', (event) => {
      const item = event.target.closest('menu-sidebar .menu-sidebar__toggle');
      if (item && menu.contains(item)) selectSidebarItem(item);
    });

    menu.addEventListener('click', (event) => {
      const item = event.target.closest('menu-sidebar .menu-sidebar__toggle');
      if (!item || event.target.closest('a')) return;
      event.preventDefault();
      selectSidebarItem(item);
    });

    document.addEventListener('click', (event) => {
      if (!menu.contains(event.target)) hide();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hide();
    });

    const selectInitialItem = () => {
      const initialItem = menu.querySelector('menu-sidebar .menu-sidebar__toggle.is-visible');
      if (initialItem) selectSidebarItem(initialItem);
    };

    menu.addEventListener('source-mega-menu:refresh', () => {
      if (refreshPanel()) selectInitialItem();
    });

    selectInitialItem();
  }

  const initMenus = () => {
    document.querySelectorAll(SELECTOR).forEach(initMenu);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMenus);
  else initMenus();
})();
