import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInitialAgents} from '../../src/agents/roster';
import {AgentRelationships} from '../../src/ai/agentRelationships';
import {planAgentDecision,recallRelevant} from '../../src/ai/decisionPlanner';
import type {CompanyTask,MemoryRecord,SimulationSnapshot} from '../../src/ai/interfaces';
const agent={...createInitialAgents()[0],energy:90,stress:10,state:'Idle' as const};
const snapshot:SimulationSnapshot={day:2,simMinutes:540,agents:[agent],activeMeetingRoomId:null};
const task:CompanyTask={id:'own',title:'Review',department:agent.department,assignedAgentId:agent.id,status:'queued',progress:0,priority:'high'};
const record:MemoryRecord={id:'m1',agentId:agent.id,day:1,timestampSimMinutes:540,kind:'task',summary:'Bắt đầu hoặc tiếp tục: Review',importance:5};
test('recall excludes foreign, future and unrelated records and deduplicates IDs',()=>{
 const records=[record,record,{...record,id:'foreign',agentId:'other'},{...record,id:'future',day:3},{...record,id:'unrelated',summary:'Other'}];
 assert.deepEqual(recallRelevant(agent.id,snapshot,records,{taskTitle:task.title}).map(m=>m.id),['m1']);
 assert.equal(recallRelevant(agent.id,snapshot,records,{taskTitle:task.title},0).length,0);
});
test('planner exposes selected task and evidence without mutating inputs',()=>{
 const tasks=[task,{...task,id:'foreign',assignedAgentId:'other'}];
 const before=structuredClone({tasks,agent,snapshot});
 const r=new AgentRelationships();
 const p=planAgentDecision(agent,snapshot,tasks,[record],r);
 assert.equal(p.reason,'assigned_work');
 assert.equal(p.intent.targetState,'Working');
 assert.equal(p.evidence.taskId,task.id);
 assert.deepEqual(p.evidence.memoryIds,['m1']);
 assert.deepEqual({tasks,agent,snapshot},before);
 assert.deepEqual(planAgentDecision(agent,snapshot,tasks,[record],r),p);
});
test('recovery wins over work and blocked tasks invite contextual help without changing status',()=>{
 const r=new AgentRelationships();
 assert.equal(planAgentDecision({...agent,energy:5},snapshot,[task],[],r).reason,'recovery');
 const peer={...createInitialAgents()[1],position:[...agent.position] as [number,number,number],state:'Sitting' as const,energy:90,stress:10};
 const blocked={...task,status:'blocked' as const};
 const p=planAgentDecision(agent,{...snapshot,agents:[agent,peer]},[blocked],[],r);
 assert.equal(p.reason,'blocked_help');
 assert.equal(p.intent.interactWithAgentId,peer.id);
 assert.ok(p.intent.speechText?.includes(task.title));
 assert.equal(blocked.status,'blocked');
});
