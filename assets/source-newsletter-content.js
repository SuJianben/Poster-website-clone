(() => {
  const DATA_SELECTOR = 'script[data-source-newsletter-overrides]';

  function replaceText(element, value) {
    if (element && value) element.textContent = value;
  }

  function applyOverrides(dataElement) {
    let data;
    try {
      data = JSON.parse(dataElement.textContent);
    } catch {
      return;
    }

    const section = dataElement.closest('.shopify-section');
    if (!section) return;

    replaceText(section.querySelector('.rich-text__heading motion-element'), data.heading);
    replaceText(section.querySelector('motion-element.rich-text__text p'), data.subheading);

    const emailInput = section.querySelector('input[name="contact[email]"]');
    if (emailInput && data.emailPlaceholder) emailInput.placeholder = data.emailPlaceholder;

    replaceText(section.querySelector('button[type="submit"] .btn__text'), data.buttonLabel);
  }

  function initialize() {
    document.querySelectorAll(DATA_SELECTOR).forEach(applyOverrides);
  }

  document.addEventListener('DOMContentLoaded', initialize);
  document.addEventListener('shopify:section:load', initialize);
})();
