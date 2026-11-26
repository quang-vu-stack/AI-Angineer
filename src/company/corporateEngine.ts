import type { CompanyService } from './companyService';
import type { CompanySnapshot, Employee, LedgerEntry } from '../types/company';
import type { CorporateState } from '../types/corporate';
import { idSchema, titleSchema } from '../types/companySchema';
import { careerProfile } from '../ai/careerPolicy';
import { rank } from '../types/corporate';

const empty = (): CorporateState => ({
  holders: [],
  issues: [],
  dividends: [],
  proposals: [],
  profiles: [],
  training: [],
  candidates: [],
});
const uid = () => crypto.randomUUID();
type Holding = { id: string; shares: number };
function safe(n: number, min = 0) {
  if (!Number.isSafeInteger(n) || n < min) throw new Error('Giá trị nguyên nằm ngoài phạm vi.');
  return n;
}
function total(numbers: number[]) {
  return numbers.reduce((a, b) => safe(a + b), 0);
}
function splitDividend(holders: Holding[], amount: number) {
  const denominator = BigInt(total(holders.map((h) => h.shares)));
  if (!denominator) throw new Error('Chưa phát hành cổ phần.');
  const rows = holders
    .filter((h) => h.shares > 0)
    .map((h) => {
      const numerator = BigInt(h.shares) * BigInt(amount);
      return {
        holderId: h.id,
        amount: Number(numerator / denominator),
        remainder: numerator % denominator,
      };
    });
  rows.sort((a, b) =>
    a.remainder === b.remainder
      ? a.holderId.localeCompare(b.holderId, 'en')
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  const left = amount - total(rows.map((r) => r.amount));
  return rows.map(({ holderId, amount }, i) => ({ holderId, amount: amount + Number(i < left) }));
}
function outcome(voters: CorporateState['proposals'][number]['electorate']) {
  const count = (vote: boolean) => total(voters.filter((v) => v.vote === vote).map((v) => v.weight));
  const half = total(voters.map((v) => v.weight)) / 2;
  return count(true) > half ? 'passed' : count(false) >= half ? 'rejected' : 'open';
}

export class CorporateEngine {
  private state: CorporateState;
  constructor(
    private c: CompanyService,
    private post: (entry: LedgerEntry) => LedgerEntry,
    saved?: CorporateState,
  ) {
    this.state = saved ?? empty();
  }
  snapshot() {
    return structuredClone(this.state);
  }
  addHolder(name: string) {
    const id = uid();
    this.state.holders.push({ id, name: titleSchema.parse(name), board: false });
    return id;
  }
  holdings() {
    const shares = new Map<string, number>();
    for (const issue of this.state.issues)
      shares.set(issue.holderId, (shares.get(issue.holderId) ?? 0) + issue.quantity);
    const count = total([...shares.values()]);
    return this.state.holders.map((h) => ({
      ...h,
      shares: shares.get(h.id) ?? 0,
      percent: count ? (100 * (shares.get(h.id) ?? 0)) / count : 0,
    }));
  }
  preview(holderId: string, quantity: number) {
    safe(quantity, 1);
    const rows = this.holdings();
    if (!rows.some((h) => h.id === holderId)) throw new Error('Cổ đông không tồn tại.');
    const after = total([...rows.map((h) => h.shares), quantity]);
    return rows.map((h) => ({
      ...h,
      afterPercent: (100 * (h.shares + (h.id === holderId ? quantity : 0))) / after,
    }));
  }
  issue(id: string, holderId: string, quantity: number, price: number, day: number) {
    idSchema.parse(id);
    this.preview(holderId, quantity);
    safe(price, 1);
    this.c.finance.record({
      id,
      kind: 'capital',
      amountVnd: safe(quantity * price, 1),
      description: 'Góp vốn phát hành cổ phần',
      simDay: day,
      recordedAt: new Date().toISOString(),
      projectId: null,
    });
    this.state.issues.push({ id, holderId, quantity, price });
  }
  dashboard() {
    const f = this.c.finance.summary();
    const liabilities = total(this.c.business.snapshot().unpaid.map((b) => b.amountVnd));
    const paid = total(this.state.dividends.flatMap((d) => d.payouts.map((p) => p.amount)));
    const valuation = Math.max(0, f.balanceVnd - liabilities);
    const shareCount = total(this.holdings().map((h) => h.shares));
    return {
      ...f,
      assets: f.balanceVnd,
      liabilities,
      valuation,
      dividendsPaid: paid,
      shareCount,
      shareValue: shareCount ? valuation / shareCount : null,
      distributable: Math.max(0, Math.min(valuation, f.operatingProfitVnd - paid - liabilities)),
    };
  }
  dividend(id: string, amount: number, day: number) {
    idSchema.parse(id);
    safe(amount, 1);
    if (amount > this.dashboard().distributable) throw new Error('Vượt lợi nhuận có thể phân phối.');
    const payouts = splitDividend(this.holdings(), amount);
    this.post({
      id,
      kind: 'dividend',
      amountVnd: amount,
      description: 'Phân phối cổ tức',
      simDay: day,
      recordedAt: new Date().toISOString(),
      projectId: null,
    });
    this.state.dividends.push({ id, payouts });
  }
  board(holderId: string, seated: boolean) {
    const h = this.state.holders.find((h) => h.id === holderId);
    if (!h || !this.holdings().find((h) => h.id === holderId)?.shares)
      throw new Error('Cần sở hữu cổ phần.');
    h.board = seated;
  }
  propose(title: string, strategy: 'skills' | 'capacity') {
    const electorate = this.holdings()
      .filter((h) => h.board && h.shares)
      .map((h) => ({ holderId: h.id, weight: h.shares, vote: null }));
    if (!electorate.length) throw new Error('HĐQT chưa có thành viên.');
    const id = uid();
    this.state.proposals.push({
      id,
      title: titleSchema.parse(title),
      strategy,
      electorate,
      status: 'open',
    });
    return id;
  }
  vote(id: string, holderId: string, yes: boolean) {
    const p = this.state.proposals.find((p) => p.id === id),
      voter = p?.electorate.find((v) => v.holderId === holderId);
    if (!p || p.status !== 'open' || !voter || voter.vote !== null) throw new Error('Phiếu không hợp lệ.');
    voter.vote = yes;
    p.status = outcome(p.electorate);
    if (p.status === 'passed') this.c.business.setStrategy(p.strategy);
  }
  private profile(id: string) {
    this.c.staff.getEmployee(id);
    return (
      this.state.profiles.find((p) => p.employeeId === id) ?? {
        employeeId: id,
        rank: 'junior' as const,
        salary: null,
        dismissed: null,
      }
    );
  }
  private update(p: CorporateState['profiles'][number]) {
    this.state.profiles = this.state.profiles.filter((old) => old.employeeId !== p.employeeId).concat(p);
  }
  payroll(employees: Employee[], fallback: number) {
    return total(employees.map((e) => this.profile(e.id).salary ?? fallback));
  }
  setSalary(id: string, salary: number | null) {
    if (salary !== null) safe(salary);
    const base = this.c.business.snapshot().salaryPerEmployee;
    total(
      this.c.staff.listEmployees().map((e) => (e.id === id ? salary : this.profile(e.id).salary) ?? base),
    );
    this.update({ ...this.profile(id), salary });
  }
  performance(id: string) {
    const tasks = this.c.tasks.getTasksForAgent(id),
      p = this.profile(id),
      xp = careerProfile(id, tasks);
    return {
      ...p,
      ...xp,
      assigned: tasks.length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      pending:
        xp.reviewEligible &&
        rank.options.indexOf(xp.level) > rank.options.indexOf(p.rank) &&
        p.dismissed !== xp.level,
    };
  }
  review(id: string, approve: boolean) {
    const p = this.performance(id);
    if (!p.pending) throw new Error('Chưa có đề xuất thăng chức.');
    this.update({
      ...this.profile(id),
      rank: approve ? p.level : p.rank,
      dismissed: approve ? null : p.level,
    });
  }
  train(id: string, topic: string) {
    const e = this.c.staff.getEmployee(id);
    const title = titleSchema.parse(topic);
    if (e.availability !== 'active') throw new Error('Nhân sự đang nghỉ phép.');
    const projectId = 'corporate-training';
    if (!this.c.projects.list().some(p => p.id === projectId))
      this.c.projects.create({id: projectId, department: 'finance_hr', name: 'Đào tạo nội bộ'});
    const task = this.c.tasks.create({
      id: uid(),
      department: e.department,
      assignedAgentId: id,
      title,
      priority: 'low',
      projectId,
      dueAt: null,
    });
    this.state.training.push({ employeeId: id, taskId: task.id, topic: title });
  }
  apply(name: string, role: string) {
    const id = uid();
    this.state.candidates.push({
      id,
      name: titleSchema.parse(name),
      role: titleSchema.parse(role),
      stage: 'applied',
    });
    return id;
  }
  interview(id: string, move: 'interview' | 'planned' | 'rejected') {
    const c = this.state.candidates.find((c) => c.id === id);
    if (
      !c ||
      !['applied', 'interview'].includes(c.stage) ||
      (move !== 'rejected' && move !== (c.stage === 'applied' ? 'interview' : 'planned'))
    )
      throw new Error('Sai bước tuyển dụng.');
    c.stage = move;
  }
}

export function validateCorporate(s: CompanySnapshot) {
  const state = s.corporate ?? empty();
  function unique(ids: string[]) {
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate corporate ID');
  }
  const holders = new Set(state.holders.map((h) => h.id)),
    employees = new Set(s.employees.map((e) => e.id));
  unique(state.holders.map((h) => h.id));
  unique([...state.issues, ...state.dividends].map((i) => i.id));
  unique(state.profiles.map((p) => p.employeeId));
  unique(state.training.map((t) => t.taskId));
  unique(state.proposals.map((p) => p.id));
  unique(state.candidates.map((c) => c.id));
  const shares = new Map<string, number>();
  const issues = new Map(state.issues.map((i) => [i.id, i])),
    dividends = new Map(state.dividends.map((d) => [d.id, d]));
  let profit = 0;
  for (const entry of s.ledger) {
    const issue = issues.get(entry.id);
    if (issue) {
      if (
        !holders.has(issue.holderId) ||
        entry.kind !== 'capital' ||
        entry.amountVnd !== safe(issue.quantity * issue.price, 1)
      )
        throw new Error('Invalid issuance');
      shares.set(issue.holderId, safe((shares.get(issue.holderId) ?? 0) + issue.quantity));
      issues.delete(entry.id);
    }
    if (entry.kind === 'revenue') profit += entry.amountVnd;
    if (entry.kind === 'expense') profit -= entry.amountVnd;
    if (entry.kind === 'dividend') {
      const d = dividends.get(entry.id),
        payouts = splitDividend(
          [...shares].map(([id, shares]) => ({ id, shares })),
          entry.amountVnd,
        );
      if (!d || entry.amountVnd > profit || JSON.stringify(d.payouts) !== JSON.stringify(payouts))
        throw new Error('Invalid dividend');
      profit -= entry.amountVnd;
      dividends.delete(entry.id);
    }
  }
  total([...shares.values()]);
  if (issues.size || dividends.size || state.holders.some((h) => h.board && !shares.get(h.id)))
    throw new Error('Invalid share register');
  for (const p of state.proposals) {
    unique(p.electorate.map((v) => v.holderId));
    if (
      !p.electorate.length ||
      p.status !== outcome(p.electorate) ||
      p.electorate.some((v) => (shares.get(v.holderId) ?? 0) < v.weight)
    )
      throw new Error('Invalid ballot');
  }
  if (
    state.profiles.some((p) => !employees.has(p.employeeId)) ||
    state.training.some(
      (t) => !employees.has(t.employeeId) || !s.tasks.some((task) => task.id === t.taskId),
    )
  )
    throw new Error('Invalid employee reference');
  total(
    s.employees.map(
      (e) =>
        state.profiles.find((p) => p.employeeId === e.id)?.salary ?? s.business?.salaryPerEmployee ?? 0,
    ),
  );
}
