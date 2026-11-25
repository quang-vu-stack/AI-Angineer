import type { AgentEntity, AgentState } from '../agents/types';
import type {
  IAIBrain,
  IMemorySystem,
  IRelationshipSystem,
  ITaskManager,
  SimulationSnapshot,
} from '../ai/interfaces';
import { findPathToWaypoint } from '../navigation/pathfinder';
import { clampOutsideObstacles } from '../navigation/collision';
import { getSeatFacingRotation } from '../navigation/waypointGraph';

const WALK_SPEED_MPS = 2.6;

export interface SimulationTickResult {
  agents: AgentEntity[];
  simMinutes: number;
  day: number;
}

export function stepSimulation(
  agents: AgentEntity[],
  simMinutes: number,
  day: number,
  realDeltaSec: number,
  speedMultiplier: number,
  brain: IAIBrain,
  memory: IMemorySystem,
  taskManager: ITaskManager,
  relationships: IRelationshipSystem
): SimulationTickResult {
  const simDeltaSec = realDeltaSec * speedMultiplier;
  if (simDeltaSec <= 0) {
    return { agents, simMinutes, day };
  }

  // 1 real second at 1x = 1 in-game minute
  let nextMinutes = simMinutes + simDeltaSec;
  let nextDay = day;
  if (nextMinutes >= 1440) {
    nextMinutes -= 1440;
    nextDay += 1;
  }

  const snapshot: SimulationSnapshot = {
    simMinutes: nextMinutes,
    day: nextDay,
    agents,
    activeMeetingRoomId: null,
  };

  const nextAgents = agents.map((agent) => {
    const a: AgentEntity = {
      ...agent,
      position: [...agent.position],
      path: agent.path,
    };

    // Update speech bubble timer
    if (a.speechRemainingSec > 0) {
      a.speechRemainingSec -= simDeltaSec;
      if (a.speechRemainingSec <= 0) {
        a.speechRemainingSec = 0;
        a.speechText = null;
      }
    }

    // Movement along waypoint path
    if (a.state === 'Walking' && a.path.length > 0 && a.pathIndex < a.path.length) {
      const target = a.path[a.pathIndex];
      const dx = target[0] - a.position[0];
      const dz = target[2] - a.position[2];
      const dist = Math.hypot(dx, dz);
      const stepDist = WALK_SPEED_MPS * simDeltaSec;

      if (dist <= stepDist || dist < 0.08) {
        a.position[0] = target[0];
        a.position[2] = target[2];
        a.pathIndex += 1;
        if (a.pathIndex >= a.path.length) {
          a.path = [];
          a.pathIndex = 0;
          a.state = a.pendingStateAfterWalk ?? 'Idle';
          a.pendingStateAfterWalk = null;
          a.stateTimerSec = 10 + (a.numericIndex % 6) * 2.5;
          const seatRot = getSeatFacingRotation(a.position);
          if (seatRot !== null) {
            a.rotationY = seatRot;
          }
        }
      } else {
        const nx = a.position[0] + (dx / dist) * stepDist;
        const nz = a.position[2] + (dz / dist) * stepDist;
        const [clampedX, clampedZ] = clampOutsideObstacles(nx, nz);
        a.position[0] = clampedX;
        a.position[2] = clampedZ;
        a.rotationY = Math.atan2(dx, dz);
      }
    } else {
      // Ensure seated agents always face their desk monitor or conference table
      if (
        a.state === 'Working' ||
        a.state === 'Sitting' ||
        a.state === 'Meeting' ||
        a.state === 'Resting'
      ) {
        const seatRot = getSeatFacingRotation(a.position);
        if (seatRot !== null) {
          a.rotationY = seatRot;
        }
      }

      // Update metrics based on current state
      updateAgentMetrics(a, simDeltaSec, taskManager);

      a.stateTimerSec -= simDeltaSec;
      if (a.stateTimerSec <= 0) {
        const intent = brain.decideNextIntent(
          a,
          snapshot,
          memory,
          taskManager,
          relationships
        );
        if (intent) {
          applyIntentToAgent(a, intent, nextMinutes, nextDay, memory, relationships);
        } else {
          a.stateTimerSec = 10;
        }
      }
    }

    return a;
  });

  return {
    agents: nextAgents,
    simMinutes: nextMinutes,
    day: nextDay,
  };
}

function updateAgentMetrics(
  a: AgentEntity,
  dt: number,
  taskManager: ITaskManager
): void {
  const factor = dt * 0.35;
  switch (a.state) {
    case 'Working': {
      a.energy = clamp(a.energy - factor * 1.1);
      a.stress = clamp(a.stress + factor * 0.65);
      a.productivity = clamp(a.productivity + (a.energy > 35 ? factor * 0.6 : -factor * 0.5));
      const updated = taskManager.advanceTaskProgress(a.id, dt * 1.4);
      if (updated) {
        a.taskProgress = Math.round(updated.progress);
        a.currentTask = updated.title;
      }
      break;
    }
    case 'Resting': {
      a.energy = clamp(a.energy + factor * 2.6);
      a.stress = clamp(a.stress - factor * 2.2);
      a.mood = clamp(a.mood + factor * 1.4);
      break;
    }
    case 'Talking': {
      a.mood = clamp(a.mood + factor * 1.2);
      a.stress = clamp(a.stress - factor * 0.8);
      a.energy = clamp(a.energy - factor * 0.4);
      break;
    }
    case 'Meeting': {
      a.energy = clamp(a.energy - factor * 0.8);
      a.stress = clamp(a.stress + factor * 0.4);
      a.productivity = clamp(a.productivity + factor * 0.5);
      break;
    }
    case 'Sitting':
    case 'Idle': {
      a.energy = clamp(a.energy + factor * 0.7);
      a.stress = clamp(a.stress - factor * 0.5);
      break;
    }
    default:
      break;
  }
}

function applyIntentToAgent(
  a: AgentEntity,
  intent: {
    targetState: AgentState;
    targetWaypointId?: string;
    speechText?: string;
    speechDurationSec?: number;
    interactWithAgentId?: string;
  },
  simMinutes: number,
  day: number,
  memory: IMemorySystem,
  relationships: IRelationshipSystem
): void {
  if (intent.speechText) {
    a.speechText = intent.speechText;
    a.speechRemainingSec = intent.speechDurationSec ?? 5;
  }

  if (intent.interactWithAgentId) {
    relationships.recordInteraction(a.id, intent.interactWithAgentId, 2, day);
    memory.addMemory({
      agentId: a.id,
      timestampSimMinutes: Math.floor(simMinutes),
      day,
      kind: 'conversation',
      summary: `Trao đổi công việc với ${intent.interactWithAgentId}`,
      importance: 4,
      relatedAgentIds: [intent.interactWithAgentId],
    });
  }

  if (intent.targetWaypointId) {
    const path = findPathToWaypoint(a.position, intent.targetWaypointId);
    const last = path[path.length - 1];
    const distToGoal = last
      ? Math.hypot(last[0] - a.position[0], last[2] - a.position[2])
      : 0;
    if (distToGoal > 0.35) {
      a.path = path;
      a.pathIndex = 0;
      a.state = 'Walking';
      a.pendingStateAfterWalk = intent.targetState;
      a.stateTimerSec = 14;
      return;
    }
  }

  a.state = intent.targetState;
  a.stateTimerSec = 10 + (a.numericIndex % 5) * 2.5;
  const seatRot = getSeatFacingRotation(a.position);
  if (seatRot !== null) {
    a.rotationY = seatRot;
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}
