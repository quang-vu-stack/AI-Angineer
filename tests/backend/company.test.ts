import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createInitialAgents } from '../../src/agents/roster';
import type { ITaskManager } from '../../src/ai/interfaces';
import { CompanyService } from '../../src/company/companyService';
import type { LedgerEntry, NewTask } from '../../src/types/company';

const now = '2026-11-25T14:00:00Z';
const project = { id: 'demo', name: 'Demo', department: 'operations' } as const;
const task = {
  id: 'demo-task', title: 'Demo API', department: 'engineering', projectId: 'demo',
  priority: 'high', assignedAgentId: 'EMP-04', dueAt: '2026-11-24T14:00:00Z',
} satisfies NewTask;
const capital = {
  id: 'funding', kind: 'capital', amountVnd: 1_000_000,
  description: 'Vốn', recordedAt: now, projectId: null,
} satisfies LedgerEntry;

const newCompany = () => CompanyService.create(createInitialAgents());

test('uses all Gemini employee IDs, departments and seed tasks without sharing mutable state', () => {
  const roster = createInitialAgents();
  const company = CompanyService.create(roster);
  assert.deepEqual(company.staff.listEmployees().map(({ id }) => id), roster.map(({ id }) => id));
  assert.equal(company.staff.listDepartments().length, 6);
  assert.equal(company.tasks.getAllTasks().length, 20);
  company.snapshot().employees[0].skills.push('external edit');
  assert.deepEqual(company.staff.getEmployee(roster[0].id).skills, roster[0].skills);
  assert.equal(company.tasks.getDisplayTask(roster[0].id)?.progress, roster[0].taskProgress);
});

test('manages employees and department records while enforcing open-task restrictions', () => {
  const company = newCompany();
  company.staff.renameDepartment('engineering', 'Kỹ thuật');
  assert.equal(company.staff.getDepartment('engineering').name, 'Kỹ thuật');
  assert.throws(() => company.staff.renameDepartment('engineering', ' '));
  const employee = { ...company.staff.getEmployee('EMP-04'), id: 'EMP-NEW' };
  company.staff.hire(employee);
  assert.throws(() => company.staff.hire(employee), /Duplicate/);
  assert.equal(company.staff.listEmployees('engineering').length, 6);
  assert.throws(() => company.changeEmployee('EMP-04', 'design', 'active'), /task department/);
  company.tasks.assignTask('task-EMP-04', employee.id);
  assert.equal(company.changeEmployee('EMP-04', 'design', 'on-leave').availability, 'on-leave');
  assert.equal(company.staff.getEmployee('EMP-04').department, 'design');
});

test('implements the Gemini ITaskManager and advances eligible tasks in deterministic order', () => {
  const company = newCompany();
  const aiTasks: ITaskManager = company.tasks;
  assert.throws(() => company.tasks.create(task), /Unknown project/);
  company.projects.create(project);
  assert.throws(() => company.projects.create(project), /Duplicate/);
  assert.throws(() => company.tasks.create({ ...task, assignedAgentId: 'EMP-01' }), /task department/);
  company.tasks.create(task);
  assert.throws(() => company.tasks.transition(task.id, 'completed'), /Invalid task transition/);
  assert.equal(aiTasks.advanceTaskProgress('EMP-04', Infinity), null);
  assert.equal(aiTasks.advanceTaskProgress('EMP-04', 120)?.id, 'task-EMP-04');
  assert.equal(aiTasks.advanceTaskProgress('EMP-04', 30)?.progress, 30);
  company.tasks.transition(task.id, 'blocked');
  assert.equal(aiTasks.advanceTaskProgress('EMP-04', 5), null);
  assert.equal(company.tasks.getDisplayTask('EMP-04')?.status, 'blocked');
  company.tasks.transition(task.id, 'in_progress');
  assert.equal(aiTasks.advanceTaskProgress('EMP-04', 90)?.status, 'completed');
  assert.throws(() => aiTasks.assignTask(task.id, 'EMP-05'), /Completed/);
});

test('calculates completion, partial progress, blocked status and overdue KPI', () => {
  const company = newCompany();
  company.projects.create(project);
  assert.equal(company.projectKpi(project.id, now).progressPercent, 0);
  company.tasks.transition('task-EMP-04', 'completed');
  company.tasks.create(task);
  company.tasks.advanceTaskProgress('EMP-04', 60);
  company.tasks.transition(task.id, 'blocked');
  company.tasks.create({ ...task, id: 'due-now', assignedAgentId: 'EMP-05', dueAt: now });
  assert.deepEqual(company.projectKpi(project.id, now), {
    total: 2, completed: 0, blocked: 1, overdue: 1, completionPercent: 0, progressPercent: 30,
  });
  company.tasks.transition(task.id, 'in_progress');
  company.tasks.advanceTaskProgress('EMP-04', 40);
  assert.equal(company.projectKpi(project.id, now).completionPercent, 50);
});

test('records VND balances and rejects overdraft, invalid amounts and duplicate entries', () => {
  const company = newCompany();
  company.projects.create(project);
  assert.equal(company.finance.summary().balanceVnd, 0);
  company.finance.record(capital);
  company.finance.record({ ...capital, id: 'sale', kind: 'revenue', amountVnd: 250_000, projectId: project.id });
  company.finance.record({ ...capital, id: 'rent', kind: 'expense', amountVnd: 300_000 });
  assert.throws(() => company.finance.record({ ...capital, id: 'overdraw', kind: 'expense' }), /Insufficient funds/);
  assert.throws(() => company.finance.record({ ...capital, id: 'overflow', amountVnd: Number.MAX_SAFE_INTEGER }), /precision/);
  assert.throws(() => company.finance.record({ ...capital, id: 'fraction', amountVnd: 0.25 }));
  assert.throws(() => company.finance.record(capital), /Duplicate/);
  assert.deepEqual(company.finance.summary(), {
    capitalVnd: 1_000_000, revenueVnd: 250_000, expensesVnd: 300_000,
    operatingProfitVnd: -50_000, balanceVnd: 950_000,
  });
});

test('validates snapshot versions, relationships, completion and financial invariants', () => {
  const snapshot = newCompany().snapshot();
  assert.deepEqual(CompanyService.restore(snapshot).snapshot(), snapshot);
  assert.throws(() => CompanyService.restore({ ...snapshot, schemaVersion: 2 }));
  assert.throws(() => CompanyService.restore({ ...snapshot, employees: [] }), /Unknown employee/);
  assert.throws(() => CompanyService.restore({ ...snapshot, projects: [] }), /Unknown project/);
  assert.throws(() => CompanyService.restore({
    ...snapshot, tasks: [{ ...snapshot.tasks[0], progress: 100 }],
  }), /Invalid task completion/);
  assert.throws(() => CompanyService.restore({
    ...snapshot, ledger: [{ ...capital, kind: 'expense' }],
  }), /Insufficient funds/);
});
