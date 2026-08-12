(() => {
  const roots = document.querySelectorAll('[data-srpc-community]');

  const emit = (root, action, detail = {}) => {
    window.dispatchEvent(new CustomEvent('source_reviews:community', {
      detail: { action, section: 'our_community', ...detail }
    }));
    root.dataset.lastCommunityAction = action;
  };

  roots.forEach((root) => {
    const viewport = root.querySelector('[data-srpc-viewport]');
    const track = root.querySelector('[data-srpc-track]');
    const firstGroup = root.querySelector('[data-srpc-group]');
    const prev = root.querySelector('[data-srpc-prev]');
    const next = root.querySelector('[data-srpc-next]');
    if (!viewport || !track || !firstGroup || !prev || !next) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const autoplay = root.dataset.srpcAutoplay === 'true' && !reduceMotion;
    const speed = Math.max(0, Number(root.dataset.srpcSpeed) || 18);
    let offset = 0;
    let previousTime = 0;
    let pauseUntil = 0;
    let frameId = 0;
    let dragging = false;
    let pointerX = 0;

    const groupWidth = () => firstGroup.getBoundingClientRect().width;
    const cardWidth = () => firstGroup.querySelector('.srpc__item')?.getBoundingClientRect().width || 252;
    const normalize = () => {
      const width = groupWidth();
      if (!width) return;
      offset = ((offset % width) + width) % width;
    };
    const render = () => {
      normalize();
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    };
    const move = (direction) => {
      offset += cardWidth() * direction;
      pauseUntil = performance.now() + 900;
      track.style.transition = 'transform .45s cubic-bezier(.3,1,.3,1)';
      render();
      window.setTimeout(() => { track.style.transition = ''; }, 470);
      emit(root, direction > 0 ? 'next' : 'previous');
    };
    const animate = (time) => {
      if (!previousTime) previousTime = time;
      const delta = Math.min(32, time - previousTime);
      previousTime = time;
      if (autoplay && !dragging && time > pauseUntil && !root.matches(':hover')) {
        offset += speed * delta / 1000;
        render();
      }
      frameId = requestAnimationFrame(animate);
    };

    prev.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    viewport.addEventListener('pointerdown', (event) => {
      dragging = true;
      pointerX = event.clientX;
      viewport.setPointerCapture?.(event.pointerId);
    });
    viewport.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      offset -= event.clientX - pointerX;
      pointerX = event.clientX;
      render();
    });
    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      pauseUntil = performance.now() + 900;
      emit(root, 'drag');
    };
    viewport.addEventListener('pointerup', stopDrag);
    viewport.addEventListener('pointercancel', stopDrag);
    viewport.addEventListener('lostpointercapture', stopDrag);
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
    });
    root.addEventListener('click', (event) => {
      if (event.target.closest('.srpc__item')) emit(root, 'open_image');
    });

    window.addEventListener('resize', render, { passive: true });
    render();
    frameId = requestAnimationFrame(animate);
    document.addEventListener('shopify:section:unload', (event) => {
      if (event.target?.contains(root)) cancelAnimationFrame(frameId);
    }, { once: true });
  });
})();

