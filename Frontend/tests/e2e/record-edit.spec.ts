import { test, expect } from '@playwright/test';

test('詳細画面で記録を編集して保存（APIモック）', async ({ page }) => {
  const animalId = 'A-0003';
  const recordId = 'r1';

  // 検索結果モック（1件）
  await page.route('**/api/animals*', async (route) => {
    const items = [{ id: animalId, microchip_number: animalId, name: '編集牛', farm_id: '編集牧場' }];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) });
  });

  // 詳細APIモック（編集前）
  await page.route(`**/api/animals/${animalId}`, async (route) => {
    const detail = {
      animal: { id: animalId, microchip_number: animalId, name: '編集牛', farm_id: '編集牧場' },
      records: [
        {
          id: recordId,
          visit_date: '2025-08-31T10:00',
          soap: { s: '主訴A', o: '所見A', a: '評価A', p: '計画A' },
        },
      ],
      summary: 'サマリー',
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) });
  });

  // 記録更新モック（PUT）
  await page.route(`**/api/records/${recordId}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });

  // 更新後の詳細APIモック（再取得想定）
  let updated = false;
  await page.route(`**/api/animals/${animalId}`, async (route) => {
    const detail = {
      animal: { id: animalId, microchip_number: animalId, name: '編集牛', farm_id: '編集牧場' },
      records: [
        {
          id: recordId,
          visit_date: '2025-08-31T10:00',
          soap: updated ? { s: '主訴B', o: '所見B', a: '評価B', p: '計画B' } : { s: '主訴A', o: '所見A', a: '評価A', p: '計画A' },
        },
      ],
      summary: 'サマリー',
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) });
    updated = true;
  });

  await page.goto('/');

  // 検索→結果→詳細へ
  await page.getByTestId('search-input').fill('編集');
  await page.getByTestId('btn-search').click();
  await page.waitForResponse((resp) => resp.url().includes('/api/animals') && resp.ok());
  await page.getByTestId('result-item').click();
  await expect(page.getByTestId('detail-view')).toBeVisible();

  // 編集開始
  await page.getByTestId('btn-edit-record').first().click();
  await page.getByTestId('edit-soap-s').fill('主訴B');
  await page.getByTestId('edit-soap-o').fill('所見B');
  await page.getByTestId('edit-soap-a').fill('評価B');
  await page.getByTestId('edit-soap-p').fill('計画B');

  // 保存
  await page.getByTestId('btn-save-record').click();

  // 反映確認（再取得後の表示）
  await expect(page.getByText('計画B')).toBeVisible();
});
