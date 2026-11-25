import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { createInitialAgents } from '../../src/agents/roster';
import { CompanyService } from '../../src/company/companyService';
import { SaveConflictError } from '../../src/persistence/saveConflict';
import {
  clearSavedGame, loadGameFromIndexedDB, loadGameSlot, saveGameToIndexedDB,
} from '../../src/services/indexedDbService';
import type { PersistedGameState } from '../../src/services/indexedDbService';
import { useGameStore } from '../../src/store/useGameStore';

const now = '2026-11-25T14:00:00.000Z';

function game(): PersistedGameState {
  return {
    version: '0.1.0', savedAtIso: now, day: 1, simMinutes: 510, speed: 1,
    quality: 'medium', agents: createInitialAgents(),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
  useGameStore.setState(useGameStore.getInitialState(), true);
});

test('saves company and world in one slot and rejects stale writes across resets', async () => {
  const initial = game();
  const payload = { ...initial, company: CompanyService.create(initial.agents).snapshot() };
  assert.deepEqual(await loadGameSlot(), { revision: null, state: null });
  const firstRevision = await saveGameToIndexedDB(payload, null);
  const writes = await Promise.allSettled([
    saveGameToIndexedDB({ ...payload, day: 2 }, firstRevision),
    saveGameToIndexedDB({ ...payload, day: 3 }, firstRevision),
  ]);
  const winner = writes.find((write) => write.status === 'fulfilled');
  const loser = writes.find((write) => write.status === 'rejected');
  assert.ok(winner);
  assert.ok(loser?.reason instanceof SaveConflictError);
  const saved = await loadGameFromIndexedDB();
  assert.equal(saved?.revision, winner.value);
  assert.deepEqual(saved?.company, payload.company);
  const resetRevision = await clearSavedGame(winner.value);
  assert.deepEqual(await loadGameSlot(), { revision: resetRevision, state: null });
  await assert.rejects(saveGameToIndexedDB(payload, winner.value), SaveConflictError);
  assert.equal(await saveGameToIndexedDB(payload, resetRevision), resetRevision + 1);
});

test('migrates an original Gemini save without losing progress or writing on load', async () => {
  const legacy = game();
  legacy.day = 3;
  legacy.agents[3].taskProgress = 67;
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('ai_company_world_3d_db', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('game_state');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction('game_state', 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.objectStore('game_state').put(legacy, 'v0.1_slot_main');
    });
  } finally {
    database.close();
  }

  await useGameStore.getState().hydrateFromIndexedDB();
  const loaded = useGameStore.getState();
  assert.equal(loaded.persistenceError, null);
  assert.equal(loaded.saveRevision, 0);
  assert.equal(loaded.day, 3);
  assert.equal(loaded.company.tasks.getDisplayTask('EMP-04')?.progress, 67);
  assert.deepEqual(await loadGameFromIndexedDB(), legacy);
  await loaded.saveNow();
  assert.equal(useGameStore.getState().saveRevision, 1);
  assert.equal((await loadGameFromIndexedDB())?.company?.tasks[3].progress, 67);
});

test('drives the real simulation and serializes save, hydrate and reset through Zustand', async () => {
  const initial = game();
  const company = CompanyService.create(initial.agents);
  useGameStore.setState({ agents: initial.agents, company });
  const before = company.tasks.getDisplayTask('EMP-04')!.progress;
  useGameStore.getState().tickSimulation(1);
  const after = company.tasks.getDisplayTask('EMP-04')!.progress;
  assert.ok(after > before);
  assert.equal(useGameStore.getState().agents[3].taskProgress, Math.round(after));
  company.projects.create({ id: 'backend', name: 'Backend', department: 'engineering' });
  const { saveNow, hydrateFromIndexedDB, resetSimulation } = useGameStore.getState();
  await Promise.all([saveNow(), saveNow()]);
  assert.equal(useGameStore.getState().saveRevision, 2);
  const restored = CompanyService.create(initial.agents);
  useGameStore.setState({ company: restored });
  await hydrateFromIndexedDB();
  assert.equal(useGameStore.getState().company.projects.require('backend').name, 'Backend');
  assert.equal(useGameStore.getState().company.tasks.getDisplayTask('EMP-04')?.progress, after);
  await resetSimulation();
  assert.equal(await loadGameFromIndexedDB(), null);
  assert.equal(useGameStore.getState().saveRevision, 3);
  assert.equal(useGameStore.getState().company.staff.listEmployees().length, 20);
});

test('leaves existing data intact after a stale save or an invalid snapshot', async () => {
  const initial = game();
  const company = CompanyService.create(initial.agents);
  const valid = { ...initial, company: company.snapshot() };
  await saveGameToIndexedDB(valid, null);
  await assert.rejects(saveGameToIndexedDB({
    ...valid, company: { ...valid.company, employees: [] },
  }, 1), /Unknown employee/);
  const state = useGameStore.getState();
  await state.saveNow();
  assert.match(useGameStore.getState().persistenceError ?? '', /revision conflict/);
  assert.equal((await loadGameFromIndexedDB())?.revision, 1);
});

test('hydrating after a reset in another tab discards the previous in-memory game', async () => {
  const initial = game();
  const company = CompanyService.create(initial.agents);
  company.projects.create({ id: 'old', name: 'Old game', department: 'engineering' });
  useGameStore.setState({ agents: initial.agents, company });
  const { saveNow, hydrateFromIndexedDB } = useGameStore.getState();
  await saveNow();
  await clearSavedGame(useGameStore.getState().saveRevision);
  await hydrateFromIndexedDB();
  assert.throws(() => useGameStore.getState().company.projects.require('old'), /Unknown project/);
  await saveNow();
  assert.equal((await loadGameFromIndexedDB())?.company?.projects.some(({ id }) => id === 'old'), false);
});
