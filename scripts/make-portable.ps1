# Builds a green/portable Win7 x64 folder: Electron 22 runtime + resources/app.
# Use this when electron-builder cannot run (e.g. no symlink privilege for winCodeSign).
param(
  [string]$Destination = ''
)

$ErrorActionPreference = 'Stop'

$repo    = Resolve-Path (Join-Path $PSScriptRoot '..')
$shell   = Join-Path $repo 'apps\shell'
$electron = Join-Path $shell 'node_modules\electron\dist'

if (-not $Destination) { $Destination = Join-Path $shell 'dist\portable' }

if (-not (Test-Path (Join-Path $electron 'electron.exe'))) {
  throw "Electron 22 runtime missing. Run: cd apps\shell; npm install; node node_modules\electron\install.js"
}

if (Test-Path $Destination) { Remove-Item $Destination -Recurse -Force }
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Copy-Item (Join-Path $electron '*') $Destination -Recurse -Force

$app = Join-Path $Destination 'resources\app'
New-Item -ItemType Directory -Force -Path $app | Out-Null
Copy-Item (Join-Path $shell 'src') $app -Recurse -Force
Copy-Item (Join-Path $shell 'assets') $app -Recurse -Force
Copy-Item (Join-Path $shell 'package.json') $app -Force

# The shell reads its config from resources\shell.config.json next to the runtime.
$config = Join-Path $shell 'shell.config.json'
if (Test-Path $config) { Copy-Item $config (Join-Path $Destination 'resources\shell.config.json') -Force }

Rename-Item (Join-Path $Destination 'electron.exe') 'DSH Win7 Shell.exe'
Write-Host "Portable build ready: $(Resolve-Path $Destination)"
