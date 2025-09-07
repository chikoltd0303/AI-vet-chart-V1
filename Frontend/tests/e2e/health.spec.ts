import { test, expect } from '@playwright/test';

test('バックエンドの/healthが応答する', async ({ request }) => {
  if (process.env.SKIP_HEALTH === '1') {
    test.skip(true, 'SKIP_HEALTH=1 によりスキップ');
  }
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const res = await request.get(`${backendUrl}/health`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.status).toBe('ok');
});
