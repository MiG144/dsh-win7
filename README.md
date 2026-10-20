<div align="center">

<img src="apps/shell/assets/icon-256.png" width="88" alt="Harness7">

# Harness7

**在 Windows 7 上运行 DeepSeek Harness**

[![CI](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml/badge.svg)](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MiG144/dsh-win7)](https://github.com/MiG144/dsh-win7/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%207%20SP1%20x64-0078D6.svg)](#安装)

<sub>非官方项目 · <a href="README.en.md">English</a></sub>

</div>

> DeepSeek Harness 官方版本仅支持 Windows 10 及以上。Harness7 为其提供 Windows 7 运行环境：
> 安装包包含 Node 运行时与官方组件，安装后即可使用，无需额外配置。

![Harness7 在 Windows 7 上运行](docs/assets/win7-first-run.png)

## 特性

- **单机自包含** —— 安装包内置 Node 22 与 Harness Host，不需要额外服务器或虚拟机
- **原生 Win7** —— Electron 22 / Chromium 108，非远程桌面或浏览器封装
- **零源码改动** —— 运行官方 `@deepseek-ai/dsh` 包，跟随上游升级，不打补丁
- **进程自管理** —— 启动 Host、等待端口、崩溃重启、退出回收，用户只面对一个窗口
- **离线可用** —— 安装后只需能访问模型 API，不依赖公网 CDN
- **桌面体验** —— 托盘常驻、单实例、窗口位置记忆、外链走系统浏览器

## 快速开始

### 安装包

从 [Releases](https://github.com/MiG144/dsh-win7/releases) 下载 `Harness7-<version>-setup.exe` 安装。
安装包未签名，SmartScreen 会提示；请核对 `SHA256SUMS.txt`。

首次启动后，在 Harness 的「设置 → 模型」里填写 OpenAI 兼容的 API 地址与密钥。

### 从源码

```powershell
git clone https://github.com/MiG144/dsh-win7.git
cd dsh-win7\apps\shell
npm ci
npm run dist
```

运行时准备与离线打包见 [构建文档](docs/BUILD.md)。

## 架构

```mermaid
flowchart LR
  subgraph Win7["Windows 7 SP1 x64"]
    S["Harness7 外壳<br/>Electron 22 / Chromium 108"]
    H["本地 Host<br/>Node 22 + @deepseek-ai/dsh"]
    S -->|"HTTP / WebSocket<br/>127.0.0.1:3080"| H
  end
  H -->|HTTPS| M["模型 API<br/>OpenAI 兼容"]
```

外壳启动 Host、等待就绪后加载界面；Host 负责会话、模型调用与工具执行。

## 能力

**可以使用**

| 能力 | 说明 |
| --- | --- |
| 对话 | 文本对话、流式输出、多会话 |
| 工作区 | 文件读写、代码高亮、Markdown 预览 |
| 模型 | 任意 OpenAI 兼容 API，内网或公网 |
| 桌面 | 托盘、单实例、窗口位置记忆、断线重连 |
| 版本检查 | 启动时自动检查，「帮助 → 检查更新」可手动触发 |
| 开机启动 | 应用菜单开关，写入 Windows 登录项 |

**暂不支持**

| 能力 | 原因 |
| --- | --- |
| 终端 | `node-pty` 的 ConPTY 需要 Windows 10 1809 及以上 |
| Office 技能 | 依赖 Python 3.12，Windows 7 无法运行 |
| 自动更新、代码签名 | 需要证书与稳定的分发通道 |

> Windows 7 已停止安全更新，建议部署在受控网络。

## 文档

| 文档 | 内容 |
| --- | --- |
| [验证记录](docs/VERIFICATION.md) | 真实 Win7 上的测试结果 |
| [架构](docs/ARCHITECTURE.md) | 进程模型、鉴权、目录布局 |
| [构建](docs/BUILD.md) | 打包、CI、离线分发 |
| [兼容性](docs/COMPATIBILITY.md) | 系统补丁、功能矩阵 |
| [常见问题](docs/FAQ.md) | 安装、网络、数据位置 |

## 参与

欢迎 Issue 与 PR。提交前请阅读 [贡献指南](CONTRIBUTING.md)。

## 许可

[MIT](LICENSE)。名称与商标说明见 [TRADEMARKS.md](TRADEMARKS.md)，第三方组件见 [NOTICE](NOTICE)。

## 致谢

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) —— 本项目的运行对象
- [Electron](https://www.electronjs.org/) 22 —— Win7 上可用的最后一个大版本
- [DeftKing/nodejs-win7](https://github.com/DeftKing/nodejs-win7) —— Node 22 的 Win7 构建

---

个人项目，主要由 AI 辅助开发，按现状提供，不承诺响应时间或长期维护。
