# 更新日志

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Verified
- **Phase 0 通过**：Node 22.23.3（社区 Win7 构建）+ 官方 DSH Host 在 Win7 SP1 x64
  **本机**运行，外壳连 `127.0.0.1:3080` 正常进入界面，零源码改动。详见 `docs/PHASE0.md`。

### Planned
- 启动器：拉起 Host、等待端口、统一退出、崩溃重启
- 单机安装包：内置 Node 22 + DSH Host
- 首次启动模型配置向导

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
