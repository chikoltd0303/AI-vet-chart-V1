$ErrorActionPreference = 'Stop'

param(
  [switch]$NoBackend,
  [switch]$NoFrontend
)

function Test-Command($name) {
  $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Start-Backend {
  Push-Location Backend
  try {
    if (-not (Test-Command python)) {
      Write-Warning 'python が見つかりません。Backend を起動できません。'
      return
    }
    # Prefer uvicorn module via python -m for venv compatibility
    Start-Job -Name 'backend' -ScriptBlock {
      Set-Location $using:PWD
      Set-Location Backend
      python -m uvicorn main:app --reload --port 8000
    } | Out-Null
    Write-Host '[dev] Backend (uvicorn) を起動しました -> http://localhost:8000'
  } finally {
    Pop-Location
  }
}

function Start-Frontend {
  Push-Location Frontend
  try {
    if (Test-Command pnpm) {
      Start-Job -Name 'frontend' -ScriptBlock {
        Set-Location $using:PWD
        Set-Location Frontend
        pnpm dev
      } | Out-Null
      Write-Host '[dev] Frontend (pnpm) を起動しました -> http://localhost:3000'
      return
    }
    if (Test-Command npm) {
      Start-Job -Name 'frontend' -ScriptBlock {
        Set-Location $using:PWD
        Set-Location Frontend
        npm run dev
      } | Out-Null
      Write-Host '[dev] Frontend (npm) を起動しました -> http://localhost:3000'
      return
    }
    Write-Warning 'pnpm / npm が見つかりません。Frontend を起動できません。'
  } finally {
    Pop-Location
  }
}

Write-Host '[dev] 同時起動を開始します。終了は Ctrl+C 後、ジョブ停止を実施してください。'
if (-not $NoBackend)  { Start-Backend }
if (-not $NoFrontend) { Start-Frontend }

Write-Host "[dev] ジョブ一覧は 'Get-Job'、停止は 'Stop-Job -Name backend,frontend' を利用できます。"

