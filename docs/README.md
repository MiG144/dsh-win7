# 文档索引

| 文档 | 内容 | 适合 |
| --- | --- | --- |
| [PHASE0.md](PHASE0.md) | Phase 0 实测：Win7 本机跑 Node 22 + Host | 想复现单机运行 |
| [PHASE1.md](PHASE1.md) | 自包含便携包的构建与 Win7 验证 | 想自己打包分发 |
| [FEASIBILITY.md](FEASIBILITY.md) | 技术选型论证 + Win7 实测数据（含截图） | 想了解"为什么这样选" |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 进程模型、鉴权、目录布局、Chromium 108 兼容层 | 要改代码的人 |
| [BUILD.md](BUILD.md) | 本地构建、CI、离线打包、代码签名 | 要出安装包的人 |
| [COMPATIBILITY.md](COMPATIBILITY.md) | Win7 补丁基线、功能矩阵、已知问题 | 部署/排障 |
| [VM-SETUP.md](VM-SETUP.md) | 用 VirtualBox 复现验证环境 | 没有 Win7 实机的人 |
| [FAQ.md](FAQ.md) | 安装、网络、数据位置等常见问题 | 第一次使用 |

## 阅读顺序建议

1. **第一次接触**：根目录 [README](../README.md) → 本文档索引 → [PHASE0.md](PHASE0.md)
2. **想跑起来**：[BUILD.md](BUILD.md)（构建）或 [PHASE0.md](PHASE0.md)（单机手搓）
3. **想部署到内网**：[COMPATIBILITY.md](COMPATIBILITY.md)（环境）→ [SECURITY.md](../SECURITY.md)（边界）
4. **想贡献代码**：[ARCHITECTURE.md](ARCHITECTURE.md) → [CONTRIBUTING.md](../CONTRIBUTING.md)

## 文档约定

- 中文为主，代码/命令/路径保持原文。
- 每篇开头标注**状态**与**最后更新日期**。
- 引用的截图放在 `docs/assets/`，命名用小写连字符。
- 涉及环境相关的路径一律用占位符：`<repo>`、`%LOCALAPPDATA%`、`<tmp>`。
