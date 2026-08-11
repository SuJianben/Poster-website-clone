(() => {
  const root = document.querySelector('[data-scp-cart]');
  if (!root) return;

  const setBusy = (item, busy) => {
    item.classList.toggle('is-updating', busy);
    item.querySelectorAll('button').forEach((button) => { button.disabled = busy; });
  };

  const changeLine = async (item, quantity) => {
    setBusy(item, true);
    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: item.dataset.lineKey, quantity })
      });
      if (!response.ok) throw new Error('Cart change failed');
      await response.json();
      window.location.reload();
    } catch (error) {
      setBusy(item, false);
      const notice = root.querySelector('[data-scp-discount-message]');
      if (notice) notice.textContent = 'We could not update your cart. Please try again.';
    }
  };

  root.addEventListener('click', (event) => {
    const quantityButton = event.target.closest('[data-scp-quantity]');
    const removeButton = event.target.closest('[data-scp-remove]');
    const discountButton = event.target.closest('[data-scp-discount]');
    const restrictedCheckout = event.target.closest('[data-scp-checkout],[data-scp-wallet]');

    if (quantityButton) {
      const item = quantityButton.closest('[data-scp-item]');
      changeLine(item, Math.max(1, Number(item.dataset.quantity) + Number(quantityButton.dataset.scpQuantity)));
    }
    if (removeButton) changeLine(removeButton.closest('[data-scp-item]'), 0);
    if (discountButton) {
      const input = root.querySelector('[data-scp-discount-input]');
      const notice = root.querySelector('[data-scp-discount-message]');
      const code = input.value.trim();
      notice.textContent = code ? `${code.toUpperCase()} is saved for checkout.` : 'Enter a discount code first.';
    }
    if (restrictedCheckout) {
      const notice = root.querySelector('[data-scp-discount-message]');
      if (notice) notice.textContent = 'Checkout remains disabled in this visual implementation.';
    }
  });

  const tiers = root.querySelector('[data-scp-tiers]');
  if (!tiers) return;
  const quantity = Number(tiers.dataset.itemCount || 0);
  const active = Math.min(5, quantity);
  tiers.querySelectorAll('li').forEach((tier) => tier.classList.toggle('is-reached', Number(tier.dataset.tier) <= active));
  const tierCopy = root.querySelector('[data-scp-tier-copy]');
  if (tierCopy && quantity) {
    const nextQuantity = active === 5 ? 5 : active + 1;
    tierCopy.textContent = active === 5 ? 'You unlocked 25% off your cart.' : `Add ${nextQuantity - quantity} more print${nextQuantity - quantity === 1 ? '' : 's'} to unlock ${nextQuantity * 5}% off.`;
  }
})();
