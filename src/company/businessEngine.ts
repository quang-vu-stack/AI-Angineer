import type { CompanyService } from './companyService';
import type { DepartmentId } from '../agents/types';
import type { BusinessState, Offer } from '../types/companySchema';
import { offerSchema, simDaySchema, titleSchema } from '../types/companySchema';

const fresh = (): BusinessState => ({
  customers: [],
  contracts: [],
  routines: [],
  unpaid: [],
  strategy: 'skills',
  salaryPerEmployee: 0,
  dailyOverhead: 0,
  lastDay: null,
});
const uid = () => crypto.randomUUID();

export class BusinessEngine {
  private state: BusinessState;
  constructor(
    private company: CompanyService,
    saved?: BusinessState,
  ) {
    this.state = saved ?? fresh();
  }
  get needsStart() {
    return this.state.lastDay === null;
  }
  snapshot() {
    return structuredClone(this.state);
  }

  customer(name: string) {
    const customer = { id: uid(), name: titleSchema.parse(name) };
    this.state.customers.push(customer);
    return customer.id;
  }

  propose(input: Offer, day: number) {
    simDaySchema.parse(day);
    const terms = offerSchema.parse(input);
    this.company.projects.require(terms.projectId);
    if (!this.state.customers.some((c) => c.id === terms.customerId))
      throw new Error('Khách hàng không tồn tại');
    if (terms.dueDay < day) throw new Error('Hợp đồng đã quá hạn');
    const id = uid();
    this.state.contracts.push({ ...terms, id, status: 'proposed', taskIds: [] });
    return id;
  }

  decide(id: string, approve: boolean, day: number) {
    simDaySchema.parse(day);
    const c = this.state.contracts.find((item) => item.id === id);
    if (!c || c.status !== 'proposed') throw new Error('Hợp đồng không chờ duyệt');
    if (day > c.dueDay) {
      c.status = 'expired';
      return;
    }
    if (!approve) {
      c.status = 'rejected';
      return;
    }
    for (const req of c.requirements) {
      const task = this.company.tasks.create({
        id: uid(),
        title: req.title,
        department: req.department,
        projectId: c.projectId,
        assignedAgentId: this.assignee(req.department, req.skills),
        priority: 'high',
        dueAt: null,
      });
      c.taskIds.push(task.id);
    }
    c.status = 'active';
  }

  configure(strategy: BusinessState['strategy'], salary: number, overhead: number) {
    if (
      !['skills', 'capacity'].includes(strategy) ||
      ![salary, overhead].every((v) => Number.isSafeInteger(v) && v >= 0) ||
      !Number.isSafeInteger(salary * this.company.staff.listEmployees().length)
    )
      throw new Error('Chính sách không hợp lệ');
    Object.assign(this.state, { strategy, salaryPerEmployee: salary, dailyOverhead: overhead });
  }

  private assignee(department: DepartmentId, skills: string[]) {
    const required = new Set(skills.map((s) => s.toLowerCase()));
    const candidates = this.company.staff
      .listEmployees(department)
      .filter((e) => e.availability === 'active')
      .map((e) => ({
        id: e.id,
        matches: e.skills.filter((s) => required.has(s.toLowerCase())).length,
        load: this.company.tasks.getTasksForAgent(e.id).reduce((n, t) => n + 100 - t.progress, 0),
      }));
    candidates.sort((a, b) => {
      const skill = b.matches - a.matches,
        load = a.load - b.load;
      return (
        (this.state.strategy === 'skills' ? skill || load : load || skill) || a.id.localeCompare(b.id)
      );
    });
    return candidates[0]?.id ?? null;
  }

  advance(day: number) {
    simDaySchema.parse(day);
    const s = this.state;
    if (s.lastDay !== null && day < s.lastDay) throw new Error('Ngày mô phỏng đi lùi');
    const tasks = this.company.tasks.getAllTasks();
    const byId = new Map(tasks.map((t) => [t.id, t]));
    for (const c of s.contracts) {
      if (c.status === 'proposed' && day > c.dueDay) c.status = 'expired';
      if (c.status !== 'active') continue;
      if (c.taskIds.every((id) => byId.get(id)?.status === 'completed')) {
        this.company.finance.record({
          id: 'income-' + c.id,
          kind: 'revenue',
          amountVnd: c.valueVnd,
          description: c.title,
          recordedAt: new Date().toISOString(),
          projectId: c.projectId,
          simDay: day,
        });
        c.status = 'completed';
      } else {
        c.taskIds.forEach((id, i) => {
          if (byId.get(id)?.assignedAgentId === null) {
            const req = c.requirements[i];
            const agent = this.assignee(req.department, req.skills);
            if (agent) this.company.tasks.assign(id, agent);
          }
        });
      }
    }
    const active = this.company.staff.listEmployees().filter((e) => e.availability === 'active');
    for (let closed = s.lastDay ?? day; closed < day; closed++) {
      const salary = active.length * s.salaryPerEmployee;
      if (salary) s.unpaid.push({ day: closed, category: 'salary', amountVnd: salary });
      if (s.dailyOverhead)
        s.unpaid.push({ day: closed, category: 'overhead', amountVnd: s.dailyOverhead });
    }
    s.lastDay = day;
    while (s.unpaid.length) {
      const bill = s.unpaid[0];
      if (this.company.finance.summary().balanceVnd < bill.amountVnd) break;
      this.company.finance.record({
        id: uid(),
        kind: 'expense',
        amountVnd: bill.amountVnd,
        description: (bill.category === 'salary' ? 'Lương' : 'Vận hành') + ' ngày ' + bill.day,
        projectId: null,
        simDay: day,
        recordedAt: new Date().toISOString(),
      });
      s.unpaid.shift();
    }
    for (const { id: department, name } of this.company.staff.listDepartments()) {
      const previous = s.routines.find((r) => r.department === department);
      if (
        previous?.day === day ||
        tasks.some((t) => t.department === department && t.status !== 'completed')
      )
        continue;
      const agent = this.assignee(department, []);
      if (!agent) continue;
      const projectId = 'business-operations';
      if (!this.company.projects.list().some((p) => p.id === projectId))
        this.company.projects.create({
          id: projectId,
          name: 'Vận hành định kỳ',
          department: 'operations',
        });
      const task = this.company.tasks.create({
        id: uid(),
        title: ('Rà soát công việc ' + name).slice(0, 160),
        department,
        assignedAgentId: agent,
        priority: 'low',
        projectId,
        dueAt: null,
      });
      const routine = { department, taskId: task.id, day };
      if (previous) Object.assign(previous, routine);
      else s.routines.push(routine);
    }
  }
}
