(() => {
  const SELECTOR = '[data-spr-recommendations]';
  const instances = new WeakMap();

  class SourceProductRecommendations {
    constructor(root) {
      this.root = root;
      this.viewport = root.querySelector('[data-spr-viewport]');
      this.track = root.querySelector('[data-spr-track]');
      this.slides = Array.from(root.querySelectorAll('[data-spr-slide]'));
      this.previousButton = root.querySelector('[data-spr-prev]');
      this.nextButton = root.querySelector('[data-spr-next]');
      this.progress = root.querySelector('[data-spr-progress]');
      this.heading = root.querySelector('[data-spr-heading]');
      this.recommendationUrl = root.dataset.sprUrl || '';
      this.index = 0;
      this.mobile = false;
      this.scrollFrame = 0;
      this.resizeTimer = 0;
      this.loading = false;
      this.destroyed = false;
      this.headingObserver = null;

      if (!this.viewport || !this.track) return;

      this.onResize = this.onResize.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onPrevious = () => this.move(-1, 'previous');
      this.onNext = () => this.move(1, 'next');

      this.previousButton?.addEventListener('click', this.onPrevious);
      this.nextButton?.addEventListener('click', this.onNext);
      this.viewport.addEventListener('scroll', this.onScroll, { passive: true });
      this.viewport.addEventListener('keydown', this.onKeyDown);
      this.root.addEventListener('click', this.onClick);
      window.addEventListener('resize', this.onResize, { passive: true });

      this.observeHeading();
      if (this.root.dataset.sprState === 'loading' && this.recommendationUrl) {
        this.loadRecommendations();
      } else if (this.slides.length) {
        this.updateLayout();
      } else {
        this.hideEmptyState();
      }
    }

    async loadRecommendations() {
      if (this.loading) return;
      this.loading = true;
      this.root.setAttribute('aria-busy', 'true');

      try {
        const response = await fetch(this.recommendationUrl, {
          credentials: 'same-origin',
          headers: { Accept: 'text/html' }
        });
        if (!response.ok) throw new Error(`Recommendation request failed: ${response.status}`);

        const markup = await response.text();
        const parsed = new DOMParser().parseFromString(markup, 'text/html');
        const replacement = parsed.querySelector(SELECTOR);
        const replacementTrack = replacement?.querySelector('[data-spr-track]');
        const replacementSlides = replacementTrack?.querySelectorAll('[data-spr-slide]') || [];

        if (this.destroyed) return;

        if (!replacement || !replacementSlides.length) {
          this.root.dataset.sprState = 'empty';
          this.hideEmptyState();
          return;
        }

        this.track.innerHTML = replacementTrack.innerHTML;
        this.slides = Array.from(this.track.querySelectorAll('[data-spr-slide]'));
        this.root.dataset.sprState = 'ready';
        this.root.hidden = false;
        this.index = 0;
        this.updateLayout();
      } catch (error) {
        this.root.dataset.sprState = 'error';
        this.hideEmptyState();
        if (this.root.dataset.sprDesignMode === 'true') {
          this.showMessage('暂时无法加载自动推荐');
        }
        window.dispatchEvent(new CustomEvent('source_product_recommendations_error', { detail: { error } }));
      } finally {
        this.loading = false;
        this.root.removeAttribute('aria-busy');
      }
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.previousButton?.removeEventListener('click', this.onPrevious);
      this.nextButton?.removeEventListener('click', this.onNext);
      this.viewport?.removeEventListener('scroll', this.onScroll);
      this.viewport?.removeEventListener('keydown', this.onKeyDown);
      this.root.removeEventListener('click', this.onClick);
      window.removeEventListener('resize', this.onResize);
      window.clearTimeout(this.resizeTimer);
      window.cancelAnimationFrame(this.scrollFrame);
      this.headingObserver?.disconnect();
      this.headingObserver = null;
      delete this.root.dataset.sprInitialized;
    }

    hideEmptyState() {
      if (this.root.dataset.sprDesignMode === 'true') {
        this.root.querySelector('[data-spr-empty]')?.remove();
        this.showMessage('Shopify 暂未找到相关产品');
        return;
      }
      this.root.hidden = true;
    }

    showMessage(message) {
      if (!this.track || this.track.children.length) return;
      const empty = document.createElement('div');
      empty.className = 'spr-recs__empty';
      empty.textContent = message;
      this.track.append(empty);
    }

    get visibleItems() {
      if (window.innerWidth < 768) return 2;
      if (window.innerWidth < 1024) return 4;
      return 5;
    }

    get maxIndex() {
      return Math.max(0, this.slides.length - this.visibleItems);
    }

    get step() {
      const first = this.slides[0];
      if (!first) return 0;
      return first.getBoundingClientRect().width + 30;
    }

    observeHeading() {
      if (!this.heading) return;

      if (!('IntersectionObserver' in window)) {
        this.heading.classList.add('is-visible');
        return;
      }

      this.headingObserver = new IntersectionObserver((entries) => {
        if (!entries[0]?.isIntersecting) return;
        this.heading.classList.add('is-visible');
        this.headingObserver?.disconnect();
        this.headingObserver = null;
      }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });

      this.headingObserver.observe(this.heading);
    }

    updateLayout() {
      const nextMobile = window.innerWidth < 768;
      const enteredMobile = nextMobile && !this.mobile;
      this.mobile = nextMobile;

      if (this.mobile) {
        this.track.style.transform = '';
        if (enteredMobile) this.viewport.scrollLeft = 0;
        this.updateMobileProgress();
        return;
      }

      this.index = Math.min(this.index, this.maxIndex);
      this.renderDesktop();
    }

    renderDesktop() {
      const stateCount = this.maxIndex + 1;
      this.track.style.transform = `translate3d(${-this.index * this.step}px, 0, 0)`;
      this.progress?.style.setProperty('--spr-progress', String((this.index + 1) / stateCount));

      if (this.previousButton) this.previousButton.disabled = this.index === 0;
      if (this.nextButton) this.nextButton.disabled = this.index === this.maxIndex;
    }

    move(delta, direction) {
      if (this.mobile) return;
      const nextIndex = Math.min(this.maxIndex, Math.max(0, this.index + delta));
      if (nextIndex === this.index) return;
      this.index = nextIndex;
      this.renderDesktop();
      this.trackSlide(direction);
    }

    onResize() {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.updateLayout(), 80);
    }

    onScroll() {
      if (!this.mobile || this.scrollFrame) return;
      this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = 0;
        this.updateMobileProgress();
      });
    }

    updateMobileProgress() {
      if (!this.progress) return;
      const maximum = Math.max(1, this.viewport.scrollWidth - this.viewport.clientWidth);
      const ratio = Math.min(1, Math.max(0, this.viewport.scrollLeft / maximum));
      const visibleRatio = Math.min(1, this.visibleItems / this.slides.length);
      const scale = visibleRatio + ((1 - visibleRatio) * ratio);
      this.progress.style.setProperty('--spr-progress', String(scale));
    }

    onKeyDown(event) {
      if (this.mobile) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.move(1, 'next');
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.move(-1, 'previous');
      }
    }

    onClick(event) {
      const link = event.target.closest('[data-spr-recommendation-card] a[href]');
      if (!link) return;
      const card = link.closest('[data-spr-recommendation-card]');
      this.pushEvent({
        event: 'source_product_recommendation_click',
        section_id: this.root.dataset.sectionId || '',
        product_title: card?.dataset.productTitle || '',
        product_position: Number(card?.dataset.productPosition || 0),
        destination_url: link.href
      });
    }

    trackSlide(direction) {
      this.pushEvent({
        event: 'source_product_recommendation_slide',
        section_id: this.root.dataset.sectionId || '',
        direction,
        slide_index: this.index
      });
    }

    pushEvent(payload) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
      this.root.dispatchEvent(new CustomEvent(payload.event, { bubbles: true, detail: payload }));
    }
  }

  const initialize = (scope = document) => {
    const roots = Array.from(scope.querySelectorAll(SELECTOR));
    if (scope.matches?.(SELECTOR)) roots.unshift(scope);

    roots.forEach((root) => {
      if (root.dataset.sprInitialized === 'true') return;
      root.dataset.sprInitialized = 'true';
      instances.set(root, new SourceProductRecommendations(root));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialize());
  } else {
    initialize();
  }

  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  document.addEventListener('shopify:section:unload', (event) => {
    const roots = Array.from(event.target.querySelectorAll(SELECTOR));
    if (event.target.matches?.(SELECTOR)) roots.unshift(event.target);

    roots.forEach((root) => {
      instances.get(root)?.destroy();
      instances.delete(root);
    });
  });
})();
