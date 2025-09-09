AI Vet Chart — Free Deployment Guide (Vercel + Render)

Overview
- Frontend: Next.js on Vercel (Hobby/Free)
- Backend: FastAPI (Uvicorn) on Render (Free Web Service)
- Secrets: Configure on each platform; do not commit credentials into repo

Prerequisites
- GitHub repository connected to both Vercel and Render
- Optional: Google credentials if you need Sheets/AI features (can skip for demo)

Backend (Render)
1) Import repo as Blueprint
   - Render Dashboard → New → Blueprint → select this repo
   - `render.yaml` will be auto-detected
2) Environment variables (Settings → Environment)
   - (preset) `PYTHON_VERSION=3.11`
   - (preset) `ENABLE_DEBUG_ENDPOINTS=0`
   - (preset) `CORS_ALLOW_ORIGIN_REGEX=^https://.*\.vercel\.app$`
   - (secret, optional) `GOOGLE_SERVICE_ACCOUNT_B64` = Base64 of service_account.json
   - (secret, optional) `SPREADSHEET_ID` = Google Sheet ID
   - (secret, optional) `GOOGLE_GEMINI_API_KEY` = Gemini API key
3) Deploy on Free plan
4) Verify health
   - Open: `https://<your-render>.onrender.com/health` → `{ "status": "ok" }`

Frontend (Vercel)
1) Import project from GitHub
   - Root Directory: `Frontend`
   - Framework Preset: Next.js (auto)
2) Environment Variables
   - `NEXT_PUBLIC_API_URL=https://<your-render>.onrender.com`
3) Deploy on Hobby/Free
4) Verify
   - Open: `https://<your-vercel>.vercel.app`
   - In browser DevTools → Network, calls to `/api/...` should target Render URL

Notes & Limitations (Free tier)
- Render Free sleeps; first request may be slow (cold start)
- `/uploads` is ephemeral; files may disappear on restart (demo only)
- Keep `service_account.json` and any `*.b64` out of git; use platform secrets

Troubleshooting
- CORS blocked: adjust `CORS_ALLOW_ORIGIN_REGEX` on Render (e.g. `^https://(.+\.)?vercel\.app$`)
- 404 or network errors from frontend:
  - Confirm `NEXT_PUBLIC_API_URL` is set in Vercel and re-deploy
  - Confirm Render health endpoint returns ok
  - Check `Frontend/next.config.js` rewrites reference `${API_BASE}` correctly

