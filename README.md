# Tiệm Bánh Tráng Trộn Nhỏ

Game quản lý xe bánh tráng vỉa hè, viết bằng TypeScript, HTML, CSS và SVG nội tuyến. Game và font được phục vụ từ máy của bạn. Tiến trình tự lưu trong trình duyệt.

## Mở bản đã build

Nếu vừa clone dự án, cài dependency và chạy lệnh build từ thư mục dự án.

```sh
pnpm install --frozen-lockfile
pnpm build
```

Phục vụ bản tĩnh qua HTTP bằng Vite hoặc Python.

```sh
pnpm preview --host 127.0.0.1 --port 4173
# Hoặc
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Mở [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Dùng lại cùng địa chỉ và cổng khi muốn chơi tiếp bản lưu cũ.

## Phát triển

Cần Node.js 24 và pnpm. Cài dependency một lần rồi mở máy chủ Vite:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`dist/` chứa bản tĩnh để phục vụ qua HTTP. Font Nunito và Quicksand dùng giấy phép OFL trong `public/licenses/`.

## Ca đầu tiên

Nhập bánh tráng, muối tôm, tắc và bộ đóng gói. Sang **Menu hôm nay** để chỉnh giá hoặc đổi món. Khi mở cửa, chọn khách rồi bấm hoặc kéo nguyên liệu vào thau. Với món muối tắc, thêm bánh tráng, tắc và muối tôm. Bấm **Trộn đều tay** đến 100%, bấm **Trộn nhẹ**, chọn bịch và **Giao món**. Mỗi ca mới kéo dài tối đa **1 phút 45 giây** (105 giây).

Két nhận tiền ngay khi giao từng bịch. Khi chốt ngày, game trừ phí vận hành, lương nếu có và thuế 3% tổng thu nhập (bán món + tip/thưởng). Báo cáo tách hai nguồn thu, ghi tiền nhập hàng khi mua và giá vốn khi sử dụng hoặc hủy. Đơn nhiều bịch chỉ tính một đơn hoàn thành và một đánh giá khi khách nhận đủ.

Ngày đầu, game tô sáng từng thao tác cho đến khi bạn giao phần bánh đầu tiên. Đồng hồ và thanh kiên nhẫn tạm dừng trong phần thực hành. Sau đó, giờ đóng cửa dự kiến hiển thị trên quầy và bạn có thể bấm **Kết thúc sớm** để chốt sổ ngay.

## Nhịp ca, khách quen và nhiệm vụ

Từ ngày 2, ca có nhịp như sau (theo thời gian thực đã chơi):

| Giây | Nhịp khách |
| --- | --- |
| 0–10 | Khởi động, khoảng cách khách ×1,3 |
| 10–30 | Bình thường |
| 30–45 | Tan học, khoảng cách khách ×0,6 |
| 45–55 | Nghỉ đón khách mới, làm nốt đơn |
| 55–85 | Bình thường, có lượt khách đáng nhớ |
| 85–105 | Ngừng đón khách mới, hoàn thành hàng chờ |

Khách đầu đến sau 0,9 giây. Từ giây 85, giao hết hàng chờ sẽ tự chốt ngày ở lần cập nhật kế tiếp; nếu còn khách thì ca vẫn kết thúc ở giây 105. Không giới hạn tổng số khách trong ca. Ngày 1 giữ nhịp nhẹ đến giây 85, không có cao điểm hoặc khách mời.

Khu trạng thái chỉ hiện chuông và đếm ngược trong 15 giây trước cao điểm, rồi tự ẩn khi tăng tốc. Mở bảng hướng dẫn, nhiệm vụ, đánh giá, về trang chính hoặc ẩn tab đều tạm dừng đồng hồ và kiên nhẫn.

Bé Mây, Anh Tín và Cô Sáu có ba lần ghé gắn với câu chuyện riêng, bắt đầu từ ngày 2. Mỗi người tiến triển tối đa một đoạn mỗi ngày khi nhận đủ đơn; đánh giá từ 4 sao có thưởng thêm. Khách bỏ về sẽ thử lại đoạn đó vào ngày sau. Chọn khách để đọc lời chào trong bong bóng.

Mỗi ca từ ngày 2 lên lịch một lượt đáng nhớ ở giây 60, báo ngôi sao từ giây 50. Từ ngày 3 có 35% cơ hội chọn Bảo Ngọc nếu món, kho và giá phù hợp; thử thách là phần bánh 5 sao hoặc topping giòn. Nếu không có thử thách, game luân phiên chọn một truyện khách quen chưa xong; khi không có truyện phù hợp thì chọn khách mua hai bịch. Chỉ lượt đã lên lịch được gắn tiến trình truyện trong ca mới. Nhân vật đó được dành riêng khỏi các lượt khách thường.

Hàng đầy thì lượt đáng nhớ chờ chỗ trống trước giây 85. Nếu mất nguyên liệu, game thử chuyển sang truyện khác hoặc đơn hai bịch; nếu vẫn không thể phục vụ, bỏ lượt ghé mà không phạt. Kho phải đủ toàn bộ số bịch, kể cả yêu cầu thêm xoài.

Hai ô nhiệm vụ cạnh trạng thái ca theo dõi số đơn và chất lượng. Ngày 1 cần 5 đơn và 2 đơn 5 sao. Từ ngày 2, chỉ tiêu số đơn theo cấp là 6/7/8/9; chất lượng luân phiên 2 đơn 5 sao, 3 đơn từ 3 sao còn ít nhất nửa kiên nhẫn, hoặc 3 đơn từ 4 sao. Bấm để xem điều kiện và thưởng. Thưởng tự cộng ngay, chỉ một lần. EXP dùng chung điểm danh tiếng từ đánh giá và phản hồi; các mốc 40, 120, 240 EXP mở cấp vào ngày kế tiếp. Tổng kết có số đơn đủ, số bịch đã bán, nhiệm vụ và EXP kiếm được; tuần là các kỳ 7 ngày trong game.

## Bản lưu và cân bằng

Bản lưu phiên bản **7** lưu chính sách ngày (`short-105` hoặc `legacy-240`), đơn giao dở, thau đang trộn, tiến trình khách quen, nhiệm vụ, lịch ghé và cờ đã thưởng. Bản v1–6 đang bán tiếp tục ca 240 giây đến hết ngày, giữ thời gian đã chơi kể cả khi vượt 105 giây. Ngày kế tiếp chuyển sang ca mới. Bản cũ ở màn chuẩn bị dùng ngay luật 105 giây và chỉ tiêu mới. Báo cáo đã chốt giữ nguyên số liệu; tải lại không cộng thưởng hoặc trừ phí lần nữa.

Giữ nguyên giá vốn, giá bán mặc định, kiên nhẫn (70 giây +18 giây/bịch thêm), thời gian trộn, phí vận hành 15/25/35/50 nghìn, lương 20 nghìn/ngày, hao hụt 30% nguyên liệu tươi (làm tròn xuống) và thuế 3%. Ca ngắn hoặc kết thúc sớm vẫn chịu đầy đủ chi phí ngày.

Chỉnh nhịp khách, cảnh báo, xác suất, mục tiêu, thưởng và lời thoại trong `src/data.ts` (`shiftPolicies`, `shiftRhythm`, `legacyShiftRhythm`, `engagementRules`, `specialChallenges`, `regularStories`). Luật tiến độ/thưởng nằm ở `src/engagement.ts`; tài chính ở `src/economy.ts`; nâng bản lưu ở `src/storage.ts`.

`pnpm test` kiểm tra nhịp ca ở từng ranh giới, hàng đầy/hết kho, truyện qua nhiều ngày, thử thách thành công/thất bại, nhiệm vụ và đơn nhiều bịch, tải lại, lên cấp và đối chiếu két với lợi nhuận. Bản build phục vụ hoàn toàn cục bộ; chỉ push/xuất bản khi có yêu cầu.
