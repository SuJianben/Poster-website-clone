(() => {
  document.querySelectorAll('[data-scc-cart]').forEach((root) => {
    if (root.dataset.sccReady === 'true') return;
    root.dataset.sccReady = 'true';
    const emit = (action, detail = {}) => root.dispatchEvent(new CustomEvent('source_cart', { bubbles: true, detail: { action, sectionId: root.dataset.sectionId, ...detail } }));
    const updateLine = async (item, quantity) => {
      item.classList.add('is-updating');
      try {
        const response = await fetch('/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ id: item.dataset.lineKey, quantity }) });
        if (!response.ok) throw new Error('cart update failed');
        emit(quantity === 0 ? 'remove' : 'quantity_change', { quantity });
        window.location.reload();
      } catch (error) {
        item.classList.remove('is-updating');
        emit('update_error');
      }
    };
    root.addEventListener('click', (event) => {
      const quantityButton = event.target.closest('[data-scc-quantity]');
      const removeButton = event.target.closest('[data-scc-remove]');
      if (quantityButton) {
        const item = quantityButton.closest('[data-scc-item]');
        updateLine(item, Math.max(1, Number(item.dataset.quantity) + Number(quantityButton.dataset.sccQuantity)));
      }
      if (removeButton) updateLine(removeButton.closest('[data-scc-item]'), 0);
    });
    root.querySelectorAll('[data-scc-quantity-input]').forEach((input) => input.addEventListener('change', () => {
      const item = input.closest('[data-scc-item]');
      const quantity = Math.max(1, Number(input.value || 1));
      updateLine(item, quantity);
    }));
    const track = root.querySelector('[data-scc-recommendation-track]');
    const viewport = root.querySelector('[data-scc-recommendation-viewport]');
    const progress = root.querySelector('[data-scc-recommendation-progress]');
    const previousButton = root.querySelector('[data-scc-recommendation-prev]');
    const nextButton = root.querySelector('[data-scc-recommendation-next]');
    let recommendationIndex = 0;
    const getVisibleRecommendations = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) return 5;
      if (window.matchMedia('(min-width: 750px)').matches) return 3;
      return 2;
    };
    const updateRecommendationProgress = () => {
      if (!track || !viewport || !progress) return;
      const cards = [...track.children];
      if (!cards.length) return;
      if (window.matchMedia('(max-width: 749px)').matches) {
        track.style.transform = '';
        const progressWidth = Math.min(100, (viewport.clientWidth / track.scrollWidth) * 100);
        const scrollProgress = viewport.scrollWidth > viewport.clientWidth ? viewport.scrollLeft / (viewport.scrollWidth - viewport.clientWidth) : 0;
        progress.style.width = `${progressWidth}%`;
        progress.style.left = `${scrollProgress * (100 - progressWidth)}%`;
        return;
      }
      const maxIndex = Math.max(0, cards.length - getVisibleRecommendations());
      recommendationIndex = Math.min(recommendationIndex, maxIndex);
      const cardWidth = cards[0]?.getBoundingClientRect().width || 0;
      const gap = Number.parseFloat(getComputedStyle(track).gap) || 0;
      track.style.transform = `translateX(${-recommendationIndex * (cardWidth + gap)}px)`;
      const steps = maxIndex + 1;
      progress.style.width = `${100 / steps}%`;
      progress.style.left = `${(recommendationIndex / steps) * 100}%`;
      previousButton?.toggleAttribute('disabled', recommendationIndex === 0);
      nextButton?.toggleAttribute('disabled', recommendationIndex === maxIndex);
    };
    const moveRecommendations = (direction) => {
      if (!track || !viewport) return;
      const cards = [...track.children];
      const visible = getVisibleRecommendations();
      const maxIndex = Math.max(0, cards.length - visible);
      recommendationIndex = Math.min(maxIndex, Math.max(0, recommendationIndex + direction));
      if (window.matchMedia('(max-width: 749px)').matches) viewport.scrollBy({ left: direction * viewport.clientWidth * .82, behavior: 'smooth' });
      updateRecommendationProgress();
      emit('recommendation_move', { direction, index: recommendationIndex });
    };
    previousButton?.addEventListener('click', () => moveRecommendations(-1));
    nextButton?.addEventListener('click', () => moveRecommendations(1));
    viewport?.addEventListener('scroll', updateRecommendationProgress, { passive: true });
    window.addEventListener('resize', updateRecommendationProgress);
    updateRecommendationProgress();
    root.querySelector('[data-scc-form]')?.addEventListener('submit', () => emit('checkout_click'));
  });
})();

