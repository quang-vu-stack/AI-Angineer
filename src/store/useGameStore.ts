import { create } from 'zustand';
import type { AgentEntity, AgentState, RoomId } from '../agents/types';
import { createInitialAgents } from '../agents/roster';
import {
  StubAIBrain,
  StubMemorySystem,
  StubRelationshipSystem,
} from '../ai/stubAdapter';
import type {
  IAIBrain,
  IMemorySystem,
  IRelationshipSystem,
  ITaskManager,
} from '../ai/interfaces';
import { CompanyService } from '../company/companyService';
import { stepSimulation } from '../simulation/simulationEngine';
import { findPathToWaypoint } from '../navigation/pathfinder';
import { OFFICE_ROOMS } from '../world/officeLayout';
import type { PerfStats, QualityLevel } from '../services/performanceMonitor';
import {
  clearSavedGame,
  loadGameSlot,
  saveGameToIndexedDB,
} from '../services/indexedDbService';

export const SPEED_OPTIONS = [0.15, 0.25, 0.5, 1, 1.5, 2] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

interface CameraFocusTarget {
  target: [number, number, number];
  offset: [number, number, number];
}

const initialAgents = createInitialAgents();
let brain: IAIBrain = new StubAIBrain();
let memorySystem: IMemorySystem = new StubMemorySystem();
let registeredTasks: ITaskManager | undefined;
let relationshipSystem: IRelationshipSystem = new StubRelationshipSystem();

/**
 * Dependency injection hook for ChatGPT & GPT-6.2 to plug in AI Brain / Memory / Tasks / Relationships
 * without modifying 3D world, navigation, or UI code.
 */
export function registerAISystems(systems: {
  brain?: IAIBrain;
  memory?: IMemorySystem;
  tasks?: ITaskManager;
  relationships?: IRelationshipSystem;
}): void {
  if (systems.brain) brain = systems.brain;
  if (systems.memory) memorySystem = systems.memory;
  if (systems.tasks) registeredTasks = systems.tasks;
  if (systems.relationships) relationshipSystem = systems.relationships;
}

let pendingPersistence = Promise.resolve();

function queuePersistence(action: () => Promise<void>): Promise<void> {
  const result = pendingPersistence.then(action);
  pendingPersistence = result.catch(() => undefined);
  return result;
}

function persistenceMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface GameStore {
  company: CompanyService;
  companyVersion: number;
  managementPanelOpen: boolean;
  saveRevision: number | null;
  persistenceError: string | null;
  agents: AgentEntity[];
  day: number;
  simMinutes: number; // Start at 08:30 (510)
  isPaused: boolean;
  speed: SpeedOption;
  quality: QualityLevel;
  showSpeechBubbles: boolean;
  selectedAgentId: string | null;
  cameraFocusTarget: CameraFocusTarget | null;
  perf: PerfStats;
  webglError: string | null;
  lastSavedAt: string | null;

  tickSimulation: (realDeltaSec: number) => void;
  notifyCompanyChange: () => void;
  setManagementPanelOpen: (open: boolean) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: SpeedOption) => void;
  setQuality: (quality: QualityLevel) => void;
  toggleSpeechBubbles: () => void;
  selectAgent: (id: string | null) => void;
  focusOnAgent: (id: string) => void;
  focusOnRoom: (roomId: RoomId) => void;
  resetOverviewCamera: () => void;
  clearCameraFocus: () => void;
  commandAgent: (id: string, targetState: AgentState, waypointId?: string) => void;
  updatePerfStats: (perf: PerfStats) => void;
  setWebGLError: (err: string | null) => void;
  saveNow: () => Promise<void>;
  hydrateFromIndexedDB: () => Promise<void>;
  resetSimulation: () => Promise<void>;
}

