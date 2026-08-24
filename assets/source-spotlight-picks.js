(() => {
  const DEFAULT_TIERS = [
    { quantity: 1, discount: 5 },
    { quantity: 2, discount: 10 },
    { quantity: 3, discount: 15 },
    { quantity: 4, discount: 20 },
    { quantity: 5, discount: 25 }
  ];

  const DEFAULT_CONFIG = {
    enabled: true,
    button: {
      label: 'Angebote',
      background: '#3D1313',
      textColor: '#FFFFFF'
    },
    banner: 'Spare jetzt mit diesen exklusiven Angeboten',
    title: 'Besondere Angebote',
    offers: [],
    progress: {
      enabled: true,
      nextCopy: 'Kaufen Sie {remaining} weitere Artikel, um {discount}% Rabatt zu erhalten.',
      completeCopy: 'Sie haben sich den maximalen Mengenrabatt gesichert.',
      discountLabel: '{discount}% Rabatt',
      goalTemplate: '{quantity} Artikel kaufen',
      tierCount: 5,
      tiers: DEFAULT_TIERS
    }
  };

  const svgElement = (attributes = {}) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  };

  const pathElement = (attributes = {}) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  };

  const createTagIcon = () => {
    const icon = svgElement({
      class: 'icon icon-tag icon--large icon--thick shrink-0',
      'aria-hidden': 'true',
      focusable: 'false',
      viewBox: '0 0 20 20',
      fill: 'none'
    });
    icon.append(
      pathElement({
        d: 'M3.30781 10.8078C3.19082 10.6907 3.12508 10.5319 3.125 10.3664V3.125H10.3664C10.5319 3.12508 10.6907 3.19082 10.8078 3.30781L18.5672 11.0672C18.6843 11.1844 18.7501 11.3433 18.7501 11.509C18.7501 11.6747 18.6843 11.8336 18.5672 11.9508L11.9531 18.5672C11.8359 18.6843 11.677 18.7501 11.5113 18.7501C11.3456 18.7501 11.1867 18.6843 11.0695 18.5672L3.30781 10.8078Z',
        stroke: 'currentColor',
        'stroke-width': '1.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }),
      pathElement({
        d: 'M6.5625 7.5C7.08027 7.5 7.5 7.08027 7.5 6.5625C7.5 6.04473 7.08027 5.625 6.5625 5.625C6.04473 5.625 5.625 6.04473 5.625 6.5625C5.625 7.08027 6.04473 7.5 6.5625 7.5Z',
        fill: 'currentColor'
      })
    );
    return icon;
  };

  const createHighlightCircle = () => {
    const icon = svgElement({
      viewBox: '0 -55 800 420',
      class: 'absolute highlight-text__svg',
      stroke: 'currentColor',
      fill: 'none',
      role: 'presentation',
      preserveAspectRatio: 'none'
    });
    icon.append(pathElement({
      transform: 'matrix(0.9791300296783447,0,0,0.9791300296783447,400,179)',
      'stroke-linejoin': 'miter',
      'stroke-miterlimit': '4',
      'stroke-width': '16',
      pathLength: '1',
      d: 'M253,-161 C253,-161 -284.78900146484375,-201.4600067138672 -376,-21 C-469,163 67.62300109863281,174.2100067138672 256,121 C564,34 250.82899475097656,-141.6929931640625 19.10700035095215,-116.93599700927734'
    }));
    return icon;
  };

  const createMarkerIcon = () => {
    const icon = svgElement({
      'aria-hidden': 'true',
      focusable: 'false',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    });
    icon.append(
      pathElement({ d: 'M3.85 8.62a4 4 0 0 1 4.77-4.77 4 4 0 0 1 6.76 0 4 4 0 0 1 4.77 4.77 4 4 0 0 1 0 6.76 4 4 0 0 1-4.77 4.77 4 4 0 0 1-6.76 0 4 4 0 0 1-4.77-4.77 4 4 0 0 1 0-6.76Z' }),
      pathElement({ d: 'm15 9-6 6' }),
      pathElement({ d: 'M9 9h.01' }),
      pathElement({ d: 'M15 15h.01' })
    );
    return icon;
  };

  const asText = (value, fallback = '') => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return fallback;
    return String(value);
  };

  const replaceTokens = (template, values) => asText(template).replace(/\{(remaining|discount|quantity)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  ));

  const parseConfig = () => {
    const node = document.querySelector('[data-source-spotlight-config]');
    if (!node) return DEFAULT_CONFIG;

    try {
      const parsed = JSON.parse(node.textContent || '{}');
      const parsedButton = parsed && typeof parsed.button === 'object' ? parsed.button : {};
      const parsedProgress = parsed && typeof parsed.progress === 'object' ? parsed.progress : {};

      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        enabled: parsed?.enabled !== false,
        button: { ...DEFAULT_CONFIG.button, ...parsedButton },
        offers: Array.isArray(parsed?.offers) ? parsed.offers : DEFAULT_CONFIG.offers,
        progress: {
          ...DEFAULT_CONFIG.progress,
          ...parsedProgress,
          enabled: parsedProgress.enabled !== false
        }
      };
    } catch (error) {
      console.warn('Unable to read spotlight configuration', error);
      return DEFAULT_CONFIG;
    }
  };

  const normalizedOffers = (offers) => (Array.isArray(offers) ? offers : [])
    .map((offer) => ({
      enabled: offer?.enabled !== false,
      highlight: asText(offer?.highlight).trim(),
      title: asText(offer?.title).trim(),
      description: asText(offer?.description).trim(),
      button: asText(offer?.button).trim(),
      link: asText(offer?.link).trim(),
      scheme: offer?.scheme === 'inverse' ? 'inverse' : '10'
    }))
    .filter((offer) => offer.enabled && (offer.highlight || offer.title || offer.description));

  const normalizedTiers = (progress) => {
    const requestedCount = Math.min(5, Math.max(1, Number.parseInt(progress?.tierCount, 10) || 5));
    const tiers = (Array.isArray(progress?.tiers) ? progress.tiers : DEFAULT_TIERS)
      .map((tier) => ({
        quantity: Number.parseInt(tier?.quantity, 10),
        discount: Number.parseInt(tier?.discount, 10)
      }))
      .filter((tier) => Number.isFinite(tier.quantity) && tier.quantity > 0 && Number.isFinite(tier.discount) && tier.discount >= 0)
      .sort((first, second) => first.quantity - second.quantity)
      .filter((tier, index, list) => index === 0 || tier.quantity !== list[index - 1].quantity)
      .slice(0, requestedCount);

    return tiers.length ? tiers : DEFAULT_TIERS;
  };

  const safeLink = (value) => {
    const link = asText(value).trim();
    return /^javascript:/i.test(link) ? '' : link;
  };

  const createOffer = (offer, index) => {
    const item = document.createElement('div');
    item.className = `spotlight__item flex items-center gap-3 theme-radius color-scheme-${offer.scheme}`;

    const info = document.createElement('div');
    info.className = 'spotlight__item-info flex-grow flex gap-3';

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'spotlight__item-icon shrink-0';
    iconWrapper.append(createTagIcon());

    const content = document.createElement('div');
    content.className = 'spotlight__item-content flex flex-col gap-1';

    if (offer.highlight || offer.title) {
      const heading = document.createElement('h3');
      heading.className = `spotlight__item-heading ${index === 0 ? 'h4' : 'h5'}`;

      if (offer.highlight) {
        const highlight = document.createElement('em');
        highlight.setAttribute('is', 'highlight-text');
        highlight.className = 'highlight-text relative inline-block font-italic highlight-text--hand-drawn-circle';
        highlight.style.setProperty('--hl-style-color', '178, 161, 131, 1.0');
        highlight.textContent = offer.highlight;
        highlight.append(createHighlightCircle());
        heading.append(highlight);
      }

      if (offer.title) {
        if (offer.highlight) heading.append(document.createTextNode(' '));
        heading.append(document.createTextNode(offer.title));
      }

      content.append(heading);
    }

    if (offer.description) {
      const description = document.createElement('div');
      description.className = 'rte text-subtext';
      offer.description.split(/\r?\n/).filter(Boolean).forEach((line) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = line;
        description.append(paragraph);
      });
      content.append(description);
    }

    info.append(iconWrapper, content);
    item.append(info);

    const link = safeLink(offer.link);
    if (offer.button && link) {
      const actions = document.createElement('div');
      actions.className = 'spotlight__item-actions shrink-0';
      const button = document.createElement('a');
      button.className = 'btn btn--primary btn--small';
      button.href = link;
      const label = document.createElement('span');
      label.className = 'btn__text';
      label.textContent = offer.button;
      button.append(label);
      actions.append(button);
      item.append(actions);
    }

    return item;
  };

  const updateHeading = (drawer, config, offerCount) => {
    const banner = drawer.querySelector('.drawer__header-message');
    if (banner) banner.textContent = asText(config.banner, DEFAULT_CONFIG.banner);

    const heading = drawer.querySelector('.drawer__heading');
    if (heading) {
      const count = document.createElement('span');
      count.dataset.sourceSpotlightCount = '';
      count.textContent = `(${offerCount})`;
      heading.replaceChildren(document.createTextNode(asText(config.title, DEFAULT_CONFIG.title)), document.createTextNode(' '), count);
    }
  };

  const updateTrigger = (config, offerCount) => {
    const trigger = document.querySelector('[data-toggle-spotlight]');
    if (!trigger) return;

    if (config.enabled === false) {
      trigger.hidden = true;
      return;
    }

    trigger.hidden = false;
    trigger.classList.remove('hidden');
    trigger.dataset.sourceSpotlightConfigured = 'true';
    trigger.style.setProperty('--source-spotlight-button-background', asText(config.button?.background, DEFAULT_CONFIG.button.background));
    trigger.style.setProperty('--source-spotlight-button-text', asText(config.button?.textColor, DEFAULT_CONFIG.button.textColor));

    const label = asText(config.button?.label, DEFAULT_CONFIG.button.label);
    trigger.setAttribute('aria-label', label);
    const count = trigger.querySelector('.badge-count');
    if (count) count.textContent = String(offerCount);

    const text = trigger.querySelector('.btn__text');
    if (!text) return;

    let labelNode = text.querySelector('[data-source-spotlight-button-label]');
    if (!labelNode) {
      Array.from(text.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node) => node.remove());
      labelNode = document.createElement('span');
      labelNode.dataset.sourceSpotlightButtonLabel = '';
      const closeTeaser = text.querySelector('[data-close-teaser]');
      text.insertBefore(labelNode, closeTeaser || null);
    }
    labelNode.textContent = label;
  };

  const applyConfig = (drawer, config) => {
    const offers = normalizedOffers(config.offers);
    updateTrigger(config, offers.length);
    if (config.enabled === false) {
      drawer.hidden = true;
      return offers;
    }

    updateHeading(drawer, config, offers.length);
    const list = drawer.querySelector('.spotlight__list');
    if (list) list.replaceChildren(...offers.map(createOffer));
    return offers;
  };

  const createPromotion = (drawer, config) => {
    const body = drawer.querySelector('.drawer__body');
    const list = body?.querySelector('.spotlight__list');
    if (!body || !list) return null;

    let promotion = body.querySelector('[data-source-spotlight-promotion]');
    if (config.progress?.enabled === false) {
      promotion?.remove();
      return null;
    }

    if (!promotion) {
      promotion = document.createElement('section');
      promotion.className = 'source-spotlight-promotion';
      promotion.dataset.sourceSpotlightPromotion = '';
      promotion.setAttribute('aria-label', 'Mengenrabatt');
      promotion.innerHTML = [
        '<p class="source-spotlight-promotion__copy" data-source-spotlight-copy></p>',
        '<div class="source-spotlight-promotion__bar-wrapper">',
        '<ol class="source-spotlight-promotion__goal-list source-spotlight-promotion__title-list"></ol>',
        '<div class="source-spotlight-promotion__bar" role="progressbar" aria-valuemin="0">',
        '<ol class="source-spotlight-promotion__goal-list source-spotlight-promotion__markers" aria-hidden="true"></ol>',
        '<span class="source-spotlight-promotion__indicator"></span>',
        '</div>',
        '<ol class="source-spotlight-promotion__goal-list source-spotlight-promotion__value-list"></ol>',
        '</div>'
      ].join('');
      list.before(promotion);
    }

    return promotion;
  };

  const createGoalTitle = (goal, progress) => {
    const item = document.createElement('li');
    item.className = 'source-spotlight-promotion__goal';
    const title = document.createElement('span');
    title.className = 'source-spotlight-promotion__goal-title';
    const labelTemplate = asText(progress.discountLabel, DEFAULT_CONFIG.progress.discountLabel);
    const label = document.createElement('span');
    const hasDiscountToken = labelTemplate.includes('{discount}');
    if (hasDiscountToken) {
      label.textContent = replaceTokens(labelTemplate, { discount: goal.discount });
    } else {
      const discount = document.createElement('span');
      discount.textContent = `${goal.discount}%`;
      label.append(discount, document.createTextNode(` ${labelTemplate}`));
    }
    const tag = document.createElement('span');
    tag.className = 'source-spotlight-promotion__tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = '🏷️';
    label.append(tag);
    title.append(label);
    item.append(title);
    return item;
  };

  const createGoalMarker = (goal) => {
    const item = document.createElement('li');
    item.className = 'source-spotlight-promotion__goal';
    const marker = document.createElement('span');
    marker.className = `source-spotlight-promotion__marker${goal.reached ? ' is-reached' : ''}`;
    marker.append(createMarkerIcon());
    item.append(marker);
    return item;
  };

  const createGoalValue = (goal, progress) => {
    const item = document.createElement('li');
    item.className = 'source-spotlight-promotion__goal';
    const value = document.createElement('span');
    value.className = 'source-spotlight-promotion__goal-value';
    value.textContent = replaceTokens(progress.goalTemplate, { quantity: goal.quantity });
    value.setAttribute('aria-label', value.textContent);
    item.append(value);
    return item;
  };

  const renderPromotion = (drawer, cart, config) => {
    const promotion = createPromotion(drawer, config);
    if (!promotion) return;

    const tiers = normalizedTiers(config.progress);
    const itemCount = Math.max(0, Number.parseInt(cart?.item_count, 10) || 0);
    const goals = tiers.map((tier) => ({ ...tier, reached: itemCount >= tier.quantity }));
    const nextGoal = goals.find((goal) => !goal.reached);
    const copy = promotion.querySelector('[data-source-spotlight-copy]');
    const titleList = promotion.querySelector('.source-spotlight-promotion__title-list');
    const markerList = promotion.querySelector('.source-spotlight-promotion__markers');
    const valueList = promotion.querySelector('.source-spotlight-promotion__value-list');
    const bar = promotion.querySelector('.source-spotlight-promotion__bar');

    promotion.style.setProperty('--source-spotlight-promotion-columns', String(goals.length));

    if (copy) {
      copy.textContent = nextGoal
        ? replaceTokens(config.progress.nextCopy, {
          remaining: Math.max(1, nextGoal.quantity - itemCount),
          discount: nextGoal.discount
        })
        : asText(config.progress.completeCopy, DEFAULT_CONFIG.progress.completeCopy);
    }

    if (titleList) titleList.replaceChildren(...goals.map((goal) => createGoalTitle(goal, config.progress)));
    if (markerList) markerList.replaceChildren(...goals.map(createGoalMarker));
    if (valueList) valueList.replaceChildren(...goals.map((goal) => createGoalValue(goal, config.progress)));

    const reachedGoals = goals.filter((goal) => goal.reached).length;
    const progress = !nextGoal ? 100 : reachedGoals ? ((reachedGoals - 0.5) / goals.length) * 100 : 0;
    const maxQuantity = goals[goals.length - 1].quantity;
    if (bar) {
      bar.setAttribute('aria-valuemax', String(maxQuantity));
      bar.setAttribute('aria-valuenow', String(Math.min(itemCount, maxQuantity)));
      bar.setAttribute('aria-valuetext', replaceTokens(config.progress.goalTemplate, { quantity: Math.min(itemCount, maxQuantity) }));
      bar.style.setProperty('--source-spotlight-promotion-progress', `${progress}%`);
    }
  };

  const fetchCart = async (drawer, config) => {
    try {
      const root = window.Shopify?.routes?.root || '/';
      const response = await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Cart request failed: ${response.status}`);
      renderPromotion(drawer, await response.json(), config);
    } catch (error) {
      console.warn('Unable to refresh spotlight promotion', error);
    }
  };

  const init = () => {
    const drawer = document.querySelector('spotlight-pick.drawer--spotlight');
    if (!drawer || drawer.dataset.sourceSpotlightPromotionReady === 'true') return;

    const config = parseConfig();
    applyConfig(drawer, config);
    if (config.enabled === false) return;

    drawer.dataset.sourceSpotlightPromotionReady = 'true';
    fetchCart(drawer, config);

    document.addEventListener('cart:updated', (event) => {
      if (event.detail?.cart) renderPromotion(drawer, event.detail.cart, config);
    });

    document.querySelector('[data-toggle-spotlight]')?.addEventListener('click', () => {
      window.requestAnimationFrame(() => fetchCart(drawer, config));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
