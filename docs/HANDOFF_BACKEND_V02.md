# AI Company World 3D — Sprint 02 Backend và QA

Nhánh `feature/backend-v02` xuất phát từ `feature/ai-brain` tại commit `be036d34ca1c533f36c9be2fa461b5d7ea296b94`. Sprint giữ cơ chế đăng ký `LocalBrain`, `AgentMemory` và `AgentRelationships` ở `registerLocalAI.ts`. Phần hiển thị và định tuyến 3D vẫn do Gemini quản lý.

## Hoàn thành

| Hạng mục | Hành vi |
| --- | --- |
| Lưu tiến trình AI | Game ghi trí nhớ, quan hệ, phiên hội thoại và họp đang diễn ra, lịch sử năng suất trong cùng giao dịch IndexedDB với dữ liệu công ty và thế giới. Bộ nhớ giới hạn 100 bản ghi mỗi nhân viên và giữ ID khi tải lại. |
| Tải save và reset | Giữ khóa lưu và cơ chế revision. Bản lưu V0.1 không có phần AI được nạp với lịch sử AI rỗng. Reset thành công xóa trí nhớ, quan hệ, phiên hoạt động và báo cáo trong bộ nhớ, đồng thời ghi dấu ô lưu đã xóa để tab cũ không ghi đè. |
| Họp liên phòng ban | Từ 08:45 đến trước 11:00 theo giờ trong game, bộ điều phối tìm dự án có nhiệm vụ còn mở ở ít nhất hai phòng ban. Mỗi phòng cử tối đa một nhân viên đủ điều kiện. Nhân viên dùng waypoint phòng họp hiện có. Sau thời gian đợi tối đa 35 phút mô phỏng, cuộc họp cần ít nhất hai người có mặt và kéo dài 8 phút mô phỏng. |
| Phối hợp nhiệm vụ | Khi họp kết thúc, cộng 5 điểm tiến độ cho mỗi nhiệm vụ gắn với người có mặt nếu vẫn đủ điều kiện và do người đó phụ trách. Nhiệm vụ đạt 100% được ghi hoàn thành một lần. KPI đọc tiến độ từ Task Manager. Sổ tài chính chỉ thay đổi qua bút toán vốn, doanh thu và chi phí. |
| Hội thoại hai chiều | Bộ mô phỏng kiểm tra người nhận tồn tại, ở gần, sẵn sàng và chưa tham gia hoạt động khác. Hai người cùng vào trạng thái `Talking`, luân phiên nói và đáp. Khi kết thúc, cả hai nhận bản ghi ký ức và quan hệ cùng được cập nhật. |
| Năng suất | Báo cáo theo ngày và tuần mô phỏng gồm tổng người-phút trong trạng thái `Working`, điểm năng suất trung bình theo thời lượng làm việc, số việc hoàn thành qua mô phỏng, và số cuộc họp, hội thoại kết thúc. Tuần 1 là ngày 1–7. |

Họp thủ công qua API backend đánh dấu ngày đã có lịch họp để lịch tự động tránh lên thêm cuộc họp trong ngày đó. Bộ điều phối giữ trạng thái của người đang tham gia cho tới khi hoạt động kết thúc hoặc hủy. Lệnh điều khiển riêng được bỏ qua trong khoảng này.

## Điểm tích hợp

```ts
const game = useGameStore.getState();

game.scheduleMeeting('world-v01'); // true nếu đã quy tụ được đủ phòng ban
const activity = game.coordination.snapshot();
const dayReport = game.coordination.productivity.daily(game.day);
const weekReport = game.coordination.productivity.weekly(Math.ceil(game.day / 7));
```

Game dùng `ITaskManager` hiện có. Thay adapter ngoài qua `registerAISystems` cần triển khai `importAll/exportAll` cho quan hệ nếu muốn lưu hoặc reset quan hệ qua IndexedDB. Họp theo dự án sử dụng Task Manager nội bộ có `projectId`. Đọc lại `coordination` từ store sau hydrate/reset vì mỗi lần khôi phục tạo một phiên riêng.

Hội thoại sử dụng lời đáp theo quy tắc cục bộ. Sprint cung cấp dữ liệu báo cáo và điều phối qua store để nối vào giao diện quản trị sau. Báo cáo tính hoạt động ghi nhận từ Sprint 02, và lịch sử trước khi nâng cấp bắt đầu trống. Đồng bộ Supabase cho trạng thái AI nằm ngoài sprint này.

## Lỗi phát hiện và xử lý

- Import trí nhớ cũ làm đổi ID. Bản mới giữ ID và cấp ID kế tiếp dựa trên lịch sử đã tải.
- Hội thoại từng ghi tương tác ngay từ lời mời và chỉ lưu ký ức một phía. Bản mới chỉ ghi lịch sử sau khi hai người đã hoàn tất lượt nói.
- Khi một tick đi qua mốc trả lời, lời đáp mới có thể bị trừ thời lượng của tick vừa qua. Bản mới giảm bộ đếm lời thoại cũ trước khi cập nhật hoạt động.
- Cuộc họp thiếu người có thể bị lên lịch lại ngay trong khoảng tự động. Bản mới lưu ngày đã mở họp, kể cả khi cuộc họp không đủ người.
- Vòng lặp cũ chỉ trừ một ngày khi vượt nửa đêm. Bản mới tính ngày bằng trục thời gian mô phỏng và tách người-phút qua ranh giới ngày.

## Kết quả kiểm thử thực tế

Môi trường Linux, Node.js 24.22.3, Vite 6.4.6, Chromium 158.0.8127.0 và SwiftShader.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck` | Đạt |
| `npm run build` | Đạt, Vite cảnh báo chunk Three.js khoảng 688 kB trước gzip |
| `npm run test:backend` | 23/23 đạt |
| Playwright Chromium | 3/3 đạt |

Backend test bao gồm các kiểm tra task, KPI và tài chính V0.1, cũng như tương thích save Gemini và V0.1 có dữ liệu công ty, tiếp tục hội thoại và họp từ bản lưu, báo cáo qua nửa đêm, xung đột revision và reset trong lúc có cuộc họp. Playwright chạy smoke test Gemini, lưu tiến trình backend, và kiểm tra tải lại ký ức/quan hệ qua IndexedDB trước khi reset bằng HUD.

Playwright dùng Chromium cài riêng và bản sao cục bộ của dữ liệu font Troika `v1.0.1` để tránh phụ thuộc CDN trong QA. Việc trỏ font qua loopback chỉ áp dụng cho đầu ra build tạm dùng trong lượt kiểm thử. Chưa chạy trên Windows hoặc kiểm tra Supabase thật.

```sh
npm ci
npm run typecheck
npm run build
npm run test:backend
npx playwright install chromium
npm run test:e2e
```
