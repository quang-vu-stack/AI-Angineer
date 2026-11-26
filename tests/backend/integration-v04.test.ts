import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createInitialAgents } from '../../src/agents/roster';
import { CompanyService } from '../../src/company/companyService';
import { Coordination } from '../../src/simulation/coordination';
import { useGameStore } from '../../src/store/useGameStore';
import { loadGameFromIndexedDB } from '../../src/services/indexedDbService';

test('HQ camera, training navigation and corporate records coexist in the current game save', async () => {
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});
  const agents=createInitialAgents();
  const company=CompanyService.create(agents);
  useGameStore.setState({...useGameStore.getInitialState(),agents,company,
    coordination:new Coordination(),saveRevision:null},true);
  const state=useGameStore.getState;
  state().resetOverviewCamera();
  assert.deepEqual(state().cameraFocusTarget,{target:[-4,0,0],offset:[0,24,27]});
  company.corporate.train('EMP-04','Integration training');
  const training=company.corporate.snapshot().training.at(-1)!;
  assert.ok(company.tasks.getAllTasks().some(t=>t.id===training.taskId&&t.assignedAgentId==='EMP-04'));
  state().notifyCompanyChange();
  state().commandAgent('EMP-04','Sitting','training_seat_1');
  const trainee=state().agents.find(a=>a.id==='EMP-04')!;
  assert.equal(trainee.pendingStateAfterWalk,'Sitting');
  assert.ok(trainee.path.length>0);
  await state().saveNow();
  assert.equal(state().persistenceError,null);
  assert.equal((await loadGameFromIndexedDB())?.version,'0.5.0');
  await state().hydrateFromIndexedDB();
  assert.deepEqual(state().company.corporate.snapshot(),company.corporate.snapshot());
  assert.equal(state().agents.length,20);
  assert.equal(state().persistenceError,null);
});
