import type { AgentEntity } from '../agents/types';
import type { AgentIntent, IMemorySystem, IRelationshipSystem } from '../ai/interfaces';
import { findPathToWaypoint } from '../navigation/pathfinder';
import type { TaskManager } from '../tasks/taskManager';
import { ProductivityLog } from './productivity';
import type { DailyActivity } from './productivity';

export interface Dialogue {
  speakerId: string;
  listenerId: string;
  replyAt: number;
  endsAt: number;
  replied: boolean;
}

export interface Meeting {
  projectId: string;
  invited: { agentId: string; taskId: string }[];
  attendees: string[];
  arrivalDeadline: number;
  endsAt: number | null;
}

export interface CoordinationSnapshot {
  lastMeetingDay: number;
  meeting: Meeting | null;
  dialogues: Dialogue[];
  dailyActivity: DailyActivity[];
}

export const simulationTime = (day: number, minutes: number): number => (day - 1) * 1440 + minutes;
const timeDay = (time: number): number => Math.floor(time / 1440) + 1;

function setSpeech(agent: AgentEntity, text: string, duration: number): void {
  agent.speechText = text;
  agent.speechRemainingSec = duration;
}

function endActivity(agent?: AgentEntity): void {
  if (!agent) return;
  agent.state = 'Idle';
  agent.stateTimerSec = 0;
  agent.path = [];
  agent.pathIndex = 0;
  agent.pendingStateAfterWalk = null;
  agent.speechText = null;
  agent.speechRemainingSec = 0;
}

function readyToTalk(agent: AgentEntity): boolean {
  return agent.state === 'Idle' || agent.state === 'Sitting';
}

export class Coordination {
  readonly productivity: ProductivityLog;
  #dialogues: Dialogue[];
  #meeting: Meeting | null;
  #lastMeetingDay: number;

  constructor(snapshot?: CoordinationSnapshot) {
    this.#dialogues = structuredClone(snapshot?.dialogues ?? []);
    this.#meeting = structuredClone(snapshot?.meeting ?? null);
    this.#lastMeetingDay = snapshot?.lastMeetingDay ?? 0;
    this.productivity = new ProductivityLog(snapshot?.dailyActivity);
  }

  get meetingRoom(): 'central_meeting_room' | null {
    return this.#meeting ? 'central_meeting_room' : null;
  }

  isReserved(agentId: string): boolean {
    return this.#meeting?.invited.some((invite) => invite.agentId === agentId) === true
      || this.#dialogues.some(({ speakerId, listenerId }) => speakerId === agentId || listenerId === agentId);
  }

  snapshot(): CoordinationSnapshot {
    return {
      lastMeetingDay: this.#lastMeetingDay,
      meeting: structuredClone(this.#meeting),
      dialogues: structuredClone(this.#dialogues),
      dailyActivity: this.productivity.snapshot(),
    };
  }

  advance(
    agents: AgentEntity[], now: number, memory: IMemorySystem,
    relationships: IRelationshipSystem, tasks?: TaskManager,
  ): void {
    if (this.#dialogues.length || this.#meeting) {
      const byId = new Map(agents.map((agent) => [agent.id, agent]));
      this.#dialogues = this.#dialogues.filter((dialogue) => {
        const speaker = byId.get(dialogue.speakerId);
        const listener = byId.get(dialogue.listenerId);
        if (!speaker || !listener) {
          endActivity(speaker);
          endActivity(listener);
          return false;
        }
        if (now >= dialogue.endsAt) {
          const day = timeDay(now);
          relationships.recordInteraction(speaker.id, listener.id, 2, day);
          for (const [participant, peer] of [[speaker, listener], [listener, speaker]]) {
            memory.addMemory({
              agentId: participant.id, day, timestampSimMinutes: Math.floor(now % 1440),
              kind: 'conversation', summary: `Trao đổi công việc với ${peer.name}`,
              importance: 4, relatedAgentIds: [peer.id],
            });
          }
          this.productivity.count(day, 'conversationsCompleted');
          endActivity(speaker);
          endActivity(listener);
          return false;
        }
        if (!dialogue.replied && now >= dialogue.replyAt) {
          dialogue.replied = true;
          speaker.speechText = null;
          speaker.speechRemainingSec = 0;
          setSpeech(listener, `Cảm ơn ${speaker.name}, mình sẽ trao đổi khi cần phối hợp.`, dialogue.endsAt - now);
        }
        return true;
      });
      if (this.#meeting) this.advanceMeeting(this.#meeting, byId, now, memory, relationships, tasks);
    }

    const day = timeDay(now);
    const minute = now % 1440;
    if (!tasks || this.#meeting || this.#lastMeetingDay === day || minute < 525 || minute >= 660) return;
    this.startMeeting(agents, tasks, now);
  }

  startDialogue(intent: AgentIntent, agents: AgentEntity[], now: number): boolean {
    const speaker = agents.find(({ id }) => id === intent.agentId);
    const listener = agents.find(({ id }) => id === intent.interactWithAgentId);
    if (!speaker || !listener || speaker.id === listener.id || !intent.speechText?.trim()
      || this.isReserved(speaker.id) || this.isReserved(listener.id) || !readyToTalk(listener)
      || speaker.state === 'Walking' || speaker.state === 'Meeting' || speaker.state === 'Resting'
      || Math.hypot(speaker.position[0] - listener.position[0], speaker.position[2] - listener.position[2]) >= 3) return false;

    const requested = intent.speechDurationSec ?? 6;
    const duration = Number.isFinite(requested) ? Math.min(15, Math.max(4, requested)) : 6;
    this.#dialogues.push({
      speakerId: speaker.id, listenerId: listener.id, replyAt: now + duration / 2, endsAt: now + duration, replied: false,
    });
    for (const participant of [speaker, listener]) {
      participant.state = 'Talking';
      participant.stateTimerSec = duration;
    }
    setSpeech(speaker, intent.speechText, duration / 2);
    setSpeech(listener, 'Đang lắng nghe…', duration / 2);
    return true;
  }

