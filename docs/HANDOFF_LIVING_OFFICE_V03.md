# HANDOFF — SPRINT 04: LIVING OFFICE 2.0 (`feature/living-office-v03`)

- **Repository:** `https://github.com/quang-vu-stack/AI-Angineer`
- **Base branch & commit:** `feature/ai-brain-v03` @ `d8c511bdf82010b12033f87f9d89a013dbdb19eb`
- **Target branch:** `feature/living-office-v03`
- **Bảo toàn kiến trúc:** Giữ nguyên toàn bộ `src/ai/*`, `src/company/*`, `src/economy/*`, `src/tasks/*`, `src/persistence/*`, `src/types/*`, `release/v0.2-rc1` và `main`. Không dùng API trả phí hay tải tài sản từ CDN ngoài.

---

## 1. Kiến trúc tối ưu nhân vật & Kết quả giảm Draw Calls (`744 → 195 DC`)

### So sánh giải pháp (GLTF / SkinnedMesh vs Vertex-Colored Merged-Bone Rig)
- **Vấn đề ở V0.2:** Mỗi nhân viên gồm ~30 `<mesh>` con rời rạc (đầu, tai, mắt, lông mày, mũi, miệng, tóc, kính, râu, tai nghe, áo khoác, cà vạt, thẻ đeo, tay/chân...) × 20 nhân viên ≈ **600 draw calls**, cộng thêm 40 mesh biểu tượng trạng thái trên đầu → tổng cảnh toàn cảnh **744 draw calls**.
- **Quyết định kỹ thuật (`src/agents/avatarGeometry.ts` & `src/agents/InstancedAgentIndicators.tsx`):**
  - Sử dụng `mergeGeometries` (`BufferGeometryUtils`) kết hợp **Vertex Colors** để gộp toàn bộ hình khối bán chân thực theo **6 nhóm xương khớp động** (`torso`, `head`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`) dùng chung 1 `MeshStandardMaterial({ vertexColors: true })` và cache theo `agent.id`.
  - Kết quả: mỗi nhân viên chỉ còn **6 draw calls** (`120 DC` cho toàn bộ 20 nhân viên, thay vì ~600 DC), vẫn giữ trọn vẹn 20 khuôn mặt có lòng trắng/mống mắt, 8 kiểu tóc, 7 trang phục có vai bo tròn + cổ áo + áo khoác/hoodie, giày có đế, phụ kiện và toàn bộ hoạt ảnh khớp nối — không cần tải file `.glb` ngoài.
  - Gộp toàn bộ 40 mesh trạng thái trên đầu 20 nhân viên thành **2 `InstancedMesh`** (`InstancedAgentIndicators.tsx`), giảm thêm **38 draw calls**.
  - Gộp toàn bộ nội thất Khu Cà Phê & Nghỉ Ngơi (`CoffeeLoungeZone.tsx`) thành **1 `BufferGeometry` gộp vertex-color (1 draw call)**.

### Bảng đo hiệu năng Trước và Sau tối ưu (Cùng môi trường Chromium SwiftShader `1366×768`)

> **Lưu ý trung thực:** Máy ảo kiểm thử không có GPU phần cứng (`/dev/dri` không tồn tại), trình duyệt chạy WebGL 2.0 phần mềm **ANGLE SwiftShader CPU**. Chỉ số **Draw Calls (`DC`)** và **JS Heap** là đo đạc kiến trúc thực tế; FPS trên laptop có GPU phần cứng cần kiểm tra trực tiếp trên máy thật (với mức `195 DC` và `22 MB Heap`, kiến trúc đã đủ nhẹ cho mục tiêu 30–60 FPS trên GPU laptop phổ thông).

| Cấu hình đồ họa | Trước tối ưu (`d8c511b`) | Sau tối ưu (`feature/living-office-v03`) | Chênh lệch thực tế |
|---|---|---|---|
| **LOW** | 1 FPS • **DC: 744** • 28 MB | 1 FPS • **DC: 195** • 22 MB | **-549 DC (-73.8%)**, -6 MB Heap |
| **MEDIUM** | 2 FPS • **DC: 744** • 28 MB | 3 FPS • **DC: 195** • 22 MB | **-549 DC (-73.8%)**, +50% FPS SwiftShader, -6 MB Heap |
| **HIGH** | 1–2 FPS • **DC: 744** • 28 MB | 2 FPS • **DC: 195** • 22 MB | **-549 DC (-73.8%)**, -6 MB Heap |
| **Cận cảnh phòng (MEDIUM)** | ~314–544 DC | **56 DC** • 22 MB | Giảm sâu draw calls khi zoom phòng |

---

## 2. Kết quả triển khai 10 hạng mục

1. **Nâng cấp ngoại hình 20 nhân viên bán chân thực (`src/agents/avatarGeometry.ts`):** Đầu bầu dục cân đối, mắt có lòng trắng + mống mắt, cổ áo, vai bo tròn, khóa thắt lưng, giày có đế sáng, giữ đủ 20 bộ ngoại hình phân biệt.
2. **Tối ưu batching nhân vật (`src/agents/avatarGeometry.ts`, `src/agents/InstancedAgentIndicators.tsx`):** Giảm từ ~30 DC/nhân viên xuống đúng **6 DC/nhân viên** và **2 DC** cho 20 biểu tượng trạng thái.
3. **Giảm draw calls vượt mục tiêu `< 400`:** Toàn cảnh giảm từ **744 DC → 195 DC** (`-73.8%`).
4. **Cải thiện hoạt ảnh (`src/agents/AgentAvatar.tsx`):** Hoạt ảnh mượt cho `Working` (gõ phím hai tay + liếc màn hình kép), `Talking` (cử chỉ tay đối thoại + gật đầu), `Meeting` (ngồi họp trao đổi), `Resting` (ngả lưng thở chậm + động tác nhấp cà phê khi ở Khu Cà Phê).
5. **Khu vực nghỉ ngơi, uống cà phê và giao tiếp (`src/world/CoffeeLoungeZone.tsx`, `src/world/officeLayout.ts`, `src/navigation/waypointGraph.ts`, `src/navigation/collision.ts`):** Đặt tại sảnh Đông (`X: 9.4..16.2, Z: -2.9..2.9`) với 2 sofa, gối tựa, bàn trà gỗ sồi, quầy pha espresso, máy pha cà phê, tủ bánh và 4 chỗ ngồi (`lounge_seat_1..4`) + `lounge_coffee_bar`. Lệnh **Cà phê / Nghỉ** tự động điều hướng nhân viên ra khu vực này.
6. **Hiệu ứng ánh sáng ngày và đêm (`src/world/OfficeScene.tsx`, `src/ui/TopHUD.tsx`):** Tự động chuyển đổi theo `simMinutes` qua 4 pha **Sáng** (06:00–09:30), **Trưa** (09:30–16:30), **Chiều hoàng hôn** (16:30–19:00) và **Tối** (19:00–06:00, ánh trăng ngoài trời + đèn ấm nội thất & khu cà phê).
7. **Hiển thị tính cách và chỉ số AI trong Inspector (`src/ui/AgentInspector.tsx`):** Đọc trực tiếp `personalityFor(agent.id)` từ `src/ai/agentPersonality.ts` hiển thị **Tập trung (Focus)**, **Hòa đồng (Sociability)**, **Bền bỉ (Resilience)** cùng 2 ngưỡng suy diễn thực từ `decisionPolicy.ts` (`Ngưỡng áp lực` và `Chu kỳ giao tiếp`).
8. **Cải thiện camera & trải nghiệm điều hành (`src/world/OfficeScene.tsx`, `src/store/useGameStore.ts`, `src/ui/AgentInspector.tsx`):** Bổ sung chế độ **Theo dõi camera** (`followSelectedAgent`), phím `Esc` đóng nhanh modal/bỏ chọn, nút **Khu Cà Phê & Nghỉ Ngơi** trên thanh điều hướng phòng nhanh.
9. **Kiểm thử va chạm, waypoint và hoạt ảnh (`tests/backend/navigation-collision.test.ts`):** Bổ sung bài test kiểm chứng đường đi A* của cả 20 nhân viên từ bàn làm việc đến `lounge_seat_1..4` và `lounge_coffee_bar` không cắt qua bàn trà, quầy cà phê hay vách kính.
10. **Đo hiệu năng trước/sau và xác minh toàn diện:** Đạt 0 `pageerror`, 0 `console.error`.

---

## 3. Kết quả kiểm thử tự động

| Kiểm tra | Lệnh | Kết quả thực tế |
|---|---|---|
| TypeScript Typecheck | `npm run typecheck` | **PASS** (0 lỗi) |
| Backend, AI Personality & Va chạm | `npm run test:backend` | **PASS 30/30** (bao gồm test mới cho Khu Cà Phê) |
| Production Build | `npm run build` | **PASS** (`tsc -b && vite build`, 8.67s) |
| Playwright E2E (Chromium) | `npm run test:e2e` | **PASS 6/6** (3.7m, 0 `pageerror`) |
