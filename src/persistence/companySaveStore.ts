import { z } from 'zod';
import { parseCompanySnapshot } from '../company/companyService';
import { instantSchema, idSchema as keySchema, revisionSchema } from '../types/companySchema';
import type { CompanySnapshot } from '../types/company';

const saveSchema = z.strictObject({
  slotId: keySchema,
  revision: revisionSchema,
  savedAt: instantSchema,
  snapshot: z.unknown(),
});

export interface SavedCompany {
  slotId: string;
  revision: number;
  savedAt: string;
  snapshot: CompanySnapshot;
}

export interface SaveStore {
  load(slotId: string): Promise<SavedCompany | null>;
  save(slotId: string, snapshot: CompanySnapshot, expectedRevision: number | null): Promise<SavedCompany>;
}

export function parseSave(input: unknown, slotId: string): SavedCompany {
  const save = saveSchema.parse(input);
  if (save.slotId !== slotId) throw new Error('Save slot mismatch');
  return { ...save, snapshot: parseCompanySnapshot(save.snapshot) };
}

export function nextSave(slotId: string, snapshot: CompanySnapshot, expectedRevision: number | null): SavedCompany {
  keySchema.parse(slotId);
  if (expectedRevision !== null) revisionSchema.parse(expectedRevision);
  const revision = revisionSchema.parse((expectedRevision ?? 0) + 1);
  return { slotId, revision, savedAt: new Date().toISOString(), snapshot: parseCompanySnapshot(snapshot) };
}
