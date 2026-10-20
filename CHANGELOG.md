# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.2.1] - 2026-10-20

更名与品牌清理，避免与上游商标混淆。

### Changed
- 产品更名为 **Harness7**（原 DSH Win7）：安装包名、开始菜单、窗口标题、托盘提示同步更新
- 应用 / 托盘 / 安装器图标改为自绘图形，不再包含上游标识美术作品
- `appId` 改为 `io.github.dshwin7.harness7`（与旧版并存安装，不会覆盖旧版本）
- 新增 [TRADEMARKS.md](TRADEMARKS.md)：名称使用原则与同类项目的通行做法
- NOTICE 中的商标章节改写为简短说明，并注明图标为自绘
## [0.2.0] - 2026-10-20

单机自包含版本：外壳自带 Node 22 运行时与 DSH Host，不再需要外部 Host。

### Added
- `src/host.js`：外壳主进程内置 Host 管理——启动、等待端口、抓取 token、崩溃按指数退避重启、退出回收
- 本地模式配置 `url: "auto"`：自动选择空闲端口并加载本机 Host
- 启动占位页，以及 Host 日志（`%APPDATA%\dsh-win7-shell\host.log`）
- `scripts/prepare-vendor.ps1`、`scripts/extract-host.js`：准备 `vendor\{node,host}`
- electron-builder 配置改为 JS：`vendor` 存在时才把运行时打进安装包
- Release 工作流：自动安装官方 Host、下载 Node 22 Win7 构建，产出单机安装包与便携版

### Verified
- **Phase 0**：Node 22.23.3 + 官方 DSH Host 在 Win7 SP1 x64 **本机**运行，
  外壳连 `127.0.0.1:3080` 正常进入界面，零源码改动。详见 `docs/PHASE0.md`
- **Phase 1**：自包含便携包在 Win7 单机启动成功，单个 exe 拉起 Host 并加载界面。详见 `docs/PHASE1.md`

## [0.1.0] - 2026-10-20

首个可用版本：**只有外壳**，需要外部 Host。

### Added
- Electron 22.3.27（Chromium 108）外壳，可在 Windows 7 SP1 x64 上运行
- Chromium 108 polyfill 层（`Promise.withResolvers`、`AbortSignal.any` 等）
- 托盘常驻、单实例、窗口位置记忆、外链走系统浏览器
- Host 不可达时的重试页
- `--smoke` 自检模式：加载页面、截图、输出控制台错误
- 绿色包脚本 `scripts/make-portable.ps1`
- CI：PR 构建校验；Release：打标签自动出 NSIS 安装包与 portable

### Verified
- 真实 Win7 SP1 x64（VirtualBox）上完成：登录、中文输入与对话、流式输出、
  托盘、断连自动恢复、去掉 token 后免登录重启
