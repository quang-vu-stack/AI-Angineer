import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createInitialAgents } from '../../src/agents/roster';
import { CompanyService } from '../../src/company/companyService';
import { useGameStore } from '../../src/store/useGameStore';
import { saveGameToIndexedDB } from '../../src/services/indexedDbService';

const create = () => CompanyService.create(createInitialAgents());
function proposal(company: CompanyService) {
  const customerId = company.business.customer('Studio');
  return {
    title: 'Release',
    customerId,
    projectId: 'world-v01',
    valueVnd: 500,
    dueDay: 2,
    requirements: [
      {
        title: 'Implement',
        department: 'engineering' as const,
        skills: company.staff.listEmployees('engineering')[0].skills,
      },
      { title: 'Review', department: 'design' as const, skills: [] },
    ],
  };
}

test('contracts dispatch across departments, expire or reject, and settle exactly once after restore', () => {
  const company = create(),
    b = company.business,
    terms = proposal(company);
  const rejected = b.propose(terms, 1),
    approved = b.propose(terms, 1),
    expired = b.propose(terms, 1);
  b.decide(rejected, false, 1);
  b.decide(approved, true, 1);
  assert.throws(() => b.decide(approved, true, 1));
  const ids = b.snapshot().contracts[1].taskIds;
  const tasks = company.tasks.getAllTasks().filter((t) => ids.includes(t.id));
  assert.deepEqual(
    tasks.map((t) => t.department),
    ['engineering', 'design'],
  );
  assert.equal(tasks[0].assignedAgentId, company.staff.listEmployees('engineering')[0].id);
  company.tasks.advanceTask(ids[0], 100);
  b.advance(1);
  assert.equal(company.finance.summary().balanceVnd, 0);
  company.tasks.advanceTask(ids[1], 100);
  b.advance(3);
  const restored = CompanyService.restore(company.snapshot());
  restored.business.advance(3);
  assert.equal(restored.finance.report('day', 3).revenueVnd, 500);
  assert.equal(restored.snapshot().ledger.length, 1);
  assert.equal(restored.business.snapshot().contracts.find((c) => c.id === expired)?.status, 'expired');
});

test('costs accrue once, survive insufficient funds and settle in the cash report for the payment day', () => {
  const c = create();
  c.business.configure('capacity', 3, 5);
  c.business.advance(7);
  c.business.advance(8);
  assert.equal(c.business.snapshot().unpaid.length, 2);
  const restored = CompanyService.restore(c.snapshot());
  restored.finance.record({
    id: 'investment',
    kind: 'capital',
    amountVnd: 200,
    projectId: null,
    description: 'CEO deposit',
    recordedAt: new Date().toISOString(),
    simDay: 8,
  });
  restored.business.advance(8);
  restored.business.advance(8);
  assert.equal(restored.finance.summary().balanceVnd, 135);
  assert.equal(restored.finance.report('week', 1).expensesVnd, 0);
  assert.equal(restored.finance.report('week', 2).expensesVnd, 65);
  assert.equal(restored.finance.report('month', 1).expensesVnd, 65);
  assert.deepEqual(restored.business.snapshot().unpaid, []);
});

test('routine work continues after foundation completion and does not duplicate an outstanding task', () => {
  const c = create();
  for (const t of c.tasks.getAllTasks()) c.tasks.advanceTask(t.id, 100);
  c.business.advance(1);
  const routines = c.business.snapshot().routines;
  assert.equal(routines.length, c.staff.listDepartments().length);
  c.business.advance(2);
  assert.deepEqual(c.business.snapshot().routines, routines);
  c.tasks.advanceTask(routines[0].taskId, 100);
  c.business.advance(2);
  assert.notEqual(c.business.snapshot().routines[0].taskId, routines[0].taskId);
});

test('V0.2 migration preserves undated ledger and full V0.3 state survives IndexedDB until reset', async () => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
  const agents = createInitialAgents(),
    c = create();
  c.finance.record({
    id: 'old',
    kind: 'capital',
    amountVnd: 123,
    description: 'Previous capital',
    projectId: null,
    recordedAt: new Date().toISOString(),
  });
  const legacy = c.snapshot();
  delete legacy.business;
  await saveGameToIndexedDB(
    {
      version: '0.2.0',
      day: 45,
      simMinutes: 60,
      speed: 1,
      quality: 'medium',
      savedAtIso: new Date().toISOString(),
      agents,
      company: legacy,
    },
    null,
  );
  const store = useGameStore.getState;
  await store().hydrateFromIndexedDB();
  const current = store().company;
  assert.equal(current.finance.report('month', 2).undatedEntries, 1);
  current.business.configure('capacity', 10, 1);
  current.business.advance(45);
  assert.equal(current.business.snapshot().unpaid.length, 0);
  const terms = proposal(current);
  current.business.decide(current.business.propose({ ...terms, dueDay: 45 }, 45), true, 45);
  await store().saveNow();
  assert.equal(store().persistenceError, null);
  await store().hydrateFromIndexedDB();
  assert.deepEqual(store().company.snapshot(), current.snapshot());
  await store().resetSimulation();
  assert.deepEqual(store().company.snapshot(), create().snapshot());
});

test('capacity policy prefers available work capacity and retries when a department returns from leave', () => {
  const c = create();
  const terms = proposal(c);
  const engineers = c.staff.listEmployees('engineering');
  for (const t of c.tasks.getAllTasks().filter(t => t.department === 'engineering')) c.tasks.advanceTask(t.id, 100);
  for (const e of engineers) c.changeEmployee(e.id, 'engineering', 'on-leave');
  c.business.configure('capacity', 0, 0);
  const id = c.business.propose(terms, 1);
  c.business.decide(id, true, 1);
  const taskId = c.business.snapshot().contracts[0].taskIds[0];
  const assigned = () => c.tasks.getAllTasks().find(t => t.id === taskId)?.assignedAgentId;
  assert.equal(assigned(), null);
  for (const e of engineers) c.changeEmployee(e.id, 'engineering', 'active');
  c.tasks.create({ id: 'busy', title: 'Other work', projectId: terms.projectId, department: 'engineering',
    assignedAgentId: engineers[0].id, priority: 'medium', dueAt: null });
  c.business.advance(1);
  assert.ok(assigned());
  assert.notEqual(assigned(), engineers[0].id);
});
