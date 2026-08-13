(() => {
  const track = (event, detail = {}) => {
    window.dataLayer?.push({ event, ...detail });
    document.dispatchEvent(new CustomEvent(event, { detail }));
  };

  const init = (root) => {
    const toggle = root.querySelector('[data-source-photo-toggle]');
    const upload = root.querySelector('[data-source-photo-upload]');
    const input = root.querySelector('[data-source-photo-input]');
    const name = root.querySelector('[data-source-photo-name]');
    if (toggle && upload) {
      const update = () => {
        upload.hidden = !toggle.checked;
        track('product_personalization_photo_toggle', { enabled: toggle.checked });
      };
      toggle.addEventListener('change', update);
      upload.hidden = !toggle.checked;
    }
    input?.addEventListener('change', () => {
      if (name) name.textContent = input.files?.[0]?.name || 'Or drop file to upload';
      track('product_personalization_file_select', { has_file: Boolean(input.files?.length) });
    });
  };

  const start = () => document.querySelectorAll('[data-source-personalization]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
