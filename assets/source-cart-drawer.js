(() => {
  const NativeDrawer = customElements.get('drawer-component');

  class StandaloneDrawer extends HTMLElement {
    constructor() {
      super();
      this.activeElement = null;
      this.onControlClick = this.onControlClick.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
    }

    connectedCallback() {
      this.controls = Array.from(document.querySelectorAll(`[aria-controls="${this.id}"]`));
      this.controls.forEach((control) => control.addEventListener('click', this.onControlClick));
      document.addEventListener('keyup', this.onKeyUp);
    }

    disconnectedCallback() {
      this.controls?.forEach((control) => control.removeEventListener('click', this.onControlClick));
      document.removeEventListener('keyup', this.onKeyUp);
    }

    get open() {
      return this.hasAttribute('open');
    }

    onControlClick(event) {
      event.preventDefault();
      this.open ? this.hide() : this.show(event.currentTarget);
    }

    onKeyUp(event) {
      if (event.code === 'Escape' && this.open) this.hide();
    }

    show(focusElement = null, animate = true) {
      if (this.open) return;
      this.activeElement = focusElement || document.activeElement;
      this.hidden = false;
      this.removeAttribute('inert');
      this.setAttribute('open', '');
      document.body.classList.add('modal-showing');

      const activate = () => {
        this.setAttribute('active', '');
        document.body.classList.add('modal-show');
        document.body.classList.remove('modal-showing');
      };

      animate ? window.requestAnimationFrame(() => window.requestAnimationFrame(activate)) : activate();
    }

    hide(animate = true) {
      if (!this.open) return;
      this.removeAttribute('active');
      this.removeAttribute('open');
      this.setAttribute('inert', '');
      document.body.classList.remove('modal-show', 'modal-showing');

      const finish = () => {
        if (!this.open) this.hidden = true;
        this.activeElement?.focus?.();
      };

      if (!animate) {
        finish();
        return;
      }

      let finished = false;
      const onFinish = () => {
        if (finished) return;
        finished = true;
        this.removeEventListener('transitionend', onFinish);
        finish();
      };
      this.addEventListener('transitionend', onFinish, { once: true });
      window.setTimeout(onFinish, 350);
    }
  }

  const CartDrawerBase = NativeDrawer || StandaloneDrawer;

  const money = (cents) => {
    if (window.FoxTheme?.Currency?.formatMoney) {
      return FoxTheme.Currency.formatMoney(cents, FoxTheme.settings.moneyFormat);
    }
    return new Intl.NumberFormat(document.documentElement.lang || 'de-DE', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'EUR'
    }).format(cents / 100);
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  const imageUrl = (url) => url ? `${url}${url.includes('?') ? '&' : '?'}width=200` : '';

  class SourceCartDrawer extends CartDrawerBase {
    constructor() {
      super();
      this.onCartUpdate = this.onCartUpdate.bind(this);
      this.onProductAdded = this.onProductAdded.bind(this);
      this.onDrawerClick = this.onDrawerClick.bind(this);
      this.onQuantityChange = this.onQuantityChange.bind(this);
    }

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener('click', this.onDrawerClick);
      this.addEventListener('change', this.onQuantityChange);
      document.addEventListener('spx:cart-added', this.onProductAdded);
      this.unsubscribe = window.FoxTheme?.pubsub?.subscribe(
        FoxTheme.pubsub.PUB_SUB_EVENTS.cartUpdate,
        this.onCartUpdate
      );
      this.refreshCart();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener('click', this.onDrawerClick);
      this.removeEventListener('change', this.onQuantityChange);
      document.removeEventListener('spx:cart-added', this.onProductAdded);
      this.unsubscribe?.();
    }

    get requiresBodyAppended() { return false; }

    show(focusElement = null, animate = true) {
      if (!this.cartLoaded) this.refreshCart();
      return super.show(focusElement, animate);
    }

    async refreshCart() {
      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`, {
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error(`Cart request failed: ${response.status}`);
        this.renderCart(await response.json());
      } catch (error) {
        console.error('Unable to refresh cart drawer', error);
      }
    }

    onCartUpdate(event) {
      if (event?.cart && !event.cart.errors) this.renderCart(event.cart);
    }

    onProductAdded(event) {
      const { cart, source } = event.detail || {};
      if (!cart || cart.errors) return;
      this.renderCart(cart);
      this.show(source || null);
    }

    async changeLine(line, quantity) {
      this.classList.add('is-loading');
      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/change.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line, quantity })
        });
        const cart = await response.json();
        if (!response.ok) throw new Error(cart.description || 'Cart update failed');
        this.renderCart(cart);
        FoxTheme.pubsub.publish(FoxTheme.pubsub.PUB_SUB_EVENTS.cartUpdate, { cart });
      } catch (error) {
        console.error('Unable to update cart line', error);
      } finally {
        this.classList.remove('is-loading');
      }
    }

    onDrawerClick(event) {
      const removeButton = event.target.closest('[data-source-cart-remove]');
      if (removeButton) {
        event.preventDefault();
        this.changeLine(Number(removeButton.dataset.sourceCartRemove), 0);
      }
    }

    onQuantityChange(event) {
      const input = event.target.closest('[data-source-cart-quantity]');
      if (input) this.changeLine(Number(input.dataset.sourceCartQuantity), Math.max(0, Number(input.value || 0)));
    }

    renderCart(cart) {
      this.cartLoaded = true;
      const isEmpty = cart.item_count === 0;
      this.querySelector('[data-source-cart-empty]')?.classList.toggle('hidden', !isEmpty);
      this.querySelector('[data-source-cart-body]')?.classList.toggle('hidden', isEmpty);
      this.querySelector('[data-source-cart-footer]')?.classList.toggle('hidden', isEmpty);

      const list = this.querySelector('[data-source-cart-items]');
      if (list) list.innerHTML = cart.items.map((item, index) => this.itemMarkup(item, index + 1)).join('');

      const total = this.querySelector('[data-source-cart-total]');
      if (total) total.textContent = money(cart.total_price);

      this.querySelector('free-shipping-goal')?.setAttribute('data-cart-total', cart.items_subtotal_price);
      document.querySelectorAll('cart-count').forEach((count) => {
        count.textContent = count.dataset.type === 'blank' ? `(${cart.item_count})` : cart.item_count;
        count.classList.toggle('cart-count--blank', isEmpty);
        count.hidden = isEmpty;
        count.setAttribute('aria-label', `${cart.item_count} Artikel`);
      });
      document.documentElement.classList.toggle('cart-has-items', !isEmpty);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    }

    itemMarkup(item, line) {
      const options = (item.options_with_values || [])
        .filter((option) => option.value && option.value !== 'Default Title')
        .map((option) => `<div class="cart-item__option-value text-sm text-subtext"><strong>${escapeHtml(option.name)}:</strong> ${escapeHtml(option.value)}</div>`)
        .join('');
      const properties = Object.entries(item.properties || {})
        .filter(([name, value]) => value && !name.startsWith('_'))
        .map(([name, value]) => `<div class="cart-item__option-value text-sm text-subtext"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</div>`)
        .join('');
      const image = item.image
        ? `<img src="${escapeHtml(imageUrl(item.image))}" alt="${escapeHtml(item.product_title)}" width="200" height="200" loading="lazy">`
        : '';

      return `<li class="cart-item flex flex-col" data-source-cart-line="${line}">
        <div class="cart-item__product flex items-start gap-3">
          <a class="cart-item__media blocks-radius media-wrapper" href="${escapeHtml(item.url)}" tabindex="-1">${image}</a>
          <div class="cart-item__details flex-grow flex flex-col gap-3">
            <div class="flex justify-between gap-3">
              <div class="grid flex-1">
                <div class="block"><a href="${escapeHtml(item.url)}" class="cart-item__title text-pcard-title reversed-link">${escapeHtml(item.product_title)}</a></div>
                <div class="cart-item__options">${options}${properties}</div>
              </div>
              <button type="button" class="cart-item__remove flex items-center justify-center relative btn-remove" data-source-cart-remove="${line}" aria-label="${escapeHtml(item.product_title)} entfernen">×</button>
            </div>
            <div class="cart-item__action flex items-center justify-between gap-3">
              <quantity-input class="cart-quantity quantity self-end">
                <button type="button" name="minus" class="quantity__button" aria-label="Menge verringern"><span aria-hidden="true">−</span></button>
                <input class="quantity__input" type="number" value="${item.quantity}" min="0" step="1" data-source-cart-quantity="${line}" aria-label="Menge für ${escapeHtml(item.product_title)}">
                <button type="button" name="plus" class="quantity__button" aria-label="Menge erhöhen"><span aria-hidden="true">+</span></button>
              </quantity-input>
              <div class="cart-item__prices text-right flex flex-col gap-2"><span class="price__regular">${money(item.final_line_price)}</span></div>
            </div>
          </div>
        </div>
      </li>`;
    }
  }

  if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', SourceCartDrawer);
})();
