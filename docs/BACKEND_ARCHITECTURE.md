# Backend và Company System V0.1

Backend chạy trong trình duyệt cùng ứng dụng Gemini. Vòng lặp mô phỏng dùng Task Manager qua `ITaskManager`. UI hiện có đọc tên nhiệm vụ và tiến độ từ các trường của `AgentEntity` được cập nhật bởi Zustand.

| Module | Trách nhiệm |
| --- | --- |
| `src/types/company.ts` | Hợp đồng nghiệp vụ mở rộng từ `DepartmentId` và `CompanyTask` của Gemini |
| `src/company/` | Hồ sơ nhân sự, sáu phòng ban, dự án, KPI và kiểm tra tham chiếu |
| `src/tasks/taskManager.ts` | Phân công, chặn, tiếp tục và hoàn thành nhiệm vụ |
| `src/economy/ledger.ts` | Ghi vốn, doanh thu, chi phí và tính lợi nhuận, số dư VND |
| `src/services/indexedDbService.ts` | Một giao dịch chứa trạng thái game và công ty, kiểm tra revision |
| `src/persistence/supabaseStore.ts` | Adapter đám mây tùy chọn cho snapshot công ty |

## Luật nghiệp vụ

- Dữ liệu khởi tạo lấy 20 nhân viên, sáu phòng ban và tiến độ nhiệm vụ từ roster Gemini. Mỗi nhiệm vụ khởi tạo có ID `task-<agentId>` và thuộc dự án `world-v01`.
- Một dự án có phòng chủ trì. Nhiệm vụ trong dự án có thể thuộc phòng khác. Người được giao phải đang hoạt động trong phòng của nhiệm vụ. Phân công lại hoặc bỏ phân công nhiệm vụ đang mở trước khi chuyển phòng hoặc cho nghỉ nhân viên. Nhân sự tuyển mới là hồ sơ nghiệp vụ, việc tạo avatar và phân bàn nằm ở tầng frontend.
- Mỗi tick làm việc ưu tiên nhiệm vụ đang thực hiện. Khi chọn trong cùng nhóm trạng thái, chọn theo mức ưu tiên rồi thứ tự tạo. Nhiệm vụ chặn dừng tiến độ. Hoàn tất đặt tiến độ 100%.
- KPI gồm số nhiệm vụ, số hoàn tất, số bị chặn, số quá hạn, tỷ lệ hoàn tất và tiến độ trung bình. Game truyền mốc thời gian UTC để tính quá hạn.
- Game khởi tạo số dư 0 VND. Vốn, doanh thu và chi phí là bút toán số nguyên dương có ID riêng. Bút toán chi vượt quỹ hoặc làm tổng vượt phạm vi số nguyên an toàn sẽ bị từ chối.

## Lưu tiến trình

Giữ ổ IndexedDB `ai_company_world_3d_db/game_state/v0.1_slot_main`. Save cũ được đọc từ cùng khóa và dựng dữ liệu công ty từ tiến độ nhân vật đã lưu. Lần lưu sau ghi thêm `company` và `revision`. Giao dịch đọc revision và cập nhật trong cùng ô. Đặt lại giữ một bản ghi đánh dấu trống với revision mới để phiên cũ không thể phục hồi nhầm tiến trình. `persistenceError` chứa lỗi đọc, ghi hoặc xung đột để frontend hiển thị khi nối UI quản trị.

## Supabase tùy chọn

Adapter nhận URL HTTPS, publishable key, ID tài khoản và callback lấy access token. Hiện IndexedDB là chế độ chạy mặc định. Mỗi adapter giữ revision riêng, phần đồng bộ nhiều thiết bị sẽ cần quy tắc hòa giải. Dùng SQL dưới đây trong Supabase staging trước khi nối tài khoản thật.

```sql
create table public.company_game_saves (
  owner_id uuid not null references auth.users(id) on delete cascade,
  slot_id text not null check (slot_id ~ '^[a-zA-Z0-9_-]{1,80}$'),
  revision bigint not null check (revision between 1 and 9007199254740991),
  saved_at timestamptz not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  primary key (owner_id, slot_id)
);

alter table public.company_game_saves enable row level security;
revoke all on public.company_game_saves from public, anon, authenticated;
grant select, insert on public.company_game_saves to authenticated;
grant update (revision, saved_at, snapshot) on public.company_game_saves to authenticated;

create policy "Read own game saves" on public.company_game_saves
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Create own game saves" on public.company_game_saves
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own game saves" on public.company_game_saves
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
```
