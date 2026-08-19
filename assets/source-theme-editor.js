(() => {
  const mobileQuery = window.matchMedia('(max-width: 767.98px)');
  const markerAttribute = 'data-shopify-editor-block';
  const markerSelector = '[data-shopify-editor-block], [data-shopify-editor-block-content]';
  const editorMarkerAttributes = (element) => [...element.attributes]
    .map((attribute) => attribute.name)
    .filter((name) => name.startsWith('data-shopify-editor-'));
  const tabIdAttributes = [
    'data-source-editor-tab',
    'data-source-bestsellers-desktop-block',
    'data-source-bestsellers-mobile-block'
  ];

  const descendantsOrSelf = (container, selector) => {
    const elements = [];
    if (container instanceof Element && container.matches(selector)) elements.push(container);
    elements.push(...container.querySelectorAll(selector));
    return elements;
  };

  const blockIdFor = (element) => tabIdAttributes
    .map((attribute) => element.getAttribute(attribute))
    .find(Boolean);

  const isVisible = (element) => element && element.getClientRects().length > 0
    && !element.closest('template');

  const markerMatchesBlock = (element, blockId) => editorMarkerAttributes(element).some((name) => {
    const value = element.getAttribute(name);
    if (!value) return false;
    if (value === blockId) return true;
    try {
      const parsed = JSON.parse(value);
      return parsed?.id === blockId || parsed?.blockId === blockId;
    } catch {
      return value.includes(blockId);
    }
  });

  function syncEditorMarkers(container = document) {
    const sections = new Set(descendantsOrSelf(container, '.shopify-section').filter(Boolean));
    if (container instanceof Element) {
      const owningSection = container.closest('.shopify-section');
      if (owningSection) sections.add(owningSection);
    }

    sections.forEach((section) => {
      const triggers = descendantsOrSelf(section, `[${tabIdAttributes.join('],[')}]`);
      const groups = new Map();

      triggers.forEach((trigger) => {
        const blockId = blockIdFor(trigger);
        if (!blockId) return;
        if (!groups.has(blockId)) groups.set(blockId, []);
        groups.get(blockId).push(trigger);
      });

      groups.forEach((group) => {
        const markerSource = group.find((element) => editorMarkerAttributes(element).length);
        if (!markerSource) return;

        const markers = editorMarkerAttributes(markerSource).map((name) => [
          name,
          markerSource.getAttribute(name)
        ]);
        group.forEach((element) => {
          editorMarkerAttributes(element).forEach((name) => element.removeAttribute(name));
        });
        const target = group.find(isVisible) || group[0];
        markers.forEach(([name, value]) => target?.setAttribute(name, value));
      });
    });
  }

  function applyAttributes(element, attributes) {
    if (!element || !attributes) return;

    const template = document.createElement('template');
    template.innerHTML = `<i ${attributes}></i>`;
    const marker = template.content.firstElementChild;
    if (!marker) return;

    [...marker.attributes].forEach((attribute) => {
      element.setAttribute(attribute.name, attribute.value);
    });
  }

  function selectBlock(blockId) {
    if (!blockId) return false;

    const triggers = [...document.querySelectorAll(`[${tabIdAttributes.join('],[')}]`)]
      .filter((trigger) => blockIdFor(trigger) === blockId);
    const trigger = triggers.find(isVisible) || triggers[0];

    if (trigger) {
      trigger.click();
      requestAnimationFrame(() => trigger.scrollIntoView({ block: 'nearest', inline: 'center' }));
      return true;
    }

    const marker = [...document.querySelectorAll(markerSelector)]
      .find((element) => markerMatchesBlock(element, blockId));
    if (!marker) return false;
    marker.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  }

  window.sourceThemeEditorApplyAttributes = applyAttributes;
  syncEditorMarkers();

  if (window.Shopify?.designMode && !window.sourceThemeEditorBridgeLoaded) {
    window.sourceThemeEditorBridgeLoaded = true;

    document.addEventListener('shopify:block:select', (event) => {
      syncEditorMarkers(event.target || document);
      const blockId = event.detail?.blockId;
      const selected = selectBlock(blockId);
      requestAnimationFrame(() => {
        syncEditorMarkers(event.target || document);
        if (!selected) selectBlock(blockId);
      });
    }, true);

    document.addEventListener('shopify:section:load', (event) => {
      syncEditorMarkers(event.target || document);
      requestAnimationFrame(() => syncEditorMarkers(event.target || document));
    });

    const resync = () => syncEditorMarkers();
    if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', resync);
    else mobileQuery.addListener(resync);
  }
})();
