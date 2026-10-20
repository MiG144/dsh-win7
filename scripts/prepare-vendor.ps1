# Prepares apps\shell\vendor\{node,host} so electron-builder can bundle a
# self-contained, single-machine installer.
#
# Usage examples:
#   .\prepare-vendor.ps1 -NodeDir D:\node-v22.23.3-win-x64 -HostDir D:\host
#   .\prepare-vendor.ps1 -NodeDir <dir> -AsarPath "%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\app.asar"
#   .\prepare-vendor.ps1 -NodeDir <dir> -HostDir <dir> -Link    # junctions, no copy
#
# Expected results:
#   vendor\node\node.exe
#   vendor\host\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js

param(
  [Parameter(Mandatory = $true)][string]$NodeDir,
  [string]$HostDir = '',
  [string]$AsarPath = '',
  [switch]$Link
)

$ErrorActionPreference = 'Stop'

$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
$shell = Join-Path $repo 'apps\shell'
$vendor = Join-Path $shell 'vendor'
$nodeTarget = Join-Path $vendor 'node'
$hostTarget = Join-Path $vendor 'host'

function Remove-Target([string]$Target) {
  if (-not (Test-Path $Target)) { return }
  $item = Get-Item $Target -Force
  if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    # Remove the junction itself; never recurse into the target.
    [System.IO.Directory]::Delete($Target)
  } else {
    Remove-Item $Target -Recurse -Force
  }
}

function New-LinkOrCopy([string]$Source, [string]$Target) {
  Remove-Target $Target
  if ($Link) {
    New-Item -ItemType Junction -Path $Target -Target $Source | Out-Null
  } else {
    Copy-Item $Source $Target -Recurse -Force
  }
}

# --- Node runtime -----------------------------------------------------------
$nodeSrc = Resolve-Path $NodeDir
if (Test-Path (Join-Path $nodeSrc 'node.exe')) {
  $nodeRoot = $nodeSrc
} else {
  $inner = Get-ChildItem $nodeSrc -Directory -Filter 'node-v*-win-x64' | Select-Object -First 1
  if (-not $inner) { throw "node.exe not found under $nodeSrc" }
  $nodeRoot = $inner.FullName
}
New-Item -ItemType Directory -Force -Path $vendor | Out-Null
New-LinkOrCopy $nodeRoot $nodeTarget

# --- Host tree --------------------------------------------------------------
if ($HostDir) {
  $hostSrc = Resolve-Path $HostDir
  # Accept either a dir that already contains dsh\, or the dsh\ dir itself.
  if (Test-Path (Join-Path $hostSrc 'dsh')) {
    New-LinkOrCopy $hostSrc $hostTarget
  } elseif (Test-Path (Join-Path $hostSrc 'node_modules\@deepseek-ai\dsh')) {
    New-Item -ItemType Directory -Force -Path $hostTarget | Out-Null
    New-LinkOrCopy $hostSrc (Join-Path $hostTarget 'dsh')
  } else {
    throw "host tree not recognised: $hostSrc"
  }
} elseif ($AsarPath) {
  New-Item -ItemType Directory -Force -Path $hostTarget | Out-Null
  node (Join-Path $PSScriptRoot 'extract-host.js') $AsarPath $hostTarget dsh
} else {
  throw 'pass either -HostDir or -AsarPath'
}

# --- Verify -----------------------------------------------------------------
$nodeExe = Join-Path $nodeTarget 'node.exe'
$binJs = Join-Path $hostTarget 'dsh\node_modules\@deepseek-ai\dsh\lib\bin.js'
if (-not (Test-Path $nodeExe)) { throw "missing: $nodeExe" }
if (-not (Test-Path $binJs)) { throw "missing: $binJs" }

$nodeVersion = & $nodeExe -v
$sizeMb = [math]::Round(((Get-ChildItem $hostTarget -Recurse -File | Measure-Object Length -Sum).Sum) / 1MB, 1)

Write-Host "vendor ready" -ForegroundColor Green
Write-Host "  node : $nodeVersion  ($nodeExe)"
Write-Host "  host : $binJs  (${sizeMb} MB)"
Write-Host "  mode : $(if ($Link) { 'junction' } else { 'copy' })"
