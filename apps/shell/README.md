# Harness7 · 外壳

Electron **22.3.27**（Chromium 108 / Node 16.17）外壳，把 DSH 的 Web UI 装进一个
Windows 7 SP1 x64 能跑的原生窗口。Electron 23 起不再支持 Win7，22 是终点。

> 背景与实测记录见 [../../docs/PHASE0.md](../../docs/PHASE0.md)；
> Win7 实测结果见 [../../docs/FEASIBILITY.md](../../docs/FEASIBILITY.md)；
> 兼容性细节见 [../../docs/COMPATIBILITY.md](../../docs/COMPATIBILITY.md)。

## 能力

| 能力 | 说明 |
| --- | --- |
| 加载 Host | 读取 `shell.config.json`（或 `--url=` / `DSH_WIN7_URL`），打开 Web UI |
| 首次鉴权 | Host 用 `GET /?token=...` 换 HttpOnly 签名 cookie；token 填一次即可 |
| 托盘常驻 | 关窗进托盘（`closeToTray: false` 改为直接退出） |
| 单实例 | 第二次启动唤起已有窗口 |
| 窗口记忆 | 位置/尺寸存 `userData/window-state.json` |
| 外链外开 | `http(s)` 新窗口交给系统浏览器；站内导航留在原窗口 |
| 断连兜底 | `did-fail-load` 显示重试页，不白屏 |
| 自检 | `--smoke` 加载、截图、输出控制台错误 |

## 运行

```powershell
npm ci
# 1) 另开一个窗口启动 Host
dsh web --host 127.0.0.1 --port 3080 --no-open
# 2) 写配置（见 shell.config.example.json），然后
npm start
```

## 配置

查找顺序：`--url=` 参数 → `DSH_WIN7_URL` → `resources\shell.config.json` →
exe 同级目录 → 应用目录 → `userData`。

```json
{
  "url": "http://127.0.0.1:3080/",
  "token": "首次换 cookie 用，之后可留空",
  "closeToTray": true,
  "gpu": "software",
  "zoom": 1
}
```

> 打包后的模板在 `resources\shell.config.json`，**优先级高于 exe 同级那份**。

## 打包

```powershell
npm run dist      # NSIS 安装包 + portable，输出 dist/
npm run dist:dir  # 只解包
```

构建机需要符号链接权限（管理员或"开发者模式"）；没有时用
[`scripts/make-portable.ps1`](../../scripts/make-portable.ps1) 出绿色包。

## 兼容红线

- 主进程只能用 Electron 22 的 API（没有 `WebContentsView`、`protocol.handle`）。
- 渲染进程必须能在 Chromium 108 上跑；新 API 加到 `src/preload.js` 的 polyfill。
