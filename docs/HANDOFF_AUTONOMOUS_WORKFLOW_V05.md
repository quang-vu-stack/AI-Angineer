# Sprint 08 — Autonomous Workflow Engine V0.5

Nhánh `feature/autonomous-workflow-v05` phát triển từ `feature/ai-planner-v05` tại `457a4f5d3867b47bb14f1bd93bfbbfba94f03360`.

## Dùng thử trong game

1. Trong **Quản trị**, tạo dự án và các nhiệm vụ theo phòng ban, hoặc duyệt hợp đồng để Business Engine tạo nhiệm vụ. Có thể tạm dừng mô phỏng trong lúc lên kế hoạch.
2. Mở **Quy trình**, chọn dự án. Đặt tên các giai đoạn, chọn nhiệm vụ, ngày đến hạn và nhiệm vụ phải làm trước. Khởi động để bắt đầu phân công. Mỗi dự án hỗ trợ một quy trình. Chỉ các nhiệm vụ đã chọn, còn chờ và có tiến độ bằng 0 được đưa vào quy trình.
3. Trong một giai đoạn, các việc độc lập có thể chạy song song. Mỗi việc chờ đủ các tiền nhiệm. Toàn bộ giai đoạn trước phải hoàn tất để mở giai đoạn sau. Hệ thống kiểm tra đồ thị trước khi đổi bất kỳ phân công nào, từ chối ID sai, trùng, tự phụ thuộc, chu trình và phụ thuộc ngược giai đoạn.
4. Khi đủ điều kiện, Business Engine chọn người đang hoạt động trong phòng nhận việc theo chiến lược hiện tại, kỹ năng của yêu cầu hợp đồng và tải việc. Nếu phòng chưa có người, công việc chờ và được thử phân công lại.
5. Nhiệm vụ bị chặn mở một phiếu hỗ trợ. Người chơi cũng có thể ghi rõ vướng mắc trong thẻ Quy trình. Nhập cách tháo gỡ để đóng phiếu và tiếp tục. Nút Resume trong thẻ Nhiệm vụ tuân thủ cùng điều kiện.
6. Khi các nhiệm vụ đã thực sự hoàn tất, QA nhập kết quả. Trả lại tạo một nhiệm vụ sửa lỗi mới ở giai đoạn cuối với tiến độ bằng 0. QA đạt chuyển sang chờ CEO duyệt bàn giao. CEO cũng có thể trả về sửa lỗi. Mỗi lệnh duyệt mang bước đang xét để lệnh QA gửi lại không thể thay thế quyết định của CEO.

## Báo cáo và thông báo

Nút Quản trị trên HUD hiển thị số thông báo quy trình chưa đọc. Hộp thông báo trong game ghi nhận mở việc cho phòng ban, yêu cầu hỗ trợ, quá hạn, hoàn tất, lỗi và các quyết định QA/bàn giao. Đánh dấu đã đọc giữ lại lịch sử. Ngày hết hạn là ngày mô phỏng, một việc chưa xong chỉ bị cảnh báo một lần sau ngày đó.

Báo cáo ngày lấy thời gian làm việc, nhiệm vụ hoàn tất trong mô phỏng, cuộc họp và hội thoại toàn công ty từ ProductivityLog. Phần chi tiết quy trình cộng mức tăng tiến độ quan sát được của từng việc theo ngày và liệt kê các sự kiện tương ứng. Cùng một tiến độ được đối soát nhiều lần không làm tăng số liệu.

## Điểm tích hợp

- `company.workflow.create(projectId, stages, day)` nhận danh sách giai đoạn theo thứ tự. Mỗi nhiệm vụ có `taskId`, danh sách ID tiền nhiệm `after` và `dueDay` hoặc null. TaskManager áp dụng cùng điều kiện cho gán người, bắt đầu, hoàn tất thủ công và tăng tiến độ từ mô phỏng hoặc cuộc họp.
- `requestHelp`, `resolve`, `decide(projectId, expectedStep, pass, note, day)`, `markRead` và `report(day)` phục vụ giao diện. Dùng `notifyCompanyChange()` sau thao tác quản trị. Vòng đối soát hiện có của Business Engine gọi workflow trước khi xét thu tiền.
- Hợp đồng có nhiệm vụ trong quy trình cần cả hai điều kiện: mọi yêu cầu hợp đồng đã hoàn tất và quy trình liên quan đã được bàn giao. Bút toán doanh thu vẫn dùng ID duy nhất của hợp đồng. Hợp đồng ngoài quy trình giữ quy tắc V0.3. Các quyết định QA và CEO không cấp XP, tăng lương, thăng chức hoặc tạo bút toán chi. Phần việc sửa lỗi đi qua TaskManager và chính sách XP hiện có.
- Save V0.5 giữ quy trình, phiếu hỗ trợ, ngày/tiến độ đã quan sát, lịch sử quyết định và trạng thái đã đọc trong cùng giao dịch IndexedDB với công ty và AI. V0.2–V0.4 thiếu trường workflow mở với danh sách quy trình trống. Restore kiểm tra đồ thị, tham chiếu, điều kiện chuyển giao và chuỗi quyết định QA/CEO. Reset sử dụng cơ chế xóa slot hiện tại.

## Kiểm thử

Commit mã nguồn `b8e88505e1418ef356e61bae52b84f6cbc198bfb`. Môi trường Linux, Node.js 24.22.3 và Chromium headless 158.0.8127.0 cài riêng. Playwright dùng cấu hình repository với `PLAYWRIGHT_BROWSERS_PATH` trỏ tới browser đã cài.

| Lệnh | Kết quả |
| --- | --- |
| `npm ci --no-audit` | Cài 157 gói theo lockfile. |
| `npm run typecheck` | Đạt. |
| `npm run build` | Đạt. Vite cảnh báo kích thước chunk Three.js khoảng 688 kB trước gzip. |
| `npm run test:backend` | 56/56 đạt. |
| `npm run test:e2e -- --workers=1` | 9/9 đạt trong 1,7 phút trên bản production cuối. |

Sáu bài backend mới bao phủ đồ thị lỗi và tính nguyên vẹn khi từ chối kế hoạch, khóa thực thi, chuyển giao liên phòng, hỗ trợ, báo cáo và cảnh báo quá hạn, QA trả lỗi, CEO duyệt, ghi doanh thu một lần, bảo toàn XP/lương, migration ba phiên bản, lưu giữa quy trình và reset. Playwright mới kiểm tra thao tác qua UI từ chọn nhiệm vụ thật đến hai quyết định QA và CEO riêng biệt.

Lượt backend đầu phát hiện kiểm thử tích hợp HQ còn chờ nhãn phiên bản 0.4.0 khi ghi save mới; đã cập nhật nhãn kỳ vọng sang 0.5.0 và giữ các kiểm tra camera, đào tạo, nhân sự và hydrate. Lượt Playwright đầu có một timeout sau reload trong lúc thư mục build được cập nhật. Chạy lại toàn bộ suite trên thư mục build cố định đạt cả chín bài.
