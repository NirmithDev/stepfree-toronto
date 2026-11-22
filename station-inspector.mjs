import { mapSize, stations } from './stations.mjs';

const arrowDirections = new Map([
  ['ArrowLeft', [-1, 0]], ['ArrowRight', [1, 0]],
  ['ArrowUp', [0, -1]], ['ArrowDown', [0, 1]],
]);

export function setupStationInspector(canvas, getOrigin) {
  const surface = canvas.parentElement;
  const marker = surface.querySelector('#station-marker');
  const tooltip = surface.querySelector('#station-tooltip');
  const name = surface.querySelector('#station-name');
  const lines = surface.querySelector('#station-lines');
  const access = surface.querySelector('#station-access');
  const announcement = surface.querySelector('#station-announcement');
  let current;
  let mode;

  function position() {
    if (!current) return;
    const [mapX, mapY] = current.point;
    const x = mapX * canvas.clientWidth / mapSize.width;
    const y = mapY * canvas.clientHeight / mapSize.height;
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left = Math.max(8, Math.min(x - width / 2, canvas.clientWidth - width - 8));
    const top = y >= height + 16 ? y - height - 12 : y + 12;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function show(station, source) {
    if (station === current && mode === source) return;
    current = station;
    mode = source;
    marker.hidden = tooltip.hidden = !station;
    canvas.style.cursor = source === 'pointer' && station ? 'help' : '';
    if (!station) {
      announcement.textContent = '';
      return;
    }
    name.textContent = station.name;
    lines.textContent = station.lines.length === 1 ? `Line ${station.lines[0]}` : `Lines ${station.lines.join(', ')}`;
    access.textContent = station.stepFree ? 'Step-free platform access' : 'No step-free platform access';
    access.classList.toggle('unavailable', !station.stepFree);
    if (source === 'keyboard') announcement.textContent = `${name.textContent}. ${lines.textContent}. ${access.textContent}.`;
    position();
  }

  function stopAt(event, radius) {
    const box = canvas.getBoundingClientRect();
    const mouseX = event.clientX - box.left;
    const mouseY = event.clientY - box.top;
    let nearest;
    let distance = radius;
    for (const station of stations.values()) {
      const [x, y] = station.point;
      const candidate = Math.hypot(mouseX - x * box.width / mapSize.width, mouseY - y * box.height / mapSize.height);
      if (candidate < distance) {
        nearest = station;
        distance = candidate;
      }
    }
    return nearest;
  }

  surface.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const station = stopAt(event, 12);
    if (!station && current && mode === 'pointer') {
      const box = tooltip.getBoundingClientRect();
      if (event.clientX >= box.left && event.clientX <= box.right &&
          event.clientY >= box.top - 12 && event.clientY <= box.bottom + 12) return;
    }
    show(station, 'pointer');
  });
  surface.addEventListener('pointerleave', () => {
    if (mode === 'pointer') show(undefined);
  });
  surface.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch') return;
    const station = stopAt(event, 18);
    show(mode === 'tap' && station === current ? undefined : station, 'tap');
  });
  document.addEventListener('pointerdown', (event) => {
    if (mode === 'tap' && !surface.contains(event.target)) show(undefined);
  });
  surface.addEventListener('focus', () => {
    if (surface.matches(':focus-visible')) show(stations.get(getOrigin()), 'keyboard');
  });
  surface.addEventListener('blur', () => {
    if (mode === 'keyboard') show(undefined);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current) show(undefined);
  });
  surface.addEventListener('keydown', (event) => {
    const direction = arrowDirections.get(event.key);
    if (!direction) return;
    event.preventDefault();
    const start = current ?? stations.get(getOrigin());
    const [dx, dy] = direction;
    let nearest = start;
    let best = Infinity;
    for (const station of stations.values()) {
      const x = station.point[0] - start.point[0];
      const y = station.point[1] - start.point[1];
      const ahead = x * dx + y * dy;
      const across = Math.abs(x * dy - y * dx);
      if (ahead <= 0) continue;
      const distance = ahead + across * 3;
      if (distance < best) {
        nearest = station;
        best = distance;
      }
    }
    show(nearest, 'keyboard');
  });
  new ResizeObserver(position).observe(canvas);
}
