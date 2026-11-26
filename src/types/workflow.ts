import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const title = z.string().trim().min(1).max(160);
export const dayNumber = z.int().min(1).max(10000000);
export const stageInput = z
  .array(
    z.strictObject({
      name: title,
      tasks: z.array(z.strictObject({ taskId: id, after: z.array(id), dueDay: dayNumber.nullable() })).min(1),
    }),
  )
  .min(1)
  .max(100);
export type StageInput = z.infer<typeof stageInput>;
const node = z.strictObject({
  taskId: id,
  after: z.array(id),
  dueDay: dayNumber.nullable(),
  released: z.boolean(),
  observed: z.number().min(0).max(100),
  late: z.boolean(),
});
const plan = z.strictObject({
  projectId: id,
  stages: z
    .array(z.strictObject({ name: title, tasks: z.array(node).min(1) }))
    .min(1)
    .max(100),
  status: z.enum(['working', 'qa', 'approval', 'delivered']),
});
const event = z.strictObject({
  projectId: id,
  taskId: id.nullable(),
  day: dayNumber,
  kind: z.enum([
    'handoff',
    'blocked',
    'resolved',
    'overdue',
    'complete',
    'qa',
    'defect',
    'approval',
    'delivered',
  ]),
  detail: title,
  read: z.boolean(),
});
export const workflowSchema = z.strictObject({
  plans: z.array(plan),
  events: z.array(event),
  tickets: z.array(
    z.strictObject({ id, taskId: id, reason: title, day: dayNumber, resolution: title.nullable() }),
  ),
  work: z.array(z.strictObject({ day: dayNumber, taskId: id, points: z.number().min(0).max(100) })),
});
export type WorkflowState = z.infer<typeof workflowSchema>;
export type WorkflowPlan = z.infer<typeof plan>;
