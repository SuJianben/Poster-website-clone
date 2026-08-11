(() => {
  const minimumLoadingTime = 420;

  const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

  const parsePayload = (text) => {
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Shopify returned an invalid cart response.');
    }
  };

  const responseError = (payload, fallback) => new Error(
    payload.description || payload.message || fallback
  );

  const requestJson = (url, options = {}) => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(options.method || 'GET', url, true);
    request.withCredentials = true;
    request.setRequestHeader('Accept', 'application/json');
    request.onload = () => {
      try {
        const payload = parsePayload(request.responseText);
        if (request.status < 200 || request.status >= 300) {
          reject(responseError(payload, `Cart request failed (${request.status}).`));
          return;
        }
        resolve(payload);
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () => reject(new Error('Unable to connect to the Shopify cart.'));
    request.ontimeout = () => reject(new Error('The Shopify cart request timed out.'));
    request.timeout = 15000;
    request.send(options.body || null);
  });

  class SourceProductAddToCart {
    constructor(product) {
      this.product = product;
      this.form = product.querySelector('[data-spx-cart-form]');
      this.button = this.form?.querySelector('[data-spx-cart-button]');
      this.variantInput = this.form?.querySelector('[data-spx-cart-variant-id]');
      this.error = this.form?.querySelector('[data-spx-cart-error]');
      this.addUrl = this.form?.dataset.spxCartAddUrl;
      this.cartUrl = this.form?.dataset.spxCartUrl;
      this.variantAvailable = !this.button?.disabled;
      this.onSubmit = this.onSubmit.bind(this);
      this.onVariantChange = this.onVariantChange.bind(this);
    }

    connect() {
      if (!this.form || !this.button || !this.variantInput || !this.addUrl || !this.cartUrl) return;
      this.form.addEventListener('submit', this.onSubmit);
      this.product.addEventListener('spx:variant-change', this.onVariantChange);
    }

    onVariantChange(event) {
      const variant = event.detail?.variant;
      if (variant?.id) this.variantInput.value = variant.id;
      this.variantAvailable = Boolean(variant?.available);
      this.button.disabled = !this.variantAvailable;
    }

    setLoading(loading) {
      this.button.disabled = loading || !this.variantAvailable;
      this.button.classList.toggle('is-loading', loading);
      this.button.setAttribute('aria-busy', String(loading));
    }

    showError(message = '') {
      if (!this.error) return;
      this.error.textContent = message;
      this.error.hidden = !message;
    }

    publish(status, detail = {}) {
      document.dispatchEvent(new CustomEvent('spx:add-to-cart', {
        detail: { status, variantId: Number(this.variantInput.value), ...detail }
      }));
    }

    async onSubmit(event) {
      event.preventDefault();
      if (this.button.classList.contains('is-loading') || !this.variantInput.value) return;

      this.showError();
      this.setLoading(true);
      this.publish('started');

      try {
        const addRequest = requestJson(this.addUrl, {
          method: 'POST',
          body: new FormData(this.form)
        });
        const [added] = await Promise.all([addRequest, wait(minimumLoadingTime)]);
        const cart = await requestJson(this.cartUrl);

        document.dispatchEvent(new CustomEvent('spx:cart-added', {
          detail: { cart, added, source: this.button }
        }));
        if (window.FoxTheme?.pubsub) {
          FoxTheme.pubsub.publish(FoxTheme.pubsub.PUB_SUB_EVENTS.cartUpdate, { cart });
        }
        this.publish('succeeded', { cart, added });
      } catch (error) {
        this.showError(error.message);
        this.publish('failed', { message: error.message, addUrl: this.addUrl, cartUrl: this.cartUrl });
      } finally {
        this.setLoading(false);
      }
    }
  }

  const initialize = () => {
    document.querySelectorAll('[data-spx-product]').forEach((product) => {
      if (product.dataset.spxCartInitialized === 'true') return;
      product.dataset.spxCartInitialized = 'true';
      new SourceProductAddToCart(product).connect();
    });
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', initialize, { once: true })
    : initialize();
})();
