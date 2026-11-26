import type { CompanyService } from './companyService';
import type { CompanySnapshot, ManagedTask } from '../types/company';
import {
  dayNumber,
  stageInput,
  type StageInput,
  type WorkflowState,
  type WorkflowPlan,
} from '../types/workflow';
import { titleSchema } from '../types/companySchema';

type Node = WorkflowPlan['stages'][number]['tasks'][number];
type EventKind = WorkflowState['events'][number]['kind'];
const fresh = (): WorkflowState => ({ plans: [], events: [], tickets: [], work: [] });

function indexPlan(stages: StageInput) {
  const byId = new Map<string, { stage: number; after: string[] }>();
  stages.forEach((s, stage) =>
    s.tasks.forEach((n) => {
      if (byId.has(n.taskId) || new Set(n.after).size !== n.after.length)
        throw new Error('Nhiệm vụ hoặc phụ thuộc trùng.');
      byId.set(n.taskId, { stage, after: n.after });
    }),
  );
  const visited = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error('Phụ thuộc vòng lặp.');
    visiting.add(id);
    const n = byId.get(id)!;
    for (const parent of n.after) {
      const dep = byId.get(parent);
      if (!dep || dep.stage > n.stage) throw new Error('Phụ thuộc thiếu hoặc thuộc giai đoạn sau.');
      visit(parent);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return byId;
}

export function validateWorkflow(snapshot: CompanySnapshot) {
  const s = snapshot.workflow;
  if (!s) return;
  const tasks = new Map(snapshot.tasks.map((t) => [t.id, t])),
    owned = new Map<string, string>(),
    plans = new Set<string>();
  for (const p of s.plans) {
    if (plans.has(p.projectId)) throw new Error('Duplicate workflow');
    plans.add(p.projectId);
    indexPlan(p.stages);
    let earlierDone = true;
    for (const stage of p.stages) {
      for (const n of stage.tasks) {
        const t = tasks.get(n.taskId);
        if (
          !t ||
          t.projectId !== p.projectId ||
          owned.has(n.taskId) ||
          n.observed > t.progress ||
          (!n.released && (t.status !== 'queued' || t.assignedAgentId !== null || t.progress !== 0)) ||
          (n.released && (!earlierDone || n.after.some((id) => tasks.get(id)?.status !== 'completed')))
        )
          throw new Error('Invalid workflow task');
        owned.set(n.taskId, p.projectId);
      }
      earlierDone = earlierDone && stage.tasks.every((n) => tasks.get(n.taskId)?.status === 'completed');
    }
    if (p.status !== 'working' && !earlierDone) throw new Error('Workflow has unfinished work');
    if (
      p.status !== 'delivered' &&
      snapshot.business?.contracts.some(
        (c) => c.status === 'completed' && c.taskIds.some((id) => owned.get(id) === p.projectId),
      )
    )
      throw new Error('Undelivered contract settlement');
  }
  const open = new Set<string>(),
    ids = new Set<string>(),
    days = new Set<string>();
  for (const ticket of s.tickets) {
    if (ids.has(ticket.id) || !owned.has(ticket.taskId)) throw new Error('Invalid support ticket');
    ids.add(ticket.id);
    if (ticket.resolution === null) {
      if (open.has(ticket.taskId) || tasks.get(ticket.taskId)?.status !== 'blocked')
        throw new Error('Invalid open ticket');
      open.add(ticket.taskId);
    }
  }
  const lifecycle = new Map<string, WorkflowPlan['status']>();
  for (const e of s.events) {
    const previous = lifecycle.get(e.projectId) ?? 'working';
    if (e.kind === 'qa' && previous === 'working') lifecycle.set(e.projectId, 'qa');
    else if (e.kind === 'approval' && previous === 'qa') lifecycle.set(e.projectId, 'approval');
    else if (e.kind === 'delivered' && previous === 'approval') lifecycle.set(e.projectId, 'delivered');
    else if (e.kind === 'defect' && (previous === 'qa' || previous === 'approval'))
      lifecycle.set(e.projectId, 'working');
    else if (['qa', 'approval', 'delivered', 'defect'].includes(e.kind))
      throw new Error('Invalid workflow decision history');
    if (!plans.has(e.projectId) || (e.taskId !== null && owned.get(e.taskId) !== e.projectId))
      throw new Error('Invalid workflow event');
  }
  for (const p of s.plans)
    if ((lifecycle.get(p.projectId) ?? 'working') !== p.status) throw new Error('Missing workflow decision');
  for (const w of s.work) {
    const key = w.day + '/' + w.taskId;
    if (!owned.has(w.taskId) || days.has(key)) throw new Error('Invalid work report');
    days.add(key);
  }
}

export class WorkflowEngine {
  private state: WorkflowState;
  private unreadCount: number;
  private nodes = new Map<string, { node: Node; plan: WorkflowPlan }>();
  constructor(
    private c: CompanyService,
    saved?: WorkflowState,
  ) {
    this.state = saved ?? fresh();
    this.unreadCount = this.state.events.filter((e) => !e.read).length;
    for (const p of this.state.plans) this.index(p);
  }
  private index(plan: WorkflowPlan) {
    for (const s of plan.stages) for (const node of s.tasks) this.nodes.set(node.taskId, { node, plan });
  }
  snapshot() {
    return structuredClone(this.state);
  }
  get unread() {
    return this.unreadCount;
  }
  markRead() {
    for (const e of this.state.events) e.read = true;
    this.unreadCount = 0;
  }
  runnable(id: string) {
    const entry = this.nodes.get(id);
    return (
      !entry ||
      (entry.node.released && !this.state.tickets.some((t) => t.taskId === id && t.resolution === null))
    );
  }
  canSettle(ids: string[]) {
    return ids.every((id) => !this.nodes.has(id) || this.nodes.get(id)!.plan.status === 'delivered');
  }
  private event(p: WorkflowPlan, day: number, kind: EventKind, detail: string, taskId: string | null = null) {
    this.unreadCount++;
    this.state.events.push({ projectId: p.projectId, taskId, kind, day, detail, read: false });
  }
  create(projectId: string, input: StageInput, day: number) {
    dayNumber.parse(day);
    this.c.projects.require(projectId);
    if (this.state.plans.some((p) => p.projectId === projectId)) throw new Error('Dự án đã có quy trình.');
    const stages = stageInput.parse(input);
    const index = indexPlan(stages);
    const tasks = new Map(this.c.tasks.getAllTasks().map((t) => [t.id, t]));
    for (const id of index.keys()) {
      const t = tasks.get(id);
      if (!t || t.projectId !== projectId || t.progress !== 0 || t.status !== 'queued')
        throw new Error('Chọn nhiệm vụ chưa bắt đầu trong cùng dự án.');
    }
    const p: WorkflowPlan = {
      projectId,
      status: 'working',
      stages: stages.map((s) => ({
        ...s,
        tasks: s.tasks.map((n) => ({ ...n, released: false, observed: 0, late: false })),
      })),
    };
    for (const id of index.keys()) if (tasks.get(id)!.assignedAgentId !== null) this.c.tasks.assign(id, null);
    this.state.plans.push(p);
    this.index(p);
    this.advance(day);
  }
  private openTicket(plan: WorkflowPlan, id: string, day: number, reason: string) {
    if (this.state.tickets.some((t) => t.taskId === id && t.resolution === null)) return;
    this.state.tickets.push({ id: crypto.randomUUID(), taskId: id, day, reason, resolution: null });
    this.event(plan, day, 'blocked', reason, id);
  }
  requestHelp(id: string, reason: string, day: number) {
    dayNumber.parse(day);
    reason = titleSchema.parse(reason);
    const entry = this.nodes.get(id);
    if (!entry?.node.released) throw new Error('Nhiệm vụ chưa được chuyển giao.');
    this.c.tasks.transition(id, 'blocked');
    this.openTicket(entry.plan, id, day, reason);
  }
  resolve(id: string, note: string, day: number) {
    dayNumber.parse(day);
    note = titleSchema.parse(note);
    const t = this.state.tickets.find((t) => t.id === id && t.resolution === null);
    if (!t) throw new Error('Yêu cầu không còn mở.');
    // Temporarily open the ticket gate for reassignment and resume.
    t.resolution = note;
    try {
      this.ensureAssignment(this.c.tasks.getAllTasks().find((task) => task.id === t.taskId)!);
      this.c.tasks.transition(t.taskId, 'in_progress');
    } catch (error) {
      t.resolution = null;
      throw error;
    }
    this.event(this.nodes.get(t.taskId)!.plan, day, 'resolved', note, t.taskId);
  }
  private ensureAssignment(t: ManagedTask) {
    if (t.assignedAgentId !== null) return;
    const id = this.c.business.chooseTaskAssignee(t);
    if (id) this.c.tasks.assign(t.id, id);
  }
  advance(day: number) {
    if (!this.nodes.size) return;
    dayNumber.parse(day);
    const tasks = new Map(this.c.tasks.getAllTasks().map((t) => [t.id, t]));
    for (const p of this.state.plans) {
      if (p.status !== 'working') continue;
      let earlierDone = true;
      for (const stage of p.stages) {
        for (const n of stage.tasks) {
          const t = tasks.get(n.taskId)!;
          if (!n.released && earlierDone && n.after.every((id) => tasks.get(id)?.status === 'completed')) {
            n.released = true;
            this.event(p, day, 'handoff', t.title, t.id);
          }
          if (
            !n.late &&
            n.dueDay !== null &&
            day > n.dueDay &&
            (t.status !== 'completed' || n.observed < 100)
          ) {
            n.late = true;
            this.event(p, day, 'overdue', t.title, t.id);
          }
          if (!n.released) continue;
          if (t.status === 'blocked') this.openTicket(p, t.id, day, 'Cần hỗ trợ: ' + t.title.slice(0, 145));
          else if (t.status !== 'completed') this.ensureAssignment(t);
          if (t.progress > n.observed) {
            const delta = t.progress - n.observed;
            const row = this.state.work.find((r) => r.day === day && r.taskId === t.id);
            if (row) row.points = Math.min(100, row.points + delta);
            else this.state.work.push({ day, taskId: t.id, points: delta });
            n.observed = t.progress;
            if (t.status === 'completed') this.event(p, day, 'complete', t.title, t.id);
          }
        }
        earlierDone = earlierDone && stage.tasks.every((n) => tasks.get(n.taskId)?.status === 'completed');
      }
      if (earlierDone) {
        p.status = 'qa';
        this.event(p, day, 'qa', 'Chờ kiểm tra chất lượng');
      }
    }
  }
  decide(projectId: string, expected: 'qa' | 'approval', pass: boolean, note: string, day: number) {
    dayNumber.parse(day);
    note = titleSchema.parse(note);
    const p = this.state.plans.find((p) => p.projectId === projectId);
    if (!p || p.status !== expected || (expected !== 'qa' && expected !== 'approval'))
      throw new Error('Chưa đến bước xét duyệt.');
    if (!pass) {
      const last = p.stages.at(-1)!;
      const dept = this.c.tasks.getAllTasks().find((t) => t.id === last.tasks[0].taskId)!.department;
      const task = this.c.tasks.create({
        id: crypto.randomUUID(),
        projectId,
        department: dept,
        priority: 'high',
        title: note,
        assignedAgentId: null,
        dueAt: null,
      });
      const node = { taskId: task.id, after: [], dueDay: null, released: false, observed: 0, late: false };
      last.tasks.push(node);
      this.nodes.set(task.id, { node, plan: p });
      p.status = 'working';
      this.event(p, day, 'defect', note, task.id);
      this.advance(day);
    } else {
      p.status = p.status === 'qa' ? 'approval' : 'delivered';
      this.event(p, day, p.status === 'approval' ? 'approval' : 'delivered', note);
    }
  }
  report(day: number) {
    dayNumber.parse(day);
    return structuredClone({
      day,
      work: this.state.work.filter((w) => w.day === day),
      events: this.state.events.filter((e) => e.day === day),
    });
  }
}
