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

## Icon trình duyệt và shortcut

Biểu tượng là gánh bánh tráng hai thúng tre với dù sọc hồng kem, cùng kiểu minh họa với gánh trong game.

Favicon nằm trong `public/favicon.ico` và các PNG 16/32 px. `public/apple-touch-icon.png` (180 px) dùng cho màn hình chính iPhone/iPad. `public/site.webmanifest` khai báo tên tiệm, icon 192/512 px và bản maskable có lề an toàn cho Android. Icon PNG 1024 px để sử dụng lại nằm tại `public/icons/icon-1024.png`; ảnh gốc và prompt imagegen lưu trong `artwork/app-icon/`.

Để tạo shortcut, mở game bằng trình duyệt rồi chọn **Thêm vào màn hình chính / Cài đặt ứng dụng / Tạo lối tắt**, tùy thiết bị và trình duyệt. Các đường dẫn icon và manifest là đường dẫn tương đối để hoạt động cả khi host dưới thư mục GitHub Pages. Shortcut mở game từ web và vẫn cần kết nối để tải tài nguyên.

Nhạc nền dùng `sound/bgm/Cozy Game Groove.mp3`, phát lặp từ lúc mở trang và dùng chung nút bật/tắt âm thanh với hiệu ứng. Nếu trình duyệt chặn tự phát, nhạc bắt đầu khi người chơi chạm hoặc nhấn phím lần đầu. Chuyển sang tab khác sẽ tạm dừng nhạc; trở lại tiếp tục từ vị trí cũ, theo lựa chọn bật/tắt đã lưu.

Thau dùng đoạn đầu của hai mẫu `sound/sfx/paper-rice-mixed-1.mp3` và `paper-rice-mixed-2.mp3` để phản hồi theo nhịp đảo, cùng một tiếng báo nhẹ khi gia vị vừa rải đều.

Các mẫu SFX cần bổ sung hoặc thay thế cho thau:

| Tên mẫu | Âm thanh mong muốn |
| --- | --- |
| `rice-drop` | Sợi bánh khô chạm đáy thau, ngắn và nhẹ |
| `kumquat-squeeze` | Một tiếng bóp tắc và vài giọt nước, có thể ngắt theo tay |
| `shrimp-salt-sprinkle` | Hạt muối khô rơi lạo xạo, phân biệt rõ với tắc |
| `rice-fold` | 2–3 tiếng sột soạt ngắn của bánh lật, thay cho đoạn cắt từ tiếng trộn hiện tại |
| `seasoning-even` | Một tiếng xác nhận nhẹ khi gia vị đã rải đều, thay cho tiếng báo hiện tại |
| `bag-rustle` | Túi nilon sột soạt và đũa chạm nhẹ khi đóng bịch |
| `customer-taste` | Tiếng nếm ngắn khi khách nhận đủ đơn, nếu có mẫu phù hợp |

## Ca đầu tiên

Màn bán hàng dùng **Quầy gọn**: điện thoại dọc xếp khách, phiếu, thau và khay trên cùng một màn; quay ngang đưa khách/phiếu sang trái và khu chế biến sang phải. iPad/desktop có cảnh khách trải ngang, khay lớn và cấp/EXP/nhiệm vụ hiện trên thanh thông tin. iPad dọc đặt phiếu cạnh thau, khay bên dưới chiếm trọn chiều ngang. iPad ngang và desktop có thêm thanh gỗ liệt kê phiếu chờ. Xoay máy giữ nguyên đơn, thau và nhóm nguyên liệu đang chọn.

Cảnh khách cố định 160 px, khu thau 150 px trên iPad/desktop; điện thoại dùng cảnh tối đa 160 px, thau tối đa 140 px và thu gọn khi màn thấp. Không dồn phần chiều cao dư vào cảnh hoặc thau. Vùng phiếu giữ nguyên chiều cao cả khi trống; nội dung dài cuộn bên trong. Khay có chiều cao cố định theo từng kiểu màn hình, không kéo dài khi chưa có phiếu hoặc khi đổi món. Khách xếp sát nhau từ cạnh gánh. Khi hàng dài hơn khung, vuốt ngang hoặc bấm mũi tên để xem hết hàng; gánh, khách và nền vỉa hè cuộn cùng nhau.

Chuyển tab **Nêm / Topping** để lấy đồ. Mỗi trang có tối đa 8 khay; nút `1/2 →` chuyển trang khi mở khóa nhiều topping. Chấm bên tab/trang báo còn nguyên liệu cần dùng. Khay đủ khẩu phần tắt viền và hình tương ứng trên phiếu được đánh dấu. Khi làm xong, bấm **Đóng bịch + đũa**; số bộ gói còn lại hiển thị ngay trên nút. Game chỉ dùng bịch nilon, mỗi phần trừ một bộ gói. Bản lưu cũ đã dùng hộp giấy tự đổi thành bịch và giữ nguyên phần đã đóng gói, không trừ kho lần nữa.

Bấm **Chi tiết** trên phiếu để xem toàn bộ nguyên liệu, số bịch, mức cay và yêu cầu đặc biệt. Bảng mở từ dưới khi dọc, từ bên phải khi ngang; đồng hồ, kiên nhẫn và trộn cùng tạm dừng khi bảng mở. Menu ở góc trên có EXP, nhiệm vụ, đánh giá, âm thanh và kết thúc sớm. Ở màn hình rộng, cấp, thanh EXP và hai nhiệm vụ còn hiện trực tiếp trên thanh thông tin. Màn hình rất thấp chỉ cuộn vùng khay; nút chính vẫn ở trong khung. Thanh địa chỉ trình duyệt và vùng tai thỏ được tính vào chiều cao hiển thị.

