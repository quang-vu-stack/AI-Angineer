# TEST REPORT — AI Company World 3D (V0.1 Foundation)

## Trạng thái kiểm thử (Trung thực, không giả mạo)
Gói mã nguồn này được tạo và kiểm tra cấu trúc tĩnh trong môi trường sinh mã nguồn (không có kết nối trực tiếp tới repository Git cục bộ hay môi trường Node/Playwright của máy Windows). Do đó:
- **Kiểm tra tĩnh đã thực hiện**:
  - Xác minh cấu trúc thư mục đầy đủ (`src/world`, `src/agents`, `src/ai`, `src/simulation`, `src/navigation`, `src/store`, `src/ui`, `src/services`, `public/assets`, `tests`, `docs`).
  - Xác minh JSON hợp lệ (`package.json`, `tsconfig.json`).
  - Xác minh đủ **20 nhân viên** chia đúng **6 phòng ban** (3 + 5 + 3 + 3 + 3 + 3) và đủ **8 phòng** trong `officeLayout.ts`.
  - Xác minh mọi `deskWaypointId` và `homeRoomDoorId` của 20 nhân viên đều tồn tại trong `WAYPOINTS`.
- **Kiểm thử thực tế trên máy Windows (CHƯA CHẠY — cần thực hiện trên máy local)**:
  ```bash
  git checkout -b feature/v0.1-3d-foundation
  npm install
  npm run typecheck
  npm run build
  npx playwright install chromium
  npm run test:e2e
  ```

## Danh mục kiểm thử trong `tests/e2e/v01-foundation.spec.ts`
1. Khởi chạy WebGL `<canvas>` không phát sinh `pageerror`.
2. Kiểm tra đủ 20 nhân viên trong `AgentListPanel`.
3. Chọn `EMP-01` và kiểm tra mở `AgentInspector` đúng tên tiếng Việt.
4. Kiểm tra nút `Pause` / `Resume`.
5. Kiểm tra đủ 6 mức tốc độ (`0.15x`, `0.25x`, `0.5x`, `1x`, `1.5x`, `2x`).
6. Kiểm tra chuyển đổi thiết lập đồ họa `Low`, `Medium`, `High`.
