import type { AgentEntity } from '../agents/types';
import type { IAIBrain, AgentIntent, SimulationSnapshot, IMemorySystem, ITaskManager, IRelationshipSystem } from './interfaces';
import { personalityFor } from './agentPersonality';
import { needsRecovery, pickConversationPeer, selectWork, minutesSince } from './decisionPolicy';

export class LocalBrain implements IAIBrain {
  readonly id = 'local-utility-v03';
  decideNextIntent(agent: AgentEntity, snapshot: SimulationSnapshot, memory: IMemorySystem, tasks: ITaskManager, relationships: IRelationshipSystem): AgentIntent {
    const base={agentId:agent.id,targetWaypointId:agent.deskWaypointId};
    const hour=snapshot.simMinutes/60;
    const personality=personalityFor(agent.id);
    if (needsRecovery(agent)) {
      return {...base,targetState:'Resting',priority:100,speechText:agent.state==='Resting'?undefined:'Nghỉ một chút để lấy lại năng lượng.'};
    }
    if (hour<8||hour>=18||(hour>=12&&hour<13)) return {...base,targetState:'Resting',priority:80};
    const assigned=tasks.getTasksForAgent(agent.id);
    const task=selectWork(assigned);
    const recent=memory.getRecentMemories(agent.id,100);
    if(task){
      const summary='Bắt đầu hoặc tiếp tục: '+task.title;
      if(agent.state!=='Working'&&!recent.some(m=>m.kind==='task'&&m.summary===summary&&minutesSince(m,snapshot)>=0&&minutesSince(m,snapshot)<60)){
        memory.addMemory({agentId:agent.id,day:snapshot.day,timestampSimMinutes:Math.floor(snapshot.simMinutes),kind:'task',summary,importance:6});
      }
      return {...base,targetState:'Working',priority:70,taskTitle:task.title,speechText:agent.state==='Working'?undefined:'Đang xử lý: '+task.title,speechDurationSec:5};
    }
    const peer=pickConversationPeer(agent,snapshot,recent,relationships);
    if(peer&&(agent.mood<75||agent.numericIndex%3===0||personality.sociability>=60)){
      const blocked=assigned.some(t=>t.status==='blocked');
      const speech=blocked?'Chào '+peer.name+', mình đang gặp vướng mắc trong công việc. Có thể trao đổi không?':
        peer.department!==agent.department?'Chào '+peer.name+', phòng bạn có cần phối hợp với bên mình không?':
        personality.focus>=50?'Chào '+peer.name+', mình cùng rà soát tiến độ nhé?':'Chào '+peer.name+', có cần hỗ trợ công việc không?';
      return {agentId:agent.id,targetState:'Talking',priority:40,interactWithAgentId:peer.id,speechText:speech,speechDurationSec:6};
    }
    return {...base,targetState:'Sitting',priority:10};
  }
}
