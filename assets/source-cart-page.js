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
    let recommendationIndex = 0;
    const moveRecommendations = (direction) => {
      if (!track || !viewport) return;
      const cards = [...track.children];
      const visible = window.matchMedia('(min-width: 750px)').matches ? 3 : 1;
      const maxIndex = Math.max(0, cards.length - visible);
      recommendationIndex = (recommendationIndex + direction + maxIndex + 1) % (maxIndex + 1);
      if (window.matchMedia('(min-width: 750px)').matches) {
        const cardWidth = cards[0]?.getBoundingClientRect().width || 0;
        const gap = Number.parseFloat(getComputedStyle(track).gap) || 0;
        track.style.transform = `translateX(${-recommendationIndex * (cardWidth + gap)}px)`;
      } else viewport.scrollBy({ left: direction * viewport.clientWidth * .82, behavior: 'smooth' });
      emit('recommendation_move', { direction, index: recommendationIndex });
    };
    root.querySelector('[data-scc-recommendation-prev]')?.addEventListener('click', () => moveRecommendations(-1));
    root.querySelector('[data-scc-recommendation-next]')?.addEventListener('click', () => moveRecommendations(1));
    root.querySelector('[data-scc-form]')?.addEventListener('submit', () => emit('checkout_click'));
  });
})();

