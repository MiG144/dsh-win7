# Phase 0 结果：单机本地的 DSH

> 日期：2026-10-20　结论：**通过，且不需要任何 DSH 源码改动**

## 目标

证明"社区 Node 22 + 官方 DSH Host"能在**同一台 Windows 7** 上跑起来，
从而支持"单机、离线、无第二台机器"的部署形态。

## 环境

| 项 | 值 |
| --- | --- |
| 系统 | Windows 7 SP1 Ultimate x64（2018-08 刷新 ISO，英文版） |
| 位置 | VirtualBox 7.2.20 虚拟机，4 GB / 2 核 / 1024×768，无 Guest Additions |
| Node | 22.23.3，社区 Win7 构建（[DeftKing/nodejs-win7](https://github.com/DeftKing/nodejs-win7)） |
| Host | 从官方桌面版 0.2.1-rc.2 的 `app.asar` 抽出的 `dsh` 树（17,262 文件 / 406 MB） |
| 外壳 | 本项目 Electron 22.3.27（Chromium 108 + polyfill） |

## 步骤

```bat
:: 1. 准备（宿主机打包，虚拟机解压）
::    node22.7z  = Node 22.23.3 win-x64
::    host.7z    = app.asar 中的 dsh/ 树（含 node_modules 与 web 前端）
7zr x node22.7z -oC:\DSH\node -y
7zr x host.7z   -oC:\DSH -y

:: 2. 启动 Host（在 Win7 本机）
C:\DSH\node\node-v22.23.3-win-x64\node.exe ^
  C:\DSH\host\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js ^
  web --host 127.0.0.1 --port 3080 --no-open

:: 3. 外壳配置指向本机，然后启动外壳
::    %USERPROFILE%\Desktop\DSH\resources\shell.config.json
::    { "url": "http://127.0.0.1:3080/", "token": "<host 打印的 token>", ... }
```

## 结果

| 检查项 | 结果 |
| --- | --- |
| `node -v` | ✅ `v22.23.3` |
| `fetch` / `structuredClone` | ✅ 原生可用 |
| `dsh web` 启动 | ✅ 监听 `127.0.0.1:3080`，打印带 token 的地址 |
| 原生模块加载 | ✅ 无 ABI / 缺 DLL 报错 |
| 前端资源 | ✅ 外壳内完整渲染（见 `docs/assets/win7-phase0-local.png`） |
| IE11 访问 | ❌ 白屏（预期：前端只支持现代 Chromium） |

## 过程中踩到的坑

1. **从 `app.asar` 抽取时要处理 `unpacked` 条目**：桌面版的原生二进制在
   `app.asar.unpacked`，直接按 asar 偏移读会得到 `NaN` 偏移。
2. **压缩包路径多套一层**：`host.7z` 内含 `host/` 目录，解压时再 `-ohost` 会变成
   `host\host\dsh`。正确做法是 `-o.`。
3. **token 提取**：`token=XXX` 前缀要去掉 6 个字符（`token=`），不是去掉 `token`，
   否则会多出一个 `=` 导致 401。
4. **IE11 不能作为验证手段**：白屏不代表 Host 有问题，必须用 Electron 外壳验证。

## 决策门 G0 结论

**方式 A：零源码改动。**

官方 npm 产物在 Node 22 上原样跑通，不需要 fork 上游、不需要 `patches/`。
`node-pty`（终端）等 Win10 专属能力仍未启用，属于功能层面的推迟，不影响 Host 主体。

## 对后续的影响

- Phase 1 的打包内容确定为：`node\` + `host\` + `app\`（外壳）+ 启动器。
- 安装包体积预估：Node 22 约 99 MB（未压缩）、Host 约 406 MB（压缩后约 94 MB）。
- 不再需要"外部 Host"模式，v0.1.0 的 `10.0.2.2` 配置只用于历史验证。
