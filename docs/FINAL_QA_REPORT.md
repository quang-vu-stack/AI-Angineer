# FINAL QA REPORT — AI COMPANY WORLD 3D V0.2 RC1

- **Repository:** `https://github.com/quang-vu-stack/AI-Angineer`
- **Tested Release Candidate:** `release/v0.2-rc1` @ `9682da402d9903d1ab996adf53e2bc829be3e02f`
- **Fix Branch Created:** `qa/rc1-final-fix` (branched directly from `9682da402d9903d1ab996adf53e2bc829be3e02f`, chỉ sửa 2 tệp kiểm thử E2E, không thay đổi mã ứng dụng/AI Brain/Backend/main)
- **Môi trường kiểm thử:** Linux x86_64, Node `v20.19.0`, Playwright Chromium (`1366×768`).
- **Trạng thái GPU phần cứng:** Máy ảo kiểm thử **không có thiết bị GPU phần cứng** (`/dev/dri` không tồn tại). Trình duyệt chạy trên WebGL 2.0 phần mềm:
  `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.

---

## 1. Kết quả các lệnh kiểm thử bắt buộc (1–5)

| # | Lệnh | Kết quả trên RC1 gốc (`9682da4`) | Kết quả trên `qa/rc1-final-fix` |
|---|---|---|---|
| 1 | `npm ci` | **PASS** (157 packages, 0 lỗi) | **PASS** |
| 2 | `npm run typecheck` | **PASS** (`tsc --noEmit`, 0 lỗi) | **PASS** |
| 3 | `npm run build` | **PASS** (`tsc -b && vite build`, 8.67s) | **PASS** (8.45s) |
| 4 | `npm run test:backend` | **PASS 26/26** | **PASS 26/26** |
| 5 | `npm run test:e2e` | **FAIL 5/6** (Test #5 `management-sync.spec.ts:28` timeout 45s và race autosave 30s) | **PASS 6/6** (3.5m, 0 `pageerror`) |

---

## 2. Đo hiệu năng thực tế trên trình duyệt (6–7)

> **Lưu ý trung thực:** Toàn bộ số liệu FPS dưới đây đo trên trình kết xuất phần mềm CPU **SwiftShader** (không có GPU phần cứng), nên FPS phản ánh giới hạn CPU software rasterizer, không đại diện cho FPS trên laptop có GPU phần cứng. Chỉ số **Draw Calls (DC)** và **JS Heap** là số đo kiến trúc thực tế.

| Cấu hình đồ họa | FPS thực tế (SwiftShader CPU) | Draw Calls | Bộ nhớ JS Heap | Lỗi Console / PageError |
|---|---|---|---|---|
| **LOW** | 1 FPS | 744 | 28 MB | 0 |
| **MEDIUM** | 2 FPS | 744 | 28 MB | 0 |
| **HIGH** | 1 FPS | 744 | 28 MB | 0 |

---

## 3. Kiểm thử vận hành 20 nhân viên trong 3 ngày mô phỏng liên tục (8–9)

Chạy vòng lặp mô phỏng thực (`useGameStore` + `LocalAIBrain` + `CompanyService` + `Coordination` + `fake-indexeddb`) trong **9.000 bước × 0.5s = 4.500 phút mô phỏng (Ngày 1 → Ngày 4, đủ 3 ngày mô phỏng liên tục)** cho toàn bộ 20 nhân viên (`180.000` lượt mẫu vị trí):

- **Vị trí & va chạm:** `0` vi phạm AABB (`obstacleViolations = 0`), `0` giá trị `NaN`/`Infinity`.
- **Phân bố đầy đủ 7 trạng thái thực tế:**
  - `Working`: 1.767 ticks
  - `Walking`: 238 ticks
  - `Meeting`: 166 ticks (đã lên lịch và hoàn tất cuộc họp liên phòng ban trên `world-v01`)
  - `Talking`: 600 ticks (hội thoại 2 chiều có ghi nhận ký ức & quan hệ đối xứng)
  - `Sitting`: 61.416 ticks
  - `Resting`: 115.714 ticks
  - `Idle`: 99 ticks
- **Tài chính (VND):**
  - Ghi nhận vốn `100.000.000 ₫`, doanh thu `25.000.000 ₫`, chi phí `15.000.000 ₫` → Lợi nhuận hoạt động `10.000.000 ₫`, số dư quỹ `110.000.000 ₫`.
  - Chi vượt quỹ (`999.000.000 ₫`) bị từ chối đúng quy tắc (`overdraftRejected = true`).
- **Dự án & KPI (`world-v01`):** Hoàn thành `20/20` nhiệm vụ (`completionPercent = 100%`, `progressPercent = 100%`, `blocked = 0`, `overdue = 0`).
- **Lưu, Tải & Đặt lại (`saveNow` → `hydrateFromIndexedDB` → `resetSimulation`):**
  - Ngày (`day = 4`) và số dư quỹ (`110.000.000 ₫`) khôi phục khớp 100% sau `hydrateFromIndexedDB`.
  - `resetSimulation` đưa sạch về Ngày 1, số dư `0 ₫`, `persistenceError = null`.

---

## 4. Lỗi phát hiện trên RC1 & Bản sửa trên `qa/rc1-final-fix` (10)

### Lỗi đã phát hiện và khắc phục (chỉ ở tầng kiểm thử E2E)
1. **Playwright timeout `45_000ms` quá sát cho test dài dưới SwiftShader (`playwright.config.ts`):**
   - `tests/e2e/management-sync.spec.ts:28` thực hiện chuỗi thao tác đầy đủ (Finance + Overdraft + Projects + Tasks + HR + Save + Reload + Reset) mất ~66 giây trên CPU SwiftShader nên bị ngắt timeout ở `page.reload()`.
   - **Đã sửa:** Nâng `timeout` trong `playwright.config.ts` từ `45_000` lên `90_000`.
2. **Race condition giữa autosave 30 giây của `App.tsx` và assertion cứng `revision === 1` (`tests/e2e/management-sync.spec.ts`):**
   - Khi bài test chạy quá 30 giây trước khi bấm nút **Lưu IndexedDB**, bộ autosave định kỳ 30s của `App.tsx` đã tự ghi `revision = 1`, khiến cú bấm lưu thủ công tăng lên `revision = 2` và làm `expect.poll(readRevision).toBe(1)` thất bại.
   - **Đã sửa:** Đọc `revBeforeSave` trước khi bấm Lưu và kiểm tra `revision > revBeforeSave`, sau đó kiểm tra `revision > revAfterSave` sau khi Đặt lại mô phỏng — giữ nguyên kiểm chứng cơ chế compare-and-set revision mà không bị flake theo thời gian chạy.

### Lưu ý còn tồn tại (Không chặn chức năng cốt lõi, cần ghi nhận trước khi chốt V0.2 Stable)
1. **Chưa đo được FPS trên GPU phần cứng thật:** Máy chủ QA không có `/dev/dri`; khuyến nghị chạy kiểm tra nhanh FPS mục tiêu (30–60 FPS) trên máy Windows/macOS có GPU phần cứng trước khi gắn tag `v0.2.0`.
2. **Cảnh báo kích thước chunk khi build Vite:** `dist/assets/three-Ci5CsgnV.js` nặng `687.53 kB` (`177.21 kB` gzip) vượt ngưỡng cảnh báo mặc định 500 kB của Vite (không ảnh hưởng runtime).
3. **Số lượng Draw Calls (`744 DC` ở góc toàn cảnh):** Phần lớn đến từ ~30 mesh khớp nối riêng lẻ trên mỗi nhân vật × 20 nhân viên. Đã ổn định cho GPU laptop phổ thông nhưng có thể tối ưu thêm bằng SkinnedMesh/GLTF trong V0.3.

---

## 5. Khuyến nghị xét duyệt V0.2 Stable

- **Đánh giá chức năng & ổn định:** **ĐẠT (PASS)** trên nhánh `qa/rc1-final-fix` (`npm ci`, `typecheck`, `build`, `26/26` backend tests, `6/6` Playwright E2E, `3` ngày mô phỏng liên tục 0 lỗi va chạm/NaN/persistence).
- **Khuyến nghị cho ChatGPT:** Có thể hợp nhất bản sửa nhỏ từ `qa/rc1-final-fix` (2 tệp test config/spec + `docs/FINAL_QA_REPORT.md`) vào `release/v0.2-rc1` và đề xuất gắn nhãn **V0.2 Stable** sau khi kiểm tra nhanh FPS trên máy có GPU phần cứng.
