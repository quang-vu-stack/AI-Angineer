import type { AgentEntity } from '../agents/types';
import type { IAIBrain, AgentIntent, SimulationSnapshot, IMemorySystem, ITaskManager, IRelationshipSystem } from './interfaces';
export class LocalBrain implements IAIBrain {
  readonly id = 'local-utility-v02';
  decideNextIntent(agent: AgentEntity, snapshot: SimulationSnapshot, memory: IMemorySystem, tasks: ITaskManager, relationships: IRelationshipSystem): AgentIntent {
    const base = {agentId: agent.id, targetWaypointId: agent.deskWaypointId};
    const hour = snapshot.simMinutes / 60;
    if (agent.energy < 32 || agent.stress > 75 || (agent.state === 'Resting' && (agent.energy < 65 || agent.stress > 45))) {
      return {...base,targetState:'Resting',priority:100,speechText:'Nghỉ một chút để lấy lại năng lượng.'};
    }
    if (hour < 8 || hour >= 18 || (hour >= 12 && hour < 13)) {
      return {...base,targetState:'Resting',priority:80};
    }
    const assigned = tasks.getTasksForAgent(agent.id);
    const task = assigned.find(t => t.status === 'in_progress') ??
      assigned.filter(t=>t.status==='queued').sort((a,b)=>({high:3,medium:2,low:1}[b.priority]-{high:3,medium:2,low:1}[a.priority]))[0];
    if (task) {
      if (agent.state !== 'Working') memory.addMemory({agentId:agent.id,day:snapshot.day,timestampSimMinutes:Math.floor(snapshot.simMinutes),kind:'task',summary:'Bắt đầu hoặc tiếp tục: '+task.title,importance:6});
      return {...base,targetState:'Working',priority:70,taskTitle:task.title,speechText:agent.state==='Working'?undefined:'Đang xử lý: '+task.title,speechDurationSec:5};
    }
    const recent = memory.getRecentMemories(agent.id, 10).some(m=>m.kind==='conversation' && m.day===snapshot.day && snapshot.simMinutes-m.timestampSimMinutes<45 && m.timestampSimMinutes<=snapshot.simMinutes);
    const colleagues = snapshot.agents.filter(a=>a.id!==agent.id && a.department===agent.department && (a.state==='Idle'||a.state==='Sitting') && Math.hypot(a.position[0]-agent.position[0],a.position[2]-agent.position[2])<3);
    colleagues.sort((a,b)=>relationships.getRelationship(agent.id,b.id).affinity-relationships.getRelationship(agent.id,a.id).affinity || a.id.localeCompare(b.id));
    if (!recent && colleagues[0] && (agent.mood<75 || agent.numericIndex%3===0)) {
      const peer=colleagues[0];
      return {agentId:agent.id,targetState:'Talking',priority:40,interactWithAgentId:peer.id,speechText:'Chào '+peer.name+', có cần hỗ trợ công việc không?',speechDurationSec:6};
    }
    return {...base,targetState:'Sitting',priority:10};
  }
}
