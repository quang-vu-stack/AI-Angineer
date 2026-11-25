# Hợp đồng TypeScript dùng chung

`src/agents/types.ts` định nghĩa `AgentEntity` và `DepartmentId`. `src/ai/interfaces.ts` định nghĩa `IAIBrain`, `AgentIntent`, `CompanyTask` và `ITaskManager`. Các module mới import trực tiếp từ những hợp đồng này.

| Kiểu | Trường chính |
| --- | --- |
| `Employee` | `id` trùng ID nhân vật 3D nếu nhân vật đã có trong scene, `name`, `role`, `department`, `skills`, `availability` |
| `Department` | `id: DepartmentId`, `name` |
| `Project` | `id`, `name`, `department` là phòng chủ trì |
| `ManagedTask` | `CompanyTask` cùng với `projectId` và `dueAt` (ISO UTC hoặc `null`) |
| `CompanySnapshot` | `schemaVersion: 1`, `currency: 'VND'`, `departments`, `employees`, `projects`, `tasks`, `ledger` |

`CompanyTask.status` giữ bốn trạng thái `queued`, `in_progress`, `blocked`, `completed`. `advanceTaskProgress(agentId, deltaProgress)` trả nhiệm vụ đã cập nhật hoặc `null`. `assignTask(taskId, agentId)` kiểm tra phòng ban và trạng thái nhân viên trước khi nhận phân công. Các hàm đọc trả bản sao.

## Tích hợp AI Brain

```ts
import { registerAISystems } from '../store/useGameStore';

// brain, memory và relationships do ChatGPT cung cấp.
registerAISystems({ brain, memory, relationships });
```

Mặc định Zustand truyền `company.tasks` của phiên đang hoạt động vào `IAIBrain.decideNextIntent`. Hãy bỏ qua thuộc tính `tasks` khi đăng ký AI để dùng cùng Task Manager với save/reset. Hook giữ tùy chọn `tasks` cho bản thử riêng. Task Manager bên ngoài có vòng đời lưu riêng. Giao diện `AgentIntent` tiếp tục điều khiển hành vi và lời thoại theo mô phỏng Gemini.

## Tích hợp UI quản trị

```ts
const { company, saveNow } = useGameStore.getState();
const employee = company.staff.getEmployee('EMP-04');
const kpi = company.projectKpi('world-v01', new Date().toISOString());
const finances = company.finance.summary();

await saveNow();
const { persistenceError, saveRevision } = useGameStore.getState();
```

Lấy lại `company` từ store sau hydrate/reset vì phiên có thể thay đổi. Dùng các phương thức của service để cập nhật nghiệp vụ. Trường vị trí, đường đi và animation thuộc `AgentEntity` và simulation. Màn hình HR hoặc tài chính mới cần trạng thái hiển thị riêng và có thể đọc snapshot từ phiên đang hoạt động.
