# DEVELOPMENT STATUS — V0.1 Foundation

## 1. Đã hoàn thành
- [x] Khởi tạo đầy đủ kiến trúc React + TypeScript + Vite + Three.js + R3F + Drei + Zustand + IndexedDB + Playwright.
- [x] Xây dựng môi trường văn phòng 3D gồm đủ 8 khu vực: Phòng CEO, Điều hành, Lập trình, Thiết kế 3D, Nghiên cứu AI, Truyền thông, Tài chính & Nhân sự, Phòng họp trung tâm có màn hình LED lớn.
- [x] Triển khai nội thất tối ưu bằng `InstancedMesh` (bàn, ghế, màn hình, laptop, cây xanh, đèn trần) + vách kính phân khu.
- [x] Tạo chính xác 20 nhân viên tiếng Việt chia theo 6 phòng ban (3 + 5 + 3 + 3 + 3 + 3) với đủ ID, giới tính, chức vụ, ngoại hình, chỉ số, kỹ năng và nhiệm vụ.
- [x] Triển khai đủ 7 trạng thái: `Idle`, `Walking`, `Working`, `Sitting`, `Talking`, `Meeting`, `Resting`.
- [x] Triển khai tìm đường A* trên đồ thị waypoint qua hành lang & cửa phòng + kẹp va chạm AABB chống đi xuyên tường/bàn.
- [x] Hoàn thiện HUD, danh sách 20 nhân viên, bảng thông tin chi tiết, bong bóng hội thoại, Pause/Resume, tốc độ `0.15x, 0.25x, 0.5x, 1x, 1.5x, 2x`, thiết lập `Low/Medium/High`, camera zoom/pan/rotate + focus mượt.
- [x] Tạo interface sạch cho ChatGPT trong `src/ai/interfaces.ts`.

## 2. Chưa hoàn thành / Dành cho V0.2+
- [ ] Chưa nạp asset GLB/GLTF tùy chỉnh (hiện dùng Stylized Low-Poly procedural để giữ nhẹ và tải tức thì).
- [ ] Chưa tích hợp AI Brain nâng cao (LLM / GOAP / Memory Retrieval / Relationship Drama) — bàn giao cho ChatGPT.
- [ ] Chưa chạy kiểm thử trực tiếp trên máy Windows đích (cần chạy `npm install`, `npm run build`, `npm run test:e2e` trên nhánh `feature/v0.1-3d-foundation`).

## 3. Hạn chế / Lưu ý hiện tại
- Khi 2 nhân viên cùng đi vào 1 nút hành lang hẹp có thể chạm nhẹ nhau (chưa có local avoidance ORCA/RVO ở V0.1).
- `performance.memory` chỉ hiển thị dung lượng RAM JS trên trình duyệt Chromium (Chrome/Edge trên Windows).
