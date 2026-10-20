'use strict';

/**
 * DSH Win7 Shell — a deliberately small Electron 22 (Chromium 108) desktop shell
 * that puts a DeepSeek Harness Web Host into a native window on Windows 7 SP1 x64.
 *
 * It owns no Harness logic: it loads one HTTP(S) origin, keeps the browser
 * session (the Host's `?token=` exchange writes a signed cookie), and adds the
 * desktop furniture a browser tab cannot give you (tray, single instance,
 * window-state memory, external-link routing, unreachable-Host recovery page).
 */

const { app, BrowserWindow, Menu, Tray, dialog, nativeImage, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const APP_NAME = 'DeepSeek Harness';
const DEFAULT_BACKGROUND = '#0f1115';
const SMOKE = process.argv.includes('--smoke') || process.argv.some((arg) => arg.startsWith('--smoke='));
const SMOKE_ARG = process.argv.find((arg) => arg.startsWith('--smoke='));
const SMOKE_OUT = SMOKE_ARG ? SMOKE_ARG.slice('--smoke='.length) : null;

function trace(message) {
  if (!SMOKE) return;
  try {
    fs.appendFileSync(path.join(process.cwd(), 'shell-trace.log'), `${new Date().toISOString()} ${message}\n`);
  } catch {
    /* ignore */
  }
}

/** @type {{url: string, token?: string, closeToTray: boolean, gpu: 'auto'|'software', zoom: number}} */
let config = {
  url: 'http://127.0.0.1:3000/',
  closeToTray: true,
  gpu: 'auto',
  zoom: 1,
};

let mainWindow = null;
let tray = null;
let quitting = false;
const consoleLog = [];

function configCandidates() {
  const list = [];
  const fromArg = process.argv.find((arg) => arg.startsWith('--url='));
  if (fromArg) list.push({ kind: 'arg', url: fromArg.slice('--url='.length) });
  if (process.env.DSH_WIN7_URL) list.push({ kind: 'env', url: process.env.DSH_WIN7_URL });
  const dirs = [];
  if (process.resourcesPath) dirs.push(process.resourcesPath);
  dirs.push(path.dirname(app.getPath('exe')));
  dirs.push(app.getAppPath());
  dirs.push(app.getPath('userData'));
  for (const dir of dirs) list.push({ kind: 'file', file: path.join(dir, 'shell.config.json') });
  return list;
}

function loadConfig() {
  for (const candidate of configCandidates()) {
    try {
      if (candidate.url) {
        config.url = candidate.url;
        return;
      }
      if (candidate.file && fs.existsSync(candidate.file)) {
        const parsed = JSON.parse(fs.readFileSync(candidate.file, 'utf8'));
        if (typeof parsed.url !== 'string' || parsed.url.length === 0) continue;
        config = { ...config, ...parsed };
        return;
      }
    } catch (error) {
      console.error('shell.config.json ignored:', error.message);
    }
  }
}

function withToken(rawUrl) {
  const url = new URL(rawUrl);
  if (!url.pathname || url.pathname === '') url.pathname = '/';
  if (config.token && !url.searchParams.has('token')) url.searchParams.set('token', config.token);
  return url.toString();
}

function readWindowState() {
  try {
    const file = path.join(app.getPath('userData'), 'window-state.json');
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Number.isFinite(state.width) && Number.isFinite(state.height)) return state;
  } catch {
    /* first run */
  }
  return { width: 1280, height: 820 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized() || mainWindow.isMaximized() || mainWindow.isFullScreen()) return;
  try {
    const file = path.join(app.getPath('userData'), 'window-state.json');
    fs.writeFileSync(file, JSON.stringify(mainWindow.getBounds()));
  } catch {
    /* ignore */
  }
}

