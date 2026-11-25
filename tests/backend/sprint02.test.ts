import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { createInitialAgents } from '../../src/agents/roster';
import { LocalBrain } from '../../src/ai/localBrain';
import { AgentMemory } from '../../src/ai/agentMemory';
import { AgentRelationships } from '../../src/ai/agentRelationships';
import { StubAIBrain } from '../../src/ai/stubAdapter';
import { CompanyService } from '../../src/company/companyService';
import { loadGameFromIndexedDB, saveGameToIndexedDB } from '../../src/services/indexedDbService';
import { Coordination } from '../../src/simulation/coordination';
import { ProductivityLog } from '../../src/simulation/productivity';
import { registerAISystems, useGameStore } from '../../src/store/useGameStore';

const epoch = '2026-11-25T12:00:00.000Z';
let memory: AgentMemory;
let relationships: AgentRelationships;

beforeEach(() => {
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: new IDBFactory() });
  memory = new AgentMemory();
  relationships = new AgentRelationships();
  registerAISystems({ brain: new StubAIBrain(), memory, relationships });
  useGameStore.setState({
    ...useGameStore.getInitialState(),
    agents: createInitialAgents(),
    company: CompanyService.create(createInitialAgents()),
    coordination: new Coordination(),
  }, true);
});

function seedMemory(agentId = 'EMP-01') {
  return memory.addMemory({
    agentId, day: 1, timestampSimMinutes: 500, kind: 'observation', summary: 'Ghi chú cũ', importance: 5,
  });
}

test('preserves imported memory IDs across bounded history and allocates fresh IDs', () => {
  const entry = seedMemory();
  const saved = { ...entry, id: 'mem-250' };
  memory.importAll([saved]);
  assert.deepEqual(memory.exportAll(), [saved]);
  assert.equal(seedMemory().id, 'mem-251');
});

test('loads two-sided dialogue, resumes its reply, records both memories once, and resets all AI state', async () => {
  const state = useGameStore.getState();
  const [speaker, listener] = state.agents;
  Object.assign(speaker, { state: 'Idle', position: [0, 0, 8] });
  Object.assign(listener, { state: 'Sitting', position: [1, 0, 8] });
  const initialMemory = seedMemory();
  relationships.recordInteraction(speaker.id, listener.id, 3, 1);
  assert.equal(state.coordination.startDialogue({
    agentId: speaker.id, interactWithAgentId: listener.id, priority: 40, targetState: 'Talking',
    speechText: 'Cùng xem tiến độ nhé?', speechDurationSec: 6,
  }, state.agents, 510), true);
  assert.equal(state.coordination.startDialogue({
    agentId: listener.id, interactWithAgentId: speaker.id, priority: 40, targetState: 'Talking',
    speechText: 'Trùng phiên',
  }, state.agents, 510), false);

  await state.saveNow();
  memory.importAll([]);
  relationships.importAll([]);
  useGameStore.setState({ coordination: new Coordination() });
  await state.hydrateFromIndexedDB();
  assert.deepEqual(memory.exportAll(), [initialMemory]);
  assert.equal(relationships.getRelationship(listener.id, speaker.id).affinity, 3);
  assert.equal(useGameStore.getState().agents[1].state, 'Talking');
  state.tickSimulation(3.1);
  assert.match(useGameStore.getState().agents[1].speechText ?? '', /Cảm ơn/);
  state.tickSimulation(3);
  assert.equal(memory.getRecentMemories(speaker.id).filter(({ kind }) => kind === 'conversation').length, 1);
  assert.equal(memory.getRecentMemories(listener.id)[0].relatedAgentIds?.[0], speaker.id);
  assert.equal(relationships.getRelationship(speaker.id, listener.id).affinity, 5);
  assert.equal(useGameStore.getState().coordination.productivity.daily(1).conversationsCompleted, 1);
  assert.equal(useGameStore.getState().coordination.snapshot().dialogues.length, 0);

  assert.equal(state.scheduleMeeting('world-v01'), true);
  await state.saveNow();
  assert.ok((await loadGameFromIndexedDB())?.ai?.coordination.meeting);
  await state.resetSimulation();
  assert.equal(await loadGameFromIndexedDB(), null);
  assert.deepEqual(memory.exportAll(), []);
  assert.deepEqual(relationships.exportAll(), []);
  assert.deepEqual(useGameStore.getState().coordination.snapshot(), new Coordination().snapshot());
  assert.equal(useGameStore.getState().agents[1].speechText, null);
});

test('the registered Local Brain starts a synchronized conversation through the simulation loop', () => {
  registerAISystems({ brain: new LocalBrain() });
  const state = useGameStore.getState();
  const [speaker, listener] = state.agents;
  state.company.tasks.transition('task-EMP-01', 'completed');
  Object.assign(speaker, { state: 'Idle', stateTimerSec: 0, position: [0, 0, 8], mood: 72 });
  Object.assign(listener, { state: 'Sitting', stateTimerSec: 10, position: [1, 0, 8] });
  state.tickSimulation(0.1);
  assert.equal(useGameStore.getState().agents[0].state, 'Talking');
  assert.equal(useGameStore.getState().agents[1].state, 'Talking');
  assert.equal(state.coordination.snapshot().dialogues[0].listenerId, listener.id);
});

test('a rejected invitation leaves both agents, memory and relationships intact', () => {
  const { agents, coordination } = useGameStore.getState();
  const [speaker, listener] = agents;
  listener.state = 'Working';
  assert.equal(coordination.startDialogue({
    agentId: speaker.id, interactWithAgentId: listener.id, priority: 40, targetState: 'Talking', speechText: 'Chào',
  }, agents, 520), false);
  assert.equal(listener.state, 'Working');
  assert.equal(memory.exportAll().length, 0);
  assert.equal(relationships.exportAll().length, 0);
});

