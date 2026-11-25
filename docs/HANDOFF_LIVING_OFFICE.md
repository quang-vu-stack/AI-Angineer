# HANDOFF — SPRINT 02: LIVING OFFICE (`feature/living-office-v02`)

- **Repository:** `https://github.com/quang-vu-stack/AI-Angineer`
- **Base branch & commit:** `feature/ai-brain` @ `be036d34ca1c533f36c9be2fa461b5d7ea296b94`
- **Target branch:** `feature/living-office-v02`
- **Trạng thái AI Brain & Backend GPT-6.2:** Giữ nguyên toàn bộ `src/ai/*`, `src/company/*`, `src/economy/*`, `src/tasks/*`, `src/persistence/*`, `src/types/*` (không ghi đè, không phá vỡ DI hook `registerAISystems`, không thêm API trả phí).

---

## 1. Kết quả triển khai 9 hạng mục

1. **Nâng cấp ngoại hình 20 nhân viên (`src/agents/types.ts`, `src/agents/roster.ts`, `src/agents/AgentAvatar.tsx`):**
   - Tạo 20 hồ sơ ngoại hình hoàn toàn phân biệt về khuôn mặt (mắt, lông mày, mũi, miệng, kính, râu/ria), 8 kiểu tóc (`short`, `sidepart`, `spiky`, `bob`, `long`, `ponytail`, `bun`, `curly`), 7 phong cách trang phục (`suit`, `blazer`, `shirt`, `hoodie`, `sweater`, `cardigan`, `polo`), phụ kiện (`tie`, `scarf`, `headphones`, `watch`, `earrings`) và tỷ lệ vóc dáng (`heightScale`, `buildScale`).
   - Toàn bộ thuộc tính mới là tùy chọn để tương thích ngược 100% với bản lưu IndexedDB V0.1.

2. **Cải thiện hoạt ảnh nhân vật (`src/agents/AgentAvatar.tsx`):**
   - Tách khớp hông, thân trên, vai, khuỷu tay và đầu; bổ sung chuyển động mượt theo `delta` cho `Walking` (đánh tay/chân, nhún bước), `Working` (ngồi gõ bàn phím hai tay, cúi người và liếc màn hình), `Sitting`, `Talking` (cử chỉ tay và gật đầu), `Meeting` (ngồi họp, cử chỉ trao đổi), `Resting` (ngả lưng thở chậm) và `Idle`.
   - Nội suy góc quay ngắn nhất (`lerpAngle`) và chuyển độ cao ngồi/đứng êm ái.

3. **Nâng cấp vật liệu, ánh sáng, nội thất và chi tiết văn phòng (`src/world/OfficeEnvironment.tsx`, `src/world/InstancedFurniture.tsx`, `src/world/OfficeScene.tsx`):**
   - Vật liệu bán chân thực: sàn hành lang gạch kiến trúc tạo bằng `CanvasTexture` nội bộ, thảm tiêu âm theo phòng ban, vách kính cường lực khung nhôm có dải mờ, tường lam gỗ phòng CEO và bảng trắng treo tường.
   - Nội thất `InstancedMesh` gồm bàn gỗ sồi + chân thép mờ + tấm lót bàn + màn hình đơn/kép có chân đế + bàn phím + laptop + cốc cà phê + ghế công thái học 3 phần (đệm ngồi, tựa lưng, chân xoay) + cây xanh nhiều tán + cụm đèn LED trần.
   - Ánh sáng 3 điểm kết hợp `ACESFilmicToneMapping` và bóng đổ mềm theo preset `LOW` / `MEDIUM` / `HIGH`.

4. **Phòng họp trung tâm với màn hình hiển thị tiến độ dự án trực tiếp (`src/world/CentralMeetingRoom.tsx`):**
   - Bàn họp gỗ óc chó kèm máng cáp nhôm, thiết bị hội nghị trung tâm và 8 ghế khớp tọa độ `meeting_seat_1..8`.
   - Màn hình LED khổ lớn gắn tường Tây cập nhật `CanvasTexture` trực tiếp từ dữ liệu Backend thật (`company.projects.list()`, `company.tasks.getAllTasks()`, `company.projectKpi(...)`, `company.finance.summary()` và trạng thái `agents`).

5. **Nâng cấp bong bóng hội thoại và trạng thái trên đầu nhân viên (`src/agents/AgentAvatar.tsx`, `src/ui/styles.css`):**
   - Điểm trạng thái trên đầu có vòng phát sáng nhịp thở theo màu trạng thái.
   - Bong bóng hội thoại kiểu kính mờ có thanh màu phòng ban, nhãn trạng thái tiếng Việt, mũi tên chỉ xuống và thanh tiến độ nhiệm vụ khi nhân viên được chọn.

