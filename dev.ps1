param([switch]$NoBackend, [switch]$NoFrontend)
$ErrorActionPreference = 'Stop'

function CmdExists([string]$name) { $null -ne (Get-Command $name -ErrorAction SilentlyContinue) }
function StopJobIfAny([string]$name) {
  $j = Get-Job -Name $name -ErrorAction SilentlyContinue
  if ($j) {
    try { Stop-Job -Job $j -Force -ErrorAction SilentlyContinue } catch {}
    try { Remove-Job -Job $j -Force -ErrorAction SilentlyContinue } catch {}
  }
}

# Script root
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) { $Root = (Get-Location).Path }

function Start-Backend {
  StopJobIfAny 'backend'
  $dir = Join-Path $Root 'Backend'
  if (-not (Test-Path $dir)) { Write-Host "WARN: backend dir not found: $dir"; return }

  $py = if (CmdExists 'python') { 'python' } elseif (CmdExists 'py') { 'py' } else { $null }
  if (-not $py) { Write-Host 'WARN: python not found'; return }

  Start-Job -Name 'backend' -ScriptBlock {
    param($d,$pycmd)
    Set-Location $d
    & $pycmd -m uvicorn main:app --reload --port 8000
  } -ArgumentList $dir,$py | Out-Null

  Write-Host 'OK: backend -> http://localhost:8000'
}

function Start-Frontend {
  StopJobIfAny 'frontend'
  $dir = Join-Path $Root 'Frontend'
  if (-not (Test-Path $dir)) { Write-Host "WARN: frontend dir not found: $dir"; return }

  if (CmdExists 'pnpm') {
    Start-Job -Name 'frontend' -ScriptBlock { param($d) Set-Location $d; pnpm dev } -ArgumentList $dir | Out-Null
    Write-Host 'OK: frontend (pnpm) -> http://localhost:3000'
  }
  elseif (CmdExists 'npm') {
    Start-Job -Name 'frontend' -ScriptBlock { param($d) Set-Location $d; npm run dev } -ArgumentList $dir | Out-Null
    Write-Host 'OK: frontend (npm) -> http://localhost:3000'
  }
  else {
    Write-Host 'WARN: pnpm/npm not found'
  }
}

if (-not $NoBackend)  { Start-Backend }
if (-not $NoFrontend) { Start-Frontend }

Write-Host 'TIP: jobs  -> Get-Job'
Write-Host 'TIP: stop  -> Stop-Job -Name backend,frontend; Remove-Job -Name backend,frontend'