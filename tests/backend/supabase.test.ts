import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialAgents } from '../../src/agents/roster';
import { CompanyService } from '../../src/company/companyService';
import { SaveConflictError } from '../../src/persistence/saveConflict';
import { SupabaseSaveStore } from '../../src/persistence/supabaseStore';

test('optional Supabase adapter scopes each save and uses compare-and-set revisions', async () => {
  const owner = 'faede3da-321c-4f13-9d9b-4d87356a2975';
  const snapshot = CompanyService.create(createInitialAgents()).snapshot();
  let row: { owner_id: string; slot_id: string; revision: number } | undefined;
  const store = new SupabaseSaveStore({
    projectUrl: 'https://example.test',
    publishableKey: 'sb_publishable_TEST_ONLY',
    userId: owner,
    getAccessToken: async () => 'TEST-ONLY',
    fetch: async (input, options) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/rest/v1/company_game_saves');
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer TEST-ONLY');
      if (options?.method === 'POST') {
        if (row) return new Response(null, { status: 409 });
        row = JSON.parse(String(options.body));
        assert.equal(row?.owner_id, owner);
      } else {
        assert.equal(url.searchParams.get('owner_id'), `eq.${owner}`);
        assert.equal(url.searchParams.get('slot_id'), 'eq.main');
      }
      if (options?.method === 'PATCH' && row) {
        if (url.searchParams.get('revision') !== `eq.${row.revision}`) return Response.json([]);
        row = { ...row, ...JSON.parse(String(options.body)) };
      }
      return Response.json(row ? [row] : []);
    },
  });
  assert.equal(await store.load('main'), null);
  assert.equal((await store.save('main', snapshot, null)).revision, 1);
  assert.equal((await store.save('main', snapshot, 1)).revision, 2);
  await assert.rejects(store.save('main', snapshot, 1), SaveConflictError);
  assert.deepEqual((await store.load('main'))?.snapshot, snapshot);
});
