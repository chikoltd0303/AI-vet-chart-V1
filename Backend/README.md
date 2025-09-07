# AI Vet Chart Backend

FastAPI + Google Cloud APIs (Speech-to-Text / Gemini)。

## 起動

1. 依存関係
   ```bash
   pip install -r requirements.txt
   ```
2. 環境変数（`.env` 推奨）
   - Google 認証情報（どちらか一方）
     - `GOOGLE_SERVICE_ACCOUNT_B64`: サービスアカウントJSONのBase64
     - もしくは リポジトリ直下に `service_account.json` を配置
       （自動で `GOOGLE_APPLICATION_CREDENTIALS` を設定）
   - Gemini API キー（いずれかの名前）
     - `GOOGLE_GEMINI_API_KEY` または `GEMINI_API_KEY`
   - Google Sheets 連携
     - `SPREADSHEET_ID`: 対象スプレッドシートID
   - 任意の開発用オプション
     - `LOCAL_DEV=1` で Sheets の読み書きをスキップ（インメモリDBのみ）
3. サーバ起動
   ```bash
   uvicorn main:app --reload --port 8000
   ```

ヘルスチェック: `GET http://localhost:8000/health`

## フロントエンドとの連携

- フロント側の `NEXT_PUBLIC_API_URL` でバックエンドURLを指定（既定は `http://localhost:8000`）
 - CORS は以下の環境変数で調整可能（未設定時は localhost と `*.app.github.dev` を許可）
   - `CORS_ALLOW_ORIGINS`: 例 `http://localhost:3000,https://yourapp.example.com`
   - `CORS_ALLOW_ORIGIN_REGEX`: 例 `^https://.*\.your-domain\.com$`

## 設定ロジック（config.py）

- 起動時に `.env` を読み込み、以下を自動実行します。
  - `GOOGLE_SERVICE_ACCOUNT_B64` が設定されていれば `service_account.json` を生成
  - `service_account.json` が存在すれば `GOOGLE_APPLICATION_CREDENTIALS` を自動設定
  - Gemini API キーは `GOOGLE_GEMINI_API_KEY` / `GEMINI_API_KEY` のいずれかを参照
  - デバッグAPI（`/api/debug/*`）は `ENABLE_DEBUG_ENDPOINTS=1` の時のみ有効（既定=1）

> 既存の API やエンドポイントの挙動は変更していません。

## テスト（E2E）

- Playwright テストは `Frontend/` 配下に設置。`/health` などの疎通確認に利用可能。
