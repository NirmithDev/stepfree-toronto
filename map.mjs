import { lines, mapSize, stations } from './stations.mjs';
import { outage } from './network.mjs';

const colors = new Map(lines.map(({ number, color }) => [number, color]));
const anchors = new Map([
  ['vaughan-metropolitan-centre', ['Vaughan', 13, 0, 'left']],
  ['finch', ['Finch', 13, 0, 'left']],
  ['humber-college', ['Humber College', 0, -20, 'left']],
  ['finch-west', ['Finch West', 13, 0, 'left']],
  ['sheppard-yonge', ['Sheppard–Yonge', 0, 20, 'center']],
  ['don-mills', ['Don Mills', 0, -19, 'center']],
  ['mount-dennis', ['Mount Dennis', -12, 0, 'right']],
  ['cedarvale', ['Cedarvale', 0, -19, 'right']],
  ['eglinton', ['Eglinton', 13, -19, 'left']],
  ['kennedy', ['Kennedy', 0, 23, 'center']],
  ['kipling', ['Kipling', 0, 20, 'left']],
  ['st-george', ['St George', -13, -19, 'right']],
  ['bloor-yonge', ['Bloor–Yonge', 17, -19, 'left']],
  ['union', ['Union', 0, 23, 'center']],
]);
export function drawNetwork(canvas, route, origin, destination, hasOutage) {
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  if (!ctx || !width) return;
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(canvas.clientHeight * scale);
  ctx.setTransform(canvas.width / mapSize.width, 0, 0, canvas.height / mapSize.height, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  function path(ids, line, color, strokeWidth) {
    ctx.beginPath();
    for (const [index, id] of ids.entries()) {
      const point = stations.get(id).point;
      if (index) {
        if (line === 1 && [id, ids[index - 1]].includes('spadina') &&
          [id, ids[index - 1]].includes('st-george')) ctx.lineTo(494, 432);
        ctx.lineTo(...point);
      } else ctx.moveTo(...point);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }

  function dot(x, y, radius, stroke, fill = '#0c151e') {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  ctx.globalAlpha = .44;
  for (const line of lines) path(line.stops, line.number, line.color, 4);
  ctx.globalAlpha = 1;

  const segments = route?.segments ?? [];
  const rides = segments.filter((edge) => edge.line);
  const active = new Set(rides.flatMap((edge) => [edge.fromStation, edge.toStation]));
  const transfers = new Set(segments.filter((edge) => !edge.line).map((edge) => edge.fromStation));
  for (const edge of rides) path([edge.fromStation, edge.toStation], edge.line, '#0c151e', 13);
  for (const edge of rides) path([edge.fromStation, edge.toStation], edge.line, colors.get(edge.line), 7);

  for (const station of stations.values()) {
    const { id, point: [x, y] } = station;
    const endpoint = id === origin || id === destination;
    if (endpoint || transfers.has(id)) {
      dot(x, y, 8, station.stepFree ? '#f2f7f8' : '#ffca78');
    } else if (station.lines.length > 1) {
      dot(x, y, 5, '#9fb1bb');
    } else {
      dot(x, y, active.has(id) ? 3 : 2.6, null, station.stepFree ? '#c2cfd4' : '#ffca78');
    }
  }

  const labels = new Map(anchors);
  for (const id of new Set([origin, destination])) {
    const station = stations.get(id);
    if (labels.has(id)) continue;
    if (id === 'broadview' || id === 'sherbourne') {
      labels.set(id, [station.name, 0, 37, 'center']);
    } else {
      labels.set(id, [station.name, 13, -18, 'left']);
    }
  }
  ctx.textBaseline = 'middle';
  for (const [id, [name, dx, dy, align]] of labels) {
    const [x, y] = stations.get(id).point;
    const endpoint = id === origin || id === destination;
    ctx.font = `${endpoint ? 750 : 550} ${width < 650 ? 21 : 17}px "Segoe UI", system-ui, sans-serif`;
    const textWidth = ctx.measureText(name).width;
    const left = x + dx - (align === 'center' ? textWidth / 2 : align === 'right' ? textWidth : 0);
    const labelX = Math.max(12, Math.min(left, mapSize.width - 12 - textWidth));
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#0c151e';
    ctx.lineWidth = 5;
    ctx.strokeText(name, labelX, y + dy);
    ctx.fillStyle = endpoint ? '#fff' : '#c2cfd4';
    ctx.fillText(name, labelX, y + dy);
  }

  if (hasOutage) {
    const [x, y] = stations.get(outage.station).point;
    dot(x, y, 10, '#ffca78');
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(x + 4, y + 4);
    ctx.moveTo(x + 4, y - 4);
    ctx.lineTo(x - 4, y + 4);
    ctx.stroke();
  }
}
