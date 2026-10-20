# 项目计划：让 DeepSeek Harness 在 Windows 7 上本地运行

> 状态：Phase 0 待启动　最后更新：2026-10-20　负责人：待定
> 相关文档：[可行性报告](FEASIBILITY.md) · [架构](ARCHITECTURE.md) · [构建](BUILD.md) · [兼容性](COMPATIBILITY.md)

---

## 0. 一句话目标

在 **Windows 7 SP1 x64 单机**上，交付一个**离线可安装、本地运行**的 DeepSeek Harness：
安装包双击即装，启动后直接对话；不依赖第二台机器，模型出口为内网 API 或经代理/防火墙控制的公网出口。
无法一次到位的功能，按阶段逐个迁移。

---

## 1. 范围：什么算"做完了"

### 1.1 MVP（v0.2.0）验收标准

- [ ] 一个 NSIS 安装包，在干净的 Win7 SP1 x64 上双击可装、可卸载
- [ ] 安装包内含：Node 运行时、DSH Host、Electron 外壳、启动器
- [ ] 首次启动引导：填模型 API 的 `base URL` / 模型名 / API Key，写入本地配置
- [ ] 对话、流式输出、工作区文件读写、Markdown/代码高亮正常
- [ ] 关闭窗口进托盘；托盘退出时 Host 与壳一起退出，无残留进程
- [ ] 重启 Windows 后能自动/一键启动，且免登录（cookie 有效期 30 天）
- [ ] Host 崩溃能被启动器拉起，界面自动重连
- [ ] 除模型 API（内网或受控出口）外，全流程不需要访问公网

### 1.2 明确不做（或推迟）

| 项目 | 原因 | 计划 |
| --- | --- | --- |
| 终端（PTY） | `node-pty` 的 ConPTY 只支持 Win10 1809+ | Phase 2，换 winpty |
| Office 技能（docx/xlsx/pptx） | 依赖 Python 3.12 + numpy2/pandas3，Win7 不支持 | Phase 3，降级 Python 3.8 |
| 语音输入 | sherpa-onnx 需验证 Win7 | Phase 3 |
| 内置浏览器 / 浏览器自动化 | 依赖 Win10 能力 | 不做 |
| 插件市场 / 账号登录 | 需公网 | 不做，保留本地插件目录 |
| 自动更新 | 无签名、无稳定 feed | Phase 4 再评估 |

---

## 2. 技术路线（已定）

```
Windows 7 SP1 x64（单机）
├─ node.exe 22.23.3（社区 Win7 构建，免安装）
│    └─ DSH Host：node bin.js web --host 127.0.0.1 --port 3080
├─ Electron 22.3.27 外壳（Chromium 108 + polyfill）
│    └─ 加载 http://127.0.0.1:3080/
└─ 启动器：先起 Host → 等端口就绪 → 起壳 → 统一退出
```

- **不 fork DSH 源码**：Host 直接使用官方 npm 包，保持能跟随上游升级。
- **不升级 Electron**：Electron 23+ 不支持 Win7；22 是终点，兼容问题用 polyfill 解决（已验证）。
- **不要求硬件虚拟化**：没有虚拟机、没有 WSL。

### 为什么不是别的方案

| 备选 | 否决理由 |
| --- | --- |
| 桌面版原样安装 | Electron 44 + Node 24 + Python 3.12，整条栈不支持 Win7 |
| 全量移植到 Electron 22 + Node 14 | 8–16 人月，且永久分叉 |
| 远程 Host + Win7 瘦客户端 | 现场只有一台 Win7，没有 Host 机器 |
| Win7 里跑虚拟机当 Host | 目标机无 VT-x / 性能不足 |

---

## 3. 阶段计划

### Phase 0：可行性 spike（1–2 天）

**目的**：证明"社区 Node 22 + 官方 DSH Host"能在这台 Win7 上跑起来。只验证，不承诺交付。

