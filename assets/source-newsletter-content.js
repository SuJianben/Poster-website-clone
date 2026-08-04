(() => {
  const DATA_SELECTOR = 'script[data-source-newsletter-overrides]';

  function replaceText(element, value) {
    if (element && value) element.textContent = value;
  }

  function parseData(dataElement) {
    try {
      return JSON.parse(dataElement.textContent);
    } catch {
      return null;
    }
  }

  function applyOverrides(dataElement) {
    const data = parseData(dataElement);
    if (!data) return;

    const section = dataElement.closest('.shopify-section');
    if (!section) return;

    replaceText(section.querySelector('.rich-text__heading motion-element'), data.heading);
    replaceText(section.querySelector('motion-element.rich-text__text p'), data.subheading);

    const emailInput = section.querySelector('input[name="contact[email]"]');
    if (emailInput && data.emailPlaceholder) emailInput.placeholder = data.emailPlaceholder;

    replaceText(section.querySelector('button[type="submit"] .btn__text'), data.buttonLabel);
  }

  function openSuccessModal(message) {
    const modal = document.querySelector('basic-modal.modal--newsletter-alert');
    if (!modal) return;

    const alert = modal.querySelector('.form-message');
    const overlay = modal.querySelector('.fixed-overlay');
    const inner = modal.querySelector('.drawer__inner');
    if (!alert) return;

    alert.classList.remove('alert--error', 'hidden');
    alert.classList.add('alert--success');
    alert.innerHTML = `<svg class="icon icon-success icon--medium" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.25 8.25 6.5 11.5 12.75 4.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>${message}`;
    modal.hidden = false;
    modal.style.zIndex = '2147483000';
    if (overlay) {
      overlay.style.visibility = 'visible';
      overlay.style.opacity = '1';
    }
    if (inner) {
      inner.style.opacity = '1';
      inner.style.transform = 'none';
    }

    modal.querySelectorAll('.fixed-overlay, .drawer__close-btn').forEach((control) => {
      control.addEventListener('click', () => {
        modal.hidden = true;
        modal.style.zIndex = '';
        if (overlay) {
          overlay.style.visibility = '';
          overlay.style.opacity = '';
        }
        if (inner) {
          inner.style.opacity = '';
          inner.style.transform = '';
        }
      }, { once: true });
    });
  }

  function initialize() {
    const overrideScripts = document.querySelectorAll(DATA_SELECTOR);
    overrideScripts.forEach(applyOverrides);

    if (new URLSearchParams(window.location.search).get('customer_posted') === 'true') {
      const data = overrideScripts[0] ? parseData(overrideScripts[0]) : null;
      openSuccessModal(data?.successMessage || 'Vielen Dank für Ihr Abonnement');
    }
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
