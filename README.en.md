<div align="center">

<img src="apps/shell/assets/icon-256.png" width="80" alt="Harness7">

# Harness7

**Run DeepSeek Harness on Windows 7 SP1 x64**

[![CI](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml/badge.svg)](https://github.com/MiG144/dsh-win7/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MiG144/dsh-win7)](https://github.com/MiG144/dsh-win7/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%207%20SP1%20x64-0078D6.svg)](#install)

<sub>Unofficial project, not affiliated with DeepSeek · [简体中文](README.md)</sub>

</div>

---

## What is this

The official DeepSeek Harness desktop app requires Electron 44, Node 24 and Python 3.12 — none of
which support Windows 7. Harness7 wraps the unmodified Harness build in a Win7-compatible runtime:

| Layer | Choice |
| --- | --- |
| Shell | Electron 22.3.27 (Chromium 108, the last version supporting Win7) |
| Runtime | Node.js 22.23.3 (community Win7 build) |
| Host | official `@deepseek-ai/dsh` (MIT), unmodified |
| Transport | `127.0.0.1:3080`, loopback only |

The shell starts the host, waits until it is ready, loads the UI and stops the host on exit.
The host owns sessions, model calls and tool execution.

## Status

| Phase | Scope | State |
| --- | --- | --- |
| Phase 0 | Node 22 + official host running on Win7 | ✅ verified |
| Phase 1 | Self-contained installer (shell + runtime + host) | ✅ released |
| Phase 2 | Terminal, Office and other capabilities | 📋 planned |

See [Releases](https://github.com/MiG144/dsh-win7/releases). Renamed to **Harness7** in `v0.2.2`.

## Install

Download from [Releases](https://github.com/MiG144/dsh-win7/releases):

- `Harness7-<version>-setup.exe` — installer
- `Harness7-<version>-portable.exe` — portable executable

The binaries are **unsigned**; Windows SmartScreen will warn. Verify `SHA256SUMS.txt` after download.

**Requirements**: Windows 7 SP1 x64, VC++ 2015-2019 x64 runtime, 4 GB RAM, ~700 MB disk.
Windows updates and CJK environment notes are in the [compatibility doc](docs/COMPATIBILITY.md) (Chinese).

## Build from source

```powershell
cd apps\shell
npm ci
npm run dist
```

Full steps (including runtime preparation) are in [docs/BUILD.md](docs/BUILD.md) (Chinese).

## Documentation

The documentation is currently written in Chinese. Start here:

| Document | Content |
| --- | --- |
| [docs/PLAN.md](docs/PLAN.md) | Phases, acceptance criteria, risks |
| [docs/PHASE0.md](docs/PHASE0.md) · [docs/PHASE1.md](docs/PHASE1.md) | Win7 verification records |
| [docs/FEASIBILITY.md](docs/FEASIBILITY.md) | Why the stack is what it is |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Process model, auth, layout |
| [docs/BUILD.md](docs/BUILD.md) | Local build, CI, offline packaging |
| [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) | Patches, feature matrix, known issues |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Planned work |

## Known limitations

- **Unsigned** builds; verify the SHA256 before running.
- **No terminal and no Office skills yet** — scheduled for Phase 2.
- **Chromium 108** — a few modern CSS features degrade gracefully.
- **Windows 7 is out of support** — deploy on a controlled network.

## About

A personal project, largely AI-assisted, provided as-is without response-time or maintenance promises.
Code is [MIT](LICENSE) licensed; see [TRADEMARKS.md](TRADEMARKS.md) for naming and trademark notes.
