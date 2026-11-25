import type {
  AgentIntent,
  CompanyTask,
  IAIBrain,
  IMemorySystem,
  IRelationshipSystem,
  ITaskManager,
  MemoryRecord,
  RelationshipEdge,
  SimulationSnapshot,
} from './interfaces';
import type { AgentEntity } from '../agents/types';

/**
 * Minimal no-op / placeholder adapters for V0.1 3D Foundation.
 * AI Brain, Memory, Task Manager, Relationship System, and Backend are intentionally
 * left unimplemented here for ChatGPT & GPT-6.2 to develop independently.
 */
export class StubMemorySystem implements IMemorySystem {
  addMemory(record: Omit<MemoryRecord, 'id'>): MemoryRecord {
    return { ...record, id: 'stub_mem' };
  }
  getRecentMemories(): MemoryRecord[] {
    return [];
  }
  clearAgentMemories(): void {}
  exportAll(): MemoryRecord[] {
    return [];
  }
  importAll(): void {}
}

export class StubTaskManager implements ITaskManager {
  getTasksForAgent(): CompanyTask[] {
    return [];
  }
  assignTask(): void {}
  advanceTaskProgress(): CompanyTask | null {
    return null;
  }
  getAllTasks(): CompanyTask[] {
    return [];
  }
}

export class StubRelationshipSystem implements IRelationshipSystem {
  getRelationship(agentA: string, agentB: string): RelationshipEdge {
    return {
      fromAgentId: agentA,
      toAgentId: agentB,
      affinity: 0,
      trust: 50,
      lastInteractionDay: 1,
    };
  }
  recordInteraction(): void {}
  getTopCollaborators(): RelationshipEdge[] {
    return [];
  }
}

export class StubAIBrain implements IAIBrain {
  readonly id = 'stub-placeholder-for-ai-team';

  decideNextIntent(
    _agent: AgentEntity,
    _snapshot: SimulationSnapshot,
    _memory: IMemorySystem,
    _tasks: ITaskManager,
    _relationships: IRelationshipSystem
  ): AgentIntent | null {
    // Intentionally returns null: AI decision-making belongs to ChatGPT / GPT-6.2.
    // Manual commands from HUD/Inspector and 3D waypoint pathfinding remain fully functional.
    return null;
  }
}
