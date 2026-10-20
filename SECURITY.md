# 安全政策

## 报告漏洞

安全漏洞不要开公开 issue；使用 GitHub 的 [Private vulnerability reporting](https://github.com/MiG144/dsh-win7/security/advisories/new)。
我们会在 72 小时内确认。

## 威胁模型

本项目是一个把 Web UI 装进 Electron 的桌面壳，信任边界如下：

| 资产 | 位置 | 风险 |
| --- | --- | --- |
| Host 启动 token | 命令行输出 / `shell.config.json` | 拿到即可换取 30 天登录 cookie |
| 登录 cookie | Electron 用户数据目录 | 等同于 Host 的完整权限 |
| 模型 API Key | Host 侧配置 | 泄露可被滥用计费 |
| 本地文件 | Host 进程可读写 | 提示注入可能诱导越权操作 |

### 已知边界

- 安装包**没有代码签名**。从 GitHub Releases 下载，并核对 `SHA256SUMS.txt`。
- 外壳只应加载**你自己的** Host，不应用于访问不受信任的网站。
- Host 默认绑定 `127.0.0.1`。改成 `0.0.0.0` 或局域网地址会把它暴露给同网段，
  此时需要自行加防火墙、反向代理或隧道；DSH 本身没有用户体系。
- `shell.config.json` 含 token，已在 `.gitignore` 中排除；提交前应再检查一次。

## 支持的版本

只对最新 Release 提供安全修复。Win7 本身已停止安全更新，因此本项目的预期部署环境是
**受控网络**（内网，或经代理/防火墙限制出口的网络）。Host 默认只监听回环地址；
跨机访问需要自行加隧道或反向代理鉴权。
