import React, { useMemo, useState } from 'react';
import { X, Users, Wallet, FolderKanban, CheckSquare, Plus } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { DEPARTMENT_META } from '../agents/roster';
import type { DepartmentId } from '../agents/types';
import type { LedgerEntry, ManagedTask } from '../types/company';

type ManagementTab = 'hr' | 'finance' | 'projects' | 'tasks';

function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
}

export const CompanyManagementPanel: React.FC = () => {
  const open = useGameStore((s) => s.managementPanelOpen);
  const setOpen = useGameStore((s) => s.setManagementPanelOpen);
  const company = useGameStore((s) => s.company);
  const companyVersion = useGameStore((s) => s.companyVersion);
  const notifyCompanyChange = useGameStore((s) => s.notifyCompanyChange);
  const agents = useGameStore((s) => s.agents);
  const focusOnAgent = useGameStore((s) => s.focusOnAgent);

  const [tab, setTab] = useState<ManagementTab>('hr');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Finance form state
  const [ledgerKind, setLedgerKind] = useState<LedgerEntry['kind']>('capital');
  const [ledgerAmount, setLedgerAmount] = useState('');
  const [ledgerDesc, setLedgerDesc] = useState('');
  const [ledgerProjectId, setLedgerProjectId] = useState<string>('');

  // Project form state
  const [newProjName, setNewProjName] = useState('');
  const [newProjDept, setNewProjDept] = useState<DepartmentId>('engineering');

  // Task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDept, setNewTaskDept] = useState<DepartmentId>('engineering');
  const [newTaskProjectId, setNewTaskProjectId] = useState<string>('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>('');
  const [newTaskPriority, setNewTaskPriority] = useState<ManagedTask['priority']>('medium');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');

  const snapshot = useMemo(() => {
    void companyVersion;
    return company.snapshot();
  }, [company, companyVersion]);

  const financeSummary = useMemo(() => {
    void companyVersion;
    return company.finance.summary();
  }, [company, companyVersion]);

  const projectKpis = useMemo(() => {
    void companyVersion;
    const nowIso = new Date().toISOString();
    return snapshot.projects.map((project) => ({
      project,
      kpi: company.projectKpi(project.id, nowIso),
    }));
  }, [company, companyVersion, snapshot.projects]);

  const agentById = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  if (!open) return null;

  const showError = (err: unknown) => {
    setFeedback({ kind: 'err', text: err instanceof Error ? err.message : String(err) });
  };
  const showOk = (text: string) => setFeedback({ kind: 'ok', text });

  const handleToggleAvailability = (empId: string, current: 'active' | 'on-leave', dept: DepartmentId) => {
    try {
      const next = current === 'active' ? 'on-leave' : 'active';
      company.changeEmployee(empId, dept, next);
      notifyCompanyChange();
      showOk(`Đã cập nhật trạng thái ${empId} sang ${next === 'active' ? 'Đang hoạt động' : 'Nghỉ phép'}.`);
    } catch (err) {
      showError(err);
    }
  };

  const handleRecordLedger = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = Number(ledgerAmount);
      if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Số tiền VNĐ phải là số nguyên dương.');
      }
      if (!ledgerDesc.trim()) {
        throw new Error('Vui lòng nhập nội dung giao dịch.');
      }
      company.finance.record({
        id: `led-${Date.now()}`,
        kind: ledgerKind,
        amountVnd: amount,
        description: ledgerDesc.trim(),
        recordedAt: new Date().toISOString(),
        projectId: ledgerProjectId || null,
      });
      notifyCompanyChange();
      setLedgerAmount('');
      setLedgerDesc('');
      showOk('Đã ghi nhận giao dịch vào sổ cái tài chính.');
    } catch (err) {
      showError(err);
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newProjName.trim()) throw new Error('Vui lòng nhập tên dự án.');
      const slug = `proj-${Date.now().toString(36)}`;
      company.projects.create({
        id: slug,
        name: newProjName.trim(),
        department: newProjDept,
      });
      notifyCompanyChange();
      setNewProjName('');
      showOk(`Đã tạo dự án "${newProjName.trim()}" (${slug}).`);
    } catch (err) {
      showError(err);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const projectId = newTaskProjectId || snapshot.projects[0]?.id;
      if (!projectId) throw new Error('Chưa có dự án nào để gán nhiệm vụ.');
      if (!newTaskTitle.trim()) throw new Error('Vui lòng nhập tiêu đề nhiệm vụ.');
      company.tasks.create({
        id: `task-${Date.now().toString(36)}`,
        title: newTaskTitle.trim(),
        department: newTaskDept,
        assignedAgentId: newTaskAssignee || null,
        priority: newTaskPriority,
        projectId,
        dueAt: null,
      });
      notifyCompanyChange();
      setNewTaskTitle('');
      showOk('Đã tạo nhiệm vụ mới trong hệ thống Backend.');
    } catch (err) {
      showError(err);
    }
  };

  const handleTaskStatus = (taskId: string, status: ManagedTask['status']) => {
    try {
      company.tasks.transition(taskId, status);
      notifyCompanyChange();
      showOk(`Đã chuyển trạng thái nhiệm vụ ${taskId} sang ${status}.`);
    } catch (err) {
      showError(err);
    }
  };

  const handleTaskReassign = (taskId: string, agentId: string) => {
    try {
      company.tasks.assign(taskId, agentId || null);
      notifyCompanyChange();
      showOk(`Đã cập nhật người phụ trách nhiệm vụ ${taskId}.`);
    } catch (err) {
      showError(err);
    }
  };

  const filteredTasks = snapshot.tasks.filter((t) =>
    taskStatusFilter === 'all' ? true : t.status === taskStatusFilter
  );

  return (
    <div className="mgmt-overlay" data-testid="company-management-panel">
      <div className="mgmt-modal">
        <div className="mgmt-header">
          <div>
            <div className="mgmt-title">TRUNG TÂM QUẢN TRỊ CÔNG TY (DỮ LIỆU BACKEND TRỰC TIẾP)</div>
            <div className="mgmt-sub">
              {snapshot.employees.length} nhân sự • {snapshot.projects.length} dự án •{' '}
              {snapshot.tasks.length} nhiệm vụ • Quỹ: {formatVnd(financeSummary.balanceVnd)}
            </div>
          </div>
          <button
            className="panel-close"
            onClick={() => setOpen(false)}
            data-testid="close-company-mgmt-btn"
            aria-label="Đóng quản trị"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mgmt-tabs">
          <button
            className={`mgmt-tab ${tab === 'hr' ? 'active' : ''}`}
            onClick={() => {
              setTab('hr');
              setFeedback(null);
            }}
            data-testid="mgmt-tab-hr"
          >
            <Users size={14} /> Nhân sự ({snapshot.employees.length})
          </button>
          <button
            className={`mgmt-tab ${tab === 'finance' ? 'active' : ''}`}
            onClick={() => {
              setTab('finance');
              setFeedback(null);
            }}
            data-testid="mgmt-tab-finance"
          >
            <Wallet size={14} /> Tài chính ({snapshot.ledger.length})
          </button>
          <button
            className={`mgmt-tab ${tab === 'projects' ? 'active' : ''}`}
            onClick={() => {
              setTab('projects');
              setFeedback(null);
            }}
            data-testid="mgmt-tab-projects"
          >
            <FolderKanban size={14} /> Dự án ({snapshot.projects.length})
          </button>
          <button
            className={`mgmt-tab ${tab === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              setTab('tasks');
              setFeedback(null);
            }}
            data-testid="mgmt-tab-tasks"
          >
            <CheckSquare size={14} /> Nhiệm vụ ({snapshot.tasks.length})
          </button>
        </div>

        {feedback && (
          <div className={`mgmt-feedback ${feedback.kind === 'err' ? 'err' : 'ok'}`}>
            {feedback.text}
          </div>
        )}

        <div className="mgmt-body">
          {/* TAB 1: NHÂN SỰ (HR) */}
          {tab === 'hr' && (
            <div className="mgmt-section" data-testid="mgmt-content-hr">
              <div className="mgmt-kpi-grid">
                <div className="mgmt-kpi-card">
                  <span>Tổng nhân sự</span>
                  <strong>{snapshot.employees.length}</strong>
                </div>
                <div className="mgmt-kpi-card">
                  <span>Đang hoạt động</span>
                  <strong>
                    {snapshot.employees.filter((e) => e.availability === 'active').length}
                  </strong>
                </div>
                <div className="mgmt-kpi-card">
                  <span>Phòng ban</span>
                  <strong>{snapshot.departments.length}</strong>
                </div>
                <div className="mgmt-kpi-card">
                  <span>Đang làm việc 3D</span>
                  <strong>{agents.filter((a) => a.state === 'Working').length}</strong>
                </div>
              </div>

              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Họ tên & Vai trò</th>
                    <th>Phòng ban</th>
                    <th>Trạng thái 3D</th>
                    <th>Nhiệm vụ</th>
                    <th>Tình trạng HR</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.employees.map((emp) => {
                    const live = agentById.get(emp.id);
                    const empTasks = snapshot.tasks.filter((t) => t.assignedAgentId === emp.id);
                    return (
                      <tr key={emp.id}>
                        <td>{emp.id}</td>
                        <td>
                          <button
                            className="mgmt-link-btn"
                            onClick={() => {
                              focusOnAgent(emp.id);
                              setOpen(false);
                            }}
                          >
                            {emp.name}
                          </button>
                          <div className="mgmt-cell-sub">{emp.role}</div>
                        </td>
                        <td>{DEPARTMENT_META[emp.department]?.label ?? emp.department}</td>
                        <td>{live?.state ?? '—'}</td>
                        <td>
                          {empTasks.length} ({live?.taskProgress ?? 0}%)
                        </td>
                        <td>
                          <button
                            className={`hud-chip ${emp.availability === 'active' ? 'active' : ''}`}
                            onClick={() =>
                              handleToggleAvailability(emp.id, emp.availability, emp.department)
                            }
                          >
                            {emp.availability === 'active' ? 'Active' : 'On-leave'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: TÀI CHÍNH (FINANCE) */}
          {tab === 'finance' && (
            <div className="mgmt-section" data-testid="mgmt-content-finance">
              <div className="mgmt-kpi-grid">
                <div className="mgmt-kpi-card">
                  <span>Vốn góp (Capital)</span>
                  <strong>{formatVnd(financeSummary.capitalVnd)}</strong>
                </div>
                <div className="mgmt-kpi-card">
                  <span>Doanh thu (Revenue)</span>
                  <strong>{formatVnd(financeSummary.revenueVnd)}</strong>
                </div>
                <div className="mgmt-kpi-card">
                  <span>Chi phí (Expenses)</span>
                  <strong>{formatVnd(financeSummary.expensesVnd)}</strong>
                </div>
                <div className="mgmt-kpi-card">
                  <span>Số dư quỹ (Balance)</span>
                  <strong className="accent">{formatVnd(financeSummary.balanceVnd)}</strong>
                </div>
              </div>

              <form className="mgmt-form" onSubmit={handleRecordLedger}>
                <select
                  value={ledgerKind}
                  onChange={(e) => setLedgerKind(e.target.value as LedgerEntry['kind'])}
                  data-testid="ledger-kind-select"
                >
                  <option value="capital">Vốn góp (Capital)</option>
                  <option value="revenue">Doanh thu (Revenue)</option>
                  <option value="expense">Chi phí (Expense)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={ledgerAmount}
                  onChange={(e) => setLedgerAmount(e.target.value)}
                  placeholder="Số tiền VNĐ (vd: 50000000)"
                  data-testid="ledger-amount-input"
                />
                <input
                  value={ledgerDesc}
                  onChange={(e) => setLedgerDesc(e.target.value)}
                  placeholder="Nội dung giao dịch..."
                  data-testid="ledger-desc-input"
                />
                <select
                  value={ledgerProjectId}
                  onChange={(e) => setLedgerProjectId(e.target.value)}
                >
                  <option value="">Chung công ty</option>
                  {snapshot.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button className="hud-btn btn-accent" type="submit" data-testid="ledger-submit-btn">
                  <Plus size={13} /> Ghi sổ cái
                </button>
              </form>

              {snapshot.ledger.length === 0 ? (
                <div className="mgmt-empty">
                  Chưa có bút toán nào trong sổ cái Backend (số dư thực tế: 0 ₫). Hãy ghi nhận vốn góp hoặc doanh thu thực tế ở trên.
                </div>
              ) : (
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Nội dung</th>
                      <th>Dự án</th>
                      <th>Số tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...snapshot.ledger].reverse().map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.kind}</td>
                        <td>{entry.description}</td>
                        <td>{entry.projectId ?? 'Công ty'}</td>
                        <td>{formatVnd(entry.amountVnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: DỰ ÁN (PROJECTS) */}
          {tab === 'projects' && (
            <div className="mgmt-section" data-testid="mgmt-content-projects">
              <form className="mgmt-form" onSubmit={handleCreateProject}>
                <input
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="Tên dự án mới..."
                  data-testid="project-name-input"
                />
                <select
                  value={newProjDept}
                  onChange={(e) => setNewProjDept(e.target.value as DepartmentId)}
                >
                  {snapshot.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button className="hud-btn btn-accent" type="submit" data-testid="project-submit-btn">
                  <Plus size={13} /> Tạo dự án
                </button>
              </form>

              <div className="mgmt-project-list">
                {projectKpis.map(({ project, kpi }) => (
                  <div key={project.id} className="mgmt-project-card">
                    <div className="mgmt-project-head">
                      <div>
                        <strong>{project.name}</strong>
                        <span className="mgmt-cell-sub">
                          {' '}
                          • {project.id} • {DEPARTMENT_META[project.department]?.label}
                        </span>
                      </div>
                      <span className="badge">{kpi.progressPercent}% tiến độ</span>
                    </div>
                    <div className="metric-track">
                      <div
                        className="metric-fill"
                        style={{ width: `${kpi.progressPercent}%`, background: '#38bdf8' }}
                      />
                    </div>
                    <div className="mgmt-project-meta">
                      <span>Tổng: {kpi.total}</span>
                      <span>Hoàn thành: {kpi.completed} ({kpi.completionPercent}%)</span>
                      <span>Bị chặn: {kpi.blocked}</span>
                      <span>Quá hạn: {kpi.overdue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: NHIỆM VỤ (TASKS) */}
          {tab === 'tasks' && (
            <div className="mgmt-section" data-testid="mgmt-content-tasks">
              <form className="mgmt-form" onSubmit={handleCreateTask}>
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Tiêu đề nhiệm vụ mới..."
                  data-testid="task-title-input"
                />
                <select
                  value={newTaskDept}
                  onChange={(e) => {
                    setNewTaskDept(e.target.value as DepartmentId);
                    setNewTaskAssignee('');
                  }}
                >
                  {snapshot.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newTaskProjectId || snapshot.projects[0]?.id || ''}
                  onChange={(e) => setNewTaskProjectId(e.target.value)}
                >
                  {snapshot.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newTaskAssignee}
                  onChange={(e) => setNewTaskAssignee(e.target.value)}
                >
                  <option value="">Chưa giao</option>
                  {snapshot.employees
                    .filter((e) => e.department === newTaskDept && e.availability === 'active')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as ManagedTask['priority'])}
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                </select>
                <button className="hud-btn btn-accent" type="submit" data-testid="task-submit-btn">
                  <Plus size={13} /> Tạo nhiệm vụ
                </button>
              </form>

              <div className="dept-filters">
                {['all', 'queued', 'in_progress', 'blocked', 'completed'].map((st) => (
                  <button
                    key={st}
                    className={`dept-chip ${taskStatusFilter === st ? 'active' : ''}`}
                    onClick={() => setTaskStatusFilter(st)}
                  >
                    {st === 'all' ? `Tất cả (${snapshot.tasks.length})` : st}
                  </button>
                ))}
              </div>

              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>Nhiệm vụ</th>
                    <th>Phòng ban</th>
                    <th>Phụ trách</th>
                    <th>Tiến độ</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const eligibleEmployees = snapshot.employees.filter(
                      (e) => e.department === task.department && e.availability === 'active'
                    );
                    return (
                      <tr key={task.id}>
                        <td>
                          <div>{task.title}</div>
                          <div className="mgmt-cell-sub">
                            {task.id} • {task.priority} • {task.projectId}
                          </div>
                        </td>
                        <td>{DEPARTMENT_META[task.department]?.label}</td>
                        <td>
                          <select
                            className="mgmt-inline-select"
                            value={task.assignedAgentId ?? ''}
                            disabled={task.status === 'completed'}
                            onChange={(e) => handleTaskReassign(task.id, e.target.value)}
                          >
                            <option value="">Chưa giao</option>
                            {eligibleEmployees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{Math.round(task.progress)}%</td>
                        <td>
                          <div className="mgmt-status-actions">
                            <span className="agent-state-pill">{task.status}</span>
                            {task.status === 'queued' && (
                              <button
                                className="hud-chip"
                                onClick={() => handleTaskStatus(task.id, 'in_progress')}
                              >
                                Start
                              </button>
                            )}
                            {task.status === 'in_progress' && (
                              <>
                                <button
                                  className="hud-chip"
                                  onClick={() => handleTaskStatus(task.id, 'blocked')}
                                >
                                  Block
                                </button>
                                <button
                                  className="hud-chip active"
                                  onClick={() => handleTaskStatus(task.id, 'completed')}
                                >
                                  Done
                                </button>
                              </>
                            )}
                            {task.status === 'blocked' && (
                              <button
                                className="hud-chip"
                                onClick={() => handleTaskStatus(task.id, 'in_progress')}
                              >
                                Resume
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
