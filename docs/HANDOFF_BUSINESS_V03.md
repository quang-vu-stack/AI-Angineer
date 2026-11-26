# Business Engine V0.3

Nhánh `feature/business-engine-v03` xuất phát từ `feature/ai-brain-v03` tại `d8c511bdf82010b12033f87f9d89a013dbdb19eb`.

## Luồng CEO

Trong **Quản trị công ty → Kinh doanh**, thêm khách hàng, chọn dự án và nhập giá trị VNĐ, ngày hết hạn cùng các yêu cầu bàn giao. Mỗi yêu cầu có phòng phụ trách và danh sách kỹ năng. Mở hợp đồng để duyệt hoặc từ chối. Hợp đồng chờ duyệt quá hạn chuyển sang `expired`. Hợp đồng đang thực hiện có thể bàn giao trễ và vẫn thu đủ giá trị đã thỏa thuận.

Mỗi yêu cầu được duyệt tạo một nhiệm vụ ưu tiên cao trong TaskManager. Người nhận phải đang hoạt động và thuộc đúng phòng. CEO chọn ưu tiên kỹ năng hoặc khối lượng còn lại. Khi không có người phù hợp trong phòng, nhiệm vụ chờ đến lần điều phối sau. Thay đổi chiến lược áp dụng cho lần phân công tiếp theo. Khi phòng hoàn tất công việc mở, hệ thống sinh tối đa một nhiệm vụ rà soát/ngày/phòng vào dự án vận hành. Nhiệm vụ rà soát không tạo doanh thu.

## Tích hợp và quy tắc tài chính

- `company.business.customer`, `propose`, `decide`, `configure` phục vụ giao diện CEO. `advance(day)` đối soát theo đồng hồ mô phỏng, ngay khi nhiệm vụ hoàn tất và sau thao tác quản trị. Dùng `company.business.snapshot()` để đọc bản sao.
- Khi toàn bộ yêu cầu hoàn thành, Business Engine ghi đúng một bút toán doanh thu, gắn với hợp đồng và dự án. Giá trị hợp đồng do CEO nhập. Khởi động với sổ cái rỗng và mức chi bằng 0 cho đến khi CEO cấu hình.
- Lương chốt theo số nhân viên hoạt động cuối ngày nhân với đơn giá chung. Chi phí vận hành là mức cố định mỗi ngày. Khoản chưa đủ quỹ được lưu theo thứ tự phát sinh, trả nguyên khoản khi đủ tiền. Chốt lương trước chi vận hành cùng ngày.
- `company.finance.report(period, index)` báo cáo vốn góp, doanh thu, chi và lợi nhuận theo dòng tiền thực ghi vào sổ. Kỳ bắt đầu từ 1, tuần dài 7 ngày, tháng dài 30 ngày. Khoản nợ nằm trong `business.unpaid` cho tới ngày trả. Trên giao diện có thể chọn kỳ hiện tại hoặc kỳ trước.
- IndexedDB ghi toàn bộ snapshot công ty, AI và thế giới trong một giao dịch có kiểm tra revision. Save V0.2 thiếu trường business được khởi tạo trống. Bút toán cũ vẫn tính vào số dư, được đếm ở mục chưa có ngày mô phỏng. Không suy ngày game từ ngày thực và không tính lương hồi tố trước khi nâng cấp. Reset dùng lại quy trình xóa slot của game.

## Kiểm thử

Commit mã nguồn `4d890750c3f2ec149e176a4e887c90157282f266`. Môi trường Linux, Node.js 24.22.3, npm 11.19.1.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm ci --fetch-retries=0 --no-audit` | Cài 157 gói theo lockfile. |
| `npm run typecheck` | Đạt. |
| `npm run build` | Đạt. Vite cảnh báo chunk Three.js khoảng 688 kB trước gzip. |
| `npm run test:backend` | 34/34 đạt, gồm 5 bài mới cho Business Engine. |
| `npm run test:e2e -- --workers=1` | 7/7 đạt trong 1,6 phút trên bản production, dùng cấu hình Playwright của repository. |

Backend kiểm tra phân công theo kỹ năng và tải việc, nghỉ phép rồi quay lại, từ chối và hết hạn, bàn giao nhiều phòng, ghi thu một lần sau restore, nợ lương, chi vận hành, báo cáo theo kỳ, nhiệm vụ định kỳ và IndexedDB V0.2 → V0.3 → reset. Playwright kiểm tra luồng CEO từ tạo khách hàng tới báo cáo doanh thu sau khi hoàn tất nhiệm vụ, cùng sáu bài hồi quy.

Lượt Playwright đầu thiếu browser binary. Máy chủ tải Chromium 159 của Playwright trả HTTP 403. Lượt cuối đặt `PLAYWRIGHT_BROWSERS_PATH` trỏ tới cache thử nghiệm chứa Chromium headless 158.0.8127.0 từ gói npm cài riêng.