test('coordinates a cross-department meeting through the game loop and settles task progress once', async () => {
  const start = useGameStore.getState();
  for (const agent of start.agents) agent.state = 'Resting';
  for (const index of [0, 3]) {
    const agent = start.agents[index];
    agent.state = 'Idle';
    agent.energy = 80;
    agent.stress = 10;
  }
  const snapshot = start.company.snapshot();
  snapshot.tasks.find(({ assignedAgentId }) => assignedAgentId === 'EMP-01')!.progress = 95;
  snapshot.tasks.find(({ assignedAgentId }) => assignedAgentId === 'EMP-04')!.progress = 95;
  const company = CompanyService.restore(snapshot);
  company.finance.record({
    id: 'capital', kind: 'capital', amountVnd: 10_000, description: 'Vốn QA', recordedAt: epoch, projectId: null,
  });
  useGameStore.setState({ company, simMinutes: 599.9 });

  start.tickSimulation(0.2);
  const activity = useGameStore.getState().coordination;
  assert.deepEqual(activity.snapshot().meeting?.invited.map(({ agentId }) => agentId), ['EMP-01', 'EMP-04']);
  assert.equal(activity.meetingRoom, 'central_meeting_room');
  assert.equal(useGameStore.getState().agents[0].pendingStateAfterWalk, 'Meeting');
  let remaining = 200;
  while (activity.snapshot().meeting?.endsAt === null && remaining-- > 0) start.tickSimulation(0.25);
  assert.deepEqual(activity.snapshot().meeting?.attendees, ['EMP-01', 'EMP-04']);
  await start.saveNow();
  assert.equal((await loadGameFromIndexedDB())?.ai?.coordination.meeting?.attendees.length, 2);
  await start.hydrateFromIndexedDB();
  const restored = useGameStore.getState();
  restored.tickSimulation(8.1);
  assert.equal(restored.coordination.snapshot().meeting, null);
  assert.equal(restored.company.projectKpi('world-v01', epoch).completed, 2);
  assert.equal(restored.company.finance.summary().balanceVnd, 10_000);
  assert.deepEqual(memory.getRecentMemories('EMP-01').map(({ kind }) => kind), ['meeting']);
  assert.equal(relationships.getRelationship('EMP-04', 'EMP-01').affinity, 1);
  assert.equal(restored.coordination.productivity.daily(1).tasksCompleted, 2);
  assert.equal(restored.coordination.productivity.weekly(1).meetingsCompleted, 1);
  restored.tickSimulation(1);
  assert.equal(restored.coordination.productivity.daily(1).tasksCompleted, 2);
});

test('a meeting without quorum releases reservations without progress or attendance credit', () => {
  const { agents, company, coordination } = useGameStore.getState();
  assert.equal(coordination.startMeeting(agents, company.tasks, 500, 'world-v01'), true);
  const [first] = coordination.snapshot().meeting!.invited;
  const before = company.tasks.getAllTasks();
  agents.find(({ id }) => id === first.agentId)!.state = 'Meeting';
  coordination.advance(agents, 535, memory, relationships, company.tasks);
  assert.equal(coordination.snapshot().meeting, null);
  assert.equal(coordination.isReserved(first.agentId), false);
  assert.equal(memory.exportAll().length, 0);
  assert.deepEqual(company.tasks.getAllTasks(), before);
});

test('daily and weekly work reports split at midnight and weight by work duration', () => {
  const log = new ProductivityLog();
  log.recordWork(1439, 3, 50);
  log.recordWork(1442, 1, 90);
  log.count(2, 'tasksCompleted');
  log.count(8, 'tasksCompleted');
  assert.equal(log.daily(1).workingMinutes, 1);
  assert.equal(log.daily(2).workingMinutes, 3);
  assert.equal(log.daily(2).averageProductivity, 63);
  assert.equal(log.weekly(1).workingMinutes, 4);
  assert.equal(log.weekly(1).averageProductivity, 60);
  assert.equal(log.weekly(1).tasksCompleted, 1);
  assert.equal(log.weekly(2).tasksCompleted, 1);
  assert.throws(() => log.weekly(0), /Invalid/);
});

test('loads a V0.1 company save with fresh AI state and rejects malformed session writes', async () => {
  const state = useGameStore.getState();
  const old = {
    version: '0.1.0', savedAtIso: epoch, day: 2, simMinutes: 700,
    speed: 1, quality: 'medium' as const, agents: state.agents, company: state.company.snapshot(),
  };
  await saveGameToIndexedDB(old, null);
  seedMemory();
  relationships.recordInteraction('EMP-01', 'EMP-02', 9, 1);
  await state.hydrateFromIndexedDB();
  assert.equal(useGameStore.getState().day, 2);
  assert.deepEqual(memory.exportAll(), []);
  assert.deepEqual(relationships.exportAll(), []);
  assert.deepEqual(useGameStore.getState().company.snapshot(), old.company);

  await assert.rejects(saveGameToIndexedDB({
    ...old, ai: {
      schemaVersion: 1, memories: [], relationships: [],
      coordination: {
        ...new Coordination().snapshot(), dialogues: [
          { speakerId: 'EMP-01', listenerId: 'EMP-01', replyAt: 1200, endsAt: 1203, replied: false },
        ],
      },
    },
  }, 1), /Invalid AI activity participant/);
  assert.equal((await loadGameFromIndexedDB())?.revision, 1);
});
