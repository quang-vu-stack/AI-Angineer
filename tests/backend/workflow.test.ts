import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createInitialAgents } from '../../src/agents/roster';
import { CompanyService } from '../../src/company/companyService';
import { useGameStore } from '../../src/store/useGameStore';
import { saveGameToIndexedDB, loadGameFromIndexedDB } from '../../src/services/indexedDbService';

const create = () => CompanyService.create(createInitialAgents());
const node = (taskId: string, after: string[] = []) => ({ taskId, after, dueDay: 1 });
function contract(c: CompanyService) {
  const projectId = 'delivery';
  c.projects.create({ id: projectId, name: 'Delivery', department: 'operations' });
  const cid = c.business.propose(
    {
      projectId,
      customerId: c.business.customer('QA studio'),
      title: 'Product',
      valueVnd: 100,
      dueDay: 4,
      requirements: [
        { title: 'Design', department: 'design', skills: [] },
        { title: 'Code', department: 'engineering', skills: [] },
        { title: 'Docs', department: 'media', skills: [] },
      ],
    },
    1,
  );
  c.business.decide(cid, true, 1);
  return c.business.snapshot().contracts[0].taskIds;
}
test('invalid DAGs never partially detach tasks; legal same-stage and cross-stage dependencies guard every execution path', () => {
  const c = create(),
    [a, b, d] = contract(c);
  const before = c.snapshot();
  for (const tasks of [
    [node(a, [a])],
    [node(a, [b]), node(b, [a])],
    [node(a, ['missing'])],
    [node(a), node(a)],
  ])
    assert.throws(() => c.workflow.create('delivery', [{ name: 'cycle', tasks }], 1));
  assert.throws(() =>
    c.workflow.create(
      'delivery',
      [
        { name: 'first', tasks: [node(a, [b])] },
        { name: 'second', tasks: [node(b)] },
      ],
      1,
    ),
  );
  assert.deepEqual(c.snapshot(), before);
  c.workflow.create(
    'delivery',
    [
      { name: 'design & code', tasks: [node(b, [a]), node(a)] },
      { name: 'release', tasks: [node(d)] },
    ],
    1,
  );
  const employee = c.staff.listEmployees('media')[0].id;
  assert.throws(() => c.tasks.assign(d, employee));
  assert.throws(() => c.tasks.transition(b, 'in_progress'));
  assert.equal(c.tasks.advanceTask(d, 100), null);
  assert.equal(c.tasks.advanceTask(b, 100), null);
  c.tasks.advanceTask(a, 100);
  c.business.advance(1);
  assert.ok(c.tasks.getAllTasks().find((t) => t.id === b)?.assignedAgentId);
  assert.equal(c.tasks.getAllTasks().find((t) => t.id === d)?.assignedAgentId, null);
  c.tasks.advanceTask(b, 100);
  c.business.advance(1);
  assert.equal(
    c.staff.getEmployee(c.tasks.getAllTasks().find((t) => t.id === d)!.assignedAgentId!).department,
    'media',
  );
});

test('support gates, daily deltas and overdue alerts survive restore and are not double counted', () => {
  const c = create(),
    [a] = contract(c);
  c.workflow.create('delivery', [{ name: 'work', tasks: [node(a)] }], 1);
  c.tasks.advanceTask(a, 15);
  c.business.advance(1);
  c.business.advance(1);
  c.tasks.transition(a, 'blocked');
  c.business.advance(2);
  const ticket = c.workflow.snapshot().tickets[0];
  assert.equal(ticket.taskId, a);
  assert.throws(() => c.tasks.transition(a, 'in_progress'));
  assert.equal(c.tasks.advanceTask(a, 10), null);
  const r = CompanyService.restore(c.snapshot());
  r.business.advance(2);
  assert.equal(r.workflow.report(2).events.filter((e) => e.kind === 'overdue').length, 1);
  r.workflow.resolve(ticket.id, 'Design supplied the missing spec', 2);
  assert.throws(() => r.workflow.resolve(ticket.id, 'repeat', 2));
  r.tasks.advanceTask(a, 25);
  r.business.advance(2);
  assert.deepEqual(r.workflow.report(1).work, [{ day: 1, taskId: a, points: 15 }]);
  assert.deepEqual(r.workflow.report(2).work, [{ day: 2, taskId: a, points: 25 }]);
  r.workflow.markRead();
  assert.equal(CompanyService.restore(r.snapshot()).workflow.unread, 0);
});