function freshSimulation(saveRevision: number | null): Partial<GameStore> {
  const agents = createInitialAgents();
  return {
    agents,
    company: CompanyService.create(agents),
    companyVersion: 0,
    saveRevision,
    persistenceError: null,
    day: 1,
    simMinutes: 8 * 60 + 30,
    isPaused: false,
    speed: 1,
    selectedAgentId: null,
    cameraFocusTarget: null,
    lastSavedAt: null,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  company: CompanyService.create(initialAgents),
  companyVersion: 0,
  managementPanelOpen: false,
  saveRevision: null,
  persistenceError: null,
  agents: initialAgents,
  day: 1,
  simMinutes: 8 * 60 + 30,
  isPaused: false,
  speed: 1,
  quality: 'medium',
  showSpeechBubbles: true,
  selectedAgentId: null,
  cameraFocusTarget: null,
  perf: { fps: 60, drawCalls: 0, triangles: 0, heapMB: null },
  webglError: null,
  lastSavedAt: null,

  tickSimulation: (realDeltaSec) => {
    const state = get();
    if (state.isPaused || realDeltaSec <= 0) return;
    const res = stepSimulation(
      state.agents,
      state.simMinutes,
      state.day,
      realDeltaSec,
      state.speed,
      brain,
      memorySystem,
      registeredTasks ?? state.company.tasks,
      relationshipSystem
    );
    // Mirror the backend's current task in the existing inspector, including manual reassignment.
    let taskChanged = false;
    if (!registeredTasks) {
      for (const agent of res.agents) {
        const task = state.company.tasks.getDisplayTask(agent.id);
        const nextTitle = task?.title ?? '';
        const nextProgress = Math.round(task?.progress ?? 0);
        if (agent.currentTask !== nextTitle || agent.taskProgress !== nextProgress) {
          taskChanged = true;
        }
        agent.currentTask = nextTitle;
        agent.taskProgress = nextProgress;
      }
    }
    set({
      agents: res.agents,
      simMinutes: res.simMinutes,
      day: res.day,
      companyVersion: taskChanged ? state.companyVersion + 1 : state.companyVersion,
    });
  },

  notifyCompanyChange: () => {
    const state = get();
    const syncedAgents = state.agents.map((agent) => {
      const emp = state.company.staff.getEmployee(agent.id);
      const task = state.company.tasks.getDisplayTask(agent.id);
      return {
        ...agent,
        department: emp.department,
        currentTask: task?.title ?? '',
        taskProgress: Math.round(task?.progress ?? 0),
      };
    });
    set({
      agents: syncedAgents,
      companyVersion: state.companyVersion + 1,
    });
  },

  setManagementPanelOpen: (open) => set({ managementPanelOpen: open }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setPaused: (paused) => set({ isPaused: paused }),
  setSpeed: (speed) => set({ speed }),
  setQuality: (quality) => set({ quality }),
  toggleSpeechBubbles: () => set((s) => ({ showSpeechBubbles: !s.showSpeechBubbles })),
  selectAgent: (id) => set({ selectedAgentId: id }),

  focusOnAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent) return;
    set({
      selectedAgentId: id,
      cameraFocusTarget: {
        target: [agent.position[0], 1, agent.position[2]],
        offset: [0, 6.2, 7.2],
      },
    });
  },

  focusOnRoom: (roomId) => {
    const room = OFFICE_ROOMS.find((r) => r.id === roomId);
    if (!room) return;
    set({
      cameraFocusTarget: {
        target: room.cameraTarget,
        offset: room.cameraOffset,
      },
    });
  },

  resetOverviewCamera: () =>
    set({
      cameraFocusTarget: {
        target: [0, 0, 0],
        offset: [0, 21, 24],
      },
    }),

  clearCameraFocus: () => set({ cameraFocusTarget: null }),

  commandAgent: (id, targetState, waypointId) => {
    set((s) => ({
      agents: s.agents.map((a) => {
        if (a.id !== id) return a;
        const targetWp =
          waypointId ??
          (targetState === 'Meeting'
            ? `meeting_seat_${(a.numericIndex % 8) + 1}`
            : a.deskWaypointId);
        const path = findPathToWaypoint(a.position, targetWp);
        return {
          ...a,
          path,
          pathIndex: 0,
          state: 'Walking',
          pendingStateAfterWalk: targetState,
          speechText: `Đã nhận lệnh: ${targetState}`,
          speechRemainingSec: 4,
        };
      }),
    }));
  },

  updatePerfStats: (perf) => set({ perf }),
  setWebGLError: (webglError) => set({ webglError }),

  saveNow: () => queuePersistence(async () => {
    const s = get();
    const savedAtIso = new Date().toISOString();
    try {
      const saveRevision = await saveGameToIndexedDB({
        version: '0.1.0',
        savedAtIso,
        day: s.day,
        simMinutes: s.simMinutes,
        speed: s.speed,
        quality: s.quality,
        agents: s.agents,
        company: s.company.snapshot(),
      }, s.saveRevision);
      set({ lastSavedAt: savedAtIso, saveRevision, persistenceError: null });
    } catch (error) {
      set({ persistenceError: persistenceMessage(error) });
    }
  }),

  hydrateFromIndexedDB: () => queuePersistence(async () => {
    try {
      const { state: saved, revision: saveRevision } = await loadGameSlot();
      if (!saved) {
        set(get().saveRevision === saveRevision
          ? { persistenceError: null }
          : freshSimulation(saveRevision));
        return;
      }
      const ids = new Set(saved.agents?.map(({ id }) => id));
      if (saved.agents?.length !== initialAgents.length || initialAgents.some(({ id }) => !ids.has(id))) {
        throw new Error('Danh sách nhân vật trong bản lưu không hợp lệ.');
      }
      const company = saved.company === undefined
        ? CompanyService.create(saved.agents)
        : CompanyService.restore(saved.company);
      for (const agent of initialAgents) company.staff.getEmployee(agent.id);
      set({
        company,
        companyVersion: get().companyVersion + 1,
        saveRevision,
        persistenceError: null,
        agents: saved.agents,
        day: saved.day,
        simMinutes: saved.simMinutes,
        speed: (SPEED_OPTIONS.includes(saved.speed as SpeedOption) ? saved.speed : 1) as SpeedOption,
        quality: saved.quality ?? 'medium',
        lastSavedAt: saved.savedAtIso,
      });
    } catch (error) {
      set({ persistenceError: persistenceMessage(error) });
    }
  }),

  resetSimulation: () => queuePersistence(async () => {
    try {
      const saveRevision = await clearSavedGame(get().saveRevision);
      set(freshSimulation(saveRevision));
    } catch (error) {
      set({ persistenceError: persistenceMessage(error) });
    }
  }),
}));
