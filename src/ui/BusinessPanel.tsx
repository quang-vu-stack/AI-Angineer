import { useState, type FormEvent } from 'react';
import type { CompanyService } from '../company/companyService';
import type { DepartmentId } from '../agents/types';
import type { BusinessState } from '../types/companySchema';
import { useGameStore } from '../store/useGameStore';

export function BusinessPanel({ company, changed }: { company: CompanyService; changed: () => void }) {
  const day = useGameStore((s) => s.day);
  const [message, feedback] = useState('');
  const [lines, setLines] = useState(1);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const business = company.business;
  const state = business.snapshot();
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const currentPeriod = Math.ceil(day / { day: 1, week: 7, month: 30 }[period]);
  const requested = Number(selectedPeriod);
  const index =
    Number.isSafeInteger(requested) && requested > 0 && requested <= currentPeriod
      ? requested
      : currentPeriod;
  const report = company.finance.report(period, index);
  function act(fn: () => void) {
    try {
      fn();
      changed();
      feedback('Đã cập nhật.');
    } catch (e) {
      feedback(e instanceof Error ? e.message : String(e));
    }
  }
  function form(fn: (data: FormData) => void) {
    return (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      act(() => fn(data));
    };
  }
  return (
    <section className="mgmt-section">
      <form className="mgmt-form" onSubmit={form((d) => business.customer(String(d.get('name'))))}>
        <input
          name="name"
          aria-label="Tên khách hàng"
          placeholder="Tên khách hàng"
          required
          maxLength={160}
        />
        <button>Thêm khách hàng</button>
      </form>
      <form
        className="mgmt-form"
        onSubmit={form((d) =>
          business.propose(
            {
              customerId: String(d.get('customer')),
              projectId: String(d.get('project')),
              title: String(d.get('title')),
              valueVnd: Number(d.get('value')),
              dueDay: Number(d.get('due')),
              requirements: Array.from({ length: lines }, (_, i) => ({
                department: String(d.get('dept' + i)) as DepartmentId,
                title: String(d.get('task' + i)),
                skills: String(d.get('skills' + i))
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean),
              })),
            },
            day,
          ),
        )}
      >
        <select name="customer" aria-label="Khách hàng" required>
          {state.customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="project" aria-label="Dự án hợp đồng">
          {company.projects.list().map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input name="title" placeholder="Tên hợp đồng" required maxLength={160} />
        <label>
          Giá trị VNĐ <input name="value" type="number" min="1" required />
        </label>
        <label>
          Hạn ngày <input name="due" type="number" min={day} required />
        </label>
        {Array.from({ length: lines }, (_, i) => (
          <fieldset key={i}>
            <legend>Yêu cầu {i + 1}</legend>
            <input name={'task' + i} placeholder="Nội dung bàn giao" required maxLength={160} />
            <select name={'dept' + i} aria-label={'Phòng ban ' + (i + 1)}>
              {company.staff.listDepartments().map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input name={'skills' + i} placeholder="Kỹ năng, cách nhau bằng dấu phẩy" />
          </fieldset>
        ))}
        <button type="button" disabled={lines >= 100} onClick={() => setLines(lines + 1)}>
          Thêm yêu cầu
        </button>
        <button disabled={!state.customers.length}>Đề xuất hợp đồng</button>
      </form>
      {state.contracts.map((c) => (
        <details key={c.id}>
          <summary>
            {c.title} · {c.valueVnd.toLocaleString('vi-VN')} ₫ · hạn ngày {c.dueDay} · {c.status}
          </summary>
          <p>
            {state.customers.find((k) => k.id === c.customerId)?.name} ·{' '}
            {c.requirements.map((r) => r.title).join(' / ')}
          </p>
          {c.status === 'proposed' && (
            <>
              <button onClick={() => act(() => business.decide(c.id, true, day))}>Duyệt</button>
              <button onClick={() => act(() => business.decide(c.id, false, day))}>Từ chối</button>
            </>
          )}
        </details>
      ))}
      <form
        className="mgmt-form"
        onSubmit={form((d) =>
          business.configure(
            String(d.get('strategy')) as BusinessState['strategy'],
            Number(d.get('salary')),
            Number(d.get('cost')),
          ),
        )}
      >
        <label>
          Phân công{' '}
          <select name="strategy" defaultValue={state.strategy}>
            <option value="skills">Ưu tiên kỹ năng</option>
            <option value="capacity">Ưu tiên người ít việc</option>
          </select>
        </label>
        <label>
          Lương VNĐ/người/ngày{' '}
          <input type="number" min="0" required name="salary" defaultValue={state.salaryPerEmployee} />
        </label>
        <label>
          Vận hành VNĐ/ngày{' '}
          <input type="number" min="0" required name="cost" defaultValue={state.dailyOverhead} />
        </label>
        <button>Lưu chính sách</button>
      </form>
      <label>
        Báo cáo tài chính{' '}
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value as typeof period);
            setSelectedPeriod('');
          }}
        >
          <option value="day">Ngày</option>
          <option value="week">Tuần</option>
          <option value="month">Tháng</option>
        </select>
      </label>
      <label>
        Kỳ báo cáo{' '}
        <input
          type="number"
          min="1"
          max={currentPeriod}
          value={selectedPeriod}
          placeholder={String(currentPeriod)}
          onChange={(e) => setSelectedPeriod(e.target.value)}
        />
      </label>
      <p>
        Ngày {report.fromDay}–{report.toDay} · Doanh thu {report.revenueVnd} ₫ · Đã chi{' '}
        {report.expensesVnd} ₫ · Lợi nhuận {report.operatingProfitVnd} ₫
      </p>
      <p>
        Khoản chờ thanh toán: {state.unpaid.length} · Bút toán cũ chưa có ngày mô phỏng:{' '}
        {report.undatedEntries}
      </p>
      <output>{message}</output>
    </section>
  );
}
