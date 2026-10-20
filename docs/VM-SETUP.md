# Win7 虚拟机验证 · 操作清单

> 状态：维护中 · 最后更新：2026-10-20

> 目标：在这台 Win11 上用虚拟机验证「DSH Win7 外壳」能不能在 Windows 7 上启动、连上 Host、正常对话。
> 预计总耗时：1 小时左右（装系统 30–45 分钟，其余 20 分钟）。

---

## 0. 已经完成的部分（不用你操作）

| 项目 | 状态 |
| --- | --- |
| 虚拟机 `DSH-Win7` | 已创建：Windows 7 (64-bit)，4 GB 内存，2 核，60 GB 动态磁盘（`D:\VMs\DSH-Win7`） |
| 光驱 | 已挂载 Win7 SP1 Ultimate x64 安装 ISO，启动顺序 光驱 → 硬盘 |
| 显示 | VBoxSVGA / 128 MB 显存 / 3D 加速关闭（模拟老机器，更贴近真实 Win7） |
| 网络 | 网卡1 = NAT（能上网），网卡2 = 仅主机 192.168.56.1/24（连 Host 用） |
| 启动自检 | 已试启动 12 秒，正常进入运行状态后关机 ✅（说明虚拟化没问题） |
| 待测程序 | 已打包：`apps\shell\<repo>\apps\shell\dist\dsh-win7-shell.zip`（92.9 MB） |
| 运行库 | `<repo>\VC_redist.x64.exe`（微软签名，14.29.30157） |

---

## 1. 安装 Windows 7（30–45 分钟）

- [ ] 打开 VirtualBox，选中左边的 **DSH-Win7**，点 **启动**
- [ ] **窗口一出现就点击进窗口，立刻按任意键**（比如空格）——否则 5 秒后会跳过光盘、提示找不到启动盘
- [ ] 语言页：English → **Next** → **Install now**
- [ ] 选版本：**Windows 7 Ultimate (x64)** → 勾选接受许可 → Next
- [ ] 安装类型：**Custom (advanced)**
- [ ] 选中那块 60 GB 的磁盘 → **New** → **Apply** → **OK** → **Next**
- [ ] 之后会重启 2–3 次，**不要按键**（让它从硬盘启动）
- [ ] 用户名填 `dsh`，密码**留空**（省得每次输）→ Next
- [ ] 产品密钥页面点 **Skip**
- [ ] 更新设置选 **Ask me later**
- [ ] 时区选 **(UTC+08:00) Beijing**
- [ ] 网络位置选 **Work network**（选 Public 会挡掉局域网访问）

> 装完会提示"此副本不是正版"，正常，30 天内不影响验证。

---

## 2. 把文件传进虚拟机（三选一）

### 方案 A：增强功能 + 共享文件夹（推荐）

- [ ] 虚拟机菜单 **Devices → Insert Guest Additions CD image...**
- [ ] 进虚拟机「计算机」，打开光驱，右键 `VBoxWindowsAdditions.exe` → **Run as administrator** → 一路 Next → 重启
- [ ] 关机，虚拟机 **Settings → Shared Folders → 添加**：路径 `<repo>`，名称 `dsh`，勾 **Auto-mount**
- [ ] 开机后资源管理器地址栏输入 `\\vboxsrv\dsh`，把 `VC_redist.x64.exe` 和 `apps\shell\<repo>\apps\shell\dist\dsh-win7-shell.zip` 拷到 `C:\`

> 如果增强功能装不上（提示数字签名/证书问题），跳到 **§5 故障处理**，or 直接用方案 C。

### 方案 B：Windows 共享文件夹

宿主机（**管理员** PowerShell）：

```powershell
New-SmbShare -Name dsh -Path <repo> -ReadAccess Everyone
```

虚拟机资源管理器打开 `\\192.168.56.1\dsh`。

### 方案 C：HTTP 下载（不依赖增强功能）

宿主机开一个临时下载服务（用 DSH 自带的 Python）：

```powershell
& "%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\primary-runtime\dependencies\python\python.exe" -m http.server 8000 --directory "<repo>\apps\shell\dist"
```

- [ ] 虚拟机里打开 IE，访问 `http://192.168.56.1:8000/dsh-apps/shell.zip` 下载
- [ ] 下载完右键解压到 `C:\DSH`

---

## 3. 安装 VC++ 运行库

- [ ] 双击 `VC_redist.x64.exe` → 安装 → **重启**

（Electron 22 需要 vcruntime140，不装会 0xc000007b）

---

## 4. 解决中文显示（重要）

英文版 Win7 没有中日韩字体，DSH 界面是中文的，可能全是方块。三选一：

- **最快**：把宿主机的 `msyh.ttc`、`msyhbd.ttc`、`simsun.ttc` 从 `C:\Windows\Fonts` 拷进虚拟机，右键 **Install**
- **正规**：控制面板 → Region and Language → Keyboards and Languages → Install/uninstall languages → 装简体中文（要联网）
- **偷懒**：DSH 设置里把界面语言切成 English

---

## 5. 在宿主机启动 Host

> 走 VirtualBox NAT（默认）时**不需要**任何防火墙规则；只有改成 host-only 网卡
> （`-BindHost 192.168.56.1 -TrustedHost ''`）才需要放行 3080。

