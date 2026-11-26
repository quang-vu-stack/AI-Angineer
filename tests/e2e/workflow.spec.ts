import { test, expect } from '@playwright/test';
test('CEO attaches a real task, reviews QA and authorizes delivery separately', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('pause-toggle-btn').click();
  await page.getByTestId('open-company-mgmt-btn').click();
  const tasks = page.getByTestId('mgmt-tab-tasks'),
    flow = page.getByRole('button', { name: /^Quy trình \(/ });
  await tasks.click();
  await page.getByTestId('task-title-input').fill('QA workflow delivery');
  await page.getByTestId('task-submit-btn').click();
  await flow.click();
  await page.getByLabel('Thêm nhiệm vụ giai đoạn 1').selectOption({ label: 'QA workflow delivery' });
  await page.getByRole('button', { name: 'Khởi động quy trình' }).click();
  await expect(page.getByText('Trạng thái: working')).toBeVisible();
  await tasks.click();
  const row = page.getByRole('row').filter({ hasText: 'QA workflow delivery' });
  await row.getByRole('button', { name: 'Start' }).click();
  await row.getByRole('button', { name: 'Done' }).click();
  await flow.click();
  const note = page.getByPlaceholder('Kết quả kiểm tra hoặc lý do trả lại');
  await note.fill('QA confirmed');
  await page.getByRole('button', { name: 'QA đạt' }).click();
  await expect(page.getByText('Trạng thái: approval')).toBeVisible();
  await note.fill('CEO accepts');
  await page.getByRole('button', { name: 'CEO duyệt bàn giao' }).click();
  await expect(page.getByText('Trạng thái: delivered')).toBeVisible();
});
