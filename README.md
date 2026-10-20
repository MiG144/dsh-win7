<div align="center">

<img src="apps/shell/assets/icon-256.png" width="80" alt="Harness7">

# Harness7

**让 DeepSeek Harness 在 Windows 7 SP1 x64 上运行**

[![CI](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml/badge.svg)](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MiG144/dsh-win7)](https://github.com/MiG144/dsh-win7/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%207%20SP1%20x64-0078D6.svg)](#安装)

<sub>非官方项目，与 DeepSeek 无隶属关系 · [English](README.en.md)</sub>

</div>

---

## 这是什么

DeepSeek Harness 官方桌面版依赖 Electron 44 + Node 24 + Python 3.12，整条技术栈都不支持 Windows 7。
Harness7 用一层 Win7 兼容的运行环境把它跑起来——**不修改 Harness 源码**，只在外面加壳和运行时：

| 层 | 选型 |
| --- | --- |
| 外壳 | Electron 22.3.27（Chromium 108，最后一个支持 Win7 的版本） |
| 运行时 | Node 22.23.3（社区 Win7 构建） |
| Host | 官方 `@deepseek-ai/dsh`（MIT），原样运行 |
| 通信 | `127.0.0.1:3080` 同机回环 |

外壳负责启动 Host、等待就绪、加载界面，退出时回收进程；Host 负责会话、模型调用和工具执行。

## 状态

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Phase 0 | Node 22 + 官方 Host 在 Win7 本机运行 | ✅ 已验证 |
| Phase 1 | 自包含安装包（外壳 + 运行时 + Host） | ✅ 已发布 |
| Phase 2 | 终端、Office 等能力迁移 | 📋 计划中 |

最新版本见 [Releases](https://github.com/MiG144/dsh-win7/releases)。`v0.2.2` 起产品名为 **Harness7**。

## 安装

从 [Releases](https://github.com/MiG144/dsh-win7/releases) 下载：

- `Harness7-<version>-setup.exe` —— 安装版
- `Harness7-<version>-portable.exe` —— 便携版

安装包**未签名**，Windows 会提示"未知发布者"；下载后请核对 `SHA256SUMS.txt`。

**系统要求**：Windows 7 SP1 x64、VC++ 2015-2019 x64 运行库、4 GB 内存、约 700 MB 磁盘。
系统补丁与中文环境要求见 [兼容性](docs/COMPATIBILITY.md)。

## 从源码构建

```powershell
cd apps\shell
npm ci
npm run dist
```

完整步骤（含运行时准备）见 [构建](docs/BUILD.md)。

## 文档

| 文档 | 内容 |
| --- | --- |
| [项目计划](docs/PLAN.md) | 阶段、验收标准、风险 |
| [Phase 0](docs/PHASE0.md) · [Phase 1](docs/PHASE1.md) | Win7 实机验证记录 |
| [可行性报告](docs/FEASIBILITY.md) | 技术选型论证与实测数据 |
| [架构](docs/ARCHITECTURE.md) | 进程模型、鉴权、目录布局 |
| [构建](docs/BUILD.md) | 本地构建、CI、离线打包 |
| [兼容性](docs/COMPATIBILITY.md) | 系统补丁、功能矩阵、已知问题 |
| [待办](docs/BACKLOG.md) | 计划中的工作 |
| [文档索引](docs/README.md) | 全部文档导航 |

## 已知限制

- **未签名**：SmartScreen 会拦截，请核对 SHA256
- **终端与 Office 技能尚未支持**：计划在 Phase 2 迁移
- **Chromium 108**：少量新 CSS 特性降级，不影响功能
- **Win7 已停止安全更新**：建议部署在受控网络

## 关于本项目

个人项目，主要由 AI 辅助开发，按现状提供，不承诺响应时间或长期维护。
代码以 [MIT](LICENSE) 发布；名称与商标说明见 [TRADEMARKS.md](TRADEMARKS.md)。
