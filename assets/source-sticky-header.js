class SourceBasicHeader extends HTMLElement {
  get headerSection() {
    return document.querySelector('.header-section');
  }

  get headerNavigation() {
    return this.querySelector('.header__bottom');
  }

  get navigationToggleButton() {
    return this.querySelector('.toggle-navigation-button');
  }

  get enableTransparent() {
    return this.dataset.enableTransparent === 'true';
  }

  connectedCallback() {
    this.init();
    if (window.ResizeObserver) new ResizeObserver(this.setHeight.bind(this)).observe(this);
  }

  init() {
    this.setHeight();
    if (this.enableTransparent) this.headerSection.classList.add('header-transparent');
  }

  calculateHeaderGroupHeight() {
    let totalHeight = 0;
    document.querySelectorAll('.shopify-section-group-header-group').forEach((section) => {
      totalHeight += section.offsetHeight;
    });
    document.documentElement.style.setProperty('--header-group-height', `${totalHeight}px`);
  }

  setHeight() {
    requestAnimationFrame(() => {
      const navigationHeight = this.headerNavigation ? this.headerNavigation.offsetHeight : 0;
      document.documentElement.style.setProperty('--header-height', `${Math.round(this.offsetHeight)}px`);
      document.documentElement.style.setProperty('--header-offset-top', `${Math.round(this.parentElement.offsetTop)}px`);
      document.documentElement.style.setProperty('--header-navigation-height', `${Math.max(0, Math.round(navigationHeight - 1))}px`);
      this.calculateHeaderGroupHeight();
    });
  }
}

class SourceStickyHeader extends SourceBasicHeader {
  constructor() {
    super();
    this.classes = {
      pinned: 'header-pinned',
      headerScrolled: 'header-scrolled',
      show: 'is-show',
      hide: 'is-hide',
      headerSticky: 'header-sticky',
      isHideNav: 'is-hide-nav'
    };
    this.navigationManuallyToggled = false;
    this.currentScrollTop = 0;
    this.lastScrollPos = 0;
    this.scrollThreshold = 200;
    this.scrollDirection = 'none';
    this.scrollDistance = 0;
  }

  get isAlwaysSticky() {
    return this.dataset.stickyType === 'always';
  }

  get collapseOnScroll() {
    return this.dataset.collapseOnScroll === 'true';
  }

  connectedCallback() {
    super.connectedCallback();
    this.firstScrollTop = window.scrollY;
    this.headerBounds = this.headerSection.getBoundingClientRect();
    this.initStickyHeader();
    if (this.collapseOnScroll && this.navigationToggleButton) {
      this.navigationToggleButton.addEventListener('click', this.handleNavigationToggle.bind(this));
    }
  }

  initStickyHeader() {
    this.headerSection.classList.add(this.classes.headerSticky);
    this.headerSection.dataset.stickyType = this.dataset.stickyType;
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

  handleNavigationToggle(event) {
    event.preventDefault();
    this.navigationManuallyToggled = true;
    const isHidden = this.headerNavigation.classList.contains(this.classes.hide);
    setTimeout(() => document.body.classList.toggle(this.classes.isHideNav, !isHidden), isHidden ? 0 : 250);
    this.headerNavigation.classList.toggle(this.classes.hide, !isHidden);
    this.headerNavigation.classList.toggle(this.classes.show, isHidden);
    this.navigationToggleButton.setAttribute('aria-expanded', isHidden);
    setTimeout(() => {
      this.navigationManuallyToggled = false;
    }, 1000);
  }

  handleScroll() {
    const scrollTop = window.scrollY;
    const headerBoundsTop = this.headerBounds.top + this.firstScrollTop;
    const headerBoundsBottom = this.headerBounds.bottom + this.firstScrollTop;
    this.updateScrollMetrics(scrollTop);
    requestAnimationFrame(() => {
      if (scrollTop > headerBoundsTop) this.handleScrolledPastHeader(scrollTop, headerBoundsBottom);
      else this.handleScrolledBeforeHeader();
      this.currentScrollTop = scrollTop;
    });
  }

  updateScrollMetrics(scrollTop) {
    const newDirection = scrollTop > this.currentScrollTop ? 'down' : 'up';
    if (newDirection !== this.scrollDirection) {
      this.scrollDistance = 0;
      this.scrollDirection = newDirection;
    } else {
      this.scrollDistance += Math.abs(scrollTop - this.currentScrollTop);
    }
  }

  handleScrolledPastHeader(scrollTop, headerBoundsBottom) {
    this.headerSection.classList.add(this.classes.headerScrolled);
    if (this.collapseOnScroll) {
      this.navigationToggleButton.classList.add(this.classes.show);
      if (!this.navigationManuallyToggled && !this.headerNavigation.classList.contains(this.classes.show)) {
        this.headerNavigation.classList.add(this.classes.hide);
        document.body.classList.add(this.classes.isHideNav);
      }
    }
    if (this.isAlwaysSticky) {
      document.body.classList.add(this.classes.pinned);
      return;
    }
    const isScrollingUp = this.scrollDirection === 'up';
    const isNearHeader = scrollTop < headerBoundsBottom + 100;
    if (isScrollingUp || isNearHeader) document.body.classList.add(this.classes.pinned);
    else if (!this.navigationManuallyToggled && this.scrollDistance >= this.scrollThreshold) document.body.classList.remove(this.classes.pinned);
  }

  handleScrolledBeforeHeader() {
    this.headerSection.classList.remove(this.classes.headerScrolled);
    if (this.collapseOnScroll && !this.navigationManuallyToggled) {
      document.body.classList.remove(this.classes.isHideNav);
      this.headerNavigation.classList.remove(this.classes.hide, this.classes.show);
      this.navigationToggleButton.setAttribute('aria-expanded', false);
    }
    if (this.isAlwaysSticky) document.body.classList.remove(this.classes.pinned);
  }
}

if (!customElements.get('sticky-header')) {
  customElements.define('sticky-header', SourceStickyHeader, { extends: 'header' });
}
