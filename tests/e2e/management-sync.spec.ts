import { expect, test } from '@playwright/test';

test('the open management panel reflects simulation work and project KPI without a manual edit', async ({ page }) => {
  await page.goto('/');
  const pause = page.getByTestId('pause-toggle-btn');
  await pause.click();
  await page.getByTestId('open-company-mgmt-btn').click();
  await page.getByTestId('mgmt-tab-tasks').click();

  const task = page.getByRole('row').filter({ hasText: 'Tối ưu InstancedMesh và mục tiêu 60 FPS' });
  const progress = task.getByRole('cell').nth(3);
  const percentage = async () => Number.parseInt(await progress.innerText(), 10);
  const before = await percentage();

  // Resume from the existing HUD. Escape the overlay only for the control click.
  await page.getByTestId('close-company-mgmt-btn').click();
  await pause.click();
  await page.getByTestId('open-company-mgmt-btn').click();
  await expect.poll(percentage).toBeGreaterThan(before);

  await page.getByTestId('mgmt-tab-projects').click();
  const project = page.locator('.mgmt-project-card').filter({ hasText: 'AI Company World 3D V0.1' });
  const kpi = project.getByText(/% tiến độ/);
  const initialKpi = Number.parseInt(await kpi.innerText(), 10);
  await expect.poll(async () => Number.parseInt(await kpi.innerText(), 10)).toBeGreaterThan(initialKpi);
});

test('management changes, rejected expenses, ownership and KPI survive save until reset', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByTestId('pause-toggle-btn').click();
  const open = page.getByTestId('open-company-mgmt-btn');
  const projects = page.getByTestId('mgmt-tab-projects');
  const finance = page.getByTestId('mgmt-tab-finance');
  const finances = page.getByTestId('mgmt-content-finance');
  const tasks = page.getByTestId('mgmt-tab-tasks');
  const hr = page.getByTestId('mgmt-tab-hr');
  const employee = page.getByTestId('mgmt-content-hr').getByRole('row').filter({ hasText: 'EMP-04' });
  const seedTask = page.getByRole('row').filter({ hasText: 'Tối ưu InstancedMesh và mục tiêu 60 FPS' });
  const projectName = 'QA đồng bộ quản trị';
  const taskName = 'Đối soát dữ liệu Sprint 03';
  const task = page.getByRole('row').filter({ hasText: taskName });
  const project = page.locator('.mgmt-project-card').filter({ hasText: projectName });

  await open.click();
  await finance.click();
  await page.getByTestId('ledger-amount-input').fill('1200');
  await page.getByTestId('ledger-desc-input').fill('Vốn kiểm thử');
  await page.getByTestId('ledger-submit-btn').click();
  await expect(finances).toContainText('1.200 ₫');

  await page.getByTestId('ledger-kind-select').selectOption('expense');
  await page.getByTestId('ledger-amount-input').fill('1300');
  await page.getByTestId('ledger-desc-input').fill('Chi vượt quỹ');
  await page.getByTestId('ledger-submit-btn').click();
  await expect(page.getByText('Insufficient funds')).toBeVisible();
  await expect(finances).toContainText('1.200 ₫');
  await expect(finances.getByRole('row').filter({ hasText: 'Chi vượt quỹ' })).toHaveCount(0);

  await projects.click();
  await page.getByTestId('project-name-input').fill(projectName);
  await page.getByTestId('project-submit-btn').click();
  await expect(project).toBeVisible();
  await tasks.click();
  await page.getByTestId('task-title-input').fill(taskName);
  await page.getByRole('combobox', { name: 'Dự án của nhiệm vụ' }).selectOption({ label: projectName });
  await page.getByRole('combobox', { name: 'Người phụ trách nhiệm vụ mới' }).selectOption('EMP-04');
  await page.getByTestId('task-submit-btn').click();
  await task.getByRole('button', { name: 'Start' }).click();
  await task.getByRole('button', { name: 'Done' }).click();
  await expect(task).toContainText('Phạm Đức Anh');
  await expect(task).toContainText('100%');
  await hr.click();
  await employee.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(page.getByText('Assignee must be active in the task department')).toBeVisible();
  await tasks.click();
  await seedTask.getByRole('button', { name: 'Done' }).click();
  await hr.click();
  await employee.getByRole('button', { name: 'Active', exact: true }).click();
  await expect(employee.getByRole('button', { name: 'On-leave' })).toBeVisible();
  await projects.click();
  await expect(project).toContainText('Hoàn thành: 1 (100%)');

  const readRevision = () => page.evaluate(async () => {
    return new Promise<number | null>((resolve, reject) => {
      const request = indexedDB.open('ai_company_world_3d_db', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('game_state');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('game_state');
        const get = transaction.objectStore('game_state').get('v0.1_slot_main');
        transaction.oncomplete = () => { db.close(); resolve(get.result?.revision ?? null); };
        transaction.onabort = () => { db.close(); reject(transaction.error); };
      };
    });
  });
  const revBeforeSave = (await readRevision()) ?? 0;
  await page.getByTestId('close-company-mgmt-btn').click();
  await page.getByTitle('Lưu IndexedDB').click();
  await expect.poll(async () => (await readRevision()) ?? 0).toBeGreaterThan(revBeforeSave);
  const revAfterSave = (await readRevision()) ?? 0;

  await page.reload();
  await open.click();
  await finance.click();
  await expect(finances).toContainText('1.200 ₫');
  await projects.click();
  await expect(project).toContainText('Hoàn thành: 1 (100%)');
  await tasks.click();
  await expect(task).toContainText('Phạm Đức Anh');
  await expect(task).toContainText('completed');
  await hr.click();
  await expect(employee.getByRole('button', { name: 'On-leave' })).toBeVisible();

  await page.getByTestId('close-company-mgmt-btn').click();
  await page.getByTitle('Đặt lại mô phỏng').click();
  await expect.poll(async () => (await readRevision()) ?? 0).toBeGreaterThan(revAfterSave);
  await open.click();
  await projects.click();
  await expect(project).toHaveCount(0);
  await hr.click();
  await expect(employee.getByRole('button', { name: 'Active', exact: true })).toBeVisible();
  await finance.click();
  await expect(finances).toContainText('Chưa có bút toán');
  expect(errors).toEqual([]);
});
