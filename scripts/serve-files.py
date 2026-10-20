#!/usr/bin/env python3
"""Static file server for moving files into a VM.

`python -m http.server` serves .bat/.json as text, and some browsers render
them instead of downloading. This version forces a download for script and
config files, and keeps everything else as-is.

Usage:
    python serve-files.py --root . --port 8000
"""

import argparse
import http.server
import os
import socketserver
import urllib.parse

FORCE_DOWNLOAD = (".bat", ".cmd", ".ps1", ".json", ".reg", ".vbs")


class Handler(http.server.SimpleHTTPRequestHandler):
    root = os.getcwd()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=Handler.root, **kwargs)

    def guess_type(self, path):
        if path.lower().endswith(FORCE_DOWNLOAD):
            return "application/octet-stream"
        return super().guess_type(path)

    def end_headers(self):
        target = urllib.parse.urlparse(self.path).path.lower()
        if target.endswith(FORCE_DOWNLOAD):
            self.send_header("Content-Disposition", "attachment")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def main():
    parser = argparse.ArgumentParser(description="static file server with forced downloads")
    parser.add_argument("--root", default=".", help="directory to serve (default: cwd)")
    parser.add_argument("--bind", default="0.0.0.0", help="bind address (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="port (default: 8000)")
    args = parser.parse_args()

    Handler.root = os.path.abspath(args.root)
    if not os.path.isdir(Handler.root):
        raise SystemExit("not a directory: %s" % Handler.root)

    with Server((args.bind, args.port), Handler) as httpd:
        print("serving %s on %s:%d" % (Handler.root, args.bind, args.port), flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
