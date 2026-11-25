import { DEPARTMENT_META } from '../agents/roster';
import type { AgentEntity, DepartmentId } from '../agents/types';
import { CompanyLedger, summarizeLedger } from '../economy/ledger';
import { TaskManager, validateTaskAssignment, validateTaskProgress } from '../tasks/taskManager';
import type { CompanySnapshot, Employee, ManagedTask } from '../types/company';
import { companySchema } from '../types/companySchema';
import { StaffDirectory } from './directory';
import { calculateProjectKpi, ProjectDirectory } from './projects';

function uniqueById<T extends { id: string }>(items: T[], label: string): Map<string, T> {
  const index = new Map(items.map((item) => [item.id, item]));
  if (index.size !== items.length) throw new Error(`Duplicate ${label} ID`);
  return index;
}

export function parseCompanySnapshot(input: unknown): CompanySnapshot {
  const snapshot = companySchema.parse(input);
  const departments = uniqueById(snapshot.departments, 'department');
  const employees = uniqueById(snapshot.employees, 'employee');
  const projects = uniqueById(snapshot.projects, 'project');
  uniqueById(snapshot.tasks, 'task');
  uniqueById(snapshot.ledger, 'ledger entry');
  if (departments.size !== Object.keys(DEPARTMENT_META).length) throw new Error('Company departments are incomplete');
  for (const item of [...snapshot.employees, ...snapshot.projects, ...snapshot.tasks]) {
    if (!departments.has(item.department)) throw new Error(`Unknown department: ${item.department}`);
  }
  for (const task of snapshot.tasks) {
    if (!projects.has(task.projectId)) throw new Error(`Unknown project: ${task.projectId}`);
    validateTaskProgress(task);
    validateTaskAssignment(task, task.assignedAgentId === null ? undefined : employees.get(task.assignedAgentId));
  }
  for (const entry of snapshot.ledger) {
    if (entry.projectId !== null && !projects.has(entry.projectId)) throw new Error(`Unknown project: ${entry.projectId}`);
  }
  summarizeLedger(snapshot.ledger);
  return snapshot;
}

const foundationProject = { id: 'world-v01', name: 'AI Company World 3D V0.1', department: 'operations' } as const;

export class CompanyService {
  readonly staff: Omit<StaffDirectory, 'update'>;
  readonly tasks: TaskManager;
  readonly projects: ProjectDirectory;
  readonly finance: CompanyLedger;
  readonly #directory: StaffDirectory;
  readonly #ledger: CompanySnapshot['ledger'];

  private constructor(snapshot: CompanySnapshot) {
    this.#directory = new StaffDirectory(snapshot.departments, snapshot.employees);
    this.staff = {
      getDepartment: (id) => this.#directory.getDepartment(id),
      listDepartments: () => this.#directory.listDepartments(),
      renameDepartment: (id, name) => this.#directory.renameDepartment(id, name),
      getEmployee: (id) => this.#directory.getEmployee(id),
      listEmployees: (id) => this.#directory.listEmployees(id),
      hire: (employee) => this.#directory.hire(employee),
    };
    this.projects = new ProjectDirectory(snapshot.projects, (id) => this.staff.getDepartment(id));
    this.tasks = new TaskManager(snapshot.tasks, (id) => this.staff.getEmployee(id), (task) => {
      this.staff.getDepartment(task.department);
      this.projects.require(task.projectId);
    });
    this.#ledger = snapshot.ledger;
    this.finance = new CompanyLedger(this.#ledger, (id) => this.projects.require(id));
  }

  static create(agents: readonly AgentEntity[]): CompanyService {
    const departments = (Object.keys(DEPARTMENT_META) as DepartmentId[]).map((id) => ({
      id, name: DEPARTMENT_META[id].label,
    }));
    const employees: Employee[] = agents.map(({ id, name, role, department, skills }) => ({
      id, name, role, department, skills, availability: 'active',
    }));
    const tasks: ManagedTask[] = agents.filter(({ currentTask }) => currentTask.trim() !== '').map((agent) => ({
      id: `task-${agent.id}`,
      title: agent.currentTask,
      department: agent.department,
      assignedAgentId: agent.id,
      status: agent.taskProgress === 100 ? 'completed' : agent.taskProgress === 0 ? 'queued' : 'in_progress',
      progress: agent.taskProgress,
      priority: 'medium',
      projectId: foundationProject.id,
      dueAt: null,
    }));
    return CompanyService.restore({
      schemaVersion: 1, currency: 'VND', departments, employees, projects: [foundationProject], tasks, ledger: [],
    });
  }

  static restore(snapshot: unknown): CompanyService {
    return new CompanyService(parseCompanySnapshot(snapshot));
  }

  changeEmployee(id: string, department: DepartmentId, availability: Employee['availability']): Employee {
    const employee = { ...this.staff.getEmployee(id), department, availability };
    for (const task of this.tasks.getTasksForAgent(id)) validateTaskAssignment(task, employee);
    return this.#directory.update(employee);
  }

  projectKpi(projectId: string, now: string) {
    this.projects.require(projectId);
    return calculateProjectKpi(this.tasks.getAllTasks().filter((task) => task.projectId === projectId), now);
  }

  snapshot(): CompanySnapshot {
    return {
      schemaVersion: 1,
      currency: 'VND',
      departments: this.staff.listDepartments(),
      employees: this.staff.listEmployees(),
      projects: this.projects.list(),
      tasks: this.tasks.getAllTasks(),
      ledger: structuredClone(this.#ledger),
    };
  }
}
