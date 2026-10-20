# Builds a green/portable Win7 x64 folder:
#   Electron 22 runtime + resources/app + resources/node + resources/host
# Use this when electron-builder cannot run (e.g. no symlink privilege for winCodeSign).
#
# Run scripts\prepare-vendor.ps1 first if you want a self-contained single-machine build.

param(
  [string]$Destination = ''
)

$ErrorActionPreference = 'Stop'

function Remove-Target([string]$Target) {
  if (-not (Test-Path $Target)) { return }
  $item = Get-Item $Target -Force
  if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    [System.IO.Directory]::Delete($Target)
  } else {
    Remove-Item $Target -Recurse -Force
  }
}

$repo    = Resolve-Path (Join-Path $PSScriptRoot '..')
$shell   = Join-Path $repo 'apps\shell'
$electron = Join-Path $shell 'node_modules\electron\dist'
$vendor  = Join-Path $shell 'vendor'

if (-not $Destination) { $Destination = Join-Path $shell 'dist\portable' }

if (-not (Test-Path (Join-Path $electron 'electron.exe'))) {
  throw "Electron 22 runtime missing. Run: cd apps\shell; npm install; node node_modules\electron\install.js"
}

Remove-Target $Destination
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
Copy-Item (Join-Path $electron '*') $Destination -Recurse -Force

$app = Join-Path $Destination 'resources\app'
New-Item -ItemType Directory -Force -Path $app | Out-Null
Copy-Item (Join-Path $shell 'src') $app -Recurse -Force
Copy-Item (Join-Path $shell 'assets') $app -Recurse -Force
Copy-Item (Join-Path $shell 'package.json') $app -Force

# Optional self-contained runtime: resources\node\node.exe and resources\host\dsh\...
if (Test-Path (Join-Path $vendor 'node')) {
  Copy-Item (Join-Path $vendor 'node') (Join-Path $Destination 'resources\node') -Recurse -Force
  Write-Host "  + node runtime"
}
if (Test-Path (Join-Path $vendor 'host')) {
  Copy-Item (Join-Path $vendor 'host') (Join-Path $Destination 'resources\host') -Recurse -Force
  Write-Host "  + host bundle"
}

# The shell reads its config from resources\shell.config.json next to the runtime.
$config = Join-Path $shell 'shell.config.json'
if (Test-Path $config) { Copy-Item $config (Join-Path $Destination 'resources\shell.config.json') -Force }

Rename-Item (Join-Path $Destination 'electron.exe') 'Harness7.exe'
Write-Host "Portable build ready: $(Resolve-Path $Destination)"
