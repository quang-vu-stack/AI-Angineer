# Kết quả kiểm thử Backend V0.1

Phạm vi là bản game tích hợp trên nền Gemini `806e72e`. Môi trường chạy Linux, Node.js 24.22.3 và Chromium headless 158.0.8127.0 với SwiftShader.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm ci --no-audit --no-fund` | Cài thành công từ lockfile trong thư mục thử độc lập |
| `npm run typecheck` | Đạt |
| `npm run build` | Đạt. Vite cảnh báo chunk Three.js khoảng 688 kB trước gzip. |
| `npm run test:backend` | 12 đạt, 0 lỗi |
| Playwright Chromium | 2 đạt với tài nguyên chữ 3D phục vụ cục bộ trong môi trường QA |

Bộ Node kiểm tra roster và quyền phân công, tiến độ nhiệm vụ qua hợp đồng AI, KPI, giới hạn tiền VND, tiêu chuẩn snapshot, lưu một giao dịch, di trú save Gemini, ghi cạnh tranh, đặt lại giữa hai phiên và adapter Supabase qua HTTP mô phỏng.

Playwright chạy smoke test Gemini hiện có và bài kiểm tra mới đi qua HUD. Nhân vật `EMP-04` tăng tiến độ trong vòng lặp mô phỏng. Người thử nhấn nút lưu, kiểm tra snapshot trong IndexedDB, tải lại trang rồi xác nhận tiến độ và revision tiếp tục từ bản lưu.

Môi trường QA trả 403 khi Playwright tải Chromium mặc định và làm các tài nguyên URL CDN của Troika bị treo trong worker. Lượt chạy đạt sử dụng Chromium đã cài riêng và dữ liệu font đúng phiên bản `v1.0.1` từ upstream, phục vụ qua loopback bằng bản build tạm cho QA. Mã nguồn và cấu hình đồ họa trong Git giữ nguyên đường dẫn tài nguyên Gemini. Kết quả E2E chưa xác nhận tải CDN trên trình duyệt Windows.

Adapter Supabase chỉ qua test HTTP mô phỏng. SQL, RLS và phiên đăng nhập Supabase thật cần chạy trên staging.

## Lệnh chạy lại

```sh
npm ci
npm run typecheck
npm run test:backend
npm run build
npx playwright install chromium
npm run test:e2e
```
