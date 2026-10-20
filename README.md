<div align="center">

<img src="apps/shell/assets/icon-256.png" width="96" alt="Harness7">

# Harness7

**让 DeepSeek Harness 在 Windows 7 SP1 x64 上运行**

[![CI](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml/badge.svg)](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MiG144/dsh-win7)](https://github.com/MiG144/dsh-win7/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%207%20SP1%20x64-0078D6.svg)](#系统要求)

<sub>非官方项目，与 DeepSeek 官方无关。个人项目，主要由 AI 辅助开发，按现状提供，不承诺维护。</sub>

</div>

---

## 目录

- [这是什么](#这是什么)
- [状态](#状态)
- [系统要求](#系统要求)
- [架构](#架构)
- [安装与运行](#安装与运行)
- [从源码构建](#从源码构建)
- [仓库结构](#仓库结构)
- [文档](#文档)
- [路线图](#路线图)
- [已知限制](#已知限制)
- [项目性质与开发方式](#项目性质与开发方式)
- [维护状态](#维护状态)
- [贡献](#贡献)
- [许可证](#许可证)

## 这是什么

DeepSeek Harness 官方桌面版依赖 **Electron 44 + Node 24 + Python 3.12**，整条技术栈都不支持
Windows 7（Electron 23 起、Node 18 起、Python 3.9 起陆续放弃 Win7）。

本项目把"壳"和"运行时"拆开，用两条仍然兼容 Win7 的老技术栈拼出一台能跑的单机 DSH：

| 层 | 选型 | 原因 |
| --- | --- | --- |
| 外壳 | Electron **22.3.27**（Chromium 108） | 最后一个支持 Win7 的 Electron |
| Host 运行时 | Node **22.23.3**（社区 Win7 构建） | 官方 Node 22 要求 Win10 |
| Host 代码 | 官方 `@deepseek-ai/dsh` 产物 | **零源码改动**，跟随上游 |
| 图形界面 | DSH 官方 Web UI | 不分叉 |
| 通信 | `127.0.0.1:3080` 同机回环 | 单机，不出网 |
| 模型出口 | 任意 OpenAI 兼容 API | 内网，或经代理/防火墙控制的公网出口 |

## 状态

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| — | Electron 22 外壳在真实 Win7 上运行 | ✅ 已验证 |
| — | 外壳连远端 Host：登录/中文/托盘/断连恢复/免 token 重启 | ✅ 已验证 |
| **Phase 0** | Node 22 + 官方 DSH Host 在 **Win7 本机**跑通 | ✅ **通过**（[记录](docs/PHASE0.md)） |
| **Phase 1** | 单机安装包与便携版已发布（`v0.2.0`，内置 Node 22 + Host） | ✅ 已发布 |
| Phase 2 | 终端、Office、语音等能力迁移 | 📋 计划中 |

发布：`v0.2.1` 起产品名为 **Harness7**，提供**单机安装包**（内置 Node 22 与 Host）。

## 系统要求

| 项 | 要求 |
| --- | --- |
| 系统 | Windows 7 **SP1 x64**（32 位不支持） |
| 补丁 | KB2533623、KB4474419、KB4490628、KB2999226(UCRT)、KB2670838 |
| 运行库 | VC++ 2015-2019 x64 |
| 内存 | ≥ 4 GB（Host + 外壳约 1 GB） |
| 磁盘 | ≥ 2 GB（安装后约 700 MB） |
| 其他 | 中文环境需自备中文字体与输入法（见[兼容性](docs/COMPATIBILITY.md)） |

## 架构

```
┌──────────────────── Windows 7 SP1 x64 ────────────────────┐
│                                                            │
│   Harness7.exe（启动器）                                    │
│     ├─ node.exe 22 ──► dsh web  --host 127.0.0.1:3080      │
│     └─ Harness7（Electron 22 / Chromium 108）               │
│              └──HTTP/WS──► 127.0.0.1:3080                  │
│                                                            │
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS
                  OpenAI 兼容 API（内网或受控出口）
```

启动器负责拉起 Host、等待端口就绪、启动外壳，并在退出时统一回收进程。
细节见 [架构文档](docs/ARCHITECTURE.md)。

## 安装与运行

### 方式一：安装包（v0.2.0+）

从 [Releases](https://github.com/MiG144/dsh-win7/releases) 下载：

- `Harness7-<version>-setup.exe` —— 安装版
- `Harness7-<version>-portable.exe` —— 便携版

下载后应核对 `SHA256SUMS.txt`。安装包**未签名**，Windows 会提示"未知发布者"。

### 方式二：只跑外壳（v0.1.0，连接外部 Host）

```powershell
git clone https://github.com/MiG144/dsh-win7.git
cd dsh-win7\apps\shell
npm ci
copy shell.config.example.json shell.config.json   # 修改 url 与 token
npm start
```

`shell.config.json`：

```json
{
  "url": "http://192.168.1.20:3080/",
  "token": "Host 启动时打印的 token（仅首次需要）",
  "closeToTray": true,
  "gpu": "software",
  "zoom": 1
}
```

## 从源码构建

```powershell
cd apps\shell
npm ci
npm run dist        # NSIS 安装包 + portable
npm run dist:dir    # 只解包，快速验证
```

- 构建机用 Windows 10/11 + Node 22；**产物**跑在 Win7。
- 国内网络可设 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`。
- 没有符号链接权限时用 `scripts\make-portable.ps1` 出绿色包。

见 [构建文档](docs/BUILD.md)。

## 仓库结构

```
dsh-win7/
├─ apps/shell/            Electron 22 外壳（主进程、preload、图标）
├─ scripts/               辅助脚本（启动 Host、绿色包、文件服务器）
├─ docs/                  计划、架构、构建、兼容性、实测记录
├─ .github/workflows/     CI（PR 构建校验）与 Release（打标签出安装包）
├─ LICENSE / NOTICE       许可证与第三方组件、商标说明
└─ SECURITY.md            威胁模型与漏洞报告方式
```

## 文档

| 文档 | 内容 |
| --- | --- |
| [项目计划](docs/PLAN.md) | 阶段、里程碑、验收标准、风险、ADR |
| [Phase 0 记录](docs/PHASE0.md) | Win7 本机跑通 Node 22 + Host 的完整过程与踩坑 |
| [Phase 1 记录](docs/PHASE1.md) | 自包含便携包（外壳+运行时+Host）的构建与 Win7 验证 |
| [可行性报告](docs/FEASIBILITY.md) | 为什么不能直接装官方版、Win7 实测数据 |
| [架构](docs/ARCHITECTURE.md) | 进程模型、鉴权、目录布局、兼容层 |
| [构建](docs/BUILD.md) | 本地构建、CI、离线打包、签名 |
| [兼容性](docs/COMPATIBILITY.md) | 系统补丁、功能矩阵、Chromium 108 差异 |
| [VM 搭建](docs/VM-SETUP.md) | 用虚拟机复现验证环境 |
| [文档索引](docs/README.md) | 全部文档导航 |
| [名称与商标](TRADEMARKS.md) | 为什么叫 Harness7、如何引用上游名称 |

## 路线图

| 版本 | 内容 |
| --- | --- |
| `v0.1.0` | 外壳（已发布） |
| `v0.2.0` | 单机安装包：外壳内置 Node 22 + Host ✅ 已发布 |
| `v0.3.0` | 终端（winpty）、图片附件 |
| `v0.4.0+` | Office 技能（Python 3.8 运行时）、语音 |

## 已知限制

- **未签名**：安装包无代码签名，SmartScreen 会拦截；应核对 SHA256。
- **终端不可用**：`node-pty` 的 ConPTY 只支持 Win10 1809+，需换 winpty 后端。
- **Office 技能不可用**：官方依赖 Python 3.12 + numpy2/pandas3，Win7 需降级到 Python 3.8。
- **Chromium 108**：少数新 CSS 特性降级（不影响功能），详见兼容性文档。
- **Win7 已停止安全更新**：本项目的预期部署环境是**受控网络**——内网，或经代理/防火墙
  限制出口的网络。Host 端口不应直接暴露到公网；确需访问公网模型 API 时，由代理或防火墙控制出口。

## 项目性质与开发方式

- 这是**个人项目**，不代表任何公司或团队，也没有官方支持渠道。
- 代码、文档和提交信息主要由 **AI 辅助生成**，经人工审阅、编译和实机/虚拟机验证后提交。
- 因此可能存在：命名与风格不统一、注释密度不一致、边界情况覆盖不足、文档与实现偶有滞后。
- 关键结论以**可复现的实测**为准：见 [Phase 0 记录](docs/PHASE0.md) 与 [可行性报告](docs/FEASIBILITY.md)。
- 发现问题欢迎开 Issue；修复不保证，但确认后会更新文档或代码。

## 维护状态

本项目是**个人实验项目**，按现状（as-is）提供：

- 不承诺响应时间、Issue/PR 审阅时限或修复周期
- 不承诺长期维护、版本支持或向后兼容
- 用于重要环境前请自行验证；使用风险与后果由使用者承担（见 [LICENSE](LICENSE)）
- 欢迎 Issue 与 PR，但是否采纳、何时处理由维护者决定

## 贡献

欢迎 Issue 与 PR。提交前请阅读 [贡献指南](CONTRIBUTING.md) 与 [行为准则](CODE_OF_CONDUCT.md)。

核心红线：主进程只能用 Electron 22 的 API；渲染进程必须能在 Chromium 108 上运行；
不修改上游 DSH 源码（必须改时进 `patches/`）。

## 许可证

代码以 [MIT](LICENSE) 发布。第三方组件、字体与商标说明见 [NOTICE](NOTICE)。
"DeepSeek"、"DeepSeek Harness" 是其权利人的商标，本项目仅作描述性使用；细节与处理方式见 [TRADEMARKS.md](TRADEMARKS.md)。

---

## English

**Harness7** is an unofficial, experimental port that runs [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
natively on Windows 7 SP1 x64. It pairs an Electron 22 (Chromium 108) shell with a community
Node.js 22 build for Windows 7, and runs the unmodified official Harness host on the same machine.

Status: shell verified on real Win7; Phase 0 (local host) passed; single-machine installer is next.
Licensed under MIT. Not affiliated with DeepSeek.