Nhập bánh tráng, muối tôm, tắc và bộ đóng gói. Sang **Menu hôm nay** để chỉnh giá hoặc đổi món. Kéo bánh vào lòng thau, rê gia vị qua nhiều chỗ rồi thả, sau đó kéo trên thau để đảo từ chỗ đậm sang chỗ nhạt. Nếu phiếu ghi **Nhiều bánh**, **Nhiều chua**, **Nhiều muối** hoặc **Nhiều cay**, mở **Chi tiết** để xem số phần mỗi bịch. Sa tế là gia vị kéo trực tiếp, với hai phần cho lời dặn **Nhiều cay**. Cho đậu phộng và hành phi sau cùng để giữ giòn. Mỗi ca mới kéo dài tối đa **1 phút 45 giây** (105 giây).

Ở thau, có thể dùng Enter để lấy phần đang chọn, phím mũi tên để rải quanh thau, Enter để thả và Escape để hủy. Khi không cầm nguyên liệu, phím mũi tên dùng để đảo. Sau khi giao, mở **Đánh giá → Xem lại phiếu** để đối chiếu yêu cầu và kết quả từng bịch.

Két nhận tiền ngay khi giao từng bịch. Khi chốt ngày, game trừ phí vận hành, lương nếu có và thuế 3% tổng thu nhập (bán món + tip/thưởng). Báo cáo tách hai nguồn thu, ghi tiền nhập hàng khi mua và giá vốn khi sử dụng hoặc hủy. Đơn nhiều bịch chỉ tính một đơn hoàn thành và một đánh giá khi khách nhận đủ.

Ngày đầu, game tô sáng từng thao tác cho đến khi bạn giao phần bánh đầu tiên. Đồng hồ và thanh kiên nhẫn tạm dừng trong phần thực hành. Sau đó, giờ đóng cửa dự kiến hiển thị trên quầy và bạn có thể mở menu rồi bấm **Kết thúc sớm** để chốt sổ ngay.

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

Hàng chờ có thể có đến 7 khách, mỗi nhân vật xuất hiện một lần. Lượt đáng nhớ có chỗ riêng trong hàng. Nếu mất nguyên liệu, game thử chuyển sang truyện khác hoặc đơn hai bịch; nếu vẫn không thể phục vụ trước giây 85, bỏ lượt ghé mà không phạt. Kho phải đủ toàn bộ số bịch, kể cả yêu cầu thêm xoài.

Các ô nhiệm vụ trong Menu ca bán theo dõi số đơn và chất lượng. Ngày 1 cần 5 đơn và 2 đơn 5 sao. Từ ngày 2, chỉ tiêu số đơn theo cấp là 6/7/8/9; chất lượng luân phiên 2 đơn 5 sao, 3 đơn từ 3 sao còn ít nhất nửa kiên nhẫn, hoặc 3 đơn từ 4 sao. Bấm để xem điều kiện và thưởng. Thưởng tự cộng ngay, chỉ một lần. EXP đến từ đánh giá tốt và phần thưởng; các mốc 40, 120, 240 EXP mở cấp vào ngày kế tiếp. Tổng kết có số đơn đủ, số bịch đã bán, nhiệm vụ và EXP kiếm được; tuần là các kỳ 7 ngày trong game.

## Bản lưu và cân bằng

Bản lưu phiên bản **9** lưu độ phủ gia vị, vị trí topping và kết quả từng bịch đã giao. Ca từ bản thử có thau muối tắc sẽ dùng thau mới cho toàn bộ món ngay khi mở lại, giữ nguyên nguyên liệu đã cho. Ca vẫn dùng nút trộn kiểu cũ sẽ chuyển sang thau mới ở ca sau. Báo cáo và lời đánh giá đã lưu giữ nguyên nội dung.

Giữ nguyên giá vốn, giá bán mặc định, kiên nhẫn (70 giây +18 giây/bịch thêm), thời gian trộn, phí vận hành 15/25/35/50 nghìn, lương 20 nghìn/ngày, hao hụt 30% nguyên liệu tươi (làm tròn xuống) và thuế 3%. Ca ngắn hoặc kết thúc sớm vẫn chịu đầy đủ chi phí ngày.

Chỉnh nhịp khách, cảnh báo, xác suất, mục tiêu, thưởng và lời thoại trong `src/data.ts` (`shiftPolicies`, `shiftRhythm`, `legacyShiftRhythm`, `engagementRules`, `specialChallenges`, `regularStories`). Luật tiến độ/thưởng nằm ở `src/engagement.ts`; tài chính ở `src/economy.ts`; nâng bản lưu ở `src/storage.ts`.

`pnpm test` kiểm tra nhịp ca ở từng ranh giới, hàng đầy/hết kho, truyện qua nhiều ngày, thử thách thành công/thất bại, nhiệm vụ và đơn nhiều bịch, tải lại, lên cấp và đối chiếu két với lợi nhuận. Bản build phục vụ hoàn toàn cục bộ; chỉ push/xuất bản khi có yêu cầu.
