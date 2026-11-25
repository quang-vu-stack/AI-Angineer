import type { DepartmentId } from '../agents/types';
import type { CompanyTask } from '../ai/interfaces';

export interface Department {
  id: DepartmentId;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: DepartmentId;
  skills: string[];
  availability: 'active' | 'on-leave';
}

export interface Project {
  id: string;
  name: string;
  department: DepartmentId;
}

export interface ManagedTask extends CompanyTask {
  projectId: string;
  dueAt: string | null;
}

export type NewTask = Omit<ManagedTask, 'status' | 'progress'>;

export interface LedgerEntry {
  id: string;
  kind: 'capital' | 'revenue' | 'expense';
  amountVnd: number;
  description: string;
  recordedAt: string;
  projectId: string | null;
}

export interface CompanySnapshot {
  schemaVersion: 1;
  currency: 'VND';
  departments: Department[];
  employees: Employee[];
  projects: Project[];
  tasks: ManagedTask[];
  ledger: LedgerEntry[];
}
