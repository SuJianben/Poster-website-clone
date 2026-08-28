(() => {
  const initWall = (wall) => {
    if (wall.dataset.inspirationWallInitialized === 'true') return;
    wall.dataset.inspirationWallInitialized = 'true';
    const moreButton = wall.querySelector('[data-inspiration-more]');
    const modal = wall.querySelector('[data-inspiration-modal]');
    const tiles = Array.from(wall.querySelectorAll('[data-inspiration-tile]'));
    const modalImage = wall.querySelector('[data-inspiration-modal-image]');
    const username = wall.querySelector('[data-inspiration-username]');
    const date = wall.querySelector('[data-inspiration-date]');
    const caption = wall.querySelector('[data-inspiration-caption]');
    const likes = wall.querySelector('[data-inspiration-likes]');
    const comments = wall.querySelector('[data-inspiration-comments]');
    const product = wall.querySelector('[data-inspiration-product]');
    const productImage = wall.querySelector('[data-inspiration-product-image]');
    const productTitle = wall.querySelector('[data-inspiration-product-title]');
    const thumbs = wall.querySelector('[data-inspiration-thumbs]');
    const likeButton = wall.querySelector('[data-inspiration-like]');
    let activeIndex = 0;
    const hiddenTiles = () => tiles.filter((tile) => tile.classList.contains('is-hidden'));
    const render = (index) => {
      if (!tiles.length) return;
      activeIndex = (index + tiles.length) % tiles.length;
      const tile = tiles[activeIndex];
      modalImage.src = tile.dataset.image;
      modalImage.alt = tile.querySelector('img').alt;
      username.textContent = tile.dataset.username;
      date.textContent = tile.dataset.date || '';
      date.hidden = !tile.dataset.date;
      caption.textContent = tile.dataset.caption;
      likes.textContent = tile.dataset.likes;
      comments.textContent = tile.dataset.comments || '0';
      const hasProduct = Boolean(tile.dataset.productUrl && tile.dataset.productImage);
      product.hidden = !hasProduct;
      if (hasProduct) {
        productImage.src = tile.dataset.productImage;
        productImage.alt = tile.dataset.productTitle;
        productTitle.textContent = tile.dataset.productTitle;
        product.href = tile.dataset.productUrl;
      }
      likeButton.setAttribute('aria-pressed', 'false');
      thumbs.querySelectorAll('button').forEach((thumb, thumbIndex) => {
        thumb.classList.toggle('is-active', thumbIndex === activeIndex);
        thumb.setAttribute('aria-current', thumbIndex === activeIndex ? 'true' : 'false');
      });
    };
    tiles.forEach((tile, index) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'inspiration-wall__thumb';
      thumb.setAttribute('aria-label', `View photo ${index + 1}`);
      thumb.innerHTML = `<img src="${tile.dataset.image}" alt="">`;
      thumb.addEventListener('click', () => render(index));
      thumbs.appendChild(thumb);
      tile.addEventListener('click', () => {
        render(index);
        modal.hidden = false;
        document.documentElement.classList.add('inspiration-modal-open');
      });
    });
    if (moreButton) moreButton.addEventListener('click', () => {
      hiddenTiles().slice(0, 6).forEach((tile, index) => window.setTimeout(() => {
        tile.classList.remove('is-hidden');
        tile.classList.add('is-revealing');
      }, index * 55));
      if (hiddenTiles().length <= 6) moreButton.hidden = true;
    });
    const close = () => {
      modal.hidden = true;
      document.documentElement.classList.remove('inspiration-modal-open');
    };
    wall.querySelector('[data-inspiration-close]').addEventListener('click', close);
    wall.querySelector('[data-inspiration-prev]').addEventListener('click', () => render(activeIndex - 1));
    wall.querySelector('[data-inspiration-next]').addEventListener('click', () => render(activeIndex + 1));
    likeButton.addEventListener('click', () => likeButton.setAttribute('aria-pressed', likeButton.getAttribute('aria-pressed') !== 'true'));
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', (event) => {
      if (modal.hidden) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') render(activeIndex - 1);
      if (event.key === 'ArrowRight') render(activeIndex + 1);
    });
  };

  const initAll = (root = document) => {
    root.querySelectorAll('[data-inspiration-wall]').forEach(initWall);
  };

  initAll();
  document.addEventListener('shopify:section:load', (event) => initAll(event.target));
})();