| ID | 任务 | 产出 |
| --- | --- | --- |
| T0.1 | 取 Node 22.23.3 Win7 构建（`node-v22.23.3-win-x64.7z`），先在宿主 Win11 上 `node -v` 验证是真 Node | 校验记录 |
| T0.2 | 在现有 Win7 虚拟机（先打快照 `pre-phase0`）里解压 Node，跑 `node -v` | 截图 |
| T0.3 | 跑兼容脚本：`fetch`、`structuredClone`、`AbortSignal.timeout`、`node:sqlite`、`worker_threads`、`fs.glob` | 通过/失败清单 |
| T0.4 | 把 DSH Host 目录（从已安装桌面版抽出的 `dsh` 树，约 400 MB）放进虚拟机 | 目录 |
| T0.5 | 启动 `node bin.js web --host 127.0.0.1 --port 3080`，看能否监听、能否加载前端 | 日志 |
| T0.6 | 外壳指向 `127.0.0.1:3080`，发一条消息 | 截图 |

**退出标准**：T0.5 + T0.6 通过 → 进入 Phase 1。
**失败处理**：记录具体缺失点，按顺序尝试：① 给 Host 打小补丁；② VxKex + 官方 Node；③ Node 24 的 Win7 构建；④ QEMU 软件模拟。

#### 决策门 G0：要不要动 DSH 源码

Phase 0 结束时必须明确回答，并记录到本文件：

| 观察结果 | 结论 |
| --- | --- |
| 官方 npm 包在 Node 22 上原样跑通 | **零源码改动**，仓库只做壳/启动器/打包（方式 A） |
| 个别文件报 Node 24 API 缺失 | 引入 `patches/` 补丁集（`patch-package`），补丁 ≤ 5 个文件（方式 B） |
| 原生模块或运行时结构性不兼容 | 评估替换包或降级功能，仍不 fork 全仓 |

**硬约束**：不把上游 monorepo 整体改造成自己的分支；所有上游改动必须能用一个 `git rebase` + 少量补丁复现。

**G0 结论（2026-10-20）：方式 A —— 零源码改动。**
官方 npm 产物在 Node 22.23.3 上原样跑通，Host 正常监听并渲染界面，详见 [PHASE0.md](PHASE0.md)。

### Phase 1：最小可用版 v0.2.0（1–2 周）

