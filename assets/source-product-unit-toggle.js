(() => {
  const sourceSizeLabels = new Map([
    ['A4 (30 x 21 cm)', { cm: '30 X 20 CM', in: '12" × 8"' }],
    ['40 x 30 cm', { cm: '40 X 30 CM', in: '16" × 12"' }],
    ['80 x 60 cm', { cm: '75 X 50 CM', in: '30" × 20"' }],
    ['100 x 75 cm', { cm: '100 X 75 CM', in: '40" × 30"' }],
    ['120 x 80 cm', { cm: '120 X 80 CM', in: '47" × 32"' }],
    ['160 x 120 cm', { cm: '160 X 120 CM', in: '63" × 47"' }],
    ['200 x 150 cm', { cm: '200 X 150 CM', in: '79" × 59"' }]
  ]);

  const normalizedSourceLabel = (value) => {
    const normalized = String(value || '').trim();
    const directMatch = sourceSizeLabels.get(normalized);
    if (directMatch) return directMatch;

    const dimensions = normalized.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
    if (!dimensions) return { cm: normalized, in: normalized };

    const width = Number(dimensions[1].replace(',', '.'));
    const height = Number(dimensions[2].replace(',', '.'));
    return {
      cm: `${dimensions[1]} X ${dimensions[2]} CM`,
      in: `${Math.round(width / 2.54)}" × ${Math.round(height / 2.54)}"`
    };
  };

  const initSizeUnitToggle = (scope = document) => {
    const product = scope.matches?.('[data-spx-product]') ? scope : scope.querySelector('[data-spx-product]');
    if (!product || product.dataset.spxUnitInitialized === 'true') return;

    const sizeGroups = [...product.querySelectorAll('.spx-product__size-group')];
    const unitButtons = [...product.querySelectorAll('[data-spx-size-unit]')];
    if (!sizeGroups.length || !unitButtons.length) return;

    product.dataset.spxUnitInitialized = 'true';
    let activeUnit = 'in';

    const updateSizeGroup = (group) => {
      const output = group.querySelector('[data-spx-option-output]');
      const selectedControl = group.querySelector('[data-spx-variant-value].is-selected');
      const select = group.querySelector('[data-spx-variant-select]');
      const selectedValue = selectedControl?.dataset.optionValue || select?.value || output?.dataset.spxOptionValue || output?.textContent.trim();

      group.querySelectorAll('[data-spx-variant-value]').forEach((control) => {
        control.textContent = normalizedSourceLabel(control.dataset.optionValue)[activeUnit];
      });

      if (select) {
        [...select.options].forEach((option) => {
          option.textContent = normalizedSourceLabel(option.value)[activeUnit];
        });
      }

      if (output && selectedValue) {
        output.dataset.spxOptionValue = selectedValue;
        output.textContent = normalizedSourceLabel(selectedValue)[activeUnit];
      }
    };

    const applyUnit = (unit, emitEvent = false) => {
      activeUnit = unit === 'cm' ? 'cm' : 'in';
      product.dataset.spxActiveUnit = activeUnit;
      document.body.dataset.activeUnit = activeUnit;

      unitButtons.forEach((button) => {
        const selected = button.dataset.spxSizeUnit === activeUnit;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      sizeGroups.forEach(updateSizeGroup);

      if (emitEvent) {
        product.dispatchEvent(new CustomEvent('spx:size-unit-change', {
          bubbles: true,
          detail: { unit: activeUnit }
        }));
      }
    };

    unitButtons.forEach((button) => button.addEventListener('click', () => {
      applyUnit(button.dataset.spxSizeUnit, true);
    }));

    product.addEventListener('spx:variant-change', () => {
      window.requestAnimationFrame(() => sizeGroups.forEach(updateSizeGroup));
    });

    applyUnit('in');
  };

  initSizeUnitToggle();
  document.addEventListener('shopify:section:load', (event) => initSizeUnitToggle(event.target));
})();
