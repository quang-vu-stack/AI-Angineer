import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { CompanyService } from '../../src/company/companyService';
import { createInitialAgents } from '../../src/agents/roster';
import { loadGameFromIndexedDB, saveGameToIndexedDB } from '../../src/services/indexedDbService';
import { useGameStore } from '../../src/store/useGameStore';

const fresh = () => CompanyService.create(createInitialAgents());
function sale(c: CompanyService, amountVnd: number) {
  c.finance.record({
    id: 'sale',
    kind: 'revenue',
    description: 'QA sale',
    recordedAt: new Date().toISOString(),
    simDay: 1,
    projectId: null,
    amountVnd,
  });
}
test('issuance and dividend journals reconcile exact VND and reject duplicate IDs after restore', () => {
  const c = fresh(),
    g = c.corporate;
  const a = g.addHolder('A'),
    b = g.addHolder('B');
  assert.equal(g.dashboard().assets, 0);
  assert.equal(g.dashboard().shareValue, null);
  g.issue('first', a, 2, 10, 1);
  assert.deepEqual(
    g.preview(b, 1).map((h) => Math.round(h.afterPercent)),
    [67, 33],
  );
  g.issue('second', b, 1, 8, 1);
  assert.throws(() => g.dividend('premature', 1, 1));
  sale(c, 7);
  g.dividend('dist', 5, 1);
  assert.deepEqual(
    g.snapshot().dividends[0].payouts.map((p) => [p.holderId, p.amount]),
    [
      [b, 2],
      [a, 3],
    ],
  );
  assert.equal(c.finance.summary().operatingProfitVnd, 7);
  assert.equal(c.finance.report('day', 1).netCashFlowVnd, 30);
  assert.equal(g.dashboard().valuation, 30);
  assert.equal(g.dashboard().shareValue, 10);
  const restored = CompanyService.restore(c.snapshot());
  assert.throws(() => restored.corporate.issue('first', a, 2, 10, 1));
  assert.throws(() => restored.corporate.dividend('dist', 1, 1));
  assert.throws(() => restored.corporate.dividend('again', 3, 1));
  assert.deepEqual(restored.snapshot(), c.snapshot());
  const corrupt = c.snapshot();
  corrupt.corporate!.dividends[0].payouts[0].amount++;
  assert.throws(() => CompanyService.restore(corrupt), /dividend/);
});
test('debt reserves profit and valuation and the ledger enforces the available balance', () => {
  const c = fresh();
  c.business.configure('skills', 0, 200);
  c.business.advance(1);
  c.business.advance(2);
  const h = c.corporate.addHolder('A');
  c.corporate.issue('one', h, 1, 10, 2);
  sale(c, 100);
  assert.equal(c.corporate.dashboard().liabilities, 200);
  assert.equal(c.corporate.dashboard().valuation, 0);
  assert.throws(() => c.corporate.dividend('blocked', 1, 2));
  assert.throws(
    () =>
      c.finance.record({
        id: 'cost',
        kind: 'expense',
        amountVnd: 111,
        description: 'cost',
        recordedAt: new Date().toISOString(),
        projectId: null,
      }),
    /Insufficient funds/,
  );
  assert.equal(c.corporate.dashboard().assets, 110);
});
test('board snapshots voting power, rejects repeat votes and ties, applies a passed strategy once', () => {
  const c = fresh(),
    g = c.corporate,
    a = g.addHolder('A'),
    b = g.addHolder('B');
  for (const h of [a, b]) {
    g.issue(h, h, 1, 1, 1);
    g.board(h, true);
  }
  const id = g.propose('Capacity', 'capacity');
  g.issue('dilution', a, 10, 1, 2);
  g.vote(id, a, true);
  assert.throws(() => g.vote(id, a, true));
  const copy = CompanyService.restore(c.snapshot());
  copy.corporate.vote(id, b, false);
  assert.equal(copy.corporate.snapshot().proposals[0].status, 'rejected');
  assert.equal(copy.business.snapshot().strategy, 'skills');
  g.vote(id, b, true);
  assert.equal(c.business.snapshot().strategy, 'capacity');
  assert.throws(() => g.vote(id, b, true));
});
test('training contributes real task XP, promotion is reviewed and individual salary flows into existing payroll', () => {
  const c = fresh(),
    g = c.corporate,
    e = 'EMP-04';
  assert.throws(() => g.review(e, true));
  for (let i = 0; i < 6; i++) {
    g.train(e, 'Practice ' + i);
    const task = g.snapshot().training.at(-1)!;
    c.tasks.advanceTask(task.taskId, 100);
  }
  assert.equal(g.performance(e).rank, 'junior');
  assert.equal(g.performance(e).experiencePoints, 60);
  assert.equal(g.performance(e).pending, true);
  const refused = CompanyService.restore(c.snapshot());
  refused.corporate.review(e, false);
  assert.equal(refused.corporate.performance(e).pending, false);
  g.review(e, true);
  assert.equal(g.performance(e).rank, 'specialist');
  assert.equal(g.performance(e).salary, null);
  c.business.configure('skills', 2, 0);
  g.setSalary(e, 7);
  c.business.advance(1);
  c.business.advance(2);
  assert.equal(c.business.snapshot().unpaid[0].amountVnd, 45);
  sale(c, 46);
  c.business.advance(2);
  c.business.advance(2);
  assert.equal(c.finance.summary().balanceVnd, 1);
  const candidate = g.apply('Test applicant', 'Design');
  assert.throws(() => g.interview(candidate, 'planned'));
  g.interview(candidate, 'interview');
  g.interview(candidate, 'planned');
  assert.equal(c.staff.listEmployees().length, 20);
});
for (const version of ['0.2.0', '0.3.0'])
  test(
    version + ' save migrates in IndexedDB and preserves journal across reload until reset',
    async () => {
      Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
      const c = fresh();
      sale(c, 11);
      c.business.customer('Existing client');
      const legacy = c.snapshot();
      delete legacy.corporate;
      if (version === '0.2.0') delete legacy.business;
      await saveGameToIndexedDB(
        {
          version,
          day: 2,
          simMinutes: 510,
          speed: 1,
          quality: 'medium',
          savedAtIso: new Date().toISOString(),
          agents: createInitialAgents(),
          company: legacy,
        },
        null,
      );
      const store = useGameStore.getState;
      await store().hydrateFromIndexedDB();
      const current = store().company;
      assert.equal(current.finance.summary().balanceVnd, 11);
      if (legacy.business) assert.deepEqual(current.business.snapshot(), legacy.business);
      const h = current.corporate.addHolder('Holder');
      current.corporate.issue('id', h, 1, 3, 2);
      current.corporate.dividend('div', 2, 2);
      current.corporate.board(h, true);
      current.corporate.propose('Plan', 'capacity');
      current.corporate.setSalary('EMP-04', 5);
      current.corporate.train('EMP-04', 'Training');
      current.corporate.apply('New', 'Artist');
      await store().saveNow();
      assert.equal(store().persistenceError, null);
      await store().hydrateFromIndexedDB();
      assert.deepEqual(store().company.snapshot(), current.snapshot());
      await store().resetSimulation();
      assert.equal(await loadGameFromIndexedDB(), null);
      assert.deepEqual(store().company.snapshot(), fresh().snapshot());
    },
  );
