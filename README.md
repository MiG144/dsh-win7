# DSH-Win7

> **非官方项目**。把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 搬到 Windows 7 SP1 x64 上本地运行的实验性方案。
> 与 DeepSeek 官方无关，未获其背书。

[![CI](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml/badge.svg)](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MiG144/dsh-win7)](https://github.com/MiG144/dsh-win7/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 这是什么

DeepSeek Harness 官方桌面版依赖 Electron 44 + Node 24 + Python 3.12，整条技术栈都不支持 Windows 7。
本项目把"壳"和"运行时"拆开，用两条老技术栈拼出一台 Win7 能跑的单机 DSH：

| 层 | 选型 | 原因 |
| --- | --- | --- |
| 外壳 | Electron 22.3.27（Chromium 108） | 最后一个支持 Win7 的 Electron |
| Host 运行时 | Node 22.23.3（社区 Win7 构建） | 官方 Node 22 要求 Win10 |
| 图形界面 | DSH 官方 Web UI | 不分叉，跟随上游 |
| 通信 | `127.0.0.1:3080` 回环 | 单机，不出网 |

```
┌──────────── Windows 7 SP1 x64 ────────────┐
│  Electron 22 外壳  ──►  127.0.0.1:3080     │
│                              ▲             │
│                      DSH Host (Node 22)     │
│                              ▲             │
└──────────────────────────────┼─────────────┘
                               │
                       内网 OpenAI 兼容 API
```

## 状态

- ✅ **已验证**：Electron 22 外壳在真实 Win7 SP1 x64 上完成登录、中文对话、托盘、断连恢复、免 token 重启
- ✅ **Phase 0 通过**：Node 22.23.3 + 官方 DSH Host 在 **Win7 本机**跑通，外壳连 `127.0.0.1:3080` 正常进入界面，零源码改动
- ⏳ **进行中**：Phase 1 —— 启动器与单机安装包
- 📦 **发布**：`v0.1.0` 只含外壳（需外部 Host）；`v0.2.0` 起提供单机安装包

详见 [项目计划](docs/PLAN.md)、[Phase 0 结果](docs/PHASE0.md) 与 [可行性报告](docs/FEASIBILITY.md)。

## 快速开始（外壳 v0.1.0）

```powershell
git clone https://github.com/MiG144/dsh-win7.git
cd dsh-win7\apps\shell
npm ci
npm start
```

首次运行前，把配置放到 `apps/shell/shell.config.json`：

```json
{
  "url": "http://127.0.0.1:3080/",
  "token": "dsh web 启动时打印的 token（仅首次需要）",
  "closeToTray": true,
  "gpu": "software",
  "zoom": 1
}
```

## 构建安装包

```powershell
cd apps\shell
npm ci
npm run dist        # NSIS 安装包 + portable，输出到 apps\shell\dist
```

CI 在推送 `v*` 标签时自动构建并发布到 GitHub Releases。

## 文档

| 文档 | 内容 |
| --- | --- |
| [项目计划](docs/PLAN.md) | 阶段、里程碑、验收标准、风险 |
| [可行性报告](docs/FEASIBILITY.md) | 为什么不能直接装官方版、Win7 实测结果 |
| [架构](docs/ARCHITECTURE.md) | 进程模型、鉴权、目录布局 |
| [构建](docs/BUILD.md) | 本地构建、CI、离线打包 |
| [兼容性](docs/COMPATIBILITY.md) | 功能矩阵、已知问题 |
| [VM 搭建](docs/VM-SETUP.md) | 用虚拟机复现验证环境 |

## 安全

- 安装包**未做代码签名**，Windows 可能提示"未知发布者"；请核对 Release 页的 SHA256。
- `shell.config.json` 里的 `token` 等同于一次登录凭据，**不要提交到仓库**（已在 `.gitignore`）。
- Host 默认只监听回环地址；如需局域网访问，请先读 [SECURITY.md](SECURITY.md)。

## 许可证

代码以 [MIT](LICENSE) 发布。第三方组件与商标说明见 [NOTICE](NOTICE)。
"DeepSeek"、"DeepSeek Harness" 是其权利人的商标，本项目仅作描述性使用。
