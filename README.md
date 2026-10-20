<div align="center">

<img src="apps/shell/assets/icon-256.png" width="72" alt="Harness7">

# Harness7

在 Windows 7 上运行 DeepSeek Harness

[![CI](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml/badge.svg)](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MiG144/dsh-win7)](https://github.com/MiG144/dsh-win7/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%207%20SP1%20x64-0078D6.svg)](#安装)

<sub>非官方项目 · <a href="README.en.md">English</a></sub>

</div>

## 简介

官方桌面版依赖 Electron 44、Node 24 和 Python 3.12，均不支持 Windows 7。
Harness7 在外层提供一套 Win7 可用的运行环境，Harness 本身未做修改：

| 层 | 选型 |
| --- | --- |
| 外壳 | Electron 22.3.27（Chromium 108） |
| 运行时 | Node.js 22.23.3（社区 Win7 构建） |
| Host | 官方 `@deepseek-ai/dsh`（MIT） |
| 通信 | `127.0.0.1:3080` 回环 |

外壳启动 Host、等待就绪后加载界面，退出时回收进程。

## 状态

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Phase 0 | Node 22 + 官方 Host 在 Win7 本机运行 | ✅ 已验证 |
| Phase 1 | 自包含安装包（外壳 + 运行时 + Host） | ✅ 已发布 |
| Phase 2 | 终端、Office 等能力迁移 | 📋 计划中 |

最新版本见 [Releases](https://github.com/MiG144/dsh-win7/releases)。

## 安装

下载 `Harness7-<version>-setup.exe` 运行安装，或使用 `-portable.exe` 免安装版本。
安装包未签名，请核对 `SHA256SUMS.txt`。

要求：Windows 7 SP1 x64 · VC++ 2015-2019 x64 运行库 · 4 GB 内存 · 约 700 MB 磁盘。
系统补丁与中文环境见 [兼容性](docs/COMPATIBILITY.md)。

## 构建

```powershell
cd apps\shell
npm ci
npm run dist
```

运行时准备与离线打包见 [构建](docs/BUILD.md)。

## 文档

| 文档 | 内容 |
| --- | --- |
| [项目计划](docs/PLAN.md) | 阶段划分与验收标准 |
| [Phase 0](docs/PHASE0.md) · [Phase 1](docs/PHASE1.md) | Win7 实机验证记录 |
| [可行性报告](docs/FEASIBILITY.md) | 技术选型论证 |
| [架构](docs/ARCHITECTURE.md) | 进程模型与鉴权 |
| [构建](docs/BUILD.md) | 打包、CI、离线分发 |
| [兼容性](docs/COMPATIBILITY.md) | 系统补丁与功能矩阵 |
| [待办](docs/BACKLOG.md) | 计划中的工作 |

## 限制

| 项 | 说明 |
| --- | --- |
| 终端、Office 技能 | 尚未支持，计划 Phase 2 迁移 |
| Chromium 108 | 少量新 CSS 特性降级，不影响功能 |
| Windows 7 | 已停止安全更新，建议部署在受控网络 |

## 关于

个人项目，主要由 AI 辅助开发，按现状提供，不承诺响应时间或长期维护。
代码以 [MIT](LICENSE) 发布，名称与商标说明见 [TRADEMARKS.md](TRADEMARKS.md)。
