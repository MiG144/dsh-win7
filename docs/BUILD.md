# 构建

> 状态：维护中 · 最后更新：2026-10-20

## 前置

| 项 | 版本 |
| --- | --- |
| 构建机 | Windows 10/11 x64 |
| Node.js | 22 或 24 |
| npm | 10+ |
| 磁盘 | ≥ 2 GB（含 Electron 下载） |

> 构建机用新系统，**产物**跑在 Win7；Win7 不作为构建机。

## 本地构建

```powershell
cd apps\shell
npm ci
npm run dist:dir     # 只解包，快速验证
npm run dist         # NSIS 安装包 + portable
```

产物在 `apps/shell/dist/`：

```
DSH-Win7-0.1.0-setup.exe      安装包（NSIS）
DSH-Win7-0.1.0-portable.exe   单文件便携版
win-unpacked\                 解包目录
```

## 国内网络

Electron 二进制走 GitHub 可能很慢，可先设镜像：

```powershell
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
node node_modules\electron\install.js
```

## 已知构建问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `Cannot create symbolic link ... winCodeSign` | 解包 macOS 签名工具需要符号链接权限 | 以管理员运行，或开启 Windows"开发者模式"；实在不行用 `scripts/make-portable.ps1` 出绿色包 |
| `electron` 下载超时 | 直连 GitHub 慢 | 设 `ELECTRON_MIRROR` 后重跑 `node node_modules\electron\install.js` |

## CI

- `.github/workflows/ci.yml`：PR / push 到 main 时构建 `dist:dir`，上传解包产物
- `.github/workflows/release.yml`：推送 `v*` 标签时构建安装包，生成 `SHA256SUMS.txt`，
  创建 GitHub Release 并附上 `setup.exe`、`portable.exe`

发布流程：

```powershell
# 1. 改版本号（apps/shell/package.json、CHANGELOG.md）

> 状态：维护中 · 最后更新：2026-10-20
# 2. 提交并打标签

> 状态：维护中 · 最后更新：2026-10-20
git commit -am "release: v0.1.1"
git tag v0.1.1
git push origin main --tags
```

## 绿色包（不依赖 electron-builder）

```powershell
.\scripts\make-portable.ps1
```

把 Electron 运行时 + `resources\app` 拼成一个可直接拷贝的目录，
适合构建机没有符号链接权限、或需要手工分发时使用。

## 代码签名

当前**未签名**，Windows 会提示"未知发布者"。若要签名，需要：

1. 代码签名证书（OV/EV）
2. 在 CI 里配置 `CSC_LINK` / `CSC_KEY_PASSWORD` 两个 secret
3. electron-builder 会自动签名

Win7 只认 SHA-2 签名，签名机需支持 SHA-256。

## 离线打包（内网部署）

Phase 1 会把 Host 一起打进安装包，流程：

1. 在有网机器上 `npm ci` 完成依赖解析
2. 把 `node\`（Node 22 Win7 构建）、`host\`（DSH 包）、`app\`（外壳）放进 `extraResources`
3. electron-builder 产出单文件安装包，整包拷进内网

详见 [PLAN.md](PLAN.md) Phase 1。
