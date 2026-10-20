# Starts the DeepSeek Harness Web Host for local testing.
#
# Default: bind 127.0.0.1 and additionally trust the VirtualBox NAT gateway
# address (10.0.2.2), so a VM can reach http://10.0.2.2:3080/ without any
# firewall rule. Pass -TrustedHost '' to disable that.
#
# Run in a NORMAL PowerShell window and keep it open.

param(
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 3080,
  [string]$TrustedHost = '10.0.2.2:3080',
  [string]$DshPath = ''
)

$ErrorActionPreference = 'Stop'

$candidates = @()
if ($DshPath) { $candidates += $DshPath }
if ($env:DSH_CLI) { $candidates += $env:DSH_CLI }
$cmd = Get-Command dsh -ErrorAction SilentlyContinue
if ($cmd) { $candidates += $cmd.Source }
$candidates += (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd')

$dsh = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $dsh) {
  throw "dsh CLI not found. Pass -DshPath <path> or install the dsh command first."
}

$inUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($inUse) {
  Write-Host "[ERROR] Port $Port already in use (PID $($inUse.OwningProcess)). Try: -Port 3081" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "  DeepSeek Harness Host" -ForegroundColor Cyan
Write-Host "  dsh    : $dsh" -ForegroundColor Gray
Write-Host "  Bind   : ${BindHost}:$Port" -ForegroundColor Gray
if ($TrustedHost) { Write-Host "  Trust  : $TrustedHost" -ForegroundColor Gray }
Write-Host "  Stop   : Ctrl+C" -ForegroundColor Gray
Write-Host ""

$dshArgs = @('web', '--host', $BindHost, '--port', "$Port", '--no-open')
if ($TrustedHost) { $dshArgs += @('--trusted-host', $TrustedHost) }

& $dsh @dshArgs
