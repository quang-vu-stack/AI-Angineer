import type { DepartmentId } from '../agents/types';
import type { ManagedTask, Project } from '../types/company';
import { instantSchema, projectSchema } from '../types/companySchema';

export interface ProjectKpi {
  total: number;
  completed: number;
  blocked: number;
  overdue: number;
  completionPercent: number;
  progressPercent: number;
}

export function calculateProjectKpi(tasks: ManagedTask[], now: string): ProjectKpi {
  const timestamp = Date.parse(instantSchema.parse(now));
  const total = tasks.length;
  const completed = tasks.filter(({ status }) => status === 'completed').length;
  return {
    total,
    completed,
    blocked: tasks.filter(({ status }) => status === 'blocked').length,
    overdue: tasks.filter(({ status, dueAt }) =>
      status !== 'completed' && dueAt !== null && Date.parse(dueAt) < timestamp,
    ).length,
    completionPercent: total === 0 ? 0 : Math.round(completed / total * 100),
    progressPercent: total === 0 ? 0 : Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / total),
  };
}

export class ProjectDirectory {
  readonly #projects: Map<string, Project>;
  readonly #validateDepartment: (id: DepartmentId) => void;

  constructor(projects: Project[], validateDepartment: (id: DepartmentId) => void) {
    this.#projects = new Map(projects.map((project) => [project.id, project]));
    this.#validateDepartment = validateDepartment;
  }

  create(input: Project): Project {
    const project = projectSchema.parse(input);
    this.#validateDepartment(project.department);
    if (this.#projects.has(project.id)) throw new Error(`Duplicate project: ${project.id}`);
    this.#projects.set(project.id, project);
    return { ...project };
  }

  require(id: string): Project {
    const project = this.#projects.get(id);
    if (!project) throw new Error(`Unknown project: ${id}`);
    return { ...project };
  }

  list(): Project[] {
    return [...this.#projects.values()].map((project) => ({ ...project }));
  }
}
