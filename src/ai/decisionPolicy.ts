import type { AgentEntity } from '../agents/types';
import type { CompanyTask, MemoryRecord, IRelationshipSystem, SimulationSnapshot } from './interfaces';
import { personalityFor } from './agentPersonality';
const priorityRank = {low:1,medium:2,high:3};

export function selectWork(assigned: CompanyTask[]): CompanyTask | undefined {
  // Match TaskManager: existing in-progress work precedes queued work.
  return assigned.filter(t=>t.status==='in_progress'||t.status==='queued')
    .sort((a,b)=>Number(b.status==='in_progress')-Number(a.status==='in_progress')
      || priorityRank[b.priority]-priorityRank[a.priority])[0];
}

export function minutesSince(record: MemoryRecord, snapshot: SimulationSnapshot): number {
  return (snapshot.day-record.day)*1440+snapshot.simMinutes-record.timestampSimMinutes;
}

export function needsRecovery(agent: AgentEntity): boolean {
  const p=personalityFor(agent.id);
  const stressLimit=70+Math.round(p.resilience/10);
  return agent.energy<32 || agent.stress>stressLimit ||
    (agent.state==='Resting' && (agent.energy<65 || agent.stress>45));
}

export function pickConversationPeer(agent: AgentEntity, snapshot: SimulationSnapshot,
  memories: MemoryRecord[], relationships: IRelationshipSystem): AgentEntity | undefined {
  const recent=memories.filter(m=>m.kind==='conversation' && minutesSince(m,snapshot)>=0);
  const p=personalityFor(agent.id);
  const cooldown=60-Math.round(p.sociability/3);
  if(recent.some(m=>minutesSince(m,snapshot)<cooldown)) return undefined;
  const score=(peer:AgentEntity):number=>{
    const edge=relationships.getRelationship(agent.id,peer.id);
    const previous=recent.filter(m=>m.relatedAgentIds?.includes(peer.id) && minutesSince(m,snapshot)<180).length;
    return edge.affinity*0.5+edge.trust*0.25-previous*30+(peer.department===agent.department?15:0);
  };
  return snapshot.agents.filter(a=>a.id!==agent.id && (a.state==='Idle'||a.state==='Sitting')
    && a.energy>=32 && a.stress<=75
    && Math.hypot(a.position[0]-agent.position[0],a.position[2]-agent.position[2])<3)
    .sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0];
}
