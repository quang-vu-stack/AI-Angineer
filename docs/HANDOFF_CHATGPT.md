# HANDOFF TO CHATGPT & GPT-6.2 (`quang-vu-stack/AI-Angineer`)

## 1. Phân tách trách nhiệm
- **3D & Frontend Foundation (`main` & `feature/world-3d`)**: Đã hoàn thiện khung React + TypeScript + Vite + R3F + Drei + Zustand + IndexedDB, 8 phòng chức năng, 20 nhân viên, 7 trạng thái hoạt ảnh, camera OrbitControls + focus mượt, và tìm đường A* trên đồ thị waypoint.
- **AI Brain & Backend (Dành riêng cho ChatGPT & GPT-6.2)**: Không triển khai AI Brain hay backend trong gói này. Hệ thống hiện dùng `StubAIBrain`, `StubMemorySystem`, `StubTaskManager`, `StubRelationshipSystem` trong `src/ai/stubAdapter.ts`.

## 2. Điểm tích hợp chuẩn
Gọi `registerAISystems({ brain, memory, tasks, relationships })` từ `src/store/useGameStore.ts` khi khởi chạy ứng dụng để gắn module thật theo đúng 4 interface trong `src/ai/interfaces.ts`:
- `IAIBrain`
- `IMemorySystem`
- `ITaskManager`
- `IRelationshipSystem`