function errorPage(url, reason) {
  const html = `<!doctype html><meta charset="utf-8"><style>
  html,body{height:100%;margin:0;background:${DEFAULT_BACKGROUND};color:#e5e7eb;
    font:14px/1.6 "Microsoft YaHei",system-ui,sans-serif;display:flex;align-items:center;justify-content:center}
  main{max-width:560px;padding:32px}
  h1{font-size:18px;margin:0 0 12px}
  code{background:#1f2937;padding:2px 6px;border-radius:4px;word-break:break-all}
  p{color:#9ca3af}
  button{margin-top:18px;padding:8px 18px;border:0;border-radius:6px;background:#4d6bfe;color:#fff;cursor:pointer;font-size:14px}
  </style><main><h1>无法连接 DeepSeek Harness Host</h1>
  <p>目标地址：<code>${url}</code></p>
  <p>${reason}</p>
  <p>请确认 Host 已启动、端口可达、隧道已连通，或 <code>shell.config.json</code> 中的地址与 token 正确。</p>
  <button onclick="location.href='${url}'">重试</button></main>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

function buildMenu() {
  const template = [
    {
      label: '应用',
      submenu: [
        { label: '重新载入', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.reload() },
        { type: 'separator' },
        { label: '退出', accelerator: 'Alt+F4', click: () => { quitting = true; app.quit(); } },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.setZoomFactor(1) },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', click: () => stepZoom(0.1) },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => stepZoom(-0.1) },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', click: () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()) },
        { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '复制当前地址', click: () => require('electron').clipboard.writeText(mainWindow?.webContents.getURL() ?? '') },
        { label: `关于 ${APP_NAME}`, click: () => showAbout() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function stepZoom(delta) {
  if (!mainWindow) return;
  const next = Math.min(2.5, Math.max(0.5, Number((mainWindow.webContents.getZoomFactor() + delta).toFixed(2))));
  mainWindow.webContents.setZoomFactor(next);
}

function showAbout() {
  dialog.showMessageBox(mainWindow ?? undefined, {
    type: 'info',
    title: `关于 ${APP_NAME}`,
    message: `${APP_NAME}（Windows 7 兼容外壳）`,
    detail: [
      `外壳版本：${app.getVersion()}`,
      `Electron：${process.versions.electron} / Chromium：${process.versions.chrome}`,
      `Host：${config.url}`,
      '',
      '外壳只承载 Web UI，不包含 Harness 运行时。',
    ].join('\n'),
    buttons: ['好'],
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip(APP_NAME);
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) mainWindow.hide();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `打开 ${APP_NAME}`, click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: '重新载入', click: () => mainWindow?.webContents.reload() },
    { type: 'separator' },
    { label: '退出', click: () => { quitting = true; app.quit(); } },
  ]));
}

function createWindow() {
  const state = readWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: Number.isFinite(state.x) ? state.x : undefined,
    y: Number.isFinite(state.y) ? state.y : undefined,
    minWidth: 520,
    minHeight: 600,
    show: false,
    backgroundColor: DEFAULT_BACKGROUND,
    title: APP_NAME,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
    },
  });

  const target = withToken(config.url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (config.zoom && config.zoom !== 1) mainWindow.webContents.setZoomFactor(config.zoom);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    consoleLog.push({ level, message, line, sourceId });
    if (consoleLog.length > 200) consoleLog.shift();
    if (level >= 2) console.log(`[renderer:${level}] ${message}`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (!isMainFrame) return;
    console.error('did-fail-load', code, description, url);
    mainWindow.loadURL(errorPage(url, `${description}（${code}）`));
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = withToken(config.url);
    const same = new URL(url);
    const base = new URL(allowed);
    if (same.origin !== base.origin) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on('close', (event) => {
    saveWindowState();
    if (!quitting && config.closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  trace('loadURL ' + target);
  mainWindow.loadURL(target);

  if (SMOKE) runSmoke(target);
}

async function runSmoke(target) {
  const result = { target, ok: false, http: null, title: null, error: null, consoleErrors: [], screenshot: null };
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for load')), 45000);
      mainWindow.webContents.once('did-finish-load', () => { clearTimeout(timer); trace('did-finish-load'); resolve(); });
      mainWindow.webContents.once('did-fail-load', (_e, code, desc) => { clearTimeout(timer); reject(new Error(`${desc} (${code})`)); });
    });
    await new Promise((resolve) => setTimeout(resolve, 8000));
    trace('capturing');
    result.title = mainWindow.webContents.getTitle();
    const image = await mainWindow.webContents.capturePage();
    const out = SMOKE_OUT ?? path.join(process.cwd(), 'smoke.png');
    fs.writeFileSync(out, image.toPNG());
    result.screenshot = out;
    result.consoleErrors = consoleLog.filter((entry) => entry.level >= 2).map((entry) => entry.message).slice(0, 24);
    result.ok = true;
  } catch (error) {
    result.error = error.message;
  }
  console.log('SMOKE_RESULT ' + JSON.stringify(result));
  quitting = true;
  app.exit(result.ok ? 0 : 1);
}

function ensureSingleInstance() {
  if (SMOKE) return true;
  const got = app.requestSingleInstanceLock();
  if (!got) {
    app.quit();
    return false;
  }
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  return true;
}

loadConfig();
trace('config ' + JSON.stringify(config));

if (config.gpu === 'software') app.disableHardwareAcceleration();

if (ensureSingleInstance()) {
  app.setAppUserModelId('com.deepseek.dsh.win7shell');
  app.whenReady().then(() => {
    trace('app ready');
    // Microphone permission is granted only to the configured Host origin.
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
      try {
        const origin = new URL(withToken(config.url)).origin;
        callback(permission === 'media' && contents.getURL().startsWith(origin));
      } catch {
        callback(false);
      }
    });
    buildMenu();
    createTray();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
