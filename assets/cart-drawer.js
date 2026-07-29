class CartDrawer {
  constructor() {
    this.drawer = document.querySelector('[data-cart-drawer]');
    if (!this.drawer) return;
    this.body = this.drawer.querySelector('[data-cart-drawer-body]');
    this.counts = document.querySelectorAll('[data-cart-count]');
    document.addEventListener('click', (event) => this.handleClick(event));
    document.addEventListener('submit', (event) => this.handleSubmit(event));
  }

  handleClick(event) {
    const opener = event.target.closest('[data-cart-open]');
    const closer = event.target.closest('[data-cart-close]');
    if (opener || closer) {
      event.preventDefault();
      return opener ? this.open() : this.close();
    }
    const quantityButton = event.target.closest('[data-cart-quantity]');
    if (quantityButton) this.changeQuantity(quantityButton.dataset.key, Number(quantityButton.dataset.cartQuantity));
  }

  async handleSubmit(event) {
    const form = event.target.closest('form.product-form');
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch('/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!response.ok) throw new Error('Unable to add item');
      await this.refresh();
      this.open();
      window.PosterTheme.track('add_to_cart', { source_module: form.dataset.sourceModule || 'product_form' });
    } catch (error) {
      form.querySelector('[data-product-form-error]').textContent = 'Unable to add this item. Please try again.';
    } finally { button.disabled = false; }
  }

  async changeQuantity(key, quantity) {
    await fetch('/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: key, quantity }) });
    await this.refresh();
  }

  async refresh() {
    const cart = await fetch('/cart.js').then((response) => response.json());
    this.render(cart);
    return cart;
  }

  render(cart) {
    this.counts.forEach((count) => { count.textContent = cart.item_count; });
    this.body.innerHTML = cart.item_count ? cart.items.map((item) => `<article class="drawer-item"><img src="${item.image}" alt=""><div><a href="${item.url}">${item.product_title}</a><p>${item.variant_title || ''}</p><strong>${this.money(item.final_line_price, cart.currency)}</strong></div><div class="drawer-quantity"><button data-cart-quantity="${item.quantity - 1}" data-key="${item.key}" aria-label="Decrease quantity">-</button><span>${item.quantity}</span><button data-cart-quantity="${item.quantity + 1}" data-key="${item.key}" aria-label="Increase quantity">+</button></div></article>`).join('') + `<div class="drawer-summary"><span>Subtotal</span><strong>${this.money(cart.total_price, cart.currency)}</strong></div><a class="button drawer-checkout" href="/checkout">Checkout</a>` : '<p class="drawer-empty">Your cart is empty.</p>';
  }

  money(cents, currency) { return new Intl.NumberFormat(document.documentElement.lang || 'en', { style: 'currency', currency }).format(cents / 100); }
  open() { this.drawer.hidden = false; requestAnimationFrame(() => this.drawer.classList.add('is-open')); document.body.classList.add('drawer-open'); this.refresh(); window.PosterTheme.track('cart_view', { source_module: 'cart_drawer' }); }
  close() { this.drawer.classList.remove('is-open'); document.body.classList.remove('drawer-open'); setTimeout(() => { this.drawer.hidden = true; }, 200); }
}
document.addEventListener('DOMContentLoaded', () => new CartDrawer());
