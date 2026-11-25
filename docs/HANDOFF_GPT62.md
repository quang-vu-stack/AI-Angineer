# Bàn giao Backend V0.1 cho ChatGPT

Nền tảng Gemini là commit `806e72e8cdf291c1163a896b3d2c856bc89d1c1c` trên `main`. Backend được tích hợp trên `feature/backend-qa`.

Đã triển khai nhân sự, phòng ban, dự án, Task Manager tương thích AI, KPI, sổ tài chính VND và lưu tiến trình IndexedDB. Vòng lặp game thực thi Task Manager mặc định nên tiến độ nhân vật đang làm việc được phản ánh trên inspector và trong bản lưu. Bản ghi cũ có thể tải lên từ cùng ô lưu. Chi tiết API nằm trong [Shared interfaces](SHARED_INTERFACES.md) và kết quả chạy trong [Báo cáo QA](BACKEND_TEST_REPORT.md).

| Phụ trách | Điểm tích hợp |
| --- | --- |
| ChatGPT | Gọi `registerAISystems({ brain, memory, relationships })` để sử dụng backend task hiện có. Brain đọc nhiệm vụ từ tham số `ITaskManager` trong từng lượt quyết định. Logic Brain, bộ nhớ và quan hệ vẫn dùng stub đến khi được đăng ký. |
| Gemini | Đọc hồ sơ nghiệp vụ theo ID nhân vật. Nối UI HR, dự án, tài chính và báo trạng thái lưu từ `persistenceError` khi các màn hình này được xây dựng. Cần thiết kế thêm chỗ làm và avatar cho hồ sơ nhân sự mới. |
| CEO | Chốt vốn khởi nghiệp để ghi bút toán vốn đầu tiên. |
| QA | Nếu bật đồng bộ, áp dụng SQL ở staging và kiểm tra RLS bằng hai tài khoản cùng với xung đột revision trên Supabase thật. |

Không có deployment công khai, API trả phí mặc định hoặc cấu hình kết nối Supabase trong ứng dụng.
