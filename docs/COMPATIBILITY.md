# Windows 7 兼容性

> 状态：维护中 · 最后更新：2026-10-20

## 系统基线

干净的 Win7 SP1 x64 需要以下补丁，否则 Electron 22 / Chromium 108 起不来：

| 补丁 | 作用 |
| --- | --- |
| KB2533623 | `SetDefaultDllDirectories`，加载 DLL 必需 |
| KB4474419 + KB4490628 | SHA-2 代码签名（装驱动、增强功能必需） |
| KB2999226 | Universal C Runtime（缺则 0xc000007b） |
| KB2670838 | Platform Update（DirectWrite/D2D，Chromium 渲染必需） |
| KB3140245 | TLS 1.2（只有访问系统级 HTTPS 才需要，Chromium 自带 TLS） |

建议直接用集成补丁的镜像（如 Windows 7 SP1 2018-08 刷新版）。
实测用的 ISO：`7601.24214.180801-1700.win7sp1_ldr_escrow_CLIENT_ULTIMATE_x64FRE_en-us.iso`，
SHA-1 `7cc76b0015220de956328fb934d61b710a94293d`。

## 运行时依赖

- **VC++ 2015-2019 x64**（`vc_redist.x64.exe`，14.29.x）——Electron 22 需要 vcruntime140
- **中文字体**（英文版系统）——需自行准备系统中文字体
- **中文输入法**（英文版系统）——需自行安装支持 Win7 的第三方输入法

## 功能矩阵

| 功能 | 状态 | 说明 |
| --- | --- | --- |
| 外壳启动 | ✅ 已验证 | Electron 22.3.27 |
| Web UI 渲染 | ✅ 已验证 | 1024×768 布局正常 |
| token → cookie 鉴权 | ✅ 已验证 | |
| 免 token 重启 | ✅ 已验证 | cookie 30 天 |
| 中文输入 / 显示 | ✅ 已验证 | 需自行装字体与输入法 |
| 流式对话 | ✅ 已验证 | 约 180 tok/s（Host 侧） |
| 托盘 | ✅ 已验证 | 关窗进托盘、单击唤回 |
| 断连自动恢复 | ✅ 已验证 | Host 重启后自动重连 |
| 终端 | ❌ 不可用 | 实测 `pty.spawn` 报 `Cannot launch conpty` |
| Office 技能 | ❌ 未支持 | 需 Python 3.8 降级运行时 |
| 语音输入 | ❌ 不可用 | `sherpa-onnx-win-x64` 加载报「找不到指定的程序」 |
| 图片附件 | ✅ 可用 | `sharp` 加载与图像编码均通过 |
| 自动更新 | ❌ 不做 | 无签名、无稳定 feed |

## Chromium 108 的差异

已用 polyfill 补齐（`apps/shell/src/preload.js`），新浏览器上是空操作：

`Promise.withResolvers`、`AbortSignal.any`、`Promise.try`、`Array.fromAsync`、
`toSorted/toReversed/toSpliced/with`、`Object.groupBy`/`Map.groupBy`、
`Set` 集合方法、`isWellFormed/toWellFormed`、`RegExp.escape`、`Iterator.from`。

CSS 降级（不影响功能，仅观感）：

| 特性 | 用量 | 表现 |
| --- | --- | --- |
| `color-mix()` | 10 处 | 标签底色变透明，文字色正常 |
| `@starting-style` | 1 处 | 无入场动画 |
| CSS anchor positioning | 1–2 处 | 个别菜单可能错位 |

## 已知问题

1. **Guest Additions 装不上**（VirtualBox 场景）：Win7 缺 SHA-2 补丁时会拒绝驱动签名。
   装 KB4474419 + KB4490628，或改用 6.1.50 版增强功能。
2. **英文版系统方块字**：装中文字体或在 DSH 里切英文界面。
3. **增强功能未装时分辨率上限 1024×768**：够用；需要更高分辨率可设自定义 VESA 模式。
4. **SmartScreen 拦截**：未签名安装包，选"仍要运行"，并核对 SHA256。
