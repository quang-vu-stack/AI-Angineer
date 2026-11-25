import type { CompanyTask, ITaskManager } from '../ai/interfaces';
import type { Employee, ManagedTask, NewTask } from '../types/company';
import { taskSchema } from '../types/companySchema';

type TaskStatus = CompanyTask['status'];
const priorityRank = { low: 0, medium: 1, high: 2 };
const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  queued: ['in_progress', 'blocked'],
  in_progress: ['blocked', 'completed'],
  blocked: ['in_progress'],
  completed: [],
};

export function validateTaskAssignment(task: ManagedTask, employee?: Employee): void {
  if (task.assignedAgentId === null) {
    if (task.status === 'in_progress' || task.status === 'completed') throw new Error('Task requires an assignee');
    return;
  }
  if (!employee) throw new Error(`Unknown employee: ${task.assignedAgentId}`);
  if (task.status !== 'completed' && (employee.department !== task.department || employee.availability !== 'active')) {
    throw new Error('Assignee must be active in the task department');
  }
}

export function validateTaskProgress(task: ManagedTask): void {
  if ((task.status === 'completed') !== (task.progress === 100)) throw new Error('Invalid task completion');
}

export class TaskManager implements ITaskManager {
  readonly #tasks: Map<string, ManagedTask>;
  readonly #employee: (id: string) => Employee;
  readonly #validateScope: (task: ManagedTask) => void;

  constructor(tasks: ManagedTask[], employee: (id: string) => Employee, validateScope: (task: ManagedTask) => void) {
    this.#tasks = new Map(tasks.map((task) => [task.id, task]));
    this.#employee = employee;
    this.#validateScope = validateScope;
  }

  create(input: NewTask): ManagedTask {
    const task = taskSchema.parse({ ...input, status: 'queued', progress: 0 });
    if (this.#tasks.has(task.id)) throw new Error(`Duplicate task: ${task.id}`);
    this.#validateScope(task);
    this.validateAssignee(task);
    this.#tasks.set(task.id, task);
    return { ...task };
  }

  getAllTasks(): ManagedTask[] {
    return [...this.#tasks.values()].map((task) => ({ ...task }));
  }

  getTasksForAgent(agentId: string): ManagedTask[] {
    return [...this.#tasks.values()].filter((task) => task.assignedAgentId === agentId)
      .map((task) => ({ ...task }));
  }

  assignTask(taskId: string, agentId: string): void {
    this.assign(taskId, agentId);
  }

  assign(taskId: string, agentId: string | null): ManagedTask {
    const current = this.requireTask(taskId);
    if (current.status === 'completed') throw new Error('Completed tasks cannot be reassigned');
    const updated = { ...current, assignedAgentId: agentId };
    this.validateAssignee(updated);
    this.#tasks.set(taskId, updated);
    return { ...updated };
  }

  transition(taskId: string, status: TaskStatus): ManagedTask {
    const current = this.requireTask(taskId);
    if (status === current.status) return { ...current };
    if (!transitions[current.status].includes(status)) throw new Error(`Invalid task transition: ${current.status} -> ${status}`);
    const updated = { ...current, status, progress: status === 'completed' ? 100 : current.progress };
    this.validateAssignee(updated);
    this.#tasks.set(taskId, updated);
    return { ...updated };
  }

  getDisplayTask(agentId: string): ManagedTask | null {
    const current = this.findRunnableTask(agentId);
    if (current) return { ...current };
    const tasks = this.getTasksForAgent(agentId);
    return tasks.find((task) => task.status === 'blocked')
      ?? tasks.reverse().find((task) => task.status === 'completed')
      ?? null;
  }

  advanceTaskProgress(agentId: string, deltaProgress: number): ManagedTask | null {
    if (!Number.isFinite(deltaProgress) || deltaProgress <= 0) return null;
    const current = this.findRunnableTask(agentId);
    if (!current) return null;
    const progress = Math.min(100, current.progress + deltaProgress);
    const updated: ManagedTask = { ...current, progress, status: progress === 100 ? 'completed' : 'in_progress' };
    this.#tasks.set(updated.id, updated);
    return { ...updated };
  }

  private findRunnableTask(agentId: string): ManagedTask | undefined {
    let current: ManagedTask | undefined;
    let rank = -1;
    for (const task of this.#tasks.values()) {
      if (task.assignedAgentId !== agentId || (task.status !== 'queued' && task.status !== 'in_progress')) continue;
      const taskRank = priorityRank[task.priority] + (task.status === 'in_progress' ? 3 : 0);
      if (taskRank > rank) {
        current = task;
        rank = taskRank;
      }
    }
    return current;
  }

  private validateAssignee(task: ManagedTask): void {
    validateTaskAssignment(task, task.assignedAgentId === null ? undefined : this.#employee(task.assignedAgentId));
  }

  private requireTask(id: string): ManagedTask {
    const task = this.#tasks.get(id);
    if (!task) throw new Error(`Unknown task: ${id}`);
    return task;
  }
}
