import { setupAlerts } from './alerts.mjs';
import { drawNetwork } from './map.mjs';
import { directions, findRoute, outage } from './network.mjs';
import { lines, stations } from './stations.mjs';
import { setupStationInspector } from './station-inspector.mjs';

const origin = document.querySelector('#origin');
const destination = document.querySelector('#destination');
const normalControl = document.querySelector('[value="normal"]');
const outageControl = document.querySelector('[value="outage"]');
const replay = document.querySelector('#replay');
const mapStatus = document.querySelector('#map-status');
const impact = document.querySelector('#impact');
const estimate = document.querySelector('#estimate');
const explanation = document.querySelector('#explanation');
const steps = document.querySelector('#directions');
const canvas = document.querySelector('#map');
const legend = document.querySelector('#map-legend');

const stationList = [...stations.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-CA'));
for (const select of [origin, destination]) {
  select.replaceChildren(...stationList.map(({ id, name, stepFree }) =>
    new Option(stepFree ? name : `${name} (no step-free access)`, id)));
  select.disabled = false;
}
origin.value = 'wellesley';
destination.value = 'broadview';

for (const { number, name, color } of lines) {
  const item = document.createElement('span');
  const swatch = document.createElement('i');
  swatch.style.color = color;
  swatch.setAttribute('aria-hidden', 'true');
  item.append(swatch, `${number} ${name}`);
  legend.append(item);
}
const stationCount = document.createElement('span');
stationCount.className = 'station-count';
stationCount.textContent = `${stations.size} stations and stops`;
legend.append(stationCount);

const alerts = setupAlerts();
let replayTimer;
let route;

function drawMap() {
  drawNetwork(canvas, route, origin.value, destination.value, outageControl.checked);
}

function updateTrip() {
  const from = origin.value;
  const to = destination.value;
  const hasOutage = outageControl.checked;
  const baseline = findRoute(from, to);
  route = hasOutage ? findRoute(from, to, [outage.edge]) : baseline;
  const affected = hasOutage && baseline && (
    baseline.segments.some((edge) => edge.id === outage.edge) || baseline.minutes !== route?.minutes
  );
  mapStatus.textContent = hasOutage ? 'Replay · Bloor–Yonge outage' : 'No simulated outage';
  mapStatus.classList.toggle('outage', hasOutage);
  impact.classList.toggle('outage', hasOutage && affected);
  alerts.setTrip(from, to, baseline);

  if (from === to) {
    impact.textContent = 'Choose another stop';
    estimate.textContent = 'Same station';
    explanation.textContent = 'Select a different origin or destination to plan a trip.';
  } else if (!route) {
    const unavailable = [from, to].map((id) => stations.get(id)).filter((station) => !station.stepFree);
    impact.textContent = 'Step-free access';
    estimate.textContent = 'No step-free rail route';
    explanation.textContent = unavailable.length
      ? `Step-free platform access is unavailable at ${unavailable.map(({ name }) => name).join(' and ')} in this station snapshot.`
      : 'The modeled network has no step-free route with this elevator out of service.';
  } else {
    const addedTime = route.minutes - baseline.minutes;
    impact.textContent = hasOutage && affected ? `+${addedTime} min · Rerouted` : 'Step-free route estimate';
    estimate.textContent = `About ${route.minutes} min`;
    explanation.textContent = hasOutage
      ? (affected ? `Elevator 3D1L is out at Bloor–Yonge. Follow the updated route below.` : 'The simulated outage leaves this route unchanged.')
      : 'Illustrative travel time. Check live elevator alerts below.';
  }
  const items = route ? directions(route).map((instruction) => {
    const item = document.createElement('li');
    item.textContent = instruction;
    return item;
  }) : [];
  steps.replaceChildren(...items);
  drawMap();
}

function cancelReplay() {
  clearTimeout(replayTimer);
  replayTimer = undefined;
  replay.textContent = 'Replay outage';
}

for (const control of [origin, destination, normalControl, outageControl]) {
  control.addEventListener('change', () => {
    cancelReplay();
    updateTrip();
  });
}

replay.addEventListener('click', () => {
  if (replayTimer !== undefined) {
    cancelReplay();
    return;
  }
  normalControl.checked = true;
  updateTrip();
  replay.textContent = 'Stop replay';
  replayTimer = setTimeout(() => {
    outageControl.checked = true;
    cancelReplay();
    updateTrip();
    alerts.replay();
  }, 1800);
});

updateTrip();
new ResizeObserver(drawMap).observe(canvas);
setupStationInspector(canvas, () => origin.value);
