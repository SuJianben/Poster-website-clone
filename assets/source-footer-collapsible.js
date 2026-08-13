(() => {
  const collapseMobileFooter = () => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    document.querySelectorAll('footer details[is="footer-details"]').forEach((details) => {
      details.removeAttribute('open');
    });
  };

  document.addEventListener('DOMContentLoaded', collapseMobileFooter);
})();
