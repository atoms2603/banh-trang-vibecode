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

Két nhận tiền ngay khi giao món. Khi chốt ngày, game trừ phí vận hành, lương nếu có và thuế 3% doanh thu. Báo cáo ghi tiền nhập hàng khi mua và giá vốn khi sử dụng hoặc hủy. Danh tiếng từ đánh giá giúp tiệm mở khóa món và dụng cụ khi bước sang ngày mới.

Ngày đầu, game tô sáng từng thao tác cho đến khi bạn giao phần bánh đầu tiên. Đồng hồ và thanh kiên nhẫn tạm dừng trong phần thực hành. Sau đó, giờ đóng cửa dự kiến hiển thị trên quầy và bạn có thể bấm **Kết thúc sớm** để chốt sổ ngay.
