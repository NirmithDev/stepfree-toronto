# StepFree Toronto

A step-free trip planner for Toronto’s subway and light rail network. Explore **109 stations and stops** across TTC Lines 1, 2, 4, 5, and 6, replay an elevator outage to see how it changes a trip, and watch for live elevator alerts at the stations you use.

## Quick start

You’ll need Python 3 (tested with 3.12), a modern browser, and an internet connection if you want live TTC alerts. The project has no package dependencies, API keys, or build step.

1. Open a terminal in the `stepfree-toronto` folder, where `serve.py` is located.
2. Start the server. On Windows, use `python serve.py` or `py -3 serve.py`. On macOS or Linux, use `python3 serve.py`.
3. Open [StepFree Toronto on localhost](http://127.0.0.1:4173/). Leave the terminal running while you use the app. Press **Ctrl+C** to stop the server.

## Try the demo

1. Leave the trip set to **Wellesley → Broadview**. The default route transfers from Line 1 to Line 2 at Bloor–Yonge.
2. Select **Replay outage**. The app removes elevator **3D1L** from its routing graph, redraws the route via St George, and updates the estimated trip time and directions. Select **Normal** to reset the scenario.
3. Hover over or tap any station dot to see its name, lines, and step-free platform access. With the map focused, use the arrow keys to move between stops. Press **Escape** to dismiss the tooltip.
4. Try **Humber College → Don Mills** to see routing across several lines. Select **Old Mill** as an endpoint to see how the planner handles a station without step-free subway platform access.

## Live elevator alerts

Select **Watch this trip** to save one trip in your browser. The alert list then shows outages reported at the stations where you board, transfer, or exit on the normal route. The app checks the TTC feed about once a minute while the page is open and flags new matching alerts. Select **Enable desktop alerts** to also receive browser notifications where supported. The replay can show a labeled in-app demo alert for a watched trip that uses Bloor–Yonge.

To verify the live connection, look for **Last checked at** in the alerts panel or open the [local alert endpoint](http://127.0.0.1:4173/api/elevator-alerts) and look for a JSON object with an `alerts` array.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| The local page won’t load | Start `serve.py` from the project folder and open the address printed in the terminal. |
| Port 4173 is already in use | Run `python serve.py --port 4174` with your Python command and open [port 4174](http://127.0.0.1:4174/). |
| The map is blank or the selectors are disabled | Open the local server URL with JavaScript enabled. If the page still looks stale after an update, hard-refresh it. |
| The live feed is unavailable | Run the project with `serve.py`, which provides `/api/elevator-alerts`. Check that Python can reach `alerts.ttc.ca`. Route planning and the replay work offline once the local server is running. |
| Desktop alerts don’t appear | Check the browser’s notification permission for the local URL and keep the app open. In-app alerts remain available. |

## How it works

| File | Responsibility |
| --- | --- |
| [`stations.mjs`](stations.mjs) | Station order, interchange points, map coordinates, and a snapshot of step-free platform access. |
| [`network.mjs`](network.mjs) | Directed routing graph, shortest-path search, and step-by-step directions. |
| [`map.mjs`](map.mjs) and [`station-inspector.mjs`](station-inspector.mjs) | Canvas schematic and stop inspection by pointer, touch, or keyboard. |
| [`alerts.mjs`](alerts.mjs) | Alert polling, watched-trip preferences, and optional desktop notifications. |
| [`serve.py`](serve.py) | Local web server and same-origin relay for the public TTC alert feed. |

For hosting, the planner and replay use static files. Live alerts need a server-side relay at `/api/elevator-alerts` on the same origin. The included Python server binds to loopback for local development.

## Routing scope

StepFree is an independent prototype covering TTC subway and light rail. Travel times are illustrative and use two minutes per stop plus modeled transfer time. Stations without step-free platform access remain visible and can be passed through, but can’t be used to start or end a step-free trip. The 3D1L replay is the only outage that currently changes routing. Live alerts display TTC reports separately. Confirm current service and elevator availability with the TTC before travelling.

## Data sources

- Station order and transfers come from the [November 2026 TTC service summary](https://cdn.ttc.ca/-/media/Project/TTC/DevProto/Documents/Home/Transparency-and-accountability/Service-Summary-2026-11-01.pdf).
- Platform access and the replay use the [TTC elevator and escalator guide](https://www.ttc.ca/en/accessibility/Easier-access-on-the-TTC/Elevators-and-Escalators) and [Bloor–Yonge station’s accessible alternatives](https://www.ttc.ca/subway-stations/bloor-yonge-station).
- The alert panel uses the [TTC public live alert feed](https://alerts.ttc.ca/api/alerts/live-alerts).
