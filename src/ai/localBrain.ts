import type { AgentEntity } from '../agents/types';
import type { IAIBrain, AgentIntent, SimulationSnapshot, IMemorySystem, ITaskManager, IRelationshipSystem } from './interfaces';
import { personalityFor } from './agentPersonality';
import { pickConversationPeer, selectWork, minutesSince } from './decisionPolicy';
import { planCareer, careerReflection } from './careerPolicy';

export class LocalBrain implements IAIBrain {
  readonly id = 'local-utility-v04';
  decideNextIntent(agent: AgentEntity, snapshot: SimulationSnapshot, memory: IMemorySystem, tasks: ITaskManager, relationships: IRelationshipSystem): AgentIntent {
    const base={agentId:agent.id,targetWaypointId:agent.deskWaypointId};
    const personality=personalityFor(agent.id);
    const assigned=tasks.getTasksForAgent(agent.id);
    const plan=planCareer(agent,snapshot,assigned);
    if(plan.goal==='recover') return {...base,targetState:'Resting',priority:100,speechText:agent.state==='Resting'?undefined:'Nghỉ một chút để lấy lại năng lượng.'};
    if(plan.goal==='off_shift') return {...base,targetState:'Resting',priority:80};
    const recent=memory.getRecentMemories(agent.id,100);
    const task=plan.goal==='deliver'?selectWork(assigned.filter(t=>t.assignedAgentId===agent.id)):undefined;
    if(task){
      const summary='Bắt đầu hoặc tiếp tục: '+task.title;
      if(agent.state!=='Working'&&!recent.some(m=>m.kind==='task'&&m.summary===summary&&minutesSince(m,snapshot)>=0&&minutesSince(m,snapshot)<60)){
        memory.addMemory({agentId:agent.id,day:snapshot.day,timestampSimMinutes:Math.floor(snapshot.simMinutes),kind:'task',summary,importance:6});
      }
      return {...base,targetState:'Working',priority:70,taskTitle:task.title,speechText:agent.state==='Working'?undefined:'Đang xử lý: '+task.title,speechDurationSec:5};
    }
    const peer=pickConversationPeer(agent,snapshot,recent,relationships);
    if(peer&&(plan.goal==='unblock'||plan.goal==='mentor'||agent.mood<75||agent.numericIndex%3===0||personality.sociability>=60)){
      const speech=plan.goal==='unblock'?'Chào '+peer.name+', mình đang gặp vướng mắc trong công việc. Có thể trao đổi không?':
        plan.goal==='mentor'&&peer.department===agent.department?'Chào '+peer.name+', mình có thể chia sẻ kinh nghiệm xử lý công việc nhé?':
        peer.department!==agent.department?'Chào '+peer.name+', phòng bạn có cần phối hợp với bên mình không?':
        personality.focus>=50?'Chào '+peer.name+', mình cùng rà soát tiến độ nhé?':'Chào '+peer.name+', có cần hỗ trợ công việc không?';
      return {agentId:agent.id,targetState:'Talking',priority:plan.goal==='unblock'?50:40,interactWithAgentId:peer.id,speechText:speech,speechDurationSec:6};
    }
    const reflection=careerReflection(agent.id,snapshot.day,plan.profile,recent);
    if(reflection) memory.addMemory({...reflection,timestampSimMinutes:Math.floor(snapshot.simMinutes)});
    return {...base,targetState:'Sitting',priority:10};
  }
}
