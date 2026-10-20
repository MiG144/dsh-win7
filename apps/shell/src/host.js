'use strict';

/**
 * Manages the local DeepSeek Harness Host process.
 *
 * Layout (packaged):
 *   resources/node/node.exe
 *   resources/host/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js
 *
 * Layout (dev):
 *   apps/shell/vendor/node/node.exe
 *   apps/shell/vendor/host/dsh/...
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const HOST_BIN = path.join('dsh', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
const TOKEN_RE = /token=([A-Za-z0-9_-]+)/;
const MAX_RESTARTS = 5;

function vendorRoot(app) {
  return app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), 'vendor');
}

function nodePath(app) {
  return path.join(vendorRoot(app), 'node', 'node.exe');
}

function hostBinPath(app) {
  return path.join(vendorRoot(app), 'host', HOST_BIN);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Returns true when something accepts TCP connections on the port. */
function probe(port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function findFreePort(start = 3080, attempts = 10) {
  return new Promise(async (resolve, reject) => {
    for (let port = start; port < start + attempts; port += 1) {
      if (!(await probe(port, 200))) return resolve(port);
    }
    reject(new Error(`no free port in ${start}..${start + attempts - 1}`));
  });
}

class LocalHost {
  /**
   * @param {object} options
   * @param {import('electron').App} options.app
   * @param {number} [options.port] fixed port; 0 picks a free one
   * @param {(state: string, detail?: string) => void} [options.onState]
   */
  constructor({ app, port = 0, onState = () => {} }) {
    this.app = app;
    this.requestedPort = port;
    this.port = 0;
    this.onState = onState;
    this.child = null;
    this.token = null;
    this.logFile = path.join(app.getPath('userData'), 'host.log');
    this.stopping = false;
    this.restarts = 0;
    this.pending = null;
  }

  get origin() {
    return `http://127.0.0.1:${this.port}`;
  }

  /** Token is only needed for the first load; it is exchanged for a cookie. */
  entryUrl() {
    return this.token ? `${this.origin}/?token=${this.token}` : `${this.origin}/`;
  }

  async start() {
    if (this.pending) return this.pending;
    this.pending = this.#startOnce();
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }

  async #startOnce() {
    const nodeExe = nodePath(this.app);
    const bin = hostBinPath(this.app);
    if (!fs.existsSync(nodeExe)) throw new Error(`node runtime missing: ${nodeExe}`);
    if (!fs.existsSync(bin)) throw new Error(`host bundle missing: ${bin}`);

    this.port = this.requestedPort || (await findFreePort());
    fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
    const log = fs.openSync(this.logFile, 'a');
    fs.writeSync(log, `\n--- ${new Date().toISOString()} starting host on ${this.origin} ---\n`);

    this.onState('starting', this.origin);
    this.child = spawn(nodeExe, [bin, 'web', '--host', '127.0.0.1', '--port', String(this.port), '--no-open'], {
      cwd: path.dirname(bin),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const capture = (chunk) => {
      fs.writeSync(log, chunk);
      const match = TOKEN_RE.exec(chunk.toString());
      if (match && !this.token) this.token = match[1];
    };
    this.child.stdout.on('data', capture);
    this.child.stderr.on('data', capture);

    this.child.on('exit', (code, signal) => {
      if (this.stopping) return;
      this.onState('crashed', `exit=${code} signal=${signal}`);
      this.#scheduleRestart();
    });

    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      if (await probe(this.port, 300)) {
        // give the host a moment to print the token line
        for (let i = 0; i < 20 && !this.token; i += 1) await delay(100);
        this.onState('ready', this.origin);
        return { origin: this.origin, token: this.token };
      }
      await delay(400);
    }
    this.stop();
    throw new Error(`host did not become ready within 90s (log: ${this.logFile})`);
  }

  #scheduleRestart() {
    if (this.restarts >= MAX_RESTARTS) {
      this.onState('failed', `gave up after ${MAX_RESTARTS} restarts`);
      return;
    }
    this.restarts += 1;
    const wait = Math.min(30_000, 1000 * 2 ** this.restarts);
    this.onState('restarting', `attempt ${this.restarts} in ${wait}ms`);
    setTimeout(() => {
      if (this.stopping) return;
      this.start()
        .then(() => this.onState('recovered', this.origin))
        .catch((error) => this.onState('failed', error.message));
    }, wait);
  }

  stop() {
    this.stopping = true;
    if (!this.child) return;
    try {
      this.child.kill();
    } catch {
      /* already gone */
    }
    this.child = null;
  }
}

module.exports = { LocalHost, nodePath, hostBinPath };
