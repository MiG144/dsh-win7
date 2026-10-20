# 架构

> 状态：维护中 · 最后更新：2026-10-20

## 组件

| 组件 | 技术 | 职责 |
| --- | --- | --- |
| 外壳 `apps/shell` | Electron 22（Chromium 108 / Node 16.17） | 窗口、托盘、外链、polyfill、错误页 |
| 启动器 `apps/launcher`（Phase 1） | 原生或 Node | 起 Host、等端口就绪、起壳、统一退出、崩溃重启 |
| Host | DSH 官方包 + Node 22.23.3（社区 Win7 构建） | 会话、模型调用、工具执行、Web/WS 服务 |
| 模型出口 | 内网 OpenAI 兼容 API | 推理 |

## 进程模型

```
DSH-Win7.exe (Electron 外壳，主进程内置 LocalHost 管理器)
└─ node.exe  host\dsh\...\lib\bin.js web --host 127.0.0.1:<port> --no-open
     └──HTTP/WS──► 127.0.0.1:<port>
```

- Host 与壳生命周期绑定：壳退出 → 杀 Host；Host 崩溃 → 启动器重启（指数退避）。
- 只监听回环地址，操作系统层面不需要开放端口。

## 启动时序

1. 启动器读配置（`%APPDATA%\DSH-Win7\config.json`）
2. 拉起 Host，轮询 `GET http://127.0.0.1:3080/` 直到返回（超时 60 s）
3. 起壳，壳加载 `http://127.0.0.1:3080/`
4. 首次运行：Host 打印带 `?token=` 的地址，外壳用它换 cookie，之后免 token

## 鉴权

- Host 每次启动生成随机 launch token；`GET /?token=` 校验通过后写入
  HttpOnly + SameSite=Strict 的签名 cookie（默认 30 天，绑定 host+port）。
- 签名密钥保存在 Host 用户目录 `.credentials.yaml`，重启后 cookie 仍有效。
- 换 Host 地址/端口 → cookie 失效 → 需要重新用 token 登录。

## 磁盘布局

```
%LOCALAPPDATA%\Programs\DSH Win7\
├─ DSH-Win7.exe
├─ resources\
│  ├─ app\                 外壳代码
│  ├─ host\                Node + DSH Host（Phase 1）
│  └─ shell.config.json    外壳配置（地址、token、GPU、缩放）
└─ ...
%APPDATA%\DSH-Win7\
├─ config.json             模型与启动配置
└─ logs\
```

## 配置优先级（外壳）

`--url=` 参数 → `DSH_WIN7_URL` 环境变量 → `resources\shell.config.json` →
exe 同级目录 → 应用目录 → `userData`。

> 打包模板放在 `resources` 下，**会盖掉** exe 同级那份——改配置请改 `resources` 里的。

## Chromium 108 兼容层

`src/preload.js` 在页面脚本前注入 polyfill，全部特性检测、新浏览器上是空操作：

`Promise.withResolvers`、`AbortSignal.any/timeout`、`Array.prototype.toSorted/with`、
`Array.fromAsync`、`Object.groupBy`、`Set` 集合方法、`String.isWellFormed`、
`RegExp.escape`、`Iterator.from`。

CSS 侧只有少量降级（`color-mix` 底色、`@starting-style` 入场动画、
个别菜单的 anchor positioning），见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 为什么不分叉上游

Host 直接使用官方产物，仓库只承载"壳 + 启动器 + 打包"。
需要改上游时用 `patches/`，补丁数控制在个位数，升级只需 `git rebase` + 重放补丁。
详见 [PLAN.md](PLAN.md) ADR-007。
