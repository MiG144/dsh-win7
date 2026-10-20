# 把 DeepSeek Harness 迁到 Windows 7：可行性与实施方案

> 审计对象：本机安装的 **DeepSeek Harness 0.2.1-rc.2**（`%LOCALAPPDATA%\Programs\DeepSeek Harness`）
> 审计时间：2026-10-20　审计方式：解包 `resources/app.asar`（18,309 个文件）、读取清单与原生模块、真实启动测试
> 结论先行：**没有现成产品；官方不会做 Win7 版；"本地全量移植"不现实，"Win7 当终端 + Host 跑在别处"可以马上做——已在真实 Win7 SP1 x64 虚拟机上端到端验证通过（见 2.3）。**

---

## 一、结论

| 问题 | 答案 |
| --- | --- |
| 现在有能在 Win7 上跑的 DSH 桌面版吗？ | 没有。官方只发 `win-x64`（Win10/11）、macOS，且桌面壳锁定 Electron 44 + Node 24 + Python 3.12，这条技术栈整体不支持 Win7。 |
| 官方会补 Win7 吗？ | 基本不会。Win7 已于 2020-01 结束支持；Electron 23 起、Node 18/20 起、Python 3.9/3.12 起都已放弃 Win7；上游仓库 `engines` 直接写 `node ^22.19 \|\| >=24`。 |
| 自己迁移可行吗？ | **拆成两件事**：<br>① 只把 Win7 当"显示终端"，Host 跑在 Win10/11、Linux 或局域网服务器 → **3–10 人日**，已给出可运行外壳并实测通过；<br>② 让 Win7 本机跑完整 Host → **8–16 人月首版 + 长期分叉维护**，且要砍功能，不建议。 |
| 最快能用的方案 | Win7 装 **Electron 22 外壳（本仓库 `apps/shell/`）→ 连远程 `dsh web` Host**。Chromium 108 实测可完整渲染，且已在 **Win7 SP1 x64 虚拟机**里跑通登录、中文对话、托盘、断连恢复、免 token 重启。 |

---

## 二、为什么现在的 DSH 上不了 Win7

### 2.1 逐组件审计

| 组件 | 实际值（0.2.1-rc.2） | Win7 能力 | 结论 |
| --- | --- | --- | --- |
| 桌面壳 | **Electron 44.7.0** | Electron **23** 起只支持 Win10+；最后一个支持 Win7/8.1 的是 **Electron 22（Chromium 108）**，2023-05 已 EOL | 必须整壳降级，或不用壳 |
| Host 运行时 | 子进程用 Electron 的 Node 模式启动（`ELECTRON_RUN_AS_NODE`），**Node 24.21.0**；另带 `node.exe 24.21.0` 给包管理用 | Node 官方 Tier 1 只到 **Windows 10 / Server 2016+**；Win7 实际能用的最后一版是 **Node 14.21.3** | 整个 Host 要跑在 Node 14/16 上，等于重做兼容层 |
| 仓库编译基线 | 根 `package.json` `engines.node: "^22.19.0 \|\| >=24.0.0"` | — | 源码大量使用 Node 20/22+ 语法与 API，降级不是改个字段 |
| Python 运行时 | **3.12.14** + numpy 2.3.5 / pandas 3.0.1 / Pillow 12 | Python 3.9 起放弃 Win7，3.12 明确放弃 Win8.1 | Office 技能链整套要换 3.8 + 旧版科学栈 |
| 原生模块 | 6 个 `.node`：`sharp 0.35.5`、`koffi`、`node-addon-require-builtin`（**NAPI v9**）、`node-pty`（仅 **conpty**）、`sherpa-onnx` | N-API 9 需 Node 18.17+；ConPTY 需 Win10 1809+，Win7 只能走 winpty——但包里**没有** winpty 后端 | 全部要重编或换实现 |
| 终端 | node-pty + ConPTY | 同上 | Win7 上没有终端能力 |
| 安装器/更新 | electron-builder 26 + NSIS + electron-updater，`dshMandatoryUpdatePolicy` 指向 `harness.deepseek.com` | NSIS 本身可跑（需 SHA-2 补丁）；但 44 的更新链、强制更新策略在 Win7 无意义 | 分叉必须关掉强制更新与遥测 |
| 前端 | `dsh-web-frontend/dist`（Vite 产物）+ 运行时按需加载的 `/plugins/*/client.js` | Chromium 108 **实测可渲染**，但运行时 bundle 用到 108 没有的 API | 见 2.2，可 patch |

