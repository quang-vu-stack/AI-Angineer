# Sprint 03 — QA tích hợp Backend V0.2

Nhánh `qa/backend-v02` dựa trên `integration/v0.2` tại commit `6a442dce697e8d1a8ce04cf1ec228dfba4bc3f2c`. Phạm vi gồm backend, AI Brain, lưu tiến trình và luồng dữ liệu vào bảng quản trị.

## Lỗi đã xử lý

| Phát hiện | Sửa và xác minh |
| --- | --- |
| Merge làm hỏng cú pháp `useGameStore.ts` và mất đoạn ghi kết quả `tickSimulation` về Zustand | Khôi phục cập nhật nhân vật, đồng hồ, ngày mô phỏng và thông tin nhiệm vụ. Build, typecheck và kiểm thử mô phỏng đã chạy lại. |
| Bảng quản trị giữ snapshot cũ trong khi mô phỏng tự cập nhật nhiệm vụ | Task Manager cung cấp bộ đếm thay đổi. Store thông báo khi mô phỏng ghi tiến độ hoặc trạng thái, kể cả khi cuộc họp cập nhật nhiệm vụ. Playwright kiểm tra tiến độ và KPI tăng khi bảng đang mở. |
| Hình chiếu nhân viên có thể giữ nhiệm vụ hoặc phòng ban cũ khi tải game hoặc sau lệnh quản trị | Sau lệnh quản trị và hydrate, store đọc lại phòng ban và nhiệm vụ từ dữ liệu công ty. Vòng lặp cũng cập nhật nhiệm vụ đang hiển thị trên nhân vật. |
| Nhiệm vụ đã đóng có thể hiện “Chưa giao” khi người từng phụ trách nghỉ phép hoặc chuyển phòng | Hiển thị tên theo ID người được lưu trong nhiệm vụ hoàn thành. Bộ lọc người đang hoạt động vẫn áp dụng cho nhiệm vụ mở. |
| Ô chọn nhiệm vụ hoặc bút toán có thể giữ ID đã mất sau reset | Giá trị gửi biểu mẫu được lấy từ danh sách dự án và người phụ trách còn tồn tại. |

Không có thay đổi đối với scene, avatar, waypoint, thuật toán định tuyến, CSS hay logic căn hướng ghế của Gemini.

## Phạm vi đã kiểm tra

- AI Brain cục bộ, điều phối họp giữa phòng ban, hủy họp khi thiếu người, hội thoại hai lượt, ký ức hai phía và cập nhật quan hệ. Các test tích hợp xác nhận có thể lưu và tiếp tục khi đang họp hoặc đang hội thoại.
- IndexedDB qua HUD và qua store, bao gồm save V0.1, restore, reset lúc AI đang hoạt động, chống ghi đè revision và reset từ tab khác.
- Luồng quản trị tài chính, phòng ban, người phụ trách, tiến độ, hoàn tất nhiệm vụ và KPI dự án. Kiểm tra cả lỗi chi vượt quỹ và nghỉ phép khi còn nhiệm vụ mở. Các thao tác bị từ chối giữ nguyên trạng thái đã lưu.
- Playwright kiểm tra bảng quản trị cập nhật khi AI làm việc, lưu/tải các thay đổi đã thực hiện qua UI và xác nhận reset khôi phục dữ liệu ban đầu. Các test điều phối chi tiết và năng suất ngày/tuần chạy ở tầng backend.

## Kết quả thực tế

Môi trường Linux, Node.js 24.22.3, npm 11.19.1, Vite 6.4.6 và Chromium headless 158.0.8127.0 với SwiftShader.

| Lệnh | Kết quả trên nhánh QA |
| --- | --- |
| `npm ci` | Đạt, cài 157 gói từ lockfile |
| `npm run typecheck` | Đạt |
| `npm run build` | Đạt. Cảnh báo Vite về chunk Three.js khoảng 688 kB trước gzip. |
| `npm run test:backend` | 26/26 đạt |
| `npm run test:e2e -- -c playwright.local.config.ts` | 6/6 đạt trong 1,6 phút |

Trên commit nền, typecheck, build và các bộ backend import store không chạy qua vì lỗi cú pháp TypeScript trong lúc merge. Sau khi sửa, suite backend bao gồm 3 test điều hướng Gemini về vị trí, waypoint và đường tới phòng họp.

Lượt `npm run test:e2e` với cấu hình mặc định dừng ở Vite preview do môi trường Linux chặn truy vấn giao diện mạng (`uv_interface_addresses`). Lượt đạt dùng cấu hình tạm cho preview bind `127.0.0.1` và trỏ Playwright đến Chromium cài riêng. Toàn bộ sáu bài dùng cùng bản production build. Cấu hình tạm nằm ngoài commit.

Hai bài Playwright mới nằm tại `tests/e2e/management-sync.spec.ts`. Một bài đợi tiến độ nhiệm vụ và KPI đổi khi mô phỏng chạy. Bài còn lại đi qua các thao tác ghi vốn, từ chối chi vượt quỹ, tạo dự án, phân công, hoàn tất, nghỉ phép, lưu/tải và reset. Kiểm thử Supabase dùng HTTP mô phỏng của bộ backend hiện có. Windows và Supabase staging nằm ngoài môi trường kiểm thử lần này.
