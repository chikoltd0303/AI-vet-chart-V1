import { test, expect } from '@playwright/test';

test('新規登録フローで詳細画面に遷移（APIモック）', async ({ page }) => {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const id = '1234567890';

  // POST /api/animals をモック（作成されたAnimalを返す）
  await page.route(`${backendUrl}/api/animals`, async (route) => {
    const json = {
      id,
      microchip_number: id,
      name: 'テスト牛',
      farm_id: 'テスト牧場',
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
  });

  // GET /api/animals/{id} をモック（詳細情報を返す）
  await page.route(`${backendUrl}/api/animals/${id}`, async (route) => {
    const json = {
      animal: {
        id,
        microchip_number: id,
        name: 'テスト牛',
        farm_id: 'テスト牧場',
      },
      records: [],
      summary: 'ダミーサマリー',
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
  });

  await page.goto('/');

  // 新規登録ページへ
  await page.getByTestId('btn-new-animal').click();

  // 入力
  await page.getByTestId('input-microchip').fill(id);
  await page.getByTestId('input-farm').fill('テスト牧場');
  await page.getByTestId('input-name').fill('テスト牛');

  // 登録
  await page.getByTestId('btn-save-animal').click();

  // 詳細表示の一部が見える
  await expect(page.getByText('テスト牛')).toBeVisible();
  await expect(page.getByText(id)).toBeVisible();
});

