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

Nhập bánh tráng, muối tôm, tắc và bộ đóng gói. Sang **Menu hôm nay** để chỉnh giá hoặc đổi món. Khi mở cửa, chọn khách rồi bấm hoặc kéo nguyên liệu vào thau. Với món muối tắc, thêm bánh tráng, tắc và muối tôm. Bấm **Trộn đều tay** đến 100%, bấm **Trộn nhẹ**, chọn bịch và **Giao món**. Mỗi ca kéo dài bốn phút.

Két nhận tiền ngay khi giao từng bịch. Khi chốt ngày, game trừ phí vận hành, lương nếu có và thuế 3% tổng thu nhập (bán món + tip/thưởng). Báo cáo tách hai nguồn thu, ghi tiền nhập hàng khi mua và giá vốn khi sử dụng hoặc hủy. Đơn nhiều bịch chỉ tính một đơn hoàn thành và một đánh giá khi khách nhận đủ.

Ngày đầu, game tô sáng từng thao tác cho đến khi bạn giao phần bánh đầu tiên. Đồng hồ và thanh kiên nhẫn tạm dừng trong phần thực hành. Sau đó, giờ đóng cửa dự kiến hiển thị trên quầy và bạn có thể bấm **Kết thúc sớm** để chốt sổ ngay.

## Nhịp ca, khách quen và nhiệm vụ

Từ ngày 2, ca lần lượt khởi động, đón khách đều, cao điểm tan học (giây 90–110), thưa khách và lượt cuối. Sau giây 180, tiệm chỉ hoàn thành hàng chờ đến giây 240. Khu trạng thái chỉ hiện chuông và đếm ngược trong 15 giây trước cao điểm, rồi tự ẩn khi tăng tốc. Mở bảng hướng dẫn, nhiệm vụ, đánh giá, về trang chính hoặc ẩn tab đều tạm dừng đồng hồ và kiên nhẫn.

Bé Mây, Anh Tín và Cô Sáu có ba lần ghé gắn với câu chuyện riêng, bắt đầu từ ngày 2. Mỗi người tiến triển tối đa một đoạn mỗi ngày khi nhận đủ đơn; đánh giá từ 4 sao có thưởng thêm. Khách bỏ về sẽ thử lại đoạn đó vào ngày sau. Chọn khách để đọc lời chào trong bong bóng.

Từ ngày 3, có 35% cơ hội Bảo Ngọc ghé thử thách ở giây 160–180. Lịch được chốt lúc mở cửa; ngôi sao báo trước 10 giây. Xem yêu cầu trên phiếu: phần bánh 5 sao hoặc topping giòn. Hàng đầy sẽ chờ chỗ trống đến hết giây 180.

Hai ô nhiệm vụ cạnh trạng thái ca theo dõi số đơn và chất lượng. Bấm để xem điều kiện và thưởng. Thưởng tự cộng ngay, chỉ một lần. EXP dùng chung điểm danh tiếng từ đánh giá và phản hồi; các mốc 40, 120, 240 EXP mở cấp vào ngày kế tiếp. Tổng kết có số đơn đủ, số bịch đã bán, nhiệm vụ và EXP kiếm được; tuần là các kỳ 7 ngày trong game.

## Bản lưu và cân bằng

Bản lưu phiên bản 6 giữ cả đơn giao dở, tiến trình khách quen, nhiệm vụ, lịch thử thách và cờ đã thưởng. Bản cũ đang bán tiếp tục luật cũ đến hết ngày; các tính năng mới bắt đầu ngày kế tiếp. Bản cũ đang chuẩn bị được tạo nhiệm vụ ngay khi tiếp tục. Phần thưởng mới trong thống kê cũ khởi tạo bằng 0.

Chỉnh nhịp khách, cảnh báo, xác suất, mục tiêu, thưởng và lời thoại trong `src/data.ts` (`shiftRhythm`, `engagementRules`, `specialChallenges`, `regularStories`). Luật tiến độ/thưởng nằm ở `src/engagement.ts`; tài chính ở `src/economy.ts`; nâng bản lưu ở `src/storage.ts`.

`pnpm test` kiểm tra nhịp ca ở từng ranh giới, hàng đầy/hết kho, truyện qua nhiều ngày, thử thách thành công/thất bại, nhiệm vụ và đơn nhiều bịch, tải lại, lên cấp và đối chiếu két với lợi nhuận. Bản build phục vụ hoàn toàn cục bộ; chỉ push/xuất bản khi có yêu cầu.