| ID | 任务 | 说明 |
| --- | --- | --- |
| T1.1 | 启动器 `launcher.exe` | 起 Host 子进程（隐藏窗口）→ 轮询 `127.0.0.1:3080` 就绪 → 起壳；壳退出时杀 Host；Host 崩溃自动重启（带退避） |
| T1.2 | 打包流水线 | electron-builder extraResources 打入 `node\` + `host\`；NSIS 安装包；绿色包（zip） |
| T1.3 | 模型配置 | 首次启动向导：base URL / 模型 / key / `stream`；写入 `%APPDATA%\DSH-Win7\config.json` |
| T1.4 | 插件裁剪 | 通过 profile patch 关闭 terminal/office/voice/browser 等不可用插件，保证启动无报错 |
| T1.5 | 稳定性 | 单实例、崩溃日志、开机自启（注册表 Run 或计划任务）、托盘 |
| T1.6 | 离线安装验证 | 断网环境装一遍、跑一遍 |

**退出标准**：§1.1 全部勾选。

### Phase 2：功能迁移（逐项，3–10 天/项）

| 功能 | 依赖 | 工作内容 | 优先级 |
| --- | --- | --- | --- |
| 图片附件 | `sharp`（NAPI） | 验证 Win7 加载；失败则降级为仅预览 | 高 |
| 终端 | `node-pty` + winpty | 换 winpty 后端或降级为只读命令 | 中 |
| MCP / 本地插件 | 纯 Node | 验证插件加载路径 | 中 |
| 语音输入 | `sherpa-onnx` | 验证 NAPI + 模型文件 | 低 |
| Office 技能 | Python 3.8 + LibreOffice 7 | 重建 Python 运行时与依赖 | 低 |

**规则**：每项功能都要能**单独开关**，关掉不影响核心对话。

### Phase 3：发布与运维（持续）

- 语义化版本 + GitHub Release（自动构建安装包）
- 可选代码签名（需证书；无签名时 README 说明 SmartScreen 警告）
- 离线更新包（新版本 zip，覆盖安装）
- 日志与诊断包导出

---

## 4. 版本计划

| 版本 | 内容 | 依赖 |
| --- | --- | --- |
| `v0.1.0` | 只有外壳（需外部 Host）——当前状态 | 已完成 |
| `v0.2.0` | 单机全本地：Host + 壳 + 启动器 + 安装包 | Phase 0/1 |
| `v0.3.0` | 终端 / 图片 | Phase 2 |
| `v0.4.0+` | Office / 语音 / 插件 | Phase 2 |

---

## 5. 风险与备选

| 风险 | 概率 | 影响 | 备选 |
| --- | --- | --- | --- |
| 社区 Node 22 构建在 Win7 上有隐性缺陷 | 中 | 高 | VxKex + 官方 Node；Node 24 构建；QEMU |
| DSH 某处依赖 Node 24 行为 | 中 | 中 | 定位后小补丁（通常个位数文件） |
| 原生模块 ABI/API 不兼容 | 中 | 中 | NAPI 模块基本免疫；非 NAPI 的功能砍掉 |
| 目标机内存不足（<4 GB） | 中 | 中 | 裁剪插件、降低窗口数量 |
| 无代码签名导致 SmartScreen 拦截 | 高 | 低 | 文档说明 + 校验 SHA256 |
| 上游 DSH 升级后接口变化 | 中 | 中 | 锁定版本、升级前跑回归清单 |

---

## 6. 需要的外部输入

1. **模型 API**：base URL、模型名、鉴权方式（Bearer/自定义 Header）、是否支持 `stream: true`。
2. **目标机硬件**：内存、CPU、磁盘剩余（决定 Phase 2 保留哪些功能）。
3. **GitHub 仓库**：owner/repo 名称（影响 `appId`、Release 链接、npm 包名）。

---

## 7. 决策记录（ADR 摘要）

| 编号 | 决策 | 理由 |
| --- | --- | --- |
| ADR-001 | 许可证用 **MIT** | 与上游 DSH、Electron、Node 一致，最省事；不引入 copyleft 传染 |
| ADR-002 | 运行时用 **社区 Node 22.23.3** | 官方 Node 22 要求 Win10；该构建满足 DSH 的 `^22.19` 引擎要求 |
| ADR-003 | 外壳用 **Electron 22** | 23+ 不支持 Win7；Chromium 108 已实测可渲染 DSH 前端 |
| ADR-004 | **不分叉** DSH 源码 | 保持跟随上游；只做打包、启动器、polyfill |
| ADR-005 | 安装包用 **NSIS**（electron-builder） | 与 Electron 生态一致，Win7 可运行 |
| ADR-006 | 不内置中文字体/输入法 | 字体有版权；输入法由用户环境提供，文档给指引 |
| ADR-007 | **源码继承策略**：优先用上游 npm 产物，仅在必要时引入 `patches/`，不做全量分叉 | 上游每周数十次提交，全量 fork 必然烂掉；补丁集可在 rebase 后重放 |

---

## 8. 时间表（相对周）

| 周 | 里程碑 |
| --- | --- |
| W1 | Phase 0 spike 完成，出结论 |
| W2–W3 | Phase 1：启动器、打包、配置向导 |
| W3 末 | `v0.2.0` 发布（GitHub Release + 安装包） |
| W4+ | Phase 2 逐项迁移 |

---

## 9. 当前进度

| 项 | 状态 |
| --- | --- |
| Win7 上外壳 + 远程 Host 端到端验证 | ✅ 完成（见 [FEASIBILITY.md](FEASIBILITY.md) §2.3） |
| Phase 0：Node 22 + DSH Host 在 Win7 本机运行 | ✅ **通过**（见 [PHASE0.md](PHASE0.md)） |
| GitHub 仓库 / CI / Release | ✅ 已上线，`v0.1.0` 自动出包 |
| Phase 1（启动器 + 单机安装包） | ⏳ 下一步 |
