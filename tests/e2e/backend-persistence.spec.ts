import { expect, test } from '@playwright/test';

test('saves company task progress from the in-game HUD and restores it after reload', async ({ page }) => {
  const failed: string[] = [];
  page.on('pageerror', (error) => failed.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('agent-item-EMP-04')).toBeVisible();

  const readSave = () => page.evaluate(() => new Promise<{
    revision?: number;
    company?: {
      employees: Array<{ id: string }>;
      tasks: Array<{ assignedAgentId: string | null; progress: number }>;
    };
  } | null>((resolve, reject) => {
    const request = indexedDB.open('ai_company_world_3d_db', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('game_state');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('game_state', 'readonly');
      const read = transaction.objectStore('game_state').get('v0.1_slot_main');
      transaction.oncomplete = () => { db.close(); resolve(read.result ?? null); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }));

  await page.getByTestId('agent-item-EMP-04').click();
  const progressLabel = page.getByTestId('agent-inspector').getByText(/^Nhiệm vụ \(/);
  await expect.poll(async () => Number((await progressLabel.textContent())?.match(/(\d+)%/)?.[1]))
    .toBeGreaterThan(53);

  const save = page.getByTitle('Lưu IndexedDB');
  await save.click();
  await expect.poll(async () => (await readSave())?.company?.employees.length).toBe(20);
  const firstSave = await readSave();
  expect(firstSave?.company?.tasks).toHaveLength(20);
  const progress = firstSave?.company?.tasks.find((task) => task.assignedAgentId === 'EMP-04')?.progress;
  expect(progress).toBeGreaterThan(53);
  expect(firstSave?.revision).toBe(1);

  await page.reload();
  await expect(page.getByTestId('agent-item-EMP-04')).toBeVisible();
  await save.click();
  await expect.poll(async () => (await readSave())?.revision).toBe(2);
  const reloadedProgress = (await readSave())?.company?.tasks.find((task) => task.assignedAgentId === 'EMP-04')?.progress;
  expect(reloadedProgress).toBeGreaterThanOrEqual(progress!);
  expect(failed).toEqual([]);
});
