import { z } from 'zod';

const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const title = z.string().trim().min(1).max(160);
const positive = z.int().positive();
export const rank = z.enum(['junior', 'specialist', 'senior', 'lead']);
export const stages = z.enum(['applied', 'interview', 'planned', 'rejected']);
const electorate = z.strictObject({ holderId: id, weight: positive, vote: z.boolean().nullable() });
export const corporateSchema = z.strictObject({
  holders: z.array(z.strictObject({ id, name: title, board: z.boolean() })),
  issues: z.array(z.strictObject({ id, holderId: id, quantity: positive, price: positive })),
  dividends: z.array(
    z.strictObject({
      id,
      payouts: z.array(z.strictObject({ holderId: id, amount: z.int().nonnegative() })),
    }),
  ),
  proposals: z.array(
    z.strictObject({
      id,
      title,
      strategy: z.enum(['skills', 'capacity']),
      electorate: z.array(electorate),
      status: z.enum(['open', 'passed', 'rejected']),
    }),
  ),
  profiles: z.array(
    z.strictObject({
      employeeId: id,
      rank,
      salary: z.int().nonnegative().nullable(),
      dismissed: rank.nullable(),
    }),
  ),
  training: z.array(z.strictObject({ employeeId: id, taskId: id, topic: title })),
  candidates: z.array(z.strictObject({ id, name: title, role: title, stage: stages })),
});
export type CorporateState = z.infer<typeof corporateSchema>;
