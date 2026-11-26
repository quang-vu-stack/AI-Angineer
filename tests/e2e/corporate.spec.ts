import { test, expect } from '@playwright/test';
test('CEO previews dilution, issues shares, appoints a director and passes a strategy', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('pause-toggle-btn').click();
  await page.getByTestId('open-company-mgmt-btn').click();
  await page.getByRole('button', { name: 'Điều hành CEO' }).click();
  await page.getByPlaceholder('Tên cổ đông').fill('QA holder');
  await page.getByRole('button', { name: 'Thêm cổ đông' }).click();
  await page.getByPlaceholder('Số cổ phần').fill('5');
  await page.getByPlaceholder('Giá phát hành VNĐ').fill('100');
  await page.getByRole('button', { name: 'Xem pha loãng' }).click();
  await expect(page.getByText(/0.00% → 100.00%/)).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận giao dịch' }).click();
  await expect(page.getByText(/Tài sản tiền mặt 500/)).toBeVisible();
  await page.getByRole('button', { name: 'Bổ nhiệm' }).click();
  await page.getByPlaceholder('Tên đề xuất').fill('QA strategy');
  await page.getByLabel('Chiến lược đề xuất').selectOption('capacity');
  await page.getByRole('button', { name: 'Mở biểu quyết' }).click();
  await page.getByRole('button', { name: 'Tán thành' }).click();
  await expect(page.getByText(/QA strategy.*passed/)).toBeVisible();
});
