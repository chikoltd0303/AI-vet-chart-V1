# AI Vet Chart — Monorepo Quick Start

This repository contains:
- `Backend/` — FastAPI + Google Cloud (Speech-to-Text, Gemini)
- `Frontend/` — Next.js app with Playwright E2E tests

## Dev: start both services (Windows / PowerShell)

```powershell
./dev.ps1           # start Backend(8000) + Frontend(3000)
./dev.ps1 -NoBackend  # start only Frontend
./dev.ps1 -NoFrontend # start only Backend
```

Requirements: Python with `uvicorn` available, and `pnpm` or `npm` for the frontend.

### Stop background jobs (PowerShell)
- List jobs: `Get-Job`
- Stop both: `Stop-Job -Name backend,frontend`

If ports are still in use, ensure jobs are stopped or close your terminal sessions that started them.

## E2E tests (from Frontend directory)

```powershell
cd Frontend
npm run test:e2e        # run headless tests
npm run test:e2e:ui     # run with Playwright UI
```

Environment variables used by tests:
- `PLAYWRIGHT_BASE_URL` (defaults to `http://localhost:3000`)
- `BACKEND_URL` (defaults to `NEXT_PUBLIC_API_URL` or `http://localhost:8000`)

See `Backend/README.md` and `Frontend/README.md` for details.

### Windows display tips (mojibake)
- If you see garbled Japanese output in PowerShell, try: `chcp 65001` before running commands, or use Windows Terminal with UTF-8.

### Credentials hygiene
- Prefer using `GOOGLE_SERVICE_ACCOUNT_B64` (Base64 of service_account.json) instead of committing the raw JSON. The repo `.gitignore` already ignores `service_account.json` and `*.b64`, but avoid keeping real keys in the repo directory.
- Backend auto-wires `service_account.json` at startup when `GOOGLE_SERVICE_ACCOUNT_B64` is present.
