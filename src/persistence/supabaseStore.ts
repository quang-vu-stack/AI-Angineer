import { z } from 'zod';
import { idSchema as keySchema, revisionSchema } from '../types/companySchema';
import type { CompanySnapshot } from '../types/company';
import { nextSave, parseSave } from './companySaveStore';
import { SaveConflictError } from './saveConflict';
import type { SavedCompany, SaveStore } from './companySaveStore';

const rowSchema = z.object({
  slot_id: keySchema,
  revision: revisionSchema,
  saved_at: z.iso.datetime({ offset: true }),
  snapshot: z.unknown(),
});

export interface SupabaseSaveOptions {
  projectUrl: string;
  publishableKey: string;
  userId: string;
  getAccessToken(): Promise<string | null>;
  fetch?: typeof globalThis.fetch;
}

export class SupabaseSaveStore implements SaveStore {
  readonly #endpoint: URL;
  readonly #request: typeof globalThis.fetch;
  readonly #options: SupabaseSaveOptions;

  constructor(options: SupabaseSaveOptions) {
    this.#options = { ...options, userId: z.uuid().parse(options.userId) };
    this.#endpoint = new URL('/rest/v1/company_game_saves', options.projectUrl);
    if (this.#endpoint.protocol !== 'https:' || this.#endpoint.username || this.#endpoint.password) {
      throw new Error('Supabase requires an HTTPS project URL without embedded credentials');
    }
    if (!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(options.publishableKey)) {
      throw new Error('A Supabase publishable key is required');
    }
    this.#request = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async load(slotId: string): Promise<SavedCompany | null> {
    keySchema.parse(slotId);
    const response = await this.send(this.slotUrl(slotId), { method: 'GET' });
    return (await this.readRow(response, slotId)) ?? null;
  }

  async save(slotId: string, snapshot: CompanySnapshot, expectedRevision: number | null): Promise<SavedCompany> {
    const save = nextSave(slotId, snapshot, expectedRevision);
    const fields = { snapshot: save.snapshot, saved_at: save.savedAt, revision: save.revision };
    const url = this.slotUrl(slotId);
    const isInsert = expectedRevision === null;
    if (isInsert) {
      url.searchParams.delete('owner_id');
      url.searchParams.delete('slot_id');
    } else {
      url.searchParams.set('revision', `eq.${expectedRevision}`);
    }
    const response = await this.send(url, {
      method: isInsert ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(isInsert ? { ...fields, owner_id: this.#options.userId, slot_id: slotId } : fields),
    });
    if (isInsert && response.status === 409) throw new SaveConflictError(slotId);
    const persisted = await this.readRow(response, slotId);
    if (!persisted) throw new SaveConflictError(slotId);
    if (persisted.revision !== save.revision) throw new Error('Unexpected Supabase save revision');
    return persisted;
  }

  private slotUrl(slotId: string): URL {
    const url = new URL(this.#endpoint);
    url.searchParams.set('owner_id', `eq.${this.#options.userId}`);
    url.searchParams.set('slot_id', `eq.${slotId}`);
    url.searchParams.set('select', 'slot_id,revision,saved_at,snapshot');
    return url;
  }

  private async send(url: URL, init: RequestInit): Promise<Response> {
    const accessToken = await this.#options.getAccessToken();
    if (!accessToken) throw new Error('Supabase requires an authenticated user');
    const headers = new Headers(init.headers);
    headers.set('apikey', this.#options.publishableKey);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return this.#request(url, { ...init, headers, redirect: 'error', cache: 'no-store' });
  }

  private async readRow(response: Response, slotId: string): Promise<SavedCompany | undefined> {
    if (!response.ok) throw new Error(`Supabase save request failed (HTTP ${response.status})`);
    const [row] = z.array(rowSchema).max(1).parse(await response.json());
    if (!row) return undefined;
    return parseSave({
      slotId: row.slot_id,
      revision: row.revision,
      savedAt: new Date(row.saved_at).toISOString(),
      snapshot: row.snapshot,
    }, slotId);
  }
}
