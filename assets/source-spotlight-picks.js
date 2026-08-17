(() => {
  const tiers = [
    { quantity: 1, discount: 5 },
    { quantity: 2, discount: 10 },
    { quantity: 3, discount: 15 },
    { quantity: 4, discount: 20 },
    { quantity: 5, discount: 25 }
  ];

  const createPromotion = (drawer) => {
    const body = drawer.querySelector('.drawer__body');
    const list = body?.querySelector('.spotlight__list');
    if (!body || !list) return null;

    let promotion = body.querySelector('[data-source-spotlight-promotion]');
    if (!promotion) {
      promotion = document.createElement('section');
      promotion.className = 'source-spotlight-promotion';
      promotion.dataset.sourceSpotlightPromotion = '';
      promotion.setAttribute('aria-label', 'Mengenrabatt');
      promotion.innerHTML = [
        '<p class="source-spotlight-promotion__copy" data-source-spotlight-copy></p>',
        '<div class="source-spotlight-promotion__bar-wrapper">',
        '<ol class="source-spotlight-promotion__goal-list source-spotlight-promotion__title-list"></ol>',
        '<div class="source-spotlight-promotion__bar" role="progressbar" aria-valuemin="0" aria-valuemax="5">',
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

  const renderPromotion = (drawer, cart) => {
    const promotion = createPromotion(drawer);
    if (!promotion) return;

    const itemCount = Math.max(0, Number.parseInt(cart?.item_count, 10) || 0);
    const nextGoal = tiers.find((tier) => itemCount < tier.quantity);
    const goals = tiers.map((tier) => ({ ...tier, reached: itemCount >= tier.quantity }));
    const copy = promotion.querySelector('[data-source-spotlight-copy]');
    const titleList = promotion.querySelector('.source-spotlight-promotion__title-list');
    const markerList = promotion.querySelector('.source-spotlight-promotion__markers');
    const valueList = promotion.querySelector('.source-spotlight-promotion__value-list');
    const bar = promotion.querySelector('.source-spotlight-promotion__bar');

    promotion.style.setProperty('--source-spotlight-promotion-columns', String(goals.length));

    if (copy) {
      copy.innerHTML = nextGoal
        ? 'Kaufen Sie ' + Math.max(1, nextGoal.quantity - itemCount) + ' weitere Artikel, um ' + nextGoal.discount + '% Rabatt <span class="source-spotlight-promotion__tag" aria-hidden="true">&#127991;&#65039;</span> zu erhalten.'
        : 'Sie haben sich den maximalen Mengenrabatt gesichert.';
    }

    if (titleList) {
      titleList.innerHTML = goals.map((goal) => (
        '<li class="source-spotlight-promotion__goal"><span class="source-spotlight-promotion__goal-title"><span>' + goal.discount + '% <span class="source-spotlight-promotion__tag" aria-hidden="true">&#127991;&#65039;</span></span><span>Rabatt</span></span></li>'
      )).join('');
    }

    if (markerList) {
      markerList.innerHTML = goals.map((goal) => (
        '<li class="source-spotlight-promotion__goal"><span class="source-spotlight-promotion__marker' + (goal.reached ? ' is-reached' : '') + '">%</span></li>'
      )).join('');
    }

    if (valueList) {
      valueList.innerHTML = goals.map((goal) => (
        '<li class="source-spotlight-promotion__goal"><span class="source-spotlight-promotion__goal-value"><span>' + goal.quantity + ' Artikel</span><span>kaufen</span></span></li>'
      )).join('');
    }

    const reachedGoals = goals.filter((goal) => goal.reached).length;
    const progress = !nextGoal ? 100 : reachedGoals ? ((reachedGoals - 0.5) / goals.length) * 100 : 0;
    if (bar) {
      bar.setAttribute('aria-valuenow', String(Math.min(itemCount, tiers.length)));
      bar.setAttribute('aria-valuetext', `${Math.min(itemCount, tiers.length)} von ${tiers.length} Artikeln`);
      bar.style.setProperty('--source-spotlight-promotion-progress', progress + '%');
    }
  };

  const fetchCart = async (drawer) => {
    try {
      const root = window.Shopify?.routes?.root || '/';
      const response = await fetch(`${root}cart.js`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Cart request failed: ${response.status}`);
      renderPromotion(drawer, await response.json());
    } catch (error) {
      console.warn('Unable to refresh spotlight promotion', error);
    }
  };

  const init = () => {
    const drawer = document.querySelector('spotlight-pick.drawer--spotlight');
    if (!drawer || drawer.dataset.sourceSpotlightPromotionReady === 'true') return;

    drawer.dataset.sourceSpotlightPromotionReady = 'true';
    fetchCart(drawer);

    document.addEventListener('cart:updated', (event) => {
      if (event.detail?.cart) renderPromotion(drawer, event.detail.cart);
    });

    document.querySelector('[data-toggle-spotlight]')?.addEventListener('click', () => {
      window.requestAnimationFrame(() => fetchCart(drawer));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
