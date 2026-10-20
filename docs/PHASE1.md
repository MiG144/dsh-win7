# Phase 1 结果：自包含便携包在 Win7 上跑通

> 日期：2026-10-20　结论：**单机自包含形态已在真实 Win7 上启动成功**

## 目标

把外壳、Node 22 运行时和 DSH Host 打成一个目录，用户**只需运行一个 exe**：
外壳自己拉起 Host、等待就绪、抓 token、加载界面，退出时回收进程。

## 构建

```powershell
# 1. 准备运行时（node + host 放到 apps\shell\vendor）
.\scripts\prepare-vendor.ps1 `
  -NodeDir <node-v22.23.3-win-x64> `
  -HostDir <含 dsh\ 的目录> -Link

# 2. 组装便携目录（Electron + resources\app + resources\node + resources\host）
.\scripts\make-portable.ps1 -Destination D:\build\portable

# 3. 压缩分发（7z，约 192 MB）
7zr a dsh-win7-portable.7z portable -mx=3
```

产物布局：

```
portable\
├─ DSH Win7 Shell.exe
└─ resources\
   ├─ app\       外壳（main.js / host.js / preload.js）
   ├─ node\      node.exe 22.23.3 + npm
   └─ host\dsh\  DSH Host（含 node_modules 与 web 前端）
```

## 虚拟机验证

1. 通过内网 HTTP 把 `dsh-win7-portable.7z` 送进 Win7
2. 解压到 `%USERPROFILE%\Desktop\DSH-Win7`
3. 双击 `DSH Win7 Shell.exe`

| 检查项 | 结果 |
| --- | --- |
| 双击启动，无需预先开 Host | ✅ |
| 加载页 → DSH 界面 | ✅（Host 启动约 5–15 s） |
| token 自动抓取、自动登录 | ✅ |
| 关闭窗口后 Host 进程退出 | ✅ 端口释放、无残留 |
| 控制台错误 | 0 |

截图：`docs/assets/win7-phase1-selfcontained.png`。

## 踩坑

1. **不要往 `C:\` 根目录写文件**。Win7 下普通权限进程无法在系统盘根目录创建文件，
   `certutil` 会瞬间失败。改成 `%TEMP%` 或用户目录。
2. **大文件下载用 PowerShell `WebClient`**，而不是 `certutil -urlcache`：
   前者失败时会给出真实错误，后者只返回退出码。
3. **junction 清理要安全**：`Remove-Item -Recurse` 对 junction 可能递归进目标目录，
   改用 `[System.IO.Directory]::Delete()` 只删链接。

## 尚未完成

| 项 | 说明 |
| --- | --- |
| 安装包（NSIS） | ✅ 已由 CI 产出（`v0.2.0`，约 251 MB） |
| 首次配置向导 | 现在依赖 DSH 自带设置页填写模型 API |
| 开机自启 | 计划用注册表 Run 或计划任务 |
| 离线验证 | 断网环境装一遍、跑一遍 |
| 签名 | 无证书，SmartScreen 会提示 |
