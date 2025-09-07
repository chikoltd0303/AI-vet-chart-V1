import { test, expect } from '@playwright/test';

test('検索→結果→詳細への遷移（APIモック）', async ({ page }) => {
  const id = 'A-0002';

  // 検索結果のモック
  await page.route('**/api/animals*', async (route) => {
    const items = [
      { id, microchip_number: id, name: 'モック牛', farm_id: 'モック牧場' },
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) });
  });

  // 詳細APIのモック
  await page.route(`**/api/animals/${id}`, async (route) => {
    const detail = {
      animal: { id, microchip_number: id, name: 'モック牛', farm_id: 'モック牧場' },
      records: [],
      summary: 'サマリー',
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) });
  });

  await page.goto('/');

  // 検索→結果
  await page.getByTestId('search-input').fill('モック');
  await page.getByTestId('btn-search').click();
  await page.waitForResponse((resp) => resp.url().includes('/api/animals') && resp.ok());
  await expect(page.getByTestId('results-view')).toBeVisible();
  await expect(page.getByTestId('result-item')).toHaveCount(1);

  // 詳細へ
  await page.getByTestId('result-item').click();
  await expect(page.getByTestId('detail-view')).toBeVisible();
  await expect(page.getByText('モック牛')).toBeVisible();
  await expect(page.getByText(id)).toBeVisible();
});
