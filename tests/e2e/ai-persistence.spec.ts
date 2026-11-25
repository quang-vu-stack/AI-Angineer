import { expect, test } from '@playwright/test';
import type { PersistedGameState } from '../../src/services/indexedDbService';

test('the game reloads persisted AI memory and executes a complete reset from the HUD', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const save = page.getByTitle('Lưu IndexedDB');
  const reset = page.getByTitle('Đặt lại mô phỏng');

  const readSlot = () => page.evaluate(() => new Promise<PersistedGameState | { deleted: true; revision: number } | null>((resolve, reject) => {
    const request = indexedDB.open('ai_company_world_3d_db', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('game_state');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('game_state');
      const read = transaction.objectStore('game_state').get('v0.1_slot_main');
      transaction.oncomplete = () => { db.close(); resolve(read.result ?? null); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }));

  await save.click();
  await expect.poll(async () => (await readSlot())?.revision).toBe(1);
  const original = await readSlot();
  expect(original && 'ai' in original && original.ai?.schemaVersion).toBe(1);

  // Seed established company history to make the reload/reset assertions independent of frame rate.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('ai_company_world_3d_db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('game_state', 'readwrite');
      const store = transaction.objectStore('game_state');
      const read = store.get('v0.1_slot_main');
      read.onsuccess = () => {
        const slot: PersistedGameState = read.result;
        const ai = slot.ai!;
        ai.memories.push({
          id: 'mem-990', agentId: 'EMP-01', day: 1, timestampSimMinutes: 500,
          kind: 'observation', summary: 'Ghi chú thử', importance: 5,
        });
        ai.relationships.push({
          fromAgentId: 'EMP-01', toAgentId: 'EMP-04', affinity: 8, trust: 54, lastInteractionDay: 1,
        });
        store.put(slot, 'v0.1_slot_main');
      };
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }));

  await page.reload();
  await save.click();
  await expect.poll(async () => (await readSlot())?.revision).toBe(2);
  const reloaded = await readSlot();
  expect(reloaded && 'ai' in reloaded && reloaded.ai?.memories.some(({ id }) => id === 'mem-990')).toBe(true);
  expect(reloaded && 'ai' in reloaded && reloaded.ai?.relationships[0]?.affinity).toBe(8);

  await reset.click();
  await expect.poll(readSlot).toEqual({ deleted: true, revision: 3 });
  await save.click();
  await expect.poll(async () => (await readSlot())?.revision).toBe(4);
  const fresh = await readSlot();
  expect(fresh && 'ai' in fresh && fresh.ai?.memories.some(({ id }) => id === 'mem-990')).toBe(false);
  expect(fresh && 'ai' in fresh && fresh.ai?.relationships).toEqual([]);
  expect(errors).toEqual([]);
});
