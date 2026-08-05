(() => {
  const HEADER_SELECTOR = '.header-section header[is="sticky-header"][data-sticky-type="on-scroll-up"]';
  const SCROLL_THRESHOLD = 200;

  function init(header) {
    if (header.dataset.sourceStickyReady === 'true') return;

    const section = header.closest('.header-section');
    if (!section) return;

    header.dataset.sourceStickyReady = 'true';
    section.classList.add('source-sticky-header');

    const setSourceHeaderMetrics = () => {
      const navigation = header.querySelector('.header__bottom');
      const headerGroups = document.querySelectorAll('.shopify-section-group-header-group');
      let groupHeight = 0;

      headerGroups.forEach((group) => {
        groupHeight += group.offsetHeight;
      });

      document.documentElement.style.setProperty('--header-height', `${Math.round(header.offsetHeight)}px`);
      document.documentElement.style.setProperty('--header-offset-top', `${Math.round(section.offsetTop)}px`);
      document.documentElement.style.setProperty('--header-navigation-height', `${Math.max(0, Math.round(navigation ? navigation.offsetHeight - 1 : 0))}px`);
      document.documentElement.style.setProperty('--header-group-height', `${Math.round(groupHeight)}px`);
    };

    setSourceHeaderMetrics();
    new ResizeObserver(setSourceHeaderMetrics).observe(header);
    window.addEventListener('resize', setSourceHeaderMetrics, { passive: true });

    let previousScrollTop = window.scrollY;
    const initialBounds = section.getBoundingClientRect();
    const headerTop = initialBounds.top + previousScrollTop;
    const headerBottom = initialBounds.bottom + previousScrollTop;
    let direction = 'none';
    let distance = 0;
    let framePending = false;

    const update = () => {
      const scrollTop = window.scrollY;
      const nextDirection = scrollTop > previousScrollTop ? 'down' : 'up';

      if (nextDirection !== direction) {
        direction = nextDirection;
        distance = 0;
      } else {
        distance += Math.abs(scrollTop - previousScrollTop);
      }

      if (scrollTop <= headerTop) {
        section.classList.remove('header-scrolled');
        document.body.classList.remove('header-pinned');
      } else {
        section.classList.add('header-scrolled');

        if (direction === 'up' || scrollTop < headerBottom + 100) {
          document.body.classList.add('header-pinned');
        } else if (distance >= SCROLL_THRESHOLD) {
          document.body.classList.remove('header-pinned');
        }
      }

      previousScrollTop = scrollTop;
      framePending = false;
    };

    const onScroll = () => {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(HEADER_SELECTOR).forEach(init);
  });
})();
