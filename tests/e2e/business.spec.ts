import { expect, test } from '@playwright/test';

test('CEO submits a customer contract and approves its department work', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('pause-toggle-btn').click();
  await page.getByTestId('open-company-mgmt-btn').click();
  await page.getByRole('button', { name: 'Kinh doanh' }).click();
  await page.getByLabel('Tên khách hàng').fill('QA Customer');
  await page.getByRole('button', { name: 'Thêm khách hàng' }).click();
  await page.getByPlaceholder('Tên hợp đồng').fill('QA Delivery');
  await page.getByLabel('Giá trị VNĐ').fill('123');
  await page.getByLabel('Hạn ngày').fill('9');
  await page.getByPlaceholder('Nội dung bàn giao').fill('QA acceptance');
  await page.getByLabel('Phòng ban 1').selectOption('engineering');
  await page.getByRole('button', { name: 'Đề xuất hợp đồng' }).click();
  await page.getByText(/QA Delivery.*proposed/).click();
  await page.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await expect(page.getByText(/QA Delivery.*active/)).toBeVisible();
  await page.getByTestId('mgmt-tab-tasks').click();
  const delivery = page.getByRole('row').filter({ hasText: 'QA acceptance' });
  await expect(delivery).toContainText('queued');
  await delivery.getByRole('button', { name: 'Start' }).click();
  await delivery.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Kinh doanh' }).click();
  await expect(page.getByText(/QA Delivery.*completed/)).toBeVisible();
  await expect(page.getByText(/Doanh thu 123 ₫/)).toBeVisible();
});
