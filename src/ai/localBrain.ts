import type { AgentEntity } from '../agents/types';
import type { IAIBrain, AgentIntent, SimulationSnapshot, IMemorySystem, ITaskManager, IRelationshipSystem } from './interfaces';
import { planAgentDecision } from './decisionPlanner';

export class LocalBrain implements IAIBrain {
  readonly id = 'local-utility-v05';
  decideNextIntent(agent: AgentEntity, snapshot: SimulationSnapshot, memory: IMemorySystem, tasks: ITaskManager, relationships: IRelationshipSystem): AgentIntent {
    const plan=planAgentDecision(agent,snapshot,tasks.getTasksForAgent(agent.id),memory.getRecentMemories(agent.id,100),relationships);
    if(plan.memoryToRecord)memory.addMemory(plan.memoryToRecord);
    return plan.intent;
  }
}
