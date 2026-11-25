import { registerAISystems } from '../store/useGameStore';
import { LocalBrain } from './localBrain';
import { AgentMemory } from './agentMemory';
import { AgentRelationships } from './agentRelationships';
export function registerLocalAI(): void {
  registerAISystems({brain:new LocalBrain(),memory:new AgentMemory(),relationships:new AgentRelationships()});
}
