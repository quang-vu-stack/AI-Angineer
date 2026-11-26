import { useState, type FormEvent } from 'react';
import type { CompanyService } from '../company/companyService';
import { useGameStore } from '../store/useGameStore';

const money = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' ₫';
type Order =
  { id: string; holder: string; quantity: number; price: number } | { id: string; amount: number };

export function CorporatePanel({ company, changed }: { company: CompanyService; changed: () => void }) {
  const day = useGameStore((s) => s.day),
    engine = company.corporate,
    state = engine.snapshot();
  const [message, setMessage] = useState(''),
    [order, setOrder] = useState<Order | null>(null);
  const staff = company.staff.listEmployees(),
    holdings = engine.holdings(),
    f = engine.dashboard();
  const [employee, selectEmployee] = useState(staff[0]?.id ?? '');
  const person = staff.find((e) => e.id === employee);
  const defaultSalary = company.business.snapshot().salaryPerEmployee;
  function act(fn: () => void) {
    try {
      fn();
      changed();
      setMessage('Đã cập nhật.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
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
      <h3>Tài sản và dòng tiền</h3>
      <p>Dòng tiền ròng ngày {day}: {money(company.finance.report('day', day).netCashFlowVnd)}</p>
      <p>
        Tài sản tiền mặt {money(f.assets)} · Vốn đã góp {money(f.capitalVnd)} · Thu kinh doanh{' '}
        {money(f.revenueVnd)} · Chi vận hành {money(f.expensesVnd)} · Cổ tức đã trả {money(f.dividendsPaid)}
      </p>
      <p>
        Lợi nhuận đã thu trừ chi {money(f.operatingProfitVnd)} · Nợ đến hạn {money(f.liabilities)} · Có thể
        chia {money(f.distributable)}
      </p>
      <p>
        Định giá theo tài sản ròng = max(0, tiền mặt − công nợ) = {money(f.valuation)}. Giá trị mỗi cổ phần:{' '}
        {f.shareValue === null ? 'Chưa phát hành' : money(f.shareValue)}.
      </p>
      <h3>Cổ đông và hội đồng quản trị</h3>
      <form className="mgmt-form" onSubmit={form((d) => engine.addHolder(String(d.get('name'))))}>
        <input name="name" placeholder="Tên cổ đông" required />
        <button>Thêm cổ đông</button>
      </form>
      <table className="mgmt-table">
        <thead>
          <tr>
            <th>Cổ đông</th>
            <th>Cổ phần / phiếu</th>
            <th>Sở hữu</th>
            <th>HĐQT</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => (
            <tr key={h.id}>
              <td>{h.name}</td>
              <td>{h.shares}</td>
              <td>{h.percent.toFixed(2)}%</td>
              <td>
                <button disabled={!h.shares} onClick={() => act(() => engine.board(h.id, !h.board))}>
                  {h.board ? 'Miễn nhiệm' : 'Bổ nhiệm'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        className="mgmt-form"
        onSubmit={form((d) => {
          const holder = String(d.get('holder')),
            quantity = Number(d.get('quantity')),
            price = Number(d.get('price'));
          engine.preview(holder, quantity);
          setOrder({ id: crypto.randomUUID(), holder, quantity, price });
        })}
      >
        <select name="holder" aria-label="Người mua" required>
          {holdings.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <input name="quantity" placeholder="Số cổ phần" type="number" min="1" required />
        <input name="price" placeholder="Giá phát hành VNĐ" type="number" min="1" required />
        <button disabled={!holdings.length}>Xem pha loãng</button>
      </form>
      <form
        className="mgmt-form"
        onSubmit={form((d) => setOrder({ id: crypto.randomUUID(), amount: Number(d.get('amount')) }))}
      >
        <input name="amount" type="number" min="1" placeholder="Tổng cổ tức VNĐ" required />
        <button>Chuẩn bị chia</button>
      </form>
      {order && (
        <div>
          {'quantity' in order ? (
            <p>
              Phát hành {order.quantity} cổ phần, thu {money(order.quantity * order.price)}.{' '}
              {engine
                .preview(order.holder, order.quantity)
                .map((h) => h.name + ' ' + h.percent.toFixed(2) + '% → ' + h.afterPercent.toFixed(2) + '%')
                .join(' · ')}
            </p>
          ) : (
            <p>Chia {money(order.amount)} theo cổ phần hiện có.</p>
          )}
          <button
            onClick={() =>
              act(() => {
                if ('quantity' in order)
                  engine.issue(order.id, order.holder, order.quantity, order.price, day);
                else engine.dividend(order.id, order.amount, day);
                setOrder(null);
              })
            }
          >
            Xác nhận giao dịch
          </button>
          <button onClick={() => setOrder(null)}>Hủy</button>
        </div>
      )}
      {state.dividends.map((d) => (
        <p key={d.id}>
          Cổ tức ·{' '}
          {d.payouts
            .map((p) => holdings.find((h) => h.id === p.holderId)?.name + ' ' + money(p.amount))
            .join(' · ')}
        </p>
      ))}
      <h3>Biểu quyết chiến lược</h3>
      <form
        className="mgmt-form"
        onSubmit={form((d) =>
          engine.propose(String(d.get('title')), d.get('strategy') === 'skills' ? 'skills' : 'capacity'),
        )}
      >
        <input name="title" placeholder="Tên đề xuất" required />
        <select name="strategy" aria-label="Chiến lược đề xuất">
          <option value="skills">Ưu tiên kỹ năng</option>
          <option value="capacity">Ưu tiên người ít việc</option>
        </select>
        <button>Mở biểu quyết</button>
      </form>
      {state.proposals.map((p) => (
        <div key={p.id}>
          <strong>
            {p.title} · {p.strategy} · {p.status}
          </strong>
          {p.electorate.map((v) => (
            <p key={v.holderId}>
              {holdings.find((h) => h.id === v.holderId)?.name} · {v.weight} phiếu ·{' '}
              {v.vote === null ? 'Chưa bỏ phiếu' : v.vote ? 'Đồng ý' : 'Phản đối'}{' '}
              {p.status === 'open' && v.vote === null && (
                <>
                  <button onClick={() => act(() => engine.vote(p.id, v.holderId, true))}>Tán thành</button>
                  <button onClick={() => act(() => engine.vote(p.id, v.holderId, false))}>Phản đối</button>
                </>
              )}
            </p>
          ))}
        </div>
      ))}
      <h3>Hồ sơ nghề nghiệp và hiệu suất</h3>
      <table className="mgmt-table">
        <thead>
          <tr>
            <th>Nhân sự</th>
            <th>Bậc chính thức</th>
            <th>Xong / được giao</th>
            <th>Bị chặn</th>
            <th>XP</th>
            <th>Lương/ngày</th>
            <th>Xét duyệt</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((e) => {
            const p = engine.performance(e.id);
            return (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{p.rank}</td>
                <td>
                  {p.completedTasks}/{p.assigned}
                </td>
                <td>{p.blocked}</td>
                <td>{p.experiencePoints}</td>
                <td>{money(p.salary ?? defaultSalary)}</td>
                <td>
                  {p.pending && (
                    <>
                      {p.level}{' '}
                      <button onClick={() => act(() => engine.review(e.id, true))}>Duyệt thăng chức</button>
                      <button onClick={() => act(() => engine.review(e.id, false))}>Từ chối</button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label>
        Hồ sơ{' '}
        <select value={employee} onChange={(e) => selectEmployee(e.target.value)}>
          {staff.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
      {person && (
        <>
          <p>
            {person.role} · {person.skills.join(', ')}
          </p>
          <form
            className="mgmt-form"
            onSubmit={form((d) => engine.setSalary(employee, Number(d.get('salary'))))}
          >
            <input name="salary" type="number" min="0" placeholder="Lương cá nhân VNĐ/ngày" required />
            <button>Đặt lương</button>
            <button type="button" onClick={() => act(() => engine.setSalary(employee, null))}>
              Dùng lương chung
            </button>
          </form>
          <form
            className="mgmt-form"
            onSubmit={form((d) => engine.train(employee, String(d.get('topic'))))}
          >
            <input name="topic" placeholder="Nội dung đào tạo" required />
            <button>Giao đào tạo</button>
          </form>
          {state.training
            .filter((t) => t.employeeId === employee)
            .map((t) => (
              <p key={t.taskId}>
                {t.topic} · {company.tasks.getAllTasks().find((task) => task.id === t.taskId)?.status}
              </p>
            ))}
        </>
      )}
      <h3>Kế hoạch tuyển dụng</h3>
      <form
        className="mgmt-form"
        onSubmit={form((d) => engine.apply(String(d.get('name')), String(d.get('role'))))}
      >
        <input name="name" placeholder="Tên ứng viên" required />
        <input name="role" placeholder="Vị trí dự tuyển" required />
        <button>Nhận hồ sơ</button>
      </form>
      {state.candidates.map((c) => (
        <p key={c.id}>
          {c.name} · {c.role} · {c.stage}{' '}
          {['applied', 'interview'].includes(c.stage) && (
            <>
              <button
                onClick={() =>
                  act(() => engine.interview(c.id, c.stage === 'applied' ? 'interview' : 'planned'))
                }
              >
                {c.stage === 'applied' ? 'Mời phỏng vấn' : 'Đưa vào kế hoạch'}
              </button>
              <button onClick={() => act(() => engine.interview(c.id, 'rejected'))}>Loại hồ sơ</button>
            </>
          )}
        </p>
      ))}
      <output aria-live="polite">{message}</output>
    </section>
  );
}