  startMeeting(agents: AgentEntity[], tasks: TaskManager, now: number, projectId?: string): boolean {
    if (this.#meeting) return false;
    const eligible = new Map(agents.filter((agent) =>
      (agent.state === 'Working' || readyToTalk(agent)) && agent.energy >= 32 && agent.stress <= 75
      && !this.isReserved(agent.id),
    ).map((agent) => [agent.id, agent]));
    const projects = new Map<string, Map<string, Meeting['invited'][number]>>();
    for (const task of tasks.getAllTasks()) {
      if (projectId && task.projectId !== projectId) continue;
      const id = task.assignedAgentId;
      if (!id || !eligible.has(id) || (task.status !== 'queued' && task.status !== 'in_progress')) continue;
      const invitees = projects.get(task.projectId) ?? new Map();
      if (!invitees.has(task.department)) invitees.set(task.department, { agentId: id, taskId: task.id });
      projects.set(task.projectId, invitees);
    }
    const candidate = [...projects].find(([, invitees]) => new Set([...invitees.values()].map(({ agentId }) => agentId)).size >= 2);
    if (!candidate) return false;
    const [selectedProject, invitees] = candidate;
    const invited = [...new Map([...invitees.values()].map((invite) => [invite.agentId, invite])).values()].slice(0, 8);
    this.#meeting = { projectId: selectedProject, invited, attendees: [], arrivalDeadline: now + 35, endsAt: null };
    this.#lastMeetingDay = timeDay(now);
    invited.forEach(({ agentId }, index) => {
      const agent = eligible.get(agentId)!;
      const path = findPathToWaypoint(agent.position, `meeting_seat_${index + 1}`);
      agent.path = path;
      agent.pathIndex = 0;
      agent.state = path.length ? 'Walking' : 'Meeting';
      agent.pendingStateAfterWalk = path.length ? 'Meeting' : null;
      setSpeech(agent, 'Đến phòng họp để phối hợp dự án.', 5);
    });
    return true;
  }

  private advanceMeeting(
    meeting: Meeting, agents: Map<string, AgentEntity>, now: number, memory: IMemorySystem,
    relationships: IRelationshipSystem, tasks?: TaskManager,
  ): void {
    if (meeting.endsAt === null) {
      const arrived = meeting.invited.filter(({ agentId }) => agents.get(agentId)?.state === 'Meeting');
      if (arrived.length < meeting.invited.length && now < meeting.arrivalDeadline) return;
      if (arrived.length < 2) {
        meeting.invited.forEach(({ agentId }) => endActivity(agents.get(agentId)));
        this.#meeting = null;
        return;
      }
      meeting.attendees = arrived.map(({ agentId }) => agentId);
      const present = new Set(meeting.attendees);
      for (const { agentId } of meeting.invited) {
        const agent = agents.get(agentId);
        if (!present.has(agentId)) endActivity(agent);
        else if (agent) setSpeech(agent, 'Thống nhất tiến độ và hỗ trợ giữa các phòng ban.', 6);
      }
      meeting.invited = arrived;
      meeting.endsAt = now + 8;
      return;
    }

    if (now < meeting.endsAt) return;
    const day = timeDay(now);
    const work = tasks?.getAllTasks();
    meeting.invited.forEach(({ agentId, taskId }, index) => {
      const peers = meeting.attendees.filter((id) => id !== agentId);
      memory.addMemory({
        agentId, day, timestampSimMinutes: Math.floor(now % 1440), kind: 'meeting', importance: 6,
        summary: `Họp phối hợp dự án ${meeting.projectId}`, relatedAgentIds: peers,
      });
      const task = work?.find(({ id }) => id === taskId);
      if (task?.projectId === meeting.projectId && task.assignedAgentId === agentId) {
        if (tasks?.advanceTask(taskId, 5)?.status === 'completed') this.productivity.count(day, 'tasksCompleted');
      }
      meeting.attendees.slice(index + 1).forEach((peer) => relationships.recordInteraction(agentId, peer, 1, day));
      endActivity(agents.get(agentId));
    });
    this.productivity.count(day, 'meetingsCompleted');
    this.#meeting = null;
  }
}
