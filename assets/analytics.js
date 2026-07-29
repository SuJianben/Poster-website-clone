window.PosterTheme = window.PosterTheme || {};
window.PosterTheme.track = function track(name, detail) {
  window.dispatchEvent(new CustomEvent('poster_theme:' + name, {
    detail: Object.assign({ event_version: 1, path: window.location.pathname }, detail || {})
  }));
};
