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
    root.querySelector('[data-scc-form]')?.addEventListener('submit', () => emit('checkout_click'));
  });
})();
