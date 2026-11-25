import { create } from 'zustand';
import type { AgentEntity, AgentState, RoomId } from '../agents/types';
import { createInitialAgents } from '../agents/roster';
import {
  StubAIBrain,
  StubMemorySystem,
  StubRelationshipSystem,
  StubTaskManager,
} from '../ai/stubAdapter';
import type {
  IAIBrain,
  IMemorySystem,
  IRelationshipSystem,
  ITaskManager,
} from '../ai/interfaces';
import { stepSimulation } from '../simulation/simulationEngine';
import { findPathToWaypoint } from '../navigation/pathfinder';
import { OFFICE_ROOMS } from '../world/officeLayout';
import type { PerfStats, QualityLevel } from '../services/performanceMonitor';
import {
  clearSavedGame,
  loadGameFromIndexedDB,
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
let taskManager: ITaskManager = new StubTaskManager();
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
  if (systems.tasks) taskManager = systems.tasks;
  if (systems.relationships) relationshipSystem = systems.relationships;
}

interface GameStore {
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
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: SpeedOption) => void;
  setQuality: (quality: QualityLevel) => void;
  toggleSpeechBubbles: () => void;
  selectAgent: (id: string | null) => void;
  focusOnAgent: (id: string) => void;
  focusOnRoom: (roomId: RoomId) => void;
  clearCameraFocus: () => void;
  commandAgent: (id: string, targetState: AgentState, waypointId?: string) => void;
  updatePerfStats: (perf: PerfStats) => void;
  setWebGLError: (err: string | null) => void;
  saveNow: () => Promise<void>;
  hydrateFromIndexedDB: () => Promise<void>;
  resetSimulation: () => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
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
    if (state.isPaused) return;
    const res = stepSimulation(
      state.agents,
      state.simMinutes,
      state.day,
      realDeltaSec,
      state.speed,
      brain,
      memorySystem,
      taskManager,
      relationshipSystem
    );
    set({
      agents: res.agents,
      simMinutes: res.simMinutes,
      day: res.day,
    });
  },

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
        offset: [0, 6.5, 7.5],
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

  saveNow: async () => {
    const s = get();
    const savedAtIso = new Date().toISOString();
    await saveGameToIndexedDB({
      version: '0.1.0',
      savedAtIso,
      day: s.day,
      simMinutes: s.simMinutes,
      speed: s.speed,
      quality: s.quality,
      agents: s.agents,
    });
    set({ lastSavedAt: savedAtIso });
  },

  hydrateFromIndexedDB: async () => {
    try {
      const saved = await loadGameFromIndexedDB();
      if (saved && Array.isArray(saved.agents) && saved.agents.length === 20) {
        set({
          agents: saved.agents,
          day: saved.day,
          simMinutes: saved.simMinutes,
          speed: (SPEED_OPTIONS.includes(saved.speed as SpeedOption)
            ? saved.speed
            : 1) as SpeedOption,
          quality: saved.quality ?? 'medium',
          lastSavedAt: saved.savedAtIso,
        });
      }
    } catch {
      // Non-fatal: fallback to clean V0.1 initial state
    }
  },

  resetSimulation: async () => {
    await clearSavedGame().catch(() => undefined);
    set({
      agents: createInitialAgents(),
      day: 1,
      simMinutes: 8 * 60 + 30,
      isPaused: false,
      speed: 1,
      selectedAgentId: null,
      lastSavedAt: null,
    });
  },
}));
