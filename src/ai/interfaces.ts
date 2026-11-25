import type { AgentEntity, AgentState, DepartmentId, RoomId } from '../agents/types';

/**
 * Core AI Decision output consumed by the V0.1 Simulation Engine.
 * ChatGPT (AI Architect) can replace LocalFallbackBrain with an LLM / GOAP / Utility AI
 * implementation without modifying the 3D world or navigation layer.
 */
export interface AgentIntent {
  agentId: string;
  targetState: AgentState;
  targetRoomId?: RoomId;
  targetWaypointId?: string;
  speechText?: string;
  speechDurationSec?: number;
  taskTitle?: string;
  interactWithAgentId?: string;
  priority: number;
}

export interface SimulationSnapshot {
  simMinutes: number; // 0..1439 (minutes since 00:00)
  day: number;
  agents: AgentEntity[];
  activeMeetingRoomId: RoomId | null;
}

/**
 * Module 1 for ChatGPT: AI Brain
 */
export interface IAIBrain {
  readonly id: string;
  decideNextIntent(
    agent: AgentEntity,
    snapshot: SimulationSnapshot,
    memory: IMemorySystem,
    tasks: ITaskManager,
    relationships: IRelationshipSystem
  ): AgentIntent | null;
}

/**
 * Module 2 for ChatGPT: Memory System (short-term + episodic + semantic)
 */
export interface MemoryRecord {
  id: string;
  agentId: string;
  timestampSimMinutes: number;
  day: number;
  kind: 'observation' | 'conversation' | 'task' | 'meeting' | 'reflection';
  summary: string;
  importance: number; // 1..10
  relatedAgentIds?: string[];
}

export interface IMemorySystem {
  addMemory(record: Omit<MemoryRecord, 'id'>): MemoryRecord;
  getRecentMemories(agentId: string, limit?: number): MemoryRecord[];
  clearAgentMemories(agentId: string): void;
  exportAll(): MemoryRecord[];
  importAll(records: MemoryRecord[]): void;
}

/**
 * Module 3 for ChatGPT: Task Manager
 */
export interface CompanyTask {
  id: string;
  title: string;
  department: DepartmentId;
  assignedAgentId: string | null;
  status: 'queued' | 'in_progress' | 'completed' | 'blocked';
  progress: number; // 0..100
  priority: 'low' | 'medium' | 'high';
}

export interface ITaskManager {
  getTasksForAgent(agentId: string): CompanyTask[];
  assignTask(taskId: string, agentId: string): void;
  advanceTaskProgress(agentId: string, deltaProgress: number): CompanyTask | null;
  getAllTasks(): CompanyTask[];
}

/**
 * Module 4 for ChatGPT: Relationship System
 */
export interface RelationshipEdge {
  fromAgentId: string;
  toAgentId: string;
  affinity: number; // -100..100
  trust: number; // 0..100
  lastInteractionDay: number;
}

export interface IRelationshipSystem {
  getRelationship(agentA: string, agentB: string): RelationshipEdge;
  recordInteraction(agentA: string, agentB: string, affinityDelta: number, day: number): void;
  getTopCollaborators(agentId: string, limit?: number): RelationshipEdge[];
}
