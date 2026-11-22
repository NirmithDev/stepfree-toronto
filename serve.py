"""Serve StepFree locally and relay the TTC's public alert feed."""

import argparse
import json
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.error import URLError
from urllib.request import Request, urlopen


FEED = "https://alerts.ttc.ca/api/alerts/live-alerts"
CACHE_SECONDS = 55
MAX_FEED_BYTES = 2_000_000


class AlertFeed:
    def __init__(self):
        self.lock = Lock()
        self.expires = 0
        self.result = None

    def get(self):
        with self.lock:
            if time.monotonic() < self.expires:
                return self.result
            request = Request(FEED, headers={"Accept": "application/json", "User-Agent": "StepFreeToronto/1.0"})
            try:
                with urlopen(request, timeout=8) as response:
                    raw = response.read(MAX_FEED_BYTES + 1)
                if len(raw) > MAX_FEED_BYTES:
                    raise ValueError("Unexpected TTC response size")
                data = json.loads(raw)
                if not isinstance(data, dict) or data.get("status") != "success" or not isinstance(data.get("accessibility"), list):
                    raise ValueError("Unexpected TTC response")
                self.result = (200, {"alerts": data["accessibility"]})
                self.expires = time.monotonic() + CACHE_SECONDS
            except (URLError, OSError, ValueError):
                self.result = (502, {"error": "TTC alerts are temporarily unavailable."})
                self.expires = time.monotonic() + 15
            return self.result


class Handler(SimpleHTTPRequestHandler):
    feed = AlertFeed()
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mjs": "text/javascript"}

    def do_GET(self):
        if self.path != "/api/elevator-alerts":
            return super().do_GET()
        status, data = self.feed.get()
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    handler = partial(Handler, directory=Path(__file__).resolve().parent)
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"StepFree Toronto is available at http://127.0.0.1:{args.port}/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
