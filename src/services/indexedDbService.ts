import type { AgentEntity } from '../agents/types';
import { parseCompanySnapshot } from '../company/companyService';
import { SaveConflictError } from '../persistence/saveConflict';
import type { CompanySnapshot } from '../types/company';
import { revisionSchema } from '../types/companySchema';
import type { QualityLevel } from './performanceMonitor';

const DB_NAME = 'ai_company_world_3d_db';
const DB_VERSION = 1;
const STORE_NAME = 'game_state';
const SAVE_KEY = 'v0.1_slot_main';

export interface PersistedGameState {
  version: string;
  savedAtIso: string;
  day: number;
  simMinutes: number;
  speed: number;
  quality: QualityLevel;
  agents: AgentEntity[];
  company?: CompanySnapshot;
  revision?: number;
}

interface ClearedSlot {
  deleted: true;
  revision: number;
}

type SlotRecord = PersistedGameState | ClearedSlot;

interface GameSlot {
  state: PersistedGameState | null;
  revision: number | null;
}

function readGameRevision(state: SlotRecord | null | undefined): number | null {
  if (state == null) return null;
  return state.revision === undefined ? 0 : revisionSchema.parse(state.revision);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không khả dụng trong trình duyệt này.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateSave(
  expectedRevision: number | null | undefined,
  update: (store: IDBObjectStore, revision: number) => void,
): Promise<number> {
  const db = await openDatabase();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const previous = store.get(SAVE_KEY);
      let revision = 0;
      tx.oncomplete = () => resolve(revision);
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
      previous.onsuccess = () => {
        try {
          const currentRevision = readGameRevision(previous.result);
          if (expectedRevision !== undefined && currentRevision !== expectedRevision) {
            throw new SaveConflictError(SAVE_KEY);
          }
          revision = revisionSchema.parse((currentRevision ?? 0) + 1);
          update(store, revision);
        } catch (error) {
          reject(error);
          tx.abort();
        }
      };
    });
  } finally {
    db.close();
  }
}

export async function saveGameToIndexedDB(
  state: PersistedGameState,
  expectedRevision?: number | null,
): Promise<number> {
  const payload = structuredClone(state);
  if (payload.company !== undefined) payload.company = parseCompanySnapshot(payload.company);
  return updateSave(expectedRevision, (store, revision) => {
    store.put({ ...payload, revision }, SAVE_KEY);
  });
}

export async function loadGameSlot(): Promise<GameSlot> {
  const db = await openDatabase();
  try {
    return await new Promise<GameSlot>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
      tx.oncomplete = () => {
        try {
          const record = req.result as SlotRecord | undefined;
          const state = !record || 'deleted' in record ? null : record;
          resolve({ state, revision: readGameRevision(record) });
        } catch (error) {
          reject(error);
        }
      };
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB read aborted'));
    });
  } finally {
    db.close();
  }
}

export async function loadGameFromIndexedDB(): Promise<PersistedGameState | null> {
  return (await loadGameSlot()).state;
}

export function clearSavedGame(expectedRevision?: number | null): Promise<number> {
  // Keep the revision across resets so another tab cannot resurrect an earlier game.
  return updateSave(expectedRevision, (store, revision) => {
    store.put({ deleted: true, revision } satisfies ClearedSlot, SAVE_KEY);
  });
}
