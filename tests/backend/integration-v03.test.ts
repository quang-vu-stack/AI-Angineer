import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialAgents } from '../../src/agents/roster';
import { CompanyService } from '../../src/company/companyService';
import { Coordination } from '../../src/simulation/coordination';
import { useGameStore } from '../../src/store/useGameStore';

test('integrated store retains camera controls, lounge commands and business progression', () => {
  const agents = createInitialAgents();
  const company = CompanyService.create(agents);
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    agents, company, coordination: new Coordination(),
  }, true);
  const state = useGameStore.getState;
  const agent = agents[0];
  state().selectAgent(agent.id);
  state().toggleFollowSelectedAgent();
  assert.equal(state().followSelectedAgent, true);
  state().commandAgent(agent.id, 'Resting');
  assert.equal(state().agents[0].pendingStateAfterWalk, 'Resting');
  assert.ok(state().agents[0].path.length > 0);
  state().selectAgent(null);
  assert.equal(state().followSelectedAgent, false);
  const before = state().companyVersion;
  for (const task of company.tasks.getAllTasks()) company.tasks.advanceTask(task.id, 100);
  state().notifyCompanyChange();
  assert.ok(company.business.snapshot().routines.length > 0);
  assert.ok(state().companyVersion > before);
});