### 2.2 实测：Chromium 108 到底缺什么

用 Electron 22.3.27（Chromium 108）直接加载 0.2.1-rc.2 的 Web UI（本地起了一个 `dsh web --port 4660` 做被测 Host）：

未打补丁时控制台：

```
Uncaught TypeError: Promise.withResolvers is not a function
Uncaught (in promise) TypeError: AbortSignal.any is not a function
[connection] connection lost, retry #1 ... #4
```

页面能画出侧边栏和输入框，但**永远停在"重新连接中"**——连接层初始化就抛异常了。

补上 polyfill 后：

```
（无 Uncaught 异常）
页面正常连上 Host，弹出"开始使用 / 登录 DeepSeek 账号，或添加 API Key"
```

对应截图：`docs/assets/chromium108-without-polyfill.png`（失败）、
`docs/assets/chromium108-with-polyfill.png`（成功）。
这说明 **GUI 层不是障碍，连接层缺的几个新 API 才是**。

静态扫描 `dist` 得到的 CSS 降级项（不影响功能）：

| 特性 | 用量 | Chromium 支持起点 | 108 上的表现 |
| --- | --- | --- | --- |
| `color-mix()` | 10 处（标签底色着色） | 111 | 声明失效 → 标签底色变透明，文字色仍在 |
| `@starting-style` | 1 处（浮层入场） | 117 | 无入场动画 |
| CSS anchor positioning（`anchor-name`/`anchor(`） | 1–2 处（菜单定位） | 125 | 个别弹出菜单可能错位 |
| `cqw` / `:has()` / `dvh` / `backdrop-filter` | 少量 | 105–108 | 正常 |

JS 侧在 `dist` 里没有 `Object.groupBy`/`toSorted`/`fromAsync` 之类，但**运行时插件 bundle 里有**（`Promise.withResolvers`、`AbortSignal.any` 就是它们引入的）。这类 API 只能靠运行时 polyfill 兜，不能靠扫描 dist 预判。

### 2.3 Win7 SP1 x64 实机验证（2026-10-20，已通过）

环境：VirtualBox 7.2.20 虚拟机；Windows 7 SP1 Ultimate x64 英文版（2018-08 刷新 ISO，
SHA-1 `7cc76b00…293d`、SHA-256 `dec04cbd…1389` 与微软官方文件清单核对一致）；
4 GB / 2 核 / 1024×768；**未安装 Guest Additions**，显卡走软件渲染。

链路：`Win7 → VirtualBox NAT 10.0.2.2:3080 → 宿主 127.0.0.1:3080`，
Host 启动参数 `dsh web --host 127.0.0.1 --port 3080 --trusted-host 10.0.2.2:3080`（**未改动防火墙**）。

| 验证项 | 结果 |
| --- | --- |
| 外壳启动 | ✅ Electron 22.3.27 直接启动，无缺 DLL / 0xc000007b |
| 界面渲染 | ✅ 布局、图标、中文字体正常，1024×768 下无错位 |
| 鉴权 | ✅ 首次 `?token=` 换 cookie 成功 |
| 免登录重启 | ✅ 配置移除 token 后重启，直接进入界面（cookie 30 天有效） |
| 对话 | ✅ 中文输入（小狼毫 0.14.3）、流式输出、约 180 tok/s |
| 托盘 | ✅ 关窗进托盘，单击托盘图标唤回 |
| 断连恢复 | ✅ 停 Host → 界面显示「重连中」→ 重启 Host 后自动恢复 |

截图：`docs/assets/win7-dsh-running.png`、`apps/shell-error-page.png`、`apps/shell-connected.png`。

两个实际踩到的坑（已写进 `apps/shell/README.md`）：

1. **配置优先级**：外壳先读 `resources\shell.config.json`，再读 exe 同级目录。打包模板放在
   `resources` 里，会盖掉 exe 同级的新配置——改配置要改 `resources` 下那一份。
2. **英文版 Win7 缺中文输入与字体**：需手动装 `msyh/simsun` 字体；输入法用**小狼毫 0.14.3**
   （0.17.x 起只支持 Win8.1+）。

未验证：Guest Additions（Win7 驱动签名）、更高分辨率、麦克风、长时间稳定性，
以及 Host 侧文件/终端工具在 Win7 客户端上的完整交互。

### 2.4 单机本地运行（Phase 0，已通过）

2026-10-20 完成：**同一台 Win7 上直接跑 DSH Host**，不再需要第二台机器。