test('contract with rework settles exactly once after QA and CEO delivery; reviews themselves grant no XP or salary', () => {
  const c = create(),
    ids = contract(c);
  c.workflow.create('delivery', [{ name: 'parallel work', tasks: ids.map((id) => node(id)) }], 1);
  for (const id of ids) c.tasks.advanceTask(id, 100);
  c.business.advance(1);
  assert.equal(c.finance.summary().balanceVnd, 0);
  c.workflow.decide('delivery', 'qa', false, 'Fix packaging', 1);
  assert.throws(() => c.workflow.decide('delivery', 'approval', true, 'Early', 1));
  const forged = c.snapshot();
  forged.workflow!.plans[0].status = 'delivered';
  assert.throws(() => CompanyService.restore(forged));
  const fix = c.workflow.snapshot().plans[0].stages[0].tasks.at(-1)!.taskId;
  assert.equal(c.tasks.getAllTasks().find((t) => t.id === fix)?.progress, 0);
  c.tasks.advanceTask(fix, 100);
  c.business.advance(2);
  const stats = c.staff.listEmployees().map((e) => c.corporate.performance(e.id));
  c.workflow.decide('delivery', 'qa', true, 'Passed regression', 2);
  assert.throws(() => c.workflow.decide('delivery', 'qa', true, 'Duplicate', 2));
  c.business.advance(2);
  assert.equal(c.finance.summary().balanceVnd, 0);
  const r = CompanyService.restore(c.snapshot());
  r.workflow.decide('delivery', 'approval', true, 'Accepted by CEO', 2);
  r.business.advance(2);
  r.business.advance(2);
  assert.deepEqual(
    r.staff.listEmployees().map((e) => r.corporate.performance(e.id)),
    stats,
  );
  assert.equal(r.snapshot().ledger.length, 1);
  assert.equal(r.finance.summary().revenueVnd, 100);
  assert.equal(CompanyService.restore(r.snapshot()).workflow.snapshot().plans[0].status, 'delivered');
});
for (const version of ['0.2.0', '0.3.0', '0.4.0'])
  test('IndexedDB ' + version + ' to V0.5, mid-workflow restore and reset', async () => {
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
    const c = create();
    if (version !== '0.2.0') contract(c);
    if (version === '0.4.0') {
      const h = c.corporate.addHolder('Investor');
      c.corporate.issue('issue', h, 2, 9, 1);
    }
    const legacy = c.snapshot();
    delete legacy.workflow;
    if (version !== '0.4.0') delete legacy.corporate;
    if (version === '0.2.0') delete legacy.business;
    await saveGameToIndexedDB(
      {
        version,
        day: 1,
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
    const r = store().company;
    assert.deepEqual(r.snapshot().ledger, legacy.ledger);
    assert.equal(r.staff.listEmployees().length, 20);
    if (legacy.business) assert.deepEqual(r.business.snapshot(), legacy.business);
    if (legacy.corporate) assert.deepEqual(r.corporate.snapshot(), legacy.corporate);
    const ids = r.business.snapshot().contracts[0]?.taskIds ?? contract(r);
    r.workflow.create(
      'delivery',
      [
        { name: 'Alpha', tasks: [node(ids[0])] },
        { name: 'Beta', tasks: [node(ids[1])] },
      ],
      1,
    );
    r.workflow.requestHelp(ids[0], 'Need a decision', 1);
    await store().saveNow();
    assert.equal(store().persistenceError, null);
    await store().hydrateFromIndexedDB();
    assert.deepEqual(store().company.snapshot(), r.snapshot());
    await store().resetSimulation();
    assert.equal(await loadGameFromIndexedDB(), null);
    assert.deepEqual(store().company.snapshot(), create().snapshot());
  });