6. **Giao diện quản lý Nhân sự, Tài chính, Dự án và Nhiệm vụ (`src/ui/CompanyManagementPanel.tsx`, `src/ui/TopHUD.tsx`, `src/store/useGameStore.ts`):**
   - Thêm nút **Quản trị** trên `TopHUD` mở bảng điều khiển 4 tab kết nối trực tiếp với `CompanyService`:
     - **Nhân sự:** xem danh sách 20 nhân sự, trạng thái 3D, số nhiệm vụ và cập nhật `active` / `on-leave` qua `company.changeEmployee(...)`.
     - **Tài chính:** xem tổng hợp `capitalVnd`, `revenueVnd`, `expensesVnd`, `balanceVnd`, danh sách bút toán và ghi sổ cái mới qua `company.finance.record(...)`.
     - **Dự án:** xem KPI thực tế từ `company.projectKpi(...)` và tạo dự án mới qua `company.projects.create(...)`.
     - **Nhiệm vụ:** lọc trạng thái, gán lại nhân sự (`company.tasks.assign`), chuyển trạng thái (`company.tasks.transition`) và tạo nhiệm vụ mới (`company.tasks.create`).

7. **Hiển thị dữ liệu thực tế từ hệ thống, không tạo số liệu minh họa giả:**
   - Toàn bộ bảng quản trị và màn hình phòng họp đọc trực tiếp từ `CompanyService` và trạng thái mô phỏng; sổ cái khởi đầu hiển thị đúng `0 ₫` và thông báo trống cho tới khi có bút toán thật.

8. **Tối ưu FPS, camera và chất lượng đồ họa (`src/world/OfficeScene.tsx`, `src/agents/AgentAvatar.tsx`, `src/ui/RoomQuickNav.tsx`):**
   - Chia sẻ `BufferGeometry` giữa 20 nhân vật, gộp nội thất qua `InstancedMesh`, loại bỏ `@react-three/drei <Text>` phụ thuộc font mạng (`fonts.gstatic.com`) bằng `CanvasTexture` nội bộ giúp giảm gói `r3f` từ `419.55 kB` xuống `299.23 kB` và chạy ổn định không cần CDN ngoài.
   - Camera hỗ trợ xoay/zoom có damping, điều hướng bàn phím `WASD`/phím mũi tên, giới hạn biên trong văn phòng và nút **Toàn cảnh** trên `RoomQuickNav`.

9. **Kiểm tra và khắc phục lỗi xuyên tường, bàn ghế và đứng sai vị trí (`src/navigation/collision.ts`, `src/navigation/waypointGraph.ts`, `src/simulation/simulationEngine.ts`):**
   - Bổ sung AABB cho toàn bộ 20 bàn làm việc, bàn họp trung tâm và toàn bộ vách kính phân phòng.
   - Chuẩn hóa đồ thị waypoint theo lối tiếp cận cửa vuông góc, loại bỏ lối cắt chéo qua vách kính và lối đi băng qua bàn họp (đóng cửa Tây sau màn hình LED, đi qua cửa Bắc/Nam/Đông).
   - Tự động căn hướng `rotationY` theo `facingRotationY` khi ngồi vào bàn làm việc hoặc ghế phòng họp.

---

## 2. Kết quả kiểm thử thực tế

| Kiểm tra | Lệnh | Kết quả thực tế |
|---|---|---|
| TypeScript Typecheck | `npm run typecheck` | **PASS** (0 lỗi) |
| Backend, AI Brain & Va chạm/Điều hướng | `npm run test:backend` | **PASS 18/18** (15 test gốc + 3 test mới trong `tests/backend/navigation-collision.test.ts`) |
| Production Build | `npm run build` | **PASS** (`tsc -b && vite build`, 0 lỗi, built in 8.30s) |
| Playwright E2E (Chromium) | `npm run test:e2e` (Node v20.19.0) | **PASS 3/3** (`backend-persistence.spec.ts`, `living-office-v02.spec.ts`, `v01-foundation.spec.ts`, 0 `pageerror`) |

---

## 3. Tệp thay đổi & bổ sung

- **Thêm mới:**
  - `src/world/CentralMeetingRoom.tsx`
  - `src/ui/CompanyManagementPanel.tsx`
  - `tests/backend/navigation-collision.test.ts`
  - `tests/e2e/living-office-v02.spec.ts`
  - `docs/HANDOFF_LIVING_OFFICE.md`
- **Cập nhật:**
  - `src/agents/types.ts`, `src/agents/roster.ts`, `src/agents/AgentAvatar.tsx`
  - `src/navigation/collision.ts`, `src/navigation/waypointGraph.ts`
  - `src/simulation/simulationEngine.ts`
  - `src/world/InstancedFurniture.tsx`, `src/world/OfficeEnvironment.tsx`, `src/world/OfficeScene.tsx`
  - `src/store/useGameStore.ts`, `src/App.tsx`, `src/ui/TopHUD.tsx`, `src/ui/RoomQuickNav.tsx`, `src/ui/styles.css`
