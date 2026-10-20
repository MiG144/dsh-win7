# 贡献指南

## 开发环境

- Windows 10/11（构建用；产物跑在 Win7）
- Node.js 22 或 24
- npm 10+

```powershell
git clone https://github.com/MiG144/dsh-win7.git
cd dsh-win7\apps\shell
npm ci
npm start
```

外壳需要一个正在运行的 Host。开发时可指向本机 `dsh web`：

```powershell
dsh web --host 127.0.0.1 --port 3080 --no-open
```

## 目录约定

| 目录 | 放什么 |
| --- | --- |
| `apps/shell/` | Electron 22 外壳（主进程、preload、图标） |
| `apps/launcher/` | 启动器（Phase 1 引入）：拉起 Host、等待端口、统一退出 |
| `patches/` | 对上游 DSH 包的最小补丁（仅在必要时出现） |
| `docs/` | 计划、架构、构建、兼容性 |
| `scripts/` | 开发与部署辅助脚本 |

## 提交规范

- 提交信息用 `type(scope): subject`，例如 `fix(shell): keep tray icon after reload`
- 一个 PR 只做一件事；涉及行为变化请更新 `docs/` 与 `CHANGELOG.md`
- **不要提交**：`shell.config.json`、任何 token、字体、ISO、安装包

## 测试

```powershell
npm run smoke     # 加载页面并截图，输出控制台错误
npm run dist:dir  # 确认能打包
```

提交前至少跑通 `dist:dir`。CI 会在 PR 上重复这一步。

## 兼容性红线

1. 主进程只能用 Electron 22 存在的 API（没有 `WebContentsView`、没有 `protocol.handle`）。
2. 渲染进程必须能在 Chromium 108 上工作；新 API 一律加到 `src/preload.js` 的 polyfill 里。
3. 不修改上游 DSH 源码；需要改就进 `patches/`，并在 PR 说明为什么不能通过配置解决。

## 许可证

贡献即表示同意以 MIT 发布。
