import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalityFor } from '../../src/ai/agentPersonality';
import { selectWork, pickConversationPeer, needsRecovery } from '../../src/ai/decisionPolicy';
import { createInitialAgents } from '../../src/agents/roster';
import { AgentRelationships } from '../../src/ai/agentRelationships';
import type { CompanyTask, MemoryRecord, SimulationSnapshot } from '../../src/ai/interfaces';

test('personality is stable, varied and bounded across the roster',()=>{
 const agents=createInitialAgents();
 const profiles=agents.map(a=>personalityFor(a.id));
 assert.deepEqual(profiles,agents.map(a=>personalityFor(a.id)));
 assert.ok(new Set(profiles.map(p=>JSON.stringify(p))).size>1);
 for(const p of profiles) for(const v of Object.values(p)) assert.ok(v>=25&&v<=75);
});
test('work policy prefers active tasks and ignores blocked and completed work',()=>{
 const base:CompanyTask={id:'a',title:'work',department:'engineering',assignedAgentId:'EMP-04',status:'queued',progress:0,priority:'high'};
 const active:CompanyTask={...base,id:'b',status:'in_progress',priority:'low'};
 assert.equal(selectWork([base,active,{...base,id:'c',status:'blocked'}])?.id,'b');
 assert.equal(selectWork([{...base,status:'completed'}]),undefined);
});
test('conversation cooldown spans midnight and excludes tired or distant peers',()=>{
 const [a,b,c]=createInitialAgents();
 Object.assign(a,{position:[0,0,0]});
 Object.assign(b,{position:[1,0,0],state:'Sitting',energy:90,stress:10});
 Object.assign(c,{position:[5,0,0],state:'Sitting',energy:90,stress:10});
 const snapshot:SimulationSnapshot={day:2,simMinutes:5,agents:[a,b,c],activeMeetingRoomId:null};
 const m:MemoryRecord={id:'mem-1',agentId:a.id,day:1,timestampSimMinutes:1435,kind:'conversation',summary:'hi',importance:4,relatedAgentIds:[b.id]};
 const r=new AgentRelationships();
 assert.equal(pickConversationPeer(a,snapshot,[m],r),undefined);
 assert.equal(pickConversationPeer(a,{...snapshot,simMinutes:100},[m],r)?.id,b.id);
 b.energy=10;
 assert.equal(pickConversationPeer(a,{...snapshot,simMinutes:100},[m],r),undefined);
 assert.equal(needsRecovery({...a,energy:5}),true);
});