- [ ] 普通 PowerShell 启动 Host（**保持窗口开着**）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "<repo>\scripts\start-host.ps1"
```

脚本默认绑定 `127.0.0.1:3080` 并信任 `10.0.2.2:3080`（VirtualBox NAT 的宿主机地址），
所以**不需要改防火墙**。它会打印一行带 token 的地址，像：

```
dsh web: http://127.0.0.1:3080/?token=<HOST-PRINTED-TOKEN>
```

**把这串 token 记下来**（只用于首次登录；每次启动 Host 都会换一个新的）。

> 启动时会刷出几条 `dsh: skipping profile bundle ...` 的警告，那是本机已装的第三方插件版本不兼容，**不影响验证**，忽略即可。

---

## 6. 配置并首次启动外壳

- [ ] 确认 `%USERPROFILE%\Desktop\DSH\DSH Win7 Shell.exe` 存在（zip 解压出来的）
- [ ] 用记事本打开 `%USERPROFILE%\Desktop\DSH\resources\shell.config.json`，改成：

```json
{
  "url": "http://10.0.2.2:3080/",
  "token": "刚才那串 token",
  "closeToTray": true,
  "gpu": "software",
  "zoom": 1
}
```

- [ ] 双击 `DSH Win7 Shell.exe`
- [ ] 应该出现 DSH 界面并自动登录；之后把 `token` 清空再启动，验证「免登录」

---

## 7. 验收清单

- [ ] 双击能启动，没有「缺少 DLL / 0xc000007b」弹窗
- [ ] 界面完整，中文/英文都正常显示（不糊、不缺字）
- [ ] 首次 token 登录成功
- [ ] 关闭再打开，仍然免登录（cookie 生效）
- [ ] 新建会话、发一条消息、流式输出正常
- [ ] 侧边栏、Markdown 代码块显示正常
- [ ] 关窗口 → 进托盘；单击托盘图标 → 窗口回来
- [ ] 宿主机停掉 Host → 虚拟机出现「无法连接」页；重起 Host → 点重试能恢复
- [ ] 连续开 30 分钟，任务管理器内存不持续上涨
- [ ] 截图存档：正常界面 + 断连界面各一张

---

## 8. 打快照（出问题能秒回）

VirtualBox → 选中 VM → **Snapshots** → **Take**：

1. `01-系统装好`
2. `02-运行库装好`
3. `03-外壳可用`

---

## 9. 故障对照

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 启动后直接 "No bootable medium" | 没在 5 秒内按键 | 重启 VM，窗口一出来就按键 |
| 双击壳报 0xc000007b | 缺 VC++/UCRT | 装 `VC_redist.x64.exe` 并重启 |
| 增强功能装不上 | Win7 缺 SHA-2 补丁 | 装 KB4490628 + KB4474419；或换 `https://mirrors.hust.edu.cn/virtualbox/6.1.50/VBoxGuestAdditions_6.1.50.iso` |
| 界面中文全是方块 | 英文版缺中文字体 | 见 §4 |
| 401 Unauthorized | token 过期，或访问地址和 Host 不一致 | 重新取 token；确认配置里是 `10.0.2.2:3080` |
| 连接被拒绝 / 一直转圈 | Host 没启动，或换了 IP 却没改 `--trusted-host` | 见 §5；确认 Host 窗口还开着 |
| 花屏/白屏 | 显卡 | `gpu` 已是 `software`；VirtualBox 里 3D 保持关闭 |
| 开机提示 VERR_VMX_NO_VMX | 和系统 VBS 冲突 | 一般不会发生（已用 WHP）；如出现，关「内核隔离 → 内存完整性」再试 |

---

## 10. 验证完怎么收尾

```powershell
# 关机后删除虚拟机（保留 ISO 和 zip）

> 状态：维护中 · 最后更新：2026-10-20
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" unregistervm "DSH-Win7" --delete
```

`D:\VMs` 目录可以直接删掉，能回收约 10–20 GB。

---

## 11. 以后怎么恢复这套环境（已验证通过的状态）

当前状态（2026-10-20）：虚拟机已**保存运行状态**（saved），快照 `03-DSH-working` 已存在，
Host 和下载服务都已停止。恢复只要两步：

1. **VirtualBox 里选中 `DSH-Win7` → 启动**（从保存状态秒恢复，Windows 不用重新登录，
   外壳会自动重连，可能先显示「重连中」）
2. **宿主机开一个 PowerShell 窗口**：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "<repo>\scripts\start-host.ps1"
```

等几秒，虚拟机会自动从「重连中」恢复；已在 cookie 有效期内，**不需要 token**。

> 只有换电脑/清了 cookie 时才需要重新拿 token：脚本会打印带 `?token=` 的地址，
> 把它填进 `%USERPROFILE%\Desktop\DSH\resources\shell.config.json` 的 `token` 字段。
>
> 想回到某个干净状态：VirtualBox → Snapshots → 选 `03-DSH-working` → **Restore**。

（`<repo>\apps\shell\dist\dsh-win7-shell.zip`、ISO、补丁都还在 `<repo>`，换新虚拟机时可以直接复用。）
