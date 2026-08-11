(() => {
  const ROOT_SELECTOR = '[data-spf-tabs]';
  const PANEL_ANIMATION_OPTIONS = {
    duration: 300,
    easing: 'ease',
    fill: 'both'
  };

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function finishAnimation(animation) {
    return animation.finished.catch(() => undefined);
  }

  function animatePanel(panel, entering) {
    const transformFrames = entering
      ? [{ transform: 'translateY(2rem)' }, { transform: 'translateY(0px)' }]
      : [{ transform: 'translateY(0px)' }, { transform: 'translateY(2rem)' }];
    const opacityFrames = entering
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 1 }, { opacity: 0 }];

    return Promise.all([
      finishAnimation(panel.animate(transformFrames, PANEL_ANIMATION_OPTIONS)),
      finishAnimation(panel.animate(opacityFrames, PANEL_ANIMATION_OPTIONS))
    ]);
  }

  function setPanelState(panel, visible) {
    panel.hidden = !visible;
    panel.style.transform = visible ? 'translateY(0px)' : 'translateY(2rem)';
    panel.style.opacity = visible ? '1' : '0';
  }

  function emitTabEvent(root, tab) {
    const detail = {
      sectionId: root.dataset.sectionId || '',
      index: Number(tab.dataset.spfTab),
      label: tab.dataset.analyticsLabel || ''
    };

    root.dispatchEvent(new CustomEvent('source_product_tab_change', {
      bubbles: true,
      detail
    }));
  }

  function init(root) {
    if (root.dataset.spfTabsReady === 'true') return;
    root.dataset.spfTabsReady = 'true';

    const tabs = Array.from(root.querySelectorAll('[data-spf-tab]'));
    const panels = Array.from(root.querySelectorAll('[data-spf-panel]'));
    let activeIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
    let animating = false;
    let queuedActivation = null;

    if (activeIndex < 0) activeIndex = 0;
    panels.forEach((panel, panelIndex) => setPanelState(panel, panelIndex === activeIndex));

    const updateTabs = (index, shouldFocus) => {
      tabs.forEach((tab, tabIndex) => {
        const active = tabIndex === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });

      const nextTab = tabs[index];
      nextTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      if (shouldFocus) nextTab.focus({ preventScroll: true });
      emitTabEvent(root, nextTab);
    };

    const activate = async (index, shouldFocus = false) => {
      const nextTab = tabs[index];
      const nextPanel = panels[index];
      if (!nextTab || !nextPanel) return;
      if (index === activeIndex && !animating) {
        if (shouldFocus) nextTab.focus({ preventScroll: true });
        return;
      }

      if (animating) {
        queuedActivation = { index, shouldFocus };
        return;
      }

      const previousPanel = panels[activeIndex];
      activeIndex = index;
      animating = true;
      root.dataset.spfAnimating = 'true';
      updateTabs(index, shouldFocus);

      if (prefersReducedMotion()) {
        if (previousPanel && previousPanel !== nextPanel) setPanelState(previousPanel, false);
        setPanelState(nextPanel, true);
      } else if (previousPanel !== nextPanel) {
        setPanelState(previousPanel, true);
        await animatePanel(previousPanel, false);
        setPanelState(previousPanel, false);

        nextPanel.hidden = false;
        nextPanel.style.transform = 'translateY(2rem)';
        nextPanel.style.opacity = '0';
        await animatePanel(nextPanel, true);
        setPanelState(nextPanel, true);
      }

      animating = false;
      root.dataset.spfAnimating = 'false';

      if (queuedActivation) {
        const queued = queuedActivation;
        queuedActivation = null;
        activate(queued.index, queued.shouldFocus);
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(index));
      tab.addEventListener('keydown', (event) => {
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        activate(nextIndex, true);
      });
    });
  }

  function initAll(container = document) {
    container.querySelectorAll(ROOT_SELECTOR).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => initAll(event.target));
})();
