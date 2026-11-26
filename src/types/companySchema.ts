import { corporateSchema } from './corporate';
import { z } from 'zod';
import { DEPARTMENT_META } from '../agents/roster';
import type { DepartmentId } from '../agents/types';
import type { CompanySnapshot } from './company';

export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const titleSchema = z.string().trim().min(1).max(160);
export const instantSchema = z.iso.datetime();
export const revisionSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const departmentIdSchema = z.custom<DepartmentId>(
  (value) => typeof value === 'string' && Object.hasOwn(DEPARTMENT_META, value),
);

export const departmentSchema = z.strictObject({ id: departmentIdSchema, name: titleSchema });
export const employeeSchema = z.strictObject({
  id: idSchema, name: titleSchema, role: titleSchema, department: departmentIdSchema,
  skills: z.array(titleSchema), availability: z.enum(['active', 'on-leave']),
});
export const projectSchema = z.strictObject({ id: idSchema, name: titleSchema, department: departmentIdSchema });
export const taskSchema = z.strictObject({
  id: idSchema, title: titleSchema, department: departmentIdSchema, assignedAgentId: idSchema.nullable(),
  status: z.enum(['queued', 'in_progress', 'completed', 'blocked']),
  progress: z.number().min(0).max(100), priority: z.enum(['low', 'medium', 'high']),
  projectId: idSchema, dueAt: instantSchema.nullable(),
});
export const ledgerEntrySchema = z.strictObject({
  simDay: z.int().positive().optional(), id: idSchema, kind: z.enum(['capital', 'revenue', 'expense', 'dividend']),
  amountVnd: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  description: z.string().trim().min(1).max(1000), recordedAt: instantSchema, projectId: idSchema.nullable(),
});

export const simDaySchema = z.int().min(1).max(10000000);
export const requirementSchema = z.strictObject({
  title: titleSchema, department: departmentIdSchema, skills: z.array(titleSchema),
});
export const offerSchema = z.strictObject({
  title: titleSchema, customerId: idSchema, projectId: idSchema,
  valueVnd: z.int().positive(), dueDay: simDaySchema, requirements: z.array(requirementSchema).min(1).max(100),
});
export const businessSchema = z.strictObject({
  customers: z.array(z.strictObject({ id: idSchema, name: titleSchema })),
  contracts: z.array(offerSchema.extend({
    id: idSchema, status: z.enum(['proposed','active','rejected','completed','expired']),
    taskIds: z.array(idSchema),
  })),
  strategy: z.enum(['skills', 'capacity']),
  salaryPerEmployee: z.int().nonnegative(), dailyOverhead: z.int().nonnegative(),
  lastDay: simDaySchema.nullable(),
  routines: z.array(z.strictObject({ department: departmentIdSchema, taskId: idSchema, day: simDaySchema })),
  unpaid: z.array(z.strictObject({ day: simDaySchema, category: z.enum(['salary','overhead']), amountVnd: z.int().positive() })),
});
export type BusinessState = z.infer<typeof businessSchema>;
export type Offer = z.infer<typeof offerSchema>;

export const companySchema: z.ZodType<CompanySnapshot> = z.strictObject({
  schemaVersion: z.literal(1), currency: z.literal('VND'),
  departments: z.array(departmentSchema),
  employees: z.array(employeeSchema),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  corporate: corporateSchema.optional(), ledger: z.array(ledgerEntrySchema), business: businessSchema.optional(),
});
