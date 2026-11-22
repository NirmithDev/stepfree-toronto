import { stationId, stations } from './stations.mjs';
import { findRoute, outage } from './network.mjs';

const aliases = new Map([
  ['bay', 'bay-yorkville'],
  ['dundas', 'tmu'],
  ['eglinton-west', 'cedarvale'],
  ['sunnybrook', 'sunnybrook-park'],
]);

export function normalizeAlerts(entries, now = Date.now()) {
  const alerts = new Map();
  for (const entry of entries) {
    if (entry?.accessibility !== 'Elevator' || !entry.id || typeof entry.headerText !== 'string') continue;
    const [stationName, ...description] = entry.headerText.split(':');
    const key = stationId(stationName.trim().replace(/\s+station$/i, ''));
    const station = aliases.get(key) ?? key;
    if (!stations.has(station) || !description.length) continue;

    const start = Date.parse(entry.activePeriod?.start);
    const endText = entry.activePeriod?.end;
    const end = String(endText).startsWith('0001-') ? NaN : Date.parse(endText);
    if (start > now || end <= now) continue;
    const id = String(entry.id);
    alerts.set(id, { id, station, description: description.join(':').trim() });
  }
  return [...alerts.values()];
}

export function watchedStations(origin, destination) {
  const route = findRoute(origin, destination);
  if (!route?.segments.length) return new Set();
  const transfers = route.segments.filter((edge) => !edge.line).map((edge) => edge.fromStation);
  return new Set([origin, destination, ...transfers]);
}

export function setupAlerts() {
  const watch = document.querySelector('#watch');
  const notification = document.querySelector('#notification');
  const watchStatus = document.querySelector('#watch-status');
  const feedStatus = document.querySelector('#feed-status');
  const notice = document.querySelector('#notice');
  const list = document.querySelector('#live-alerts');
  const storageKey = 'stepfree-watched-trip';
  const notifications = globalThis.Notification;
  let trip;
  let savedTrip;
  let alerts = [];
  let previousIds = null;
  let lastChecked;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && watchedStations(saved.origin, saved.destination).size) savedTrip = saved;
  } catch {
    // The live alert list still works when browser storage is unavailable.
  }

  function isWatched() {
    return savedTrip && savedTrip.origin === trip?.origin && savedTrip.destination === trip?.destination;
  }

  function render() {
    watch.textContent = savedTrip && isWatched() ? 'Stop watching' : savedTrip ? 'Watch this trip instead' : 'Watch this trip';
    watch.disabled = !(savedTrip && isWatched()) && !trip?.watchable;
    const stationIds = savedTrip ? watchedStations(savedTrip.origin, savedTrip.destination) : null;
    watchStatus.textContent = stationIds
      ? `Watching ${[...stationIds].map((id) => stations.get(id).name).join(', ')} while this page is open.`
      : 'Watch the stations where you board, transfer, or exit. Alerts check while this page is open.';
    const relevant = stationIds ? alerts.filter((alert) => stationIds.has(alert.station)) : alerts;
    const items = relevant.map((alert) => {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = stations.get(alert.station).name;
      item.append(name, ` · ${alert.description}`);
      return item;
    });
    if (lastChecked && !relevant.length) {
      const item = document.createElement('li');
      item.textContent = stationIds ? 'No elevator outages reported for the watched stations at the last check.' : 'No elevator outages reported at the last check.';
      items.push(item);
    }
    list.replaceChildren(...items);
  }

  async function poll() {
    try {
      const response = await fetch('/api/elevator-alerts', { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('TTC alert feed unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload.alerts)) throw new Error('Unexpected TTC alert feed');
      alerts = normalizeAlerts(payload.alerts);
      const matchingStations = savedTrip ? watchedStations(savedTrip.origin, savedTrip.destination) : new Set();
      const newAlerts = previousIds
        ? alerts.filter(({ id, station }) => !previousIds.has(id) && matchingStations.has(station))
        : [];
      previousIds = new Set(alerts.map(({ id }) => id));
      lastChecked = new Date();
      feedStatus.textContent = `Last checked at ${lastChecked.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}. Checks every minute.`;
      if (newAlerts.length) {
        const stationNames = [...new Set(newAlerts.map(({ station }) => stations.get(station).name))];
        notice.textContent = `New TTC elevator ${newAlerts.length === 1 ? 'alert' : 'alerts'} at ${stationNames.join(', ')}.`;
        if (notifications?.permission === 'granted') {
          try {
            new notifications('StepFree Toronto', { body: notice.textContent, tag: 'stepfree-elevator' });
          } catch {
            // Keep the in-app alert when desktop delivery is unsupported.
          }
        }
      }
    } catch {
      feedStatus.textContent = lastChecked
        ? `Live feed unavailable. Showing the last check at ${lastChecked.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}.`
        : 'Live feed unavailable. Check the official TTC status.';
    }
    render();
    setTimeout(poll, 60000);
  }

  function updateNotificationButton() {
    notification.disabled = !notifications || notifications.permission !== 'default';
    notification.textContent = !notifications ? 'Desktop alerts unavailable'
      : notifications.permission === 'granted' ? 'Desktop alerts enabled'
      : notifications.permission === 'denied' ? 'Desktop alerts blocked' : 'Enable desktop alerts';
  }

  watch.addEventListener('click', () => {
    savedTrip = isWatched() ? undefined : { origin: trip.origin, destination: trip.destination };
    try {
      if (savedTrip) localStorage.setItem(storageKey, JSON.stringify(savedTrip));
      else localStorage.removeItem(storageKey);
    } catch {
      // Watching can continue for the current visit.
    }
    notice.textContent = '';
    render();
  });
  notification.addEventListener('click', async () => {
    try {
      await notifications.requestPermission();
    } catch {
      notice.textContent = 'Desktop alerts are unavailable in this browser. In-app alerts will still appear.';
    }
    updateNotificationButton();
  });
  updateNotificationButton();
  void poll();

  return {
    setTrip(origin, destination, baseline) {
      trip = { origin, destination, watchable: Boolean(baseline?.segments.length) };
      render();
    },
    replay() {
      if (savedTrip && watchedStations(savedTrip.origin, savedTrip.destination).has(outage.station)) {
        notice.textContent = 'Replay alert · Bloor–Yonge elevator 3D1L is out in the demo.';
      }
    },
  };
}