| 层 | 实现 |
| --- | --- |
| 运行时 | Node.js **22.23.3**，社区 Win7 构建（[DeftKing/nodejs-win7](https://github.com/DeftKing/nodejs-win7)） |
| Host | 官方桌面版 `app.asar` 中的 `dsh` 树（17,262 文件 / 406 MB），**零源码改动** |
| 外壳 | 本项目 Electron 22.3.27 |
| 通信 | `127.0.0.1:3080` 同机回环 |

结果：`node bin.js web --host 127.0.0.1 --port 3080` 启动成功，外壳进入界面，
原生模块无 ABI/缺 DLL 报错。IE11 访问白屏（预期：前端只支持现代 Chromium），
因此验证必须走 Electron 外壳。

这一步推翻了 §3 中"方案 A 必须依赖另一台 Host"的前提：**Win7 单机即可**，
代价只是 Node 用社区构建、终端/Office 等功能后置。详见 [PHASE0.md](PHASE0.md)。

---

## 三、三条路线对比

| | A. Win7 当终端（推荐） | B. 全量本地移植 | C. 虚拟机 / 远程桌面 |
| --- | --- | --- | --- |
| 架构 | Host 跑 Win10/11、Linux、NAS 或云主机；Win7 只跑 Electron 22 壳或浏览器 | 把整个 monorepo 降到 Electron 22 + Node 14/16 + Python 3.8 | Win7 里跑 Win10 LTSC 虚拟机 / 连一台 Win10 远程桌面 |
| 首版工作量 | **3–10 人日** | **8–16 人月** | 0.5–2 人日 |
| 后续维护 | 只维护壳（几乎不变） | 上游每周多次提交，永久 rebase；每个版本都要重打补丁 | 无（但系统要维护） |
| Win7 本机算力 | 不用；文件操作发生在 Host 侧 | 用本机 | 用虚拟机/远端 |
| 访问本机文件 | 只能访问 Host 机器上的文件（可用共享目录/SMB 折中） | 可以 | 可以（在虚拟机里） |
| 断网可用 | 需要能连到 Host（局域网/隧道） | 可以 | 可以 |
| 风险 | 网络与鉴权配置；Host 暴露面 | 原生模块、ConPTY、Python、强制更新、签名，处处是坑 | 硬件虚拟化（VT-x）、内存 ≥8G、Vmware/VirtualBox 对 Win7 宿主也已停更 |

**建议**：先用 A 把"Win7 上能用"落地；确有离线/本机文件硬需求，再评估 C（虚拟机里跑官方安装包，零改动）；B 只在"必须 Win7 原生、必须本机执行、且能长期养一个分叉"时才考虑。

---

## 四、路线 A：落地手册

### 4.1 架构

```
┌────────────────────────┐        HTTP + WebSocket        ┌──────────────────────────┐
│ Win7 SP1 x64           │  ───────────────────────────▶  │ Host（Win10/11 或 Linux） │
│ Electron 22 壳          │   ?token= → 签名 Cookie         │ dsh web --host 0.0.0.0    │
│ (Chromium 108 + polyfill)│                               │ Node 24 / Python 3.12     │
└────────────────────────┘                                └──────────────────────────┘
```

要点：

- DSH 的 Web 端鉴权是"**一次性 token 换签名 cookie**"：`dsh web` 启动时打印
  `http://<host>:<port>/?token=xxxx`，浏览器 `GET /?token=` 通过后写入
  HttpOnly + SameSite=Strict 的签名 cookie（默认 30 天，绑定 host+port），
  之后访问干净 URL 即可。所以 Win7 端**不需要改鉴权代码**，把带 token 的地址交给壳就行。
- Host 默认只绑 `127.0.0.1`。要让 Win7 访问，需要改 `host`（如局域网 IP），
  并把客户端来源加进 `trustedHosts`；Host 本身**没有全局鉴权中间件**，
  暴露到局域网前务必配合防火墙/反代/VPN（见 4.6）。

### 4.2 Host 侧

```bash
# 在 Win10/11 或 Linux 上（配置文件方式更适合长期运行）
dsh web --host 192.168.1.20 --port 3080
# 首次启动会打印带 token 的 URL，复制给 Win7 端
```

- 端口固定后，把 `?token=` 里的 token 交给 Win7 端做首次换取；cookie 生效后
  可以把配置里的 token 清空。
- 需要跨公网时，**不要**直接把 3080 暴露到公网：用 WireGuard/Tailscale/SSH 隧道，
  或前置 Nginx/Caddy 做 TLS + Basic Auth（DSH 自身 TLS 只负责加密，不做客户端认证）。
- 文件类工具（读写、终端、Office）执行在 Host 机器上，Win7 端看到的是 Host 的文件系统。
  需要 Win7 本地文件时，把对应目录做成 SMB 共享挂到 Host，或在 Host 上开工作区。

### 4.3 Win7 侧壳（本仓库已实现）

`apps/shell/` 是一个完整的 Electron 22 工程，已验证：

- Electron 22.3.27 能在 Win11 上加载并渲染 0.2.1 的 Web UI（截图见 `smoke-2.png`）；
- `npm run dist:dir` 能产出 win32-x64 目录包（见 `apps/shell/dist/`）。

它做的事（都是"浏览器标签页给不了"的）：

| 能力 | 实现 |
| --- | --- |
| 首次 token 换 cookie | 配置 `url` + `token`，首次加载自动拼 `?token=` |
| 托盘常驻 / 单实例 / 窗口记忆 | 见 `src/main.js` |
| 外链走系统浏览器、站内导航留窗口 | `setWindowOpenHandler` + `will-navigate` |
| Host 不可达时给重试页而不是白屏 | `did-fail-load` → 内置错误页 |
| Chromium 108 兼容 | `src/preload.js` 注入 polyfill（见 4.4） |
| 麦克风权限只给配置的 Host | `setPermissionRequestHandler` |
| 老显卡/虚拟机 | 配置 `gpu: "software"` |

已验证产物：`apps/shell/dist/portable/`（220 MB，Electron 22 运行时 + `resources/app`），
打包形态下 `--smoke` 实测 **exit 0、控制台零错误**，能正常连上 Host。

> 构建注意：`npm run dist`（electron-builder + NSIS）在**本机**失败于 `winCodeSign` 解包时
> 无法创建符号链接（需要管理员权限或开启 Windows"开发者模式"）。这是构建机限制，
> 与 Win7 无关；没有该权限时可用 `scripts/make-portable.ps1` 生成绿色包
> （Electron 运行时 + `resources/app`，免安装、可直接拷贝）。

配置（`shell.config.json`，放在 exe 同级或 `resources/`）：

```json
{
  "url": "http://192.168.1.20:3080/",
  "token": "首次换取 cookie 用，之后可留空",
  "closeToTray": true,
  "gpu": "auto",
  "zoom": 1
}
```

打包：

```powershell
npm install
npm run dist         # NSIS 安装包 + portable.exe（win32-x64）
```

### 4.4 Chromium 108 polyfill 清单

`src/preload.js` 在页面脚本之前用 `webFrame.executeJavaScript` 注入，全部特性检测、新浏览器上是空操作：

| API | 原生支持起点 | 用途 |
| --- | --- | --- |
| `Promise.withResolvers` | Chromium 119 | **实测必需**，连接层直接崩 |
| `AbortSignal.any` | Chromium 116 | **实测必需**，取消传播 |
| `Promise.try` | Chromium 128 | 预防 |
| `Array.prototype.toSorted / toReversed / toSpliced / with` | 110 | 预防 |
| `Array.fromAsync` | 121 | 预防 |
| `Object.groupBy` / `Map.groupBy` | 117 | 预防 |
| `Set.prototype.union / intersection / difference / symmetricDifference / isSubsetOf …` | 122 | 预防 |
| `String.prototype.isWellFormed / toWellFormed` | 111 | 预防 |
| `RegExp.escape` | 136 | 预防 |
| `Iterator.from` + 常用 helper | 122 | 预防 |

如果不用 Electron 而用 Chrome 109 `--app=` 模式，这套 polyfill 需要改成：
反代注入 `<script>`、或做一个启动页先执行 polyfill 再 `import()` 主 bundle、或装一个扩展。
**Electron 壳是更省事的选择**（preload 天然在 document-start）。

CSS 兜底（可选，影响观感不影响功能）：

```css
/* color-mix 降级：给标签底色一个等价实色 */
@supports not (color: color-mix(in srgb, red, blue)) {
  [data-tone="success"] { background: rgba(34, 197, 94, .1); }
  [data-tone="info"]    { background: rgba(77, 107, 254, .1); }
  [data-tone="warning"] { background: rgba(245, 158, 11, .12); }
  [data-tone="danger"]  { background: rgba(239, 68, 68, .1); }
}
```

菜单定位若错位，把用 `anchor-name` 的那处菜单改成 `position: fixed` + JS 取 rect（只影响 1 个组件）。

### 4.5 验收清单

- [ ] Win7 SP1 x64 干净机装完第六节的补丁后，安装包能装、能启动
- [ ] 首次用带 token 的地址能进 UI，重启后免登录（cookie 30 天）
- [ ] 新建会话、发消息、流式输出正常
- [ ] 侧边栏文件浏览、Markdown/代码高亮、图片预览正常
- [ ] 断网 → 出现"无法连接"重试页；恢复后点重试能回来
- [ ] 托盘：关闭窗口进托盘、单击唤回、右键退出
- [ ] 1080p 下不糊（`zoom` 1.0，必要时 1.1）
- [ ] 连续跑 8 小时不崩（Win7 老机器重点看内存）

### 4.6 安全注意

- token 只用于首次换 cookie；**不要把带 token 的 URL 发到群里/工单里**。cookie 泄露 = 完整 Host 权限。
- Host 暴露到局域网时，DSH 只做 Host/Origin 校验、不做用户体系；非信任网络必须加隧道或反代鉴权。
- Win7 上的 Chromium 108 不再有安全更新；这个壳只应加载你自己的 Host，不要当通用浏览器用。
- 分叉/内部分发注意商标：仓库是 MIT，但 "DeepSeek Harness" 品牌与官方服务不在许可范围内，内部使用建议换名换图标。

---

## 五、路线 B：如果一定要在 Win7 本机跑 Host

### 5.1 工程量拆解

| 里程碑 | 内容 | 难点/风险 | 估时 |
| --- | --- | --- | --- |
| M0 基线 | fork 仓库、锁定 tag、先让官方代码在本机可构建 | 22k commits、pnpm workspace、生成代码多 | 3–5 天 |
| M1 编译降级 | tsdown/tsc target 降到 `node16`/ES2021；清掉 `using`、`import.meta.dirname`、`fs.glob`、`node:sqlite`、全局 `WebSocket`、`Promise.withResolvers` 等 | 类型层与运行时层都要改；`--expose-internals` + `node-addon-require-builtin` 依赖 Node 内部模块，跨大版本极不稳定 | 3–6 周 |
| M2 壳移植 | Electron 44 → 22：`WebContentsView`→`BrowserView`、`protocol.handle`→`registerFileProtocol`、`net.fetch`→`net.request`、`titleBarOverlay`/`backgroundMaterial` 降级、`Promise.withResolvers` 补 | 壳代码 500KB，API 面不小；`dsh-app://` 自定义协议要重写 | 2–4 周 |
| M3 运行时 | 打包 Node 14.21.3 作为 Host 进程；保证 Host 在该 Node 上启动 | Node 14 没有全局 `fetch`/`structuredClone`/`AbortSignal.timeout`，要么 polyfill（undici），要么改代码 | 2–4 周 |
| M4 原生模块 | `node-pty` 换 winpty 后端；`sharp`/`koffi`/`sherpa-onnx` 重编到 Electron 22 ABI；`node-addon-require-builtin`（NAPI v9）重写或去掉 | Win7 上编译工具链（VS2019 + Win7 SDK）本身就难配 | 2–4 周 |
| M5 Python | 3.12 → 3.8；numpy 1.24 / pandas 1.3 / openpyxl 3.0 / Pillow 9；LibreOffice kit 降版本 | pandas 3 的 API 在 1.x 不存在，Office 技能要回归测试 | 2–3 周 |
| M6 安装/更新/合规 | NSIS 打包、SHA-2 签名、关掉 electron-updater 与强制更新策略、关遥测、改品牌 | 强制更新策略在壳里是硬编码的，必须摘 | 1 周 |
| M7 长期 | 每版上游 rebase、回归 | 上游 nightly，几乎每周破一次 | 1–2 人常驻 |

**首版 8–16 人月，之后永久分叉。** 这还是"功能不砍"的估计；实际大概率要砍掉：内置浏览器、语音输入（sherpa-onnx）、Office 技能、终端、自动更新、账号体系。

### 5.2 更现实的本机子集

如果目标只是"Win7 上有个本地 AI 编码代理"，不要移植桌面版，做减法：

- 只跑 `dsh --profile headless "..."`（CLI，无 Web/无 Electron），Node 14 + 一个极简 TUI/批处理壳；
- 砍掉 Electron 壳、Office、语音、终端、内置浏览器；
- 这样仍要过 M1（编译降级）和 M3（Node 14 运行时），但省掉 M2/M4/M5 的大半。

---

## 六、Win7 环境基线

### 6.1 必备补丁

| 补丁 | 作用 | 不装的后果 |
| --- | --- | --- |
| **KB2533623** | `SetDefaultDllDirectories` | Electron/Chromium 直接起不来（0xc0000135/0xc000007b） |
| **KB4474419 + KB4490628** | SHA-2 代码签名 | 安装包/驱动签名校验失败，SmartScreen 直接拦 |
| **KB3140245** + 注册表 `DefaultSecureProtocols=0xA00` | 启用 TLS 1.2 | 登录 DeepSeek、检查更新全部握手失败 |
| **KB2999226**（UCRT） | Universal C Runtime | 缺 `api-ms-win-crt-*` 报错 |
| KB3063858 / KB4019990 等 | 部分精简版缺的转发 DLL | 视镜像而定 |

建议直接用集成补丁的 Win7 SP1 x64 镜像，或先装离线补丁包（如 Simplix UpdatePack）。
装完 `winver` 确认 SP1，`Get-HotFix` 确认上述 KB 都在。

### 6.2 运行时注意

- **必须是 x64**：DSH 的原生模块与 Host 只有 x64，ia32 无解。
- **字体**：Win7 没有 `Segoe UI Emoji` 彩色字体（COLR/CPAL 要 Win8.1+），UI 里的 emoji 图标会变单色或方块。兜底：把图标换成 SVG，或在壳里注入 `@font-face` 用 Noto Emoji 的**单色**字重。
- **GPU**：老显卡/虚拟机用 `gpu: "software"`（`app.disableHardwareAcceleration()`）；花屏时再加 `--disable-gpu-compositing`。
- **DPI**：Win7 的 125%/150% 缩放会让 Chromium 文字发虚，壳里 `zoom: 1` + 系统 100% 最稳。
- **IE 代理**：Win7 控制面板里的代理设置会传给 Chromium，Host 在内网时注意别被系统代理劫持。

### 6.3 不能指望的能力

- 自动更新（electron-updater 在 22 上还能跑，但官方 feed 只发 Win10 包，且会触发强制更新）；
- 系统级 Toast 通知（用托盘气泡替代）；
- Windows 10 的窗口材质/圆角/标题栏覆盖（Electron 22 也没有 `WebContentsView`）。

---

## 七、建议的推进顺序

1. **第 1 周**：选一台 Win10/11 或 Linux 当 Host，`dsh web --host <LAN IP>`；
   用本仓库 `apps/shell` 在一台 Win7 SP1 x64 上跑通"打开 → 登录 → 对话"。
2. **第 2 周**：补 4.6 的安全边界（隧道/反代/防火墙），做 4.5 验收清单。
3. **第 3 周**：打包 NSIS + portable，做内部分发；把 `shell.config.json` 的 token 流程做成首次启动向导。
4. 只有验收发现"必须访问 Win7 本机文件/必须离线"时，再评估虚拟机方案（C）；
   B 路线留到有专职人力再谈。

---

## 八、参考

- Electron 停止支持 Win7/8/8.1（Electron 22 为最后一版）：<https://electronjs.org/blog/windows-7-to-8-1-deprecation-notice>
- Node.js 支持平台（Windows 仅 Tier 1 ≥ Win10/Server 2016）：<https://github.com/nodejs/node/blob/main/BUILDING.md>
- N-API 版本矩阵（v9 需 Node 18.17+/20.3+）：<https://nodejs.org/api/n-api.html>
- Python 3.12 放弃 Windows 8.1：<https://github.com/python/cpython/issues/98383>
- Chrome 109 为 Win7/8.1 最后一版：<https://support.google.com/chrome/thread/185534985>
- DSH 仓库（MIT，含 `apps/desktop` 与 `packages/host/webserver` 文档）：<https://github.com/deepseek-ai/deepseek-harness>

---

## 附录：本次审计怎么复现

```powershell
# 1) 解 asar 头，列文件/原生模块
node audit/asar-list.js
# 2) 抓壳入口与运行时清单
node audit/extract.js
# 3) 静态扫前端 CSS/JS 的新特性
node audit/scan-fe.js
# 4) 实测：起一个被测 Host（会打印 token）
$env:ELECTRON_RUN_AS_NODE='1'; $env:DSH_HOME='<tmp>\dsh-home-test'
& 'C:\...\DeepSeek Harness.exe' --expose-internals 'C:\...\app.asar\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js' web --port 4660
# 5) 用 Electron 22 壳跑 smoke（截图 + 控制台错误）
cd apps/shell; npm start -- --smoke=smoke.png
```
