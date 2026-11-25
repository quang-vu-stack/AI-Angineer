import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgentMemory } from '../../src/ai/agentMemory';
import { AgentRelationships } from '../../src/ai/agentRelationships';
import { LocalBrain } from '../../src/ai/localBrain';
import { createInitialAgents } from '../../src/agents/roster';
import { StubTaskManager } from '../../src/ai/stubAdapter';
test('memory is bounded and isolated',()=>{
 const m=new AgentMemory();
 for(let i=0;i<110;i++) m.addMemory({agentId:'a',day:1,timestampSimMinutes:i,kind:'task',summary:String(i),importance:5});
 assert.equal(m.exportAll().length,100);
 assert.equal(m.getRecentMemories('a',1)[0].summary,'109');
 assert.equal(m.getRecentMemories('b').length,0);
});
test('relationships are symmetric and bounded',()=>{
 const r=new AgentRelationships(); r.recordInteraction('a','b',200,1);
 assert.equal(r.getRelationship('b','a').affinity,100);
 assert.equal(r.getRelationship('a','b').trust,100);
});
test('exhausted employee rests',()=>{
 const agents=createInitialAgents(); const a={...agents[0],energy:10};
 assert.equal(new LocalBrain().decideNextIntent(a,{agents,day:1,simMinutes:540,activeMeetingRoomId:null},new AgentMemory(),new StubTaskManager(),new AgentRelationships()).targetState,'Resting');
});
