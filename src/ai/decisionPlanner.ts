import type { AgentEntity } from '../agents/types';
import type { AgentIntent, CompanyTask, IRelationshipSystem, MemoryRecord, SimulationSnapshot } from './interfaces';
import { personalityFor } from './agentPersonality';
import { pickConversationPeer, selectWork, minutesSince } from './decisionPolicy';
import { planCareer, careerReflection, type CareerGoal } from './careerPolicy';

export type DecisionReason = 'recovery' | 'off_shift' | 'assigned_work' | 'blocked_help' | 'mentoring' | 'social' | 'standby';
export interface DecisionPlan {
  goal: CareerGoal;
  reason: DecisionReason;
  intent: AgentIntent;
  /** Advisory steps; only intent is executed by the simulation. */
  steps: string[];
  evidence: {taskId?:string; peerId?:string; memoryIds:string[]};
  memoryToRecord?: Omit<MemoryRecord,'id'>;
}

/** Bounded recall of this agent's past, ranked by relevance, recency and importance. */
export function recallRelevant(agentId:string, snapshot:SimulationSnapshot, records:readonly MemoryRecord[],
  context:{taskTitle?:string;peerId?:string}, limit=3):MemoryRecord[] {
  const seen=new Set<string>();
  const ranked=records.filter(m=>{
    const age=minutesSince(m,snapshot);
    if(m.agentId!==agentId||!Number.isFinite(age)||age<0||age>7*1440||seen.has(m.id))return false;
    seen.add(m.id);
    return Boolean((context.taskTitle&&m.kind==='task'&&m.summary==='Bắt đầu hoặc tiếp tục: '+context.taskTitle)
      ||(context.peerId&&m.relatedAgentIds?.includes(context.peerId)));
  }).map(m=>({m,score:m.importance*10+Math.max(0,30-minutesSince(m,snapshot)/48)}));
  return ranked.sort((a,b)=>b.score-a.score||a.m.id.localeCompare(b.m.id))
    .slice(0,Math.max(0,Math.min(10,Math.floor(limit)))).map(({m})=>structuredClone(m));
}

/** Pure, inspectable decision. No task, payroll, relationship or memory writes. */
export function planAgentDecision(agent:AgentEntity,snapshot:SimulationSnapshot,assigned:readonly CompanyTask[],
  memories:readonly MemoryRecord[],relationships:IRelationshipSystem):DecisionPlan {
  const own=assigned.filter(t=>t.assignedAgentId===agent.id);
  const recent=memories.filter(m=>m.agentId===agent.id&&minutesSince(m,snapshot)>=0);
  const career=planCareer(agent,snapshot,own);
  const base={agentId:agent.id,targetWaypointId:agent.deskWaypointId};
  const result=(reason:DecisionReason,intent:AgentIntent,steps:string[],evidence:DecisionPlan['evidence']={memoryIds:[]}):DecisionPlan=>
    ({goal:career.goal,reason,intent,steps,evidence});
  if(career.goal==='recover')return result('recovery',{...base,targetState:'Resting',priority:100,
    speechText:agent.state==='Resting'?undefined:'Nghỉ một chút để lấy lại năng lượng.'},['Phục hồi năng lượng','Đánh giá lại khả năng làm việc']);
  if(career.goal==='off_shift')return result('off_shift',{...base,targetState:'Resting',priority:80},['Nghỉ ngoài giờ','Kiểm tra lịch ca tiếp theo']);
  const task=career.goal==='deliver'?selectWork(own):undefined;
  if(task){
    const summary='Bắt đầu hoặc tiếp tục: '+task.title;
    const plan=result('assigned_work',{...base,targetState:'Working',priority:70,taskTitle:task.title,
      speechText:agent.state==='Working'?undefined:'Đang xử lý: '+task.title,speechDurationSec:5},
      ['Đến bàn làm việc','Xử lý nhiệm vụ được giao','Đánh giá lại tiến độ'],
      {taskId:task.id,memoryIds:recallRelevant(agent.id,snapshot,recent,{taskTitle:task.title}).map(m=>m.id)});
    if(agent.state!=='Working'&&!recent.some(m=>m.kind==='task'&&m.summary===summary&&minutesSince(m,snapshot)<60))
      plan.memoryToRecord={agentId:agent.id,day:snapshot.day,timestampSimMinutes:Math.floor(snapshot.simMinutes),kind:'task',summary,importance:6};
    return plan;
  }
  const personality=personalityFor(agent.id);
  const peer=pickConversationPeer(agent,snapshot,recent,relationships);
  if(peer&&(career.goal==='unblock'||career.goal==='mentor'||agent.mood<75||agent.numericIndex%3===0||personality.sociability>=60)){
    const blocked=career.goal==='unblock'?own.find(t=>t.status==='blocked'):undefined;
    const recalled=recallRelevant(agent.id,snapshot,recent,{peerId:peer.id});
    const mentoring=career.goal==='mentor'&&peer.department===agent.department;
    const speech=blocked?'Chào '+peer.name+', mình đang vướng nhiệm vụ '+blocked.title+'. Có thể trao đổi không?':
      mentoring?'Chào '+peer.name+', mình có thể chia sẻ kinh nghiệm xử lý công việc nhé?':
      peer.department!==agent.department?'Chào '+peer.name+', phòng bạn có cần phối hợp với bên mình không?':
      recalled.length?'Chào '+peer.name+', mình cùng cập nhật tiến độ từ lần trao đổi trước nhé?':
      personality.focus>=50?'Chào '+peer.name+', mình cùng rà soát tiến độ nhé?':'Chào '+peer.name+', có cần hỗ trợ công việc không?';
    return result(blocked?'blocked_help':mentoring?'mentoring':'social',
      {agentId:agent.id,targetState:'Talking',priority:blocked?50:40,interactWithAgentId:peer.id,speechText:speech,speechDurationSec:6},
      [blocked?'Nêu vướng mắc':mentoring?'Chia sẻ kinh nghiệm':'Trao đổi với đồng nghiệp','Lắng nghe phản hồi','Đánh giá lại công việc'],
      {taskId:blocked?.id,peerId:peer.id,memoryIds:recalled.map(m=>m.id)});
  }
  const plan=result('standby',{...base,targetState:'Sitting',priority:10},['Chờ công việc phù hợp','Kiểm tra lại mục tiêu']);
  const reflection=careerReflection(agent.id,snapshot.day,career.profile,recent);
  if(reflection)plan.memoryToRecord={...reflection,timestampSimMinutes:Math.floor(snapshot.simMinutes)};
  return plan;
}
