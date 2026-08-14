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
      this.onCartRefresh = this.onCartRefresh.bind(this);
    }

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener('click', this.onDrawerClick);
      this.addEventListener('change', this.onQuantityChange);
      document.addEventListener('spx:cart-added', this.onProductAdded);
      document.addEventListener('cart:refresh', this.onCartRefresh);
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
      document.removeEventListener('cart:refresh', this.onCartRefresh);
      this.unsubscribe?.();
    }

    get requiresBodyAppended() { return false; }

    show(focusElement = null, animate = true) {
      this.refreshCart();
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

    onCartRefresh() {
      this.refreshCart();
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
        window.FoxTheme?.pubsub?.publish?.(FoxTheme.pubsub.PUB_SUB_EVENTS.cartUpdate, { cart });
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
        return;
      }

      const quantityButton = event.target.closest('.cart-quantity .quantity__button');
      if (quantityButton) {
        event.preventDefault();
        const quantity = quantityButton.closest('quantity-input');
        const input = quantity?.querySelector('[data-source-cart-quantity]');
        if (!input) return;
        const delta = quantityButton.name === 'minus' ? -1 : 1;
        const nextQuantity = Math.max(0, Number(input.value || 0) + delta);
        this.changeLine(Number(input.dataset.sourceCartQuantity), nextQuantity);
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

      this.renderShipping(cart.items_subtotal_price);
      this.renderPromotion(cart.item_count);
      this.renderDiscounts(cart.cart_level_discount_applications || []);
      document.querySelectorAll('cart-count').forEach((count) => {
        count.textContent = count.dataset.type === 'blank' ? `(${cart.item_count})` : cart.item_count;
        count.classList.toggle('cart-count--blank', isEmpty);
        count.hidden = isEmpty;
        count.setAttribute('aria-label', `${cart.item_count} Artikel`);
      });
      document.documentElement.classList.add('cart-count-ready');
      document.documentElement.classList.toggle('cart-has-items', !isEmpty);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    }

    renderShipping(subtotal) {
      const goal = this.querySelector('free-shipping-goal');
      if (!goal) return;

      const threshold = Number(goal.dataset.minimumAmount || 49) * 100;
      const progress = threshold ? Math.min(1, Math.max(0, Number(subtotal || 0) / threshold)) : 1;
      const remaining = Math.max(0, threshold - Number(subtotal || 0));

      goal.style.setProperty('--source-cart-shipping-progress', String(progress));
      goal.classList.toggle('is-reached', remaining === 0);
      goal.querySelector('[data-left-to-spend]')?.replaceChildren(document.createTextNode(money(remaining)));
    }

    renderPromotion(itemCount) {
      const body = this.querySelector('[data-source-cart-body]');
      if (!body) return;

      let promotion = body.querySelector('[data-source-cart-promotion]');
      if (!promotion) {
        promotion = document.createElement('section');
        promotion.className = 'source-cart-promotion';
        promotion.dataset.sourceCartPromotion = '';
        promotion.setAttribute('aria-label', 'Mengenangebote');
        promotion.innerHTML = '<p class="source-cart-promotion__copy"></p><ol class="source-cart-promotion__tiers"></ol>';
        body.prepend(promotion);
      }

      const tiers = [5, 10, 15, 20, 25];
      const copy = promotion.querySelector('.source-cart-promotion__copy');
      const next = Math.min(5, Number(itemCount || 0) + 1);
      if (copy) {
        copy.textContent = itemCount >= 5
          ? 'Sie haben sich den maximalen Mengenrabatt gesichert.'
          : 'Kaufen Sie ' + Math.max(1, next - itemCount) + ' weitere Artikel, um ' + tiers[next - 1] + '% Rabatt zu erhalten.';
      }

      const list = promotion.querySelector('.source-cart-promotion__tiers');
      if (list) {
        list.innerHTML = tiers.map((discount, index) => {
          const quantity = index + 1;
          const reached = itemCount >= quantity;
          return '<li class="source-cart-promotion__tier' + (reached ? ' is-reached' : '') + '">' +
            '<strong>' + discount + '% Rabatt</strong>' +
            '<i>' + (reached ? 'OK' : quantity) + '</i>' +
            '<span>' + quantity + ' Artikel kaufen</span>' +
            '</li>';
        }).join('');
      }
    }

    renderDiscounts(discounts) {
      const footer = this.querySelector('[data-source-cart-footer] .drawer__footer-body');
      if (!footer) return;

      let list = footer.querySelector('[data-source-cart-discounts]');
      if (!discounts.length) {
        list?.remove();
        return;
      }

      if (!list) {
        list = document.createElement('div');
        list.className = 'source-cart-discounts';
        list.dataset.sourceCartDiscounts = '';
        footer.prepend(list);
      }

      list.innerHTML = discounts.map((discount) => {
        const title = escapeHtml(discount.title || 'Rabatt');
        const amount = money(discount.total_allocated_amount || 0);
        return '<span>' + title + '</span><strong>-' + amount + '</strong>';
      }).join('');
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
