This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## E2Eテスト（Playwright）

- 前提: フロントエンドが `http://localhost:3000` で起動していること
- バックエンドは `NEXT_PUBLIC_API_URL`（既定は `http://localhost:8000`）を参照します

### 実行コマンド（レポート可視化）

- スモークテスト実行
  ```bash
  npm run test:e2e
  ```
- 対話UIで実行
  ```bash
  npm run test:e2e:ui
  ```
- 操作記録から雛形生成（codegen）
  ```bash
  npm run test:e2e:codegen
  ```

- レポート／成果物
  - HTML: `Frontend/playwright-report/index.html`
  - JSON: `Frontend/playwright-results.json`
  - JUnit: `Frontend/playwright-junit.xml`
  - 失敗時のスクショ・動画・トレース: `Frontend/playwright-artifacts/`

### 設定

- `playwright.config.ts`
  - `baseURL`: `PLAYWRIGHT_BASE_URL` 環境変数があれば使用、なければ `http://localhost:3000`
  - 失敗時に `trace`/`screenshot`/`video` を保存

### 含まれるテスト

- `tests/e2e/smoke.spec.ts`: トップページに見出し「AI Vet Chart」が表示される
- `tests/e2e/health.spec.ts`: バックエンド `/health` が 200 を返す（`BACKEND_URL` で上書き可）
- `tests/e2e/form.spec.ts`: 検索フォームから結果表示（`/api/animals` をモックして安定化）

## MCP連携（雛形）

- `tools/mcp-playwright/server.mjs`: JSON-RPC 2.0 over stdio の簡易サーバ
  - `initialize` / `runTests` / `openTrace` / `codegen` を提供
  - `runTests` は `playwright-results.json` を解析し、`summary`（total/passed/failed/skipped、failures概要）を返します
  - 例: 以下のようなリクエストを標準入力に流すと実行
    ```json
    {"jsonrpc":"2.0","id":1,"method":"runTests","params":{"args":["-g","smoke"]}}
    ```
  - 注意: `npx playwright ...` を内部で呼び出すため、ローカルにPlaywrightがインストールされている必要があります
