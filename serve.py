"""
Spooky Cable web server.

Why this exists: `python -m http.server` cannot do HTTP Range requests, so a browser cannot
jump into the middle of a video. The TV app jumps every video to where the channel "would be
by now" - with the built-in server that jump fails and every channel change restarts the video
from 0:00. This server supports Range requests, so seeking works.

Usage (from anywhere):
    python C:\\Users\\sampc\\tv\\serve.py
Then open:
    http://localhost:8000/tv/

Serves only the tv folder and the media folder, and only to this computer (127.0.0.1).
"""

import http.server
import os
import posixpath
import re
import sys
import urllib.parse
from http import HTTPStatus
from pathlib import Path

PORT = 8000
TV_DIR = Path(__file__).resolve().parent
MEDIA_DIR = TV_DIR.parent / "media"
CHUNK = 1024 * 1024


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # keep-alive, which video playback likes
    _range = (0, -1)

    # ---- where URLs point -------------------------------------------------------------
    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0].split("#", 1)[0]
        path = posixpath.normpath(urllib.parse.unquote(path))
        parts = [p for p in path.split("/") if p and p not in (".", "..")]
        nowhere = str(TV_DIR / "__not_found__")
        if any("\\" in p or ":" in p for p in parts):
            return nowhere  # no drive letters or backslash tricks
        if not parts:
            return nowhere
        if parts[0] == "tv":
            rest = parts[1:]
            if rest and rest[0] == "media":  # the app asks for "media/..." relative to /tv/
                return str(MEDIA_DIR.joinpath(*rest[1:]))
            return str(TV_DIR.joinpath(*rest))
        if parts[0] == "media":
            return str(MEDIA_DIR.joinpath(*parts[1:]))
        return nowhere

    # ---- sending files, with Range support --------------------------------------------
    def send_head(self):
        self._range = (0, -1)
        url_path = self.path.split("?", 1)[0]

        if url_path in ("", "/"):
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", "/tv/")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        path = self.translate_path(self.path)
        if os.path.isdir(path):
            if not url_path.endswith("/"):
                self.send_response(HTTPStatus.MOVED_PERMANENTLY)
                self.send_header("Location", url_path + "/")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return None
            index = os.path.join(path, "index.html")
            if not os.path.isfile(index):
                self.send_error(HTTPStatus.NOT_FOUND, "Not found")
                return None
            path = index

        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return None

        try:
            size = os.fstat(f.fileno()).st_size
            start, end, status = 0, size - 1, HTTPStatus.OK

            match = re.fullmatch(r"bytes=(\d*)-(\d*)", (self.headers.get("Range") or "").strip())
            if match and (match.group(1) or match.group(2)):
                first, last = match.groups()
                if first == "":  # "the last N bytes"
                    start, end = max(0, size - int(last)), size - 1
                else:
                    start = int(first)
                    end = min(int(last), size - 1) if last else size - 1
                if start >= size or start > end:
                    self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    f.close()
                    return None
                status = HTTPStatus.PARTIAL_CONTENT

            self.send_response(status)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(max(0, end - start + 1)))
            if status == HTTPStatus.PARTIAL_CONTENT:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            if not path.lower().endswith((".mp4", ".webm", ".mkv", ".jpg")):
                self.send_header("Cache-Control", "no-store")  # always show your latest edits
            self.end_headers()
            self._range = (start, end)
            return f
        except Exception:
            f.close()
            raise

    def copyfile(self, source, outputfile):
        start, end = self._range
        remaining = end - start + 1
        try:
            source.seek(start)
            while remaining > 0:
                chunk = source.read(min(CHUNK, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass  # the browser dropped the connection (normal when it seeks)

    def log_request(self, code="-", size="-"):
        # Only log problems; video playback makes hundreds of normal requests
        try:
            if int(code) >= 400:
                super().log_request(code, size)
        except ValueError:
            pass


def main() -> None:
    if not MEDIA_DIR.exists():
        print(f"Warning: media folder not found at {MEDIA_DIR}")
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError as exc:
        sys.exit(
            f"Could not start on port {PORT}: {exc}\n"
            "Another server is probably still running. Close the old `python -m http.server` window first."
        )
    server.daemon_threads = True
    print(f"Spooky Cable running -> http://localhost:{PORT}/tv/   (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
