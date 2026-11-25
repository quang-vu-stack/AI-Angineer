import type { DepartmentId } from '../agents/types';
import type { Department, Employee } from '../types/company';
import { departmentSchema, employeeSchema } from '../types/companySchema';

export class StaffDirectory {
  readonly #departments: Map<DepartmentId, Department>;
  readonly #employees: Map<string, Employee>;

  constructor(departments: Department[], employees: Employee[]) {
    this.#departments = new Map(departments.map((department) => [department.id, department]));
    this.#employees = new Map(employees.map((employee) => [employee.id, employee]));
  }

  getDepartment(id: DepartmentId): Department {
    const department = this.#departments.get(id);
    if (!department) throw new Error(`Unknown department: ${id}`);
    return { ...department };
  }

  listDepartments(): Department[] {
    return [...this.#departments.values()].map((department) => ({ ...department }));
  }

  renameDepartment(id: DepartmentId, name: string): Department {
    this.getDepartment(id);
    const department = departmentSchema.parse({ id, name });
    this.#departments.set(id, department);
    return { ...department };
  }

  getEmployee(id: string): Employee {
    const employee = this.#employees.get(id);
    if (!employee) throw new Error(`Unknown employee: ${id}`);
    return structuredClone(employee);
  }

  listEmployees(department?: DepartmentId): Employee[] {
    if (department !== undefined) this.getDepartment(department);
    return structuredClone([...this.#employees.values()].filter((employee) =>
      department === undefined || employee.department === department,
    ));
  }

  hire(input: Employee): Employee {
    const employee = employeeSchema.parse(input);
    this.getDepartment(employee.department);
    if (this.#employees.has(employee.id)) throw new Error(`Duplicate employee: ${employee.id}`);
    this.#employees.set(employee.id, employee);
    return structuredClone(employee);
  }

  update(employee: Employee): Employee {
    this.getEmployee(employee.id);
    const updated = employeeSchema.parse(employee);
    this.getDepartment(updated.department);
    this.#employees.set(updated.id, updated);
    return structuredClone(updated);
  }
}
