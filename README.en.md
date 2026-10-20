<div align="center">

<img src="apps/shell/assets/icon-256.png" width="72" alt="Harness7">

# Harness7

DeepSeek Harness for Windows 7

[![CI](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml/badge.svg)](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MiG144/dsh-win7)](https://github.com/MiG144/dsh-win7/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%207%20SP1%20x64-0078D6.svg)](#install)

<sub>Unofficial project · <a href="README.md">简体中文</a></sub>

</div>

## Overview

The official desktop app targets Electron 44, Node 24 and Python 3.12, none of which support
Windows 7. Harness7 supplies a Win7-capable runtime around the unmodified Harness build:

| Layer | Choice |
| --- | --- |
| Shell | Electron 22.3.27 (Chromium 108) |
| Runtime | Node.js 22.23.3 (community Win7 build) |
| Host | official `@deepseek-ai/dsh` (MIT) |
| Transport | `127.0.0.1:3080`, loopback |

The shell starts the host, waits until it is ready, loads the UI, and stops the host on exit.

## Status

| Phase | Scope | State |
| --- | --- | --- |
| Phase 0 | Node 22 + official host running on Win7 | ✅ verified |
| Phase 1 | Self-contained installer (shell + runtime + host) | ✅ released |
| Phase 2 | Terminal, Office and other capabilities | 📋 planned |

See [Releases](https://github.com/MiG144/dsh-win7/releases) for the latest build.

## Install

Run `Harness7-<version>-setup.exe`, or use `-portable.exe` for a portable build.
The binaries are unsigned; verify `SHA256SUMS.txt` after download.

Requirements: Windows 7 SP1 x64 · VC++ 2015-2019 x64 · 4 GB RAM · ~700 MB disk.
Patches and CJK setup are covered in [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) (Chinese).

## Build

```powershell
cd apps\shell
npm ci
npm run dist
```

Runtime preparation and offline packaging: [docs/BUILD.md](docs/BUILD.md) (Chinese).

## Documentation

The docs are written in Chinese. Entry points:

| Document | Content |
| --- | --- |
| [docs/PLAN.md](docs/PLAN.md) | Phases and acceptance criteria |
| [docs/PHASE0.md](docs/PHASE0.md) · [docs/PHASE1.md](docs/PHASE1.md) | Win7 verification records |
| [docs/FEASIBILITY.md](docs/FEASIBILITY.md) | Why this stack |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Process model and auth |
| [docs/BUILD.md](docs/BUILD.md) | Packaging, CI, offline distribution |
| [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) | Patches and feature matrix |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Planned work |

## Limitations

| Item | Note |
| --- | --- |
| Terminal, Office skills | Not supported yet; planned for Phase 2 |
| Chromium 108 | A few modern CSS features degrade gracefully |
| Windows 7 | Out of support; deploy on a controlled network |

## About

A personal project, largely AI-assisted, provided as-is without response-time or maintenance promises.
Code is [MIT](LICENSE) licensed; see [TRADEMARKS.md](TRADEMARKS.md).
