import { z } from 'zod';
import type { MemoryRecord, RelationshipEdge } from '../ai/interfaces';
import type { CoordinationSnapshot } from '../simulation/coordination';
import { idSchema } from '../types/companySchema';

const day = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const time = z.number().nonnegative().max(Number.MAX_SAFE_INTEGER);
const memory = z.strictObject({
  id: idSchema, agentId: idSchema, day, timestampSimMinutes: z.number().int().min(0).max(1439),
  kind: z.enum(['observation', 'conversation', 'task', 'meeting', 'reflection']),
  summary: z.string().min(1), importance: z.number().min(1).max(10),
  relatedAgentIds: z.array(idSchema).optional(),
});
const relationship = z.strictObject({
  fromAgentId: idSchema, toAgentId: idSchema, affinity: z.number().min(-100).max(100),
  trust: z.number().min(0).max(100), lastInteractionDay: count,
});

export interface AISnapshot {
  schemaVersion: 1;
  memories: MemoryRecord[];
  relationships: RelationshipEdge[];
  coordination: CoordinationSnapshot;
}

const aiSchema: z.ZodType<AISnapshot> = z.strictObject({
  schemaVersion: z.literal(1),
  memories: z.array(memory),
  relationships: z.array(relationship),
  coordination: z.strictObject({
    lastMeetingDay: count,
    dialogues: z.array(z.strictObject({
      speakerId: idSchema, listenerId: idSchema, replyAt: time, endsAt: time, replied: z.boolean(),
    })),
    meeting: z.strictObject({
      projectId: idSchema,
      invited: z.array(z.strictObject({ agentId: idSchema, taskId: idSchema })).min(2).max(8),
      attendees: z.array(idSchema).max(8),
      arrivalDeadline: time,
      endsAt: time.nullable(),
    }).nullable(),
    dailyActivity: z.array(z.strictObject({
      day, workingMinutes: time, productivityMinutes: time,
      tasksCompleted: count, meetingsCompleted: count, conversationsCompleted: count,
    })),
  }),
});

export function parseAISnapshot(value: unknown, agentIds: Iterable<string>): AISnapshot {
  const snapshot = aiSchema.parse(value);
  const known = new Set(agentIds);
  const memoryIds = new Set(snapshot.memories.map(({ id }) => id));
  const relationshipIds = new Set(snapshot.relationships.map(({ fromAgentId, toAgentId }) =>
    JSON.stringify([fromAgentId, toAgentId]),
  ));
  if (memoryIds.size !== snapshot.memories.length || relationshipIds.size !== snapshot.relationships.length
    || snapshot.relationships.some(({ fromAgentId, toAgentId }) => fromAgentId === toAgentId)) {
    throw new Error('Invalid AI history IDs');
  }
  const active = new Set<string>();
  function reserve(id: string): void {
    if (!known.has(id) || active.has(id)) throw new Error('Invalid AI activity participant');
    active.add(id);
  }
  const { meeting, dialogues, dailyActivity } = snapshot.coordination;
  for (const dialogue of dialogues) {
    reserve(dialogue.speakerId);
    reserve(dialogue.listenerId);
    if (dialogue.replyAt >= dialogue.endsAt) throw new Error('Invalid dialogue timing');
  }
  if (meeting) {
    const invitees = new Set(meeting.invited.map(({ agentId }) => agentId));
    meeting.invited.forEach(({ agentId }) => reserve(agentId));
    const attendees = new Set(meeting.attendees);
    const validAttendance = attendees.size === meeting.attendees.length
      && (meeting.endsAt === null ? attendees.size === 0 : attendees.size === invitees.size)
      && meeting.attendees.every((id) => invitees.has(id));
    if (!validAttendance) throw new Error('Invalid meeting attendance');
  }
  if (new Set(dailyActivity.map(({ day }) => day)).size !== dailyActivity.length
    || dailyActivity.some((entry) => entry.productivityMinutes > 100.000001 * entry.workingMinutes)) {
    throw new Error('Invalid productivity history');
  }
  return snapshot;
}
