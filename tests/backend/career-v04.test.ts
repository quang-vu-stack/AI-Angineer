import { test } from 'node:test';
import assert from 'node:assert/strict';
import { careerProfile, planCareer, careerReflection } from '../../src/ai/careerPolicy';
import { LocalBrain } from '../../src/ai/localBrain';
import { AgentMemory } from '../../src/ai/agentMemory';
import { AgentRelationships } from '../../src/ai/agentRelationships';
import { StubTaskManager } from '../../src/ai/stubAdapter';
import { createInitialAgents } from '../../src/agents/roster';
import type { CompanyTask, SimulationSnapshot } from '../../src/ai/interfaces';

const agent={...createInitialAgents()[0],energy:90,stress:10,state:'Idle' as const};
const task=(id:string, override:Partial<CompanyTask>={}):CompanyTask=>({
  id,title:id,department:agent.department,assignedAgentId:agent.id,status:'completed',progress:100,priority:'high',...override
});
const snapshot:SimulationSnapshot={day:1,simMinutes:540,agents:[agent],activeMeetingRoomId:null};

test('career evidence excludes incomplete, foreign and duplicate tasks',()=>{
  const first=task('one');
  const p=careerProfile(agent.id,[first,first,task('two'),task('foreign',{assignedAgentId:'other'}),
    task('open',{status:'queued',progress:0}),task('invalid',{progress:99})]);
  assert.equal(p.experiencePoints,60);
  assert.equal(p.completedTasks,2);
  assert.equal(p.level,'specialist');
  assert.equal(p.pointsToNext,120);
  assert.equal(p.reviewEligible,true);
});
test('career plan prioritizes recovery, schedule and assigned work before mentoring',()=>{
  const done=Array.from({length:6},(_,i)=>task('done-'+i));
  assert.equal(planCareer(agent,snapshot,done).goal,'mentor');
  assert.equal(planCareer({...agent,energy:10},snapshot,done).goal,'recover');
  assert.equal(planCareer(agent,{...snapshot,simMinutes:1200},done).goal,'off_shift');
  const open=task('open',{status:'queued',progress:0});
  assert.deepEqual(planCareer(agent,snapshot,[...done,open]).taskId,'open');
  assert.equal(planCareer(agent,snapshot,[task('blocked',{status:'blocked',progress:30})]).goal,'unblock');
});
test('brain records career reflection once per day and preserves it across memory restore',()=>{
  const memory=new AgentMemory();
  const manager=new StubTaskManager();
  manager.getTasksForAgent=()=>[task('done')];
  const brain=new LocalBrain();
  const relationships=new AgentRelationships();
  assert.equal(brain.decideNextIntent(agent,snapshot,memory,manager,relationships).targetState,'Sitting');
  const restored=new AgentMemory();
  restored.importAll(memory.exportAll());
  brain.decideNextIntent(agent,snapshot,restored,manager,relationships);
  assert.equal(restored.getRecentMemories(agent.id).filter(m=>m.kind==='reflection').length,1);
  brain.decideNextIntent(agent,{...snapshot,day:2},restored,manager,relationships);
  assert.equal(restored.getRecentMemories(agent.id).filter(m=>m.kind==='reflection').length,2);
  assert.equal(careerReflection(agent.id,1,careerProfile(agent.id,[]),[]),null);
});
