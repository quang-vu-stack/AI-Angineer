# Corporate Management Engine V0.4

Nhánh `feature/corporate-engine-v04` phát triển từ `feature/ai-brain-v04` tại `4238d73ef12a4fca2c85ff9959b6763a57c59d98`. Mở **Quản trị công ty → Điều hành CEO** để dùng các chức năng mới.

## Cổ phần và HĐQT

Sổ cổ đông bắt đầu trống. CEO đăng ký cổ đông, nhập số lượng và giá mua, xem tỷ lệ trước/sau của từng người, rồi xác nhận phát hành. Số cổ phần và giá phát hành là số nguyên dương. Tiền thu được ghi vào vốn góp trong sổ cái. Vốn góp thủ công của save cũ vẫn thuộc số dư và không tự sinh cổ phần.

Mỗi cổ phần phổ thông có một phiếu. CEO bổ nhiệm hoặc miễn nhiệm cổ đông có cổ phần vào HĐQT. Mỗi đề xuất chốt danh sách thành viên và số phiếu ngay lúc mở. Thành viên bỏ phiếu một lần. Đề xuất cần hơn một nửa tổng số phiếu đã chốt để thông qua, hòa bị bác. Khi thông qua, hệ thống áp dụng chiến lược phân công kỹ năng hoặc tải việc của Business Engine. Đây là mô phỏng một người chơi, CEO thao tác phiếu của từng thành viên trên dashboard.

## Kế toán và định giá

| Chỉ tiêu | Cách tính trong game |
| --- | --- |
| Tài sản | Số dư tiền mặt trong sổ cái. Mô hình hiện tại chỉ ghi nhận tài sản tiền mặt. |
| Công nợ | Tổng lương và chi phí vận hành đến hạn trong hàng đợi thanh toán của Business Engine. |
| Lợi nhuận vận hành đã thu, chi | Doanh thu trừ chi phí đã thanh toán. |
| Định giá vốn chủ theo tài sản ròng | Giá trị lớn hơn giữa 0 và tài sản trừ công nợ. Giá trị một cổ phần bằng định giá chia tổng cổ phần đã phát hành. Khi mẫu số bằng 0, dashboard hiển thị “Chưa phát hành”. |
| Lợi nhuận có thể chia | Giá trị nhỏ hơn giữa tiền mặt sau dự phòng nợ và lợi nhuận vận hành sau trừ nợ, trừ cổ tức đã trả, với mức sàn 0. |
| Dòng tiền ròng ngày | Vốn góp + doanh thu − chi vận hành − cổ tức trong ngày mô phỏng. |

Cổ tức ghi thành một dòng chi phân phối riêng trong sổ cái. Sổ cổ tức lưu số VNĐ của từng cổ đông tại thời điểm chia. Phép chia dùng số nguyên lớn và phân bổ từng đồng còn dư theo phần lẻ lớn nhất, hòa thì theo ID. Tổng các khoản nhận bằng đúng khoản chi. Mỗi lần phát hành hoặc chia dùng một ID giao dịch ổn định từ bước xem trước đến xác nhận. Ghi sổ kiểm tra số dư, giới hạn số nguyên và ID trùng trước khi cập nhật sổ cổ đông. Bên tích hợp phải tái sử dụng ID của cùng một lệnh khi thử lại.

## Nghề nghiệp và tuyển dụng

- Báo cáo nhân viên lấy nhiệm vụ trực tiếp từ TaskManager và gọi `careerProfile` trong `src/ai/careerPolicy.ts` để đọc XP và điều kiện đề nghị. Dashboard hiển thị số nhiệm vụ hoàn thành, được giao, bị chặn, XP, bậc chính thức và lương.
- Khi save chưa có hồ sơ, bậc quản trị mặc định là `junior`, chức vụ hiện có được giữ nguyên. CEO duyệt để ghi nhận bậc tương ứng với mốc XP hiện tại. Từ chối sẽ ẩn đề xuất ở mốc đó. Lương chỉ đổi khi CEO cập nhật chính sách chung hoặc lương riêng.
- Đào tạo tạo nhiệm vụ ưu tiên thấp cho nhân viên đang hoạt động trong dự án đào tạo nội bộ. Tiến độ và XP đến từ việc hoàn tất nhiệm vụ thực.
- Lương chốt cuối ngày theo tổng lương cá nhân của nhân viên hoạt động. Nhân viên chưa đặt mức riêng dùng chính sách chung V0.3. Mức riêng bằng 0 là hợp lệ. Chọn “Dùng lương chung” để bỏ mức riêng.
- Tuyển dụng đi từ tiếp nhận hồ sơ tới phỏng vấn, sau đó vào kế hoạch hoặc bị loại. Ứng viên không tạo nhân vật, bàn làm việc hay tăng biên chế 20 người.

## Lưu trữ và tích hợp

`company.corporate` cung cấp lệnh giao dịch, biểu quyết, đào tạo, xét duyệt và tuyển dụng. Sau thao tác từ UI, gọi `notifyCompanyChange()` như BusinessPanel hiện tại. Dữ liệu nằm trong `company.corporate` của snapshot IndexedDB cùng nhiệm vụ, AI và sổ cái, dùng chung cơ chế kiểm tra revision. Khi đọc, hệ thống đối chiếu lịch sử phát hành và chia cổ tức với thứ tự ghi sổ, kiểm tra tham chiếu và trạng thái biểu quyết. Save V0.2/V0.3 thiếu phân hệ mới được mở với sổ cổ đông trống. Reset xóa cả dữ liệu quản trị và khôi phục danh sách nhân viên ban đầu.

## Kết quả QA

Chạy trên Linux, Node.js 24.22.3, npm 11.19.1. Playwright dùng cấu hình repository và Chromium headless 158.0.8127.0 cài riêng qua npm, trỏ cache bằng `PLAYWRIGHT_BROWSERS_PATH`.

| Lệnh | Kết quả thực tế |
| --- | --- |
| `npm ci --no-audit` | Cài 157 gói từ lockfile. |
| `npm run typecheck` | Đạt. |
| `npm run build` | Đạt. Vite cảnh báo chunk Three.js khoảng 688 kB trước gzip. |
| `npm run test:backend` | 45/45 đạt, gồm 6 bài mới cho Corporate Engine. |
| `npm run test:e2e -- --workers=1` | 8/8 đạt trong 1,6 phút trên production build. |

Bài mới bao phủ pha loãng, làm tròn cổ tức, giao dịch trùng sau restore, lợi nhuận và số dư không đủ, tỷ lệ biểu quyết sau phát hành, hòa phiếu, lương riêng, thăng chức cần CEO, ứng viên nằm ngoài biên chế, migration V0.2/V0.3 qua IndexedDB và reset. Playwright đi qua quy trình CEO xem trước pha loãng, phát hành, bổ nhiệm HĐQT và biểu quyết, cùng bảy bài hồi quy.
