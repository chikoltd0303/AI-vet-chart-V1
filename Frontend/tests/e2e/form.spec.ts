import { test, expect } from '@playwright/test';

test('検索フォームから結果一覧が表示される（APIモック）', async ({ page }) => {
  // /api/animals をモックして安定化（ホスト差異に強いワイルドカードパターン）
  await page.route('**/api/animals*', async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('query') || '';
    // モック結果
    const items = [
      {
        id: '0001',
        microchip_number: '0001',
        name: q || 'はなこ',
        age: 4,
        sex: 'F',
        breed: 'Holstein',
        farm_id: '佐藤牧場',
        thumbnailUrl: null,
        owner: '佐藤',
      },
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(items),
    });
  });

  await page.goto('/');

  // 入力 → 検索（安定セレクタに変更）
  await page.getByTestId('search-input').fill('はなこ');
  await page.getByTestId('btn-search').click();

  // API リクエスト完了を待機
  await page.waitForResponse((resp) => resp.url().includes('/api/animals') && resp.ok());

  // 検索結果表示を確認（結果ビューが表示され、アイテムが1件）
  await expect(page.getByTestId('results-view')).toBeVisible();
  await expect(page.getByTestId('result-item')).toHaveCount(1);
  await expect(page.getByText('はなこ')).toBeVisible();
});
