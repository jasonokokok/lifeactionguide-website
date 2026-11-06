(() => {
  const viewer = document.querySelector('#screenshot-viewer');
  const stage = viewer.querySelector('.viewer-stage');
  const image = viewer.querySelector('.viewer-image');
  const label = viewer.querySelector('#viewer-title');
  const output = viewer.querySelector('.viewer-scale');
  const minus = viewer.querySelector('[data-zoom="out"]');
  const plus = viewer.querySelector('[data-zoom="in"]');
  let scale = 1, x = 0, y = 0, width = 0, height = 0;
  let opener, previousOverflow, gesture, moved = false, backgroundTap = false;
  const pointers = new Map();
  const limit = (value, min, max) => Math.max(min, Math.min(max, value));
  function render() {
    x = limit(x, -Math.max(0, (width * scale - stage.clientWidth) / 2), Math.max(0, (width * scale - stage.clientWidth) / 2));
    y = limit(y, -Math.max(0, (height * scale - stage.clientHeight) / 2), Math.max(0, (height * scale - stage.clientHeight) / 2));
    image.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
    output.textContent = `${Math.round(scale * 100)}%`;
    minus.disabled = scale <= 1;
    plus.disabled = scale >= 4;
    stage.classList.toggle('is-zoomed', scale > 1);
  }
  function fit() {
    if (!viewer.open || !image.naturalWidth) return;
    const ratio = Math.min((stage.clientWidth - 32) / image.naturalWidth, (stage.clientHeight - 24) / image.naturalHeight, 1);
    width = image.naturalWidth * ratio;
    height = image.naturalHeight * ratio;
    image.style.width = `${width}px`;
    image.style.height = `${height}px`;
    scale = 1; x = 0; y = 0; render();
  }
  function zoom(next, point) {
    const before = scale;
    scale = limit(next, 1, 4);
    if (point) {
      const rect = stage.getBoundingClientRect();
      const px = point.x - rect.left - rect.width / 2;
      const py = point.y - rect.top - rect.height / 2;
      x = px - (px - x) * scale / before;
      y = py - (py - y) * scale / before;
    }
    render();
  }
  document.querySelectorAll('.screen-link').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      previousOverflow = document.body.style.overflow;
      label.textContent = button.closest('figure').querySelector('h3').textContent;
      image.alt = button.querySelector('img').alt;
      image.removeAttribute('src');
      image.style.visibility = 'hidden';
      viewer.showModal();
      document.body.style.overflow = 'hidden';
      image.src = button.dataset.image;
      if (image.complete && image.naturalWidth) { fit(); image.style.visibility = 'visible'; }
    });
  });
  image.addEventListener('load', () => { fit(); image.style.visibility = 'visible'; });
  viewer.querySelector('[data-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
  viewer.addEventListener('close', () => {
    pointers.clear(); gesture = null;
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
  minus.addEventListener('click', () => zoom(scale / 1.5));
  plus.addEventListener('click', () => zoom(scale * 1.5));
  viewer.querySelector('[data-reset]').addEventListener('click', fit);
  stage.addEventListener('dblclick', event => { event.preventDefault(); zoom(scale > 1 ? 1 : 2, { x: event.clientX, y: event.clientY }); });
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    zoom(scale * Math.exp(-event.deltaY * 0.002), { x: event.clientX, y: event.clientY });
  }, { passive: false });
  function snapshot() {
    const points = [...pointers.values()];
    gesture = { points, x, y, scale };
  }
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (!pointers.size) { moved = false; backgroundTap = event.target === stage; }
    else backgroundTap = false;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    snapshot();
  });
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.values()];
    if (points.length >= 2 && gesture.points.length >= 2) {
      moved = true;
      const distance = pair => Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
      const before = distance(gesture.points);
      if (before > 0) {
        scale = gesture.scale; x = gesture.x; y = gesture.y;
        zoom(gesture.scale * distance(points) / before, { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 });
      }
    } else if (points.length === 1) {
      const dx = points[0].x - gesture.points[0].x;
      const dy = points[0].y - gesture.points[0].y;
      if (Math.hypot(dx, dy) > 5) moved = true;
      x = gesture.x + dx; y = gesture.y + dy; render();
    }
  });
  function release(event) {
    pointers.delete(event.pointerId);
    if (pointers.size) snapshot(); else gesture = null;
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('click', event => {
    if (event.target === stage && backgroundTap && !moved) viewer.close();
  });
  viewer.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(scale * 1.5); }
    if (event.key === '-') { event.preventDefault(); zoom(scale / 1.5); }
    if (event.key === '0') { event.preventDefault(); fit(); }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'ArrowLeft') x += 60;
      if (event.key === 'ArrowRight') x -= 60;
      if (event.key === 'ArrowUp') y += 60;
      if (event.key === 'ArrowDown') y -= 60;
      render();
    }
  });
  window.addEventListener('resize', fit);
})();
