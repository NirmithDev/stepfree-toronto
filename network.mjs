import { lines, stations } from './stations.mjs';

const bloor = 'bloor-yonge';
export const outage = {
  edge: '3D1L', station: bloor,
  detail: 'Elevator 3D1L links the Line 1 northbound platform and the Line 2 platform at Bloor–Yonge.',
};

const graph = new Map();

function addEdge(from, to, segment) {
  if (!graph.has(from)) graph.set(from, []);
  graph.get(from).push({ from, to, ...segment });
}

function platform(station, line, direction = 1) {
  if (station === bloor && line === 1) return direction === 1 ? 'bloor-north' : 'bloor-south';
  return `${station}:${line}`;
}

function stationFor(node) {
  if (node.startsWith('bloor-') && !node.includes(':')) return bloor;
  return node.split(':')[0];
}

for (const line of lines) {
  for (const direction of [1, -1]) {
    const stops = direction === 1 ? line.stops : line.stops.toReversed();
    const terminal = stations.get(stops.at(-1)).name;
    for (let index = 1; index < stops.length; index++) {
      const from = platform(stops[index - 1], line.number, direction);
      const to = platform(stops[index], line.number, direction);
      addEdge(from, to, { minutes: 2, line: line.number, terminal });
    }
  }
}

function connect(from, to, id, minutes, forward, reverse) {
  addEdge(from, to, { id, minutes, instruction: forward });
  addEdge(to, from, { id, minutes, instruction: reverse });
}

for (const station of stations.values()) {
  if (station.lines.length !== 2 || station.id === bloor) continue;
  const [first, second] = station.lines;
  connect(platform(station.id, first), platform(station.id, second), station.id,
    station.id === 'spadina' ? 7 : 3,
    `At ${station.name}, follow the step-free transfer to Line ${second}.`,
    `At ${station.name}, follow the step-free transfer to Line ${first}.`);
}

connect('bloor-north', platform(bloor, 2), outage.edge, 3,
  'At Bloor–Yonge, take elevator 3D1L to Line 2.',
  'At Bloor–Yonge, take elevator 3D1L to Line 1 northbound.');
connect('bloor-north', 'bloor-concourse', 'bloor-north-concourse', 1,
  'At Bloor–Yonge, take the elevator to the north concourse.',
  'From the north concourse, take the elevator down to Line 1 northbound.');
connect('bloor-concourse', 'bloor-south', 'bloor-south-concourse', 2,
  'From the north concourse, take the elevator down to Line 1 southbound.',
  'At Bloor–Yonge, take the elevator to the north concourse.');

function stepFreeEndpoints(station, blocked) {
  if (station.id === bloor) {
    const platforms = ['bloor-north', 'bloor-south'];
    if (!blocked.has(outage.edge)) platforms.push(platform(bloor, 2));
    return platforms;
  }
  return station.lines.map((line) => platform(station.id, line));
}

export function findRoute(origin, destination, unavailable = []) {
  const start = stations.get(origin);
  const end = stations.get(destination);
  if (!start?.stepFree || !end?.stepFree) return null;
  if (start === end) return { minutes: 0, segments: [] };

  const blocked = new Set(unavailable);
  const targets = new Set(stepFreeEndpoints(end, blocked));
  const pending = new Set(graph.keys());
  const times = new Map(stepFreeEndpoints(start, blocked).map((node) => [node, 0]));
  const previous = new Map();
  while (pending.size) {
    let current;
    let elapsed = Infinity;
    for (const node of pending) {
      const time = times.get(node) ?? Infinity;
      if (time < elapsed) {
        current = node;
        elapsed = time;
      }
    }
    if (current === undefined) return null;
    if (targets.has(current)) {
      const segments = [];
      for (let node = current; previous.has(node);) {
        const edge = previous.get(node);
        segments.push({ ...edge, fromStation: stationFor(edge.from), toStation: stationFor(edge.to) });
        node = edge.from;
      }
      return { minutes: elapsed, segments: segments.reverse() };
    }
    pending.delete(current);
    for (const edge of graph.get(current)) {
      if (!pending.has(edge.to) || blocked.has(edge.id)) continue;
      const arrival = elapsed + edge.minutes;
      if (arrival < (times.get(edge.to) ?? Infinity)) {
        times.set(edge.to, arrival);
        previous.set(edge.to, edge);
      }
    }
  }
  return null;
}

export function directions(route) {
  const steps = [];
  let ride;
  for (const edge of route.segments) {
    if (!edge.line) {
      ride = undefined;
      steps.push(edge);
    } else if (ride?.line === edge.line && ride.terminal === edge.terminal) {
      ride.toStation = edge.toStation;
    } else {
      ride = { ...edge };
      steps.push(ride);
    }
  }
  return steps.map((step) => step.instruction ??
    `Ride Line ${step.line} toward ${step.terminal} from ${stations.get(step.fromStation).name} to ${stations.get(step.toStation).name}.`);
}
