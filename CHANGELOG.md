# Changelog

## [0.1.0] - 2026-11-25
### Added
- Khởi tạo kiến trúc module React + TypeScript + Vite + Three.js + React Three Fiber + Drei + Zustand + IndexedDB + Playwright.
- Xây dựng văn phòng 3D Stylized Semi-Realistic gồm 8 phòng (CEO, Điều hành, Lập trình, Thiết kế 3D, Nghiên cứu AI, Truyền thông, Tài chính & Nhân sự, Phòng họp trung tâm có màn hình LED lớn).
- Tối ưu đồ nội thất bằng `InstancedMesh` và hỗ trợ 3 mức đồ họa `Low`, `Medium`, `High`.
- Triển khai 20 nhân viên AI tiếng Việt thuộc 6 phòng ban với 7 trạng thái hoạt động và tìm đường A* trên đồ thị waypoint chống xuyên tường/bàn.
- Xây dựng HUD điều hành, danh sách nhân viên, bảng thông tin chi tiết, bong bóng hội thoại, điều khiển tốc độ `0.15x..2x` và tự động lưu IndexedDB.
- Bổ sung bộ interface AI (`IAIBrain`, `IMemorySystem`, `ITaskManager`, `IRelationshipSystem`) và bộ tài liệu bàn giao cho ChatGPT.
