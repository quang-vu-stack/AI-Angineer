# ARCHITECTURE — AI Company World 3D (V0.1 Foundation)

## 1. Tổng quan công nghệ
- **Frontend & Build**: React 18 + TypeScript 5 + Vite 6.
- **3D Engine**: Three.js + `@react-three/fiber` + `@react-three/drei`.
- **State Management**: Zustand (`src/store/useGameStore.ts`).
- **Persistence**: Native IndexedDB (`src/services/indexedDbService.ts`), tự động lưu mỗi 30 giây và hỗ trợ lưu thủ công.
- **Testing**: Playwright (`tests/e2e/v01-foundation.spec.ts`).
- **Chi phí vận hành**: 0-cost, không yêu cầu API trả phí.

## 2. Cấu trúc module
| Thư mục | Vai trò |
| :--- | :--- |
| `src/world/` | Bố cục 8 phòng (`officeLayout.ts`), kiến trúc kính/sàn/phòng họp (`OfficeEnvironment.tsx`), đồ nội thất `InstancedMesh` (`InstancedFurniture.tsx`), scene & camera rig (`OfficeScene.tsx`). |
| `src/agents/` | Kiểu dữ liệu nhân viên (`types.ts`), danh sách 20 nhân viên 6 phòng ban (`roster.ts`), avatar 3D có animation 7 trạng thái (`AgentAvatar.tsx`). |
| `src/ai/` | Interface chuẩn cho ChatGPT (`interfaces.ts`: `IAIBrain`, `IMemorySystem`, `ITaskManager`, `IRelationshipSystem`) và bộ não cục bộ V0.1 (`localSystems.ts`). |
| `src/simulation/` | Vòng lặp mô phỏng theo thời gian (`simulationEngine.ts`), cập nhật chỉ số năng lượng, tâm trạng, căng thẳng, năng suất và tiến độ nhiệm vụ. |
| `src/navigation/` | Đồ thị waypoint hành lang & cửa phòng (`waypointGraph.ts`), thuật toán A* (`pathfinder.ts`), kiểm soát va chạm AABB (`collision.ts`). |
| `src/store/` | Zustand store tập trung (`useGameStore.ts`). |
| `src/ui/` | HUD điều hành (`TopHUD.tsx`), danh sách 20 nhân viên (`AgentListPanel.tsx`), bảng chi tiết nhân viên (`AgentInspector.tsx`), điều hướng nhanh 8 phòng (`RoomQuickNav.tsx`). |
| `src/services/` | Lưu trữ IndexedDB (`indexedDbService.ts`) và cấu hình đồ họa Low/Medium/High (`performanceMonitor.ts`). |
| `public/assets/` | Thư mục chờ cho mô hình GLB/GLTF ở V0.2+. |
| `tests/` | Kịch bản kiểm thử Playwright E2E. |

## 3. Tối ưu hiệu suất 60 FPS
- Gom bàn, màn hình, laptop, ghế, chậu cây, tán cây và đèn trần vào **7 InstancedMesh** để giảm draw calls.
- Giới hạn 1 nguồn `directionalLight` đổ bóng chính; preset `Low` tắt shadow và hạ `dpr` về `[0.75, 1]`.
- Theo dõi FPS, Draw Calls, Triangles và JS Heap trực tiếp trên HUD; lắng nghe sự kiện `webglcontextlost` / `webglcontextrestored`.
