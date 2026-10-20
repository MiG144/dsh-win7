# 常见问题

## Harness7 和 DeepSeek Harness 是什么关系？

Harness7 是一个**非官方**的 Windows 7 运行环境。界面和功能来自 DeepSeek Harness 官方软件，
Harness7 只负责让它能在 Win7 上启动，与 DeepSeek 没有隶属关系。

## 为什么需要它？

官方桌面版依赖 Electron 44、Node 24 和 Python 3.12，这三者都不支持 Windows 7。
Electron 22 是最后一个支持 Win7 的版本，Node 22 需要社区构建，Python 3.12 无法在 Win7 运行
（因此 Office 技能暂不可用）。

## 支持哪些系统？

Windows 7 **SP1 x64**。32 位系统不支持：Harness 的运行时和原生模块只有 x64 构建。

系统补丁（KB2533623、KB4474419、KB2999226、KB2670838 等）和 VC++ 运行库是必需的，
详见 [兼容性](COMPATIBILITY.md)。

## 需要联网吗？

安装后只需要能访问模型 API（内网或公网均可）。安装包自带运行时，不依赖公网 CDN。
完全离线的内网需要自备模型网关。

## 数据存在哪里？

- Harness 的会话、配置、凭据：`%USERPROFILE%\.dsh`
- 外壳的日志：`%APPDATA%\Harness7\host.log`
- 窗口位置等本地状态：`%APPDATA%\Harness7`

卸载程序不会删除这些目录，需要手动清理。

## 模型怎么配置？

启动后进入 Harness 的「设置 → 模型」，填写 OpenAI 兼容的 base URL、模型名和 API Key。
凭据保存在本机 `.dsh` 目录内，除了模型请求不会外发。

## 为什么安装包有 250 MB？

里面打包了 Electron 运行时（约 200 MB）、Node 22（约 100 MB）和 Harness 本体（约 400 MB），
压缩后约 250 MB，安装后约 700 MB。这样才不需要用户另外装 Node 或 npm。

## 有终端和 Office 功能吗？

还没有。终端依赖 `node-pty` 的 ConPTY（需要 Win10 1809+），Office 技能依赖 Python 3.12。
两者都在 [待办](BACKLOG.md) 的 Phase 2 里。

## 安装包为什么没有签名？

代码签名证书需要付费购买并做企业验证。没有签名时 Windows 会提示"未知发布者"，
请从 Releases 下载并核对 `SHA256SUMS.txt`。

## 可以商用吗？

代码是 MIT，允许商用。但 Windows 7 已停止安全更新，用于生产环境前请自行评估风险；
本项目不提供任何担保或支持承诺。
