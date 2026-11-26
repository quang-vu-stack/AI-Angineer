import { useState, type FormEvent } from 'react';
import type { CompanyService } from '../company/companyService';
import type { StageInput } from '../types/workflow';
import { useGameStore } from '../store/useGameStore';

export function WorkflowPanel({ company, changed }: { company: CompanyService; changed: () => void }) {
  const day = useGameStore((s) => s.day),
    flow = company.workflow,
    state = flow.snapshot();
  const projects = company.projects.list(),
    tasks = company.tasks.getAllTasks();
  const [selected, select] = useState(projects[0]?.id ?? ''),
    [message, feedback] = useState(''),
    [when, setWhen] = useState('');
  const project = projects.find((p) => p.id === selected) ?? projects[0],
    plan = state.plans.find((p) => p.projectId === project?.id);
  const eligible = tasks.filter(
    (t) => t.projectId === project?.id && t.status === 'queued' && t.progress === 0,
  );
  const name = (id: string) => tasks.find((t) => t.id === id)?.title ?? id;
  const [draft, setDraft] = useState<StageInput>([{ name: 'Thực hiện', tasks: [] }]);
  function edit(i: number, patch: Partial<StageInput[number]>) {
    setDraft(draft.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  }
  function act(fn: () => void) {
    try {
      fn();
      changed();
      feedback('Đã cập nhật.');
    } catch (e) {
      feedback(e instanceof Error ? e.message : String(e));
    }
  }
  function submit(fn: (d: FormData) => void) {
    return (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const d = new FormData(e.currentTarget);
      act(() => fn(d));
    };
  }
  const report = flow.report(
    Number.isSafeInteger(Number(when)) && Number(when) > 0 && Number(when) <= day ? Number(when) : day,
  );
  const activity = useGameStore((s) => s.coordination).productivity.daily(report.day);
  return (
    <section className="mgmt-section">
      <h3>Quy trình dự án</h3>
      <label>
        Dự án theo dõi{' '}
        <select
          value={project?.id ?? ''}
          onChange={(e) => {
            select(e.target.value);
            setDraft([{ name: 'Thực hiện', tasks: [] }]);
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {!plan && project && (
        <form className="mgmt-form" onSubmit={submit(() => flow.create(project.id, draft, day))}>
          {!eligible.length && <p>Tạo nhiệm vụ mới cho dự án trong thẻ Nhiệm vụ để lập quy trình.</p>}
          {draft.map((stage, i) => (
            <fieldset key={i}>
              <legend>Giai đoạn {i + 1}</legend>
              <input
                aria-label={'Tên giai đoạn ' + (i + 1)}
                value={stage.name}
                onChange={(e) => edit(i, { name: e.target.value })}
                required
              />
              <select
                aria-label={'Thêm nhiệm vụ giai đoạn ' + (i + 1)}
                value=""
                onChange={(e) =>
                  edit(i, { tasks: [...stage.tasks, { taskId: e.target.value, after: [], dueDay: null }] })
                }
              >
                <option value="">Chọn nhiệm vụ</option>
                {eligible
                  .filter((t) => !draft.some((s) => s.tasks.some((n) => n.taskId === t.id)))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
              {stage.tasks.map((n) => (
                <div key={n.taskId}>
                  <strong>{name(n.taskId)}</strong>
                  <label>
                    Hạn ngày{' '}
                    <input
                      type="number"
                      min="1"
                      value={n.dueDay ?? ''}
                      onChange={(e) =>
                        edit(i, {
                          tasks: stage.tasks.map((x) =>
                            x === n ? { ...x, dueDay: e.target.value ? Number(e.target.value) : null } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  {stage.tasks
                    .filter((x) => x !== n)
                    .map((x) => (
                      <label key={x.taskId}>
                        <input
                          type="checkbox"
                          checked={n.after.includes(x.taskId)}
                          onChange={(e) =>
                            edit(i, {
                              tasks: stage.tasks.map((v) =>
                                v === n
                                  ? {
                                      ...v,
                                      after: e.target.checked
                                        ? [...v.after, x.taskId]
                                        : v.after.filter((id) => id !== x.taskId),
                                    }
                                  : v,
                              ),
                            })
                          }
                        />
                        Chờ {name(x.taskId)}
                      </label>
                    ))}
                </div>
              ))}
            </fieldset>
          ))}
          <button type="button" onClick={() => setDraft([...draft, { name: '', tasks: [] }])}>
            Thêm giai đoạn
          </button>
          <button type="button" onClick={() => setDraft([{ name: 'Thực hiện', tasks: [] }])}>
            Soạn lại
          </button>
          <button>Khởi động quy trình</button>
        </form>
      )}
      {plan && (
        <>
          <p>Trạng thái: {plan.status}</p>
          {plan.stages.map((s, i) => (
            <details open key={i}>
              <summary>{s.name}</summary>
              {s.tasks.map((n) => {
                const task = tasks.find((t) => t.id === n.taskId)!;
                const ticket = state.tickets.find((t) => t.taskId === n.taskId && !t.resolution);
                return (
                  <div key={n.taskId}>
                    <p>
                      {task.title} · {n.released ? task.status : 'Chờ phụ thuộc'} ·{' '}
                      {Math.round(task.progress)}% · {task.department} ·{' '}
                      {task.assignedAgentId ?? 'Chờ phân công'} {n.late ? '· Đã quá hạn' : ''}
                    </p>
                    {ticket ? (
                      <form onSubmit={submit((d) => flow.resolve(ticket.id, String(d.get('note')), day))}>
                        {ticket.reason} <input name="note" placeholder="Cách tháo gỡ" required />
                        <button>Giải quyết hỗ trợ</button>
                      </form>
                    ) : (
                      n.released &&
                      task.status !== 'completed' && (
                        <form onSubmit={submit((d) => flow.requestHelp(task.id, String(d.get('note')), day))}>
                          <input name="note" placeholder="Nội dung vướng mắc" required />
                          <button>Yêu cầu hỗ trợ</button>
                        </form>
                      )
                    )}
                  </div>
                );
              })}
            </details>
          ))}
          {(plan.status === 'qa' || plan.status === 'approval') && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const note = String(new FormData(e.currentTarget).get('note'));
                const pass = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement)?.value === 'yes';
                act(() =>
                  flow.decide(plan.projectId, plan.status === 'qa' ? 'qa' : 'approval', pass, note, day),
                );
              }}
            >
              <input name="note" placeholder="Kết quả kiểm tra hoặc lý do trả lại" required />
              <button value="yes">{plan.status === 'qa' ? 'QA đạt' : 'CEO duyệt bàn giao'}</button>
              <button value="no">Trả về sửa lỗi</button>
            </form>
          )}
        </>
      )}
      <h3>Thông báo CEO ({flow.unread})</h3>
      <button onClick={() => act(() => flow.markRead())}>Đánh dấu đã đọc</button>
      {state.events
        .filter((e) => !e.read)
        .slice()
        .reverse()
        .map((e, i) => (
          <p key={i}>
            Ngày {e.day} · {projects.find((p) => p.id === e.projectId)?.name} · {e.kind} · {e.detail}
          </p>
        ))}
      <h3>Báo cáo công việc theo ngày</h3>
      <label>
        Ngày mô phỏng{' '}
        <input
          type="number"
          min="1"
          max={day}
          value={when}
          placeholder={String(day)}
          onChange={(e) => setWhen(e.target.value)}
        />
      </label>
      <p>
        Toàn công ty · {Math.round(activity.workingMinutes)} phút làm việc · {activity.tasksCompleted} nhiệm
        vụ hoàn tất trong mô phỏng · {activity.meetingsCompleted} cuộc họp · {activity.conversationsCompleted}{' '}
        hội thoại
      </p>
      {report.work.map((w) => (
        <p key={w.taskId}>
          {name(w.taskId)} · +{Number(w.points.toFixed(2))} điểm phần trăm
        </p>
      ))}
      {report.events.map((e, i) => (
        <p key={i}>
          {e.kind} · {e.detail}
        </p>
      ))}
      {!report.work.length && !report.events.length && (
        <p>Chưa ghi nhận hoạt động quy trình ngày {report.day}.</p>
      )}
      <output aria-live="polite">{message}</output>
    </section>
  );
}
