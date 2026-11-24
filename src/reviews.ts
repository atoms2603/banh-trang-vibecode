import { extraNotes } from './coating.ts'
import { ingredients, profiles } from './data.ts'
import type { Customer, DepartureReason, Order, OrderIssue, Review } from './types.ts'

const reviewCopy = {
  saltPraise: {
    genZ: [
      'Chụp story chưa kịp, bịch bánh mất tích rồi.',
      'Tắc thơm tới mức cái bụng tự bấm theo dõi.',
      'Tui xin lỗi bịch bánh vì đã đánh giá thấp nó.',
      'Định ăn nửa bịch. Nửa còn lại tự biến mất.',
      'Muối tôm rải đều, sợi cuối cũng được đối xử tử tế.',
      'Bịch này mà vào nhóm chat là được ghim liền.',
      'Bánh dẻo, chua vừa. Tui gật đầu từ miếng đầu.',
      'Rủ bạn ăn ké là quyết định sai duy nhất hôm nay.',
      'Tắc với muối tôm phối hợp mượt ghê, ai làm đội trưởng vậy?',
      'Tới sợi cuối vẫn còn vị. Tiệm chơi đẹp đó.',
      'Ngon cỡ này mà để tui đi ngang bao lần mới biết?',
      'Lịch hôm nay có thêm mục quay lại mua bịch nữa.',
      'Cái đũa chưa kịp nghỉ là bịch hết trơn.',
      'Đúng kiểu chua vừa đủ để tay tự gắp thêm.',
      'Bịch này làm tui quên luôn đang định tiết kiệm.',
      'Định chia cho bạn. Kế hoạch đó đã bị hủy.',
      'Mùi tắc thơm ghê, mới mở bịch đã nghe bụng réo.',
      'Khúc muối tôm bám đều là khúc tui biết mình chọn đúng quán.',
      'Bánh dẻo mà từng sợi vẫn tách nhau. Có nghề nha.',
      'Tui đã gắp miếng cuối ba lần. Lần này hết thật.',
      'Nếm một sợi thôi mà miệng tự đòi tăng ca.',
      'Hết bánh rồi mà cái đũa vẫn chưa chịu tin.',
      'Tui tính để dành một góc. Giờ chỉ còn góc bịch.',
      'Vị tắc làm cái đơn ăn vặt này lên hạng hẳn.',
    ],
    neighbor: [
      'Bánh thấm vị, vừa miệng cô.', 'Tắc thơm quá, cô vừa mở bịch đã thèm.',
      'Cô tính chừa một nửa cho cháu. Chắc phải mua thêm bịch.',
      'Muối rải đều ghê, sợi nào cô gắp cũng vừa.',
      'Bánh mềm vừa tới, trộn khéo đó con.',
      'Cô thử một miếng rồi quên luôn đang để dành.',
      'Chua mặn có chừng mực, cô thích kiểu này.',
      'Vị này ăn xong còn nhớ, mai cô ghé nữa nghen.',
      'Cô định ăn cho vui miệng, cái bịch hết thiệt luôn.',
      'Con trộn đều tay, tới đáy bịch vẫn ngon.',
    ],
  },
  saltCustom: {
    genZ: [
      'Tiệm đọc ghi chú thiệt kìa, cảm động ngang.',
      'Đúng gu tui tới mức muốn lưu đơn này làm mặc định.',
      'Ghi chú được duyệt, cái bụng cũng duyệt.',
      'Dặn một câu mà tiệm nhớ thiệt. Tui nhớ quán luôn.',
      'Đúng y lời dặn. Tui khỏi mở phiếu ra đối chất.',
      'Cái gu hơi khó chiều của tui vừa được chiều.',
      'Phiếu ghi sao, bịch ra vậy. Quá uy tín.',
      'Một dòng ghi chú, một bịch hợp gu. Gọn đẹp.',
      'Tiệm hiểu ý tui nhanh hơn đứa bạn thân.',
      'Đơn này tui xin ghim để lần sau gọi y chang.',
      'Bịch đúng ý quá, tui cất luôn bài góp ý đã soạn.',
      'Tui dặn thêm cho vui miệng, ai dè ngon thiệt.',
      'Nếm cái biết tiệm có đọc phần chữ nhỏ.',
      'Gọi theo gu mình mà ra đúng gu mình. Nay hên dữ.',
      'Đúng lời dặn tới mức tui muốn đặt lại trước khi ăn hết.',
      'Đơn chỉnh riêng mà nêm vẫn vừa. Cho tiệm cái gật đầu.',
    ],
    neighbor: [
      'Đúng lời cô dặn, ngon đó con.', 'Tiệm nhớ lời cô dặn, cảm ơn nghen.',
      'Cô nhờ thêm một chút mà con canh vừa khéo.', 'Cô dặn sao được vậy, lần sau cứ làm y vậy nghen.',
      'Thêm đúng phần cô thích, mà vị vẫn đều tay.', 'Cô tưởng phải nhắc lại. Ai dè con nhớ rồi.',
      'Bịch này đúng khẩu vị cô, ghi sổ làm khách quen đi con.',
    ],
  },
  saltNoteMissed: {
    genZ: [
      'Hình như mình có dặn {ingredient}.', 'Ủa, phiếu ghi {ingredient} mà ta?',
      'Tui có dặn {ingredient}, chắc chữ hơi nhỏ.', 'Lời dặn {ingredient} đi lạc qua bịch nào rồi?',
      'Tui đặt {ingredient}, nhận bản tiêu chuẩn mất rồi.', 'Ghi chú {ingredient} chắc chưa tới tay cái thau.',
      'Tui chờ phần {ingredient} tới sợi cuối vẫn chưa thấy.', 'Bịch này quên mất kèo {ingredient} rồi tiệm ơi.',
    ],
    neighbor: ['Cô có dặn {ingredient} đó con.', 'Bịch này quên lời cô dặn {ingredient} rồi.', 'Lần sau nhớ {ingredient} cho cô nha.'],
  },
  saltMissing: {
    genZ: [
      'Thiếu {ingredient}, tui gắp tới đáy để kiểm chứng rồi.', 'Hình như {ingredient} chưa vào ca.',
      'Tui ăn hết vẫn đang chờ {ingredient} xuất hiện.', '{ingredient} có tên trên phiếu mà vắng mặt trong bịch.',
      'Tui tìm {ingredient} một hồi, chỉ tìm được đáy bịch.', 'Ủa, phần {ingredient} của tui đâu rồi?',
      'Bịch này thiếu {ingredient}, có ai thấy đi ngang không?', 'Cho {ingredient} lên hình lần sau giùm tui nha.',
    ],
    neighbor: ['Phần cô thiếu {ingredient}.', 'Cô ăn tới cuối vẫn thiếu {ingredient}.', 'Hình như con quên cho {ingredient}.'],
  },
  saltExtra: {
    genZ: [
      'Hơi dư {ingredient}, tiệm hào phóng sai chỗ rồi.', 'Tui gọi phần thường, {ingredient} lên hẳn bản XL.',
      '{ingredient} hơi nhiều, tiệm tính cho tui ăn bù hôm qua hả?', 'Mạnh tay với {ingredient} quá, tui nhận ra liền.',
      'Dư {ingredient} nha, phần thưởng bất ngờ này tui xin kiếu.', 'Bớt {ingredient} một nhịp là vừa, tiệm ơi.',
      'Phiếu ghi phần thường mà {ingredient} đi theo cả đội.', '{ingredient} nhiều quá, chia bớt cho đơn kế với.',
    ],
    neighbor: ['Hơi dư {ingredient}, lần sau bớt giùm cô.', 'Con cho {ingredient} hơi nhiều tay rồi.', 'Bớt chút {ingredient} là vừa miệng cô.'],
  },
  saltUneven: {
    genZ: [
      'Rải {ingredient} chưa đều, nửa bịch kia chưa được chia phần.', '{ingredient} tụ một góc, góc bên kia xin ý kiến.',
      'Miếng đậm, miếng nhạt. {ingredient} chia không công bằng nha.', 'Tui lắc bịch phụ tiệm vì {ingredient} dồn hết một chỗ.',
      '{ingredient} đứng chung một phe, mấy sợi bên kia bị bỏ rơi.', 'Đảo thêm cho {ingredient} đi thăm nửa bịch còn lại với.',
      'Chỗ có {ingredient} thì đậm, chỗ không có thì im re.', 'Tui gắp phải ổ {ingredient}, miếng kế lại nhạt ngang.',
    ],
    neighbor: ['{ingredient} còn dồn một chỗ đó con.', 'Đảo thêm cho {ingredient} thấm đều nghen.', 'Chỗ đậm chỗ nhạt, con rải {ingredient} đều tay hơn nha.'],
  },
  saltSlow: {
    genZ: ['Tui đợi tới lúc bạn nhắn ăn xong chưa.', 'Bánh tới hơi muộn, cái bụng đã họp khẩn.', 'Đợi một bịch mà kịp nghe hết bài nhạc.', 'Chờ hơi lâu, tui thuộc giá cả menu luôn rồi.', 'Tới lúc có bánh, tui đã chọn xong món lần sau.'],
    neighbor: ['Cô đợi hơi lâu đó con.', 'Tiệm làm nhanh chút nữa là cô vui.', 'Đợi thêm xíu là cô trễ buổi chợ rồi.'],
  },
  saltPrice: {
    genZ: ['Giá hơi căng, ví tui mất mood.', 'Tui nhớ giá rõ hơn nhớ vị tắc.', 'Giá này cái ví xin coi lại phiếu.', 'Một bịch bánh, một phút suy ngẫm về số dư.', 'Ăn vặt thôi mà ví tui đòi họp.'],
    neighbor: ['Giá hơi cao so với phần bánh, con ơi.', 'Bịch này hơi chát tiền đó con.', 'Cô mua thử một lần, giá này hơi khó ghé thường.'],
  },
  praise: {
    genZ: [
      'Định ăn một miếng cho biết. Biết xong thấy đáy bịch luôn.',
      'Bánh dẻo, vị tắc thơm. Tính chụp story mà tay nhanh hơn camera.',
      'Đặt một phần ăn chơi, chốt lại là mai ghé ăn thiệt.',
      'Mùi tắc tới trước, miếng bánh tới sau. Tui tới lại ngày mai.',
      'Đem về chia cả nhóm. Cả nhóm chưa kịp biết mình mua gì.',
      'Bánh thấm vị tới sợi cuối. Công nhận cái thau làm việc có tâm.',
      'Ăn xong đứng cân nhắc có nên quay lại mua bịch thứ hai liền không.',
      'Giờ tan học có thêm một lý do để đi đường vòng rồi nha.',
      'Topping có mặt đầy đủ, bịch bánh được điểm chuyên cần.',
      'Tui định kể bạn nghe vị thế nào mà ăn nhanh quá quên hết.',
      'Một bịch tưởng ít, tới lúc hết mới thấy đúng là ít.',
      'Hôm nay tui có chuyện vui, chính là bịch bánh này.',
      'Gắp thử một miếng rồi tự nhích ra xa đứa đòi ăn ké.',
      'Có đứa bảo mua một bịch chia đôi. Đứa đó chưa ăn thử.',
    ],
    neighbor: [
      'Bánh dẻo, thơm mùi tắc. Cô ăn một hồi hết bịch hồi nào không hay.',
      'Cô tính mua ăn chơi thôi, mai chắc ghé lấy thêm phần cho mấy đứa nhỏ.',
      'Trộn vừa miệng đó con. Lần sau cô đem hộp qua đựng cho tiện.',
    ],
  },
  budget: {
    genZ: [
      'Vừa miệng, vừa túi. Hiếm khi tui với cái ví đồng ý nhanh vậy.',
      'Giá học sinh mà bịch bánh có tâm. Cuối tháng vẫn chốt được kèo ăn vặt.',
      'Tưởng phải rủ hai đứa góp tiền. Ai ngờ mua xong còn dư tiền trà đá.',
      'Bánh ngon, giá làm tui bình tĩnh lại mỗi lần nhìn số dư.',
      'Ví duyệt, miệng duyệt. Chốt luôn bịch thứ hai.',
      'Giá mềm, bánh dẻo. Hai thứ mềm đúng chỗ.',
      'Định nhìn giá cho tỉnh. Nhìn xong đặt thêm.',
      'Ăn xong vẫn còn tiền gửi xe, tiệm được cộng điểm.',
    ],
    neighbor: [
      'Giá dễ chịu, bánh vừa miệng. Cô ghé mua thêm cho cháu được.',
      'Bịch bánh ngon mà giá mềm. Hôm nào đi chợ ngang cô ghé nữa.',
    ],
  },
  custom: {
    genZ: [
      'Dặn riêng có một câu mà tiệm nhớ thiệt. Tự nhiên thấy mình là khách ruột.',
      'Đúng y lời dặn luôn. Tui đọc lại phiếu đơn mà thấy được lắng nghe.',
      'Tiệm làm đúng cái mình dặn. Nhóm chat đã nhận địa chỉ.',
      'Đơn có chỉnh riêng vẫn làm chuẩn. Tui có thể yên tâm rủ đứa bạn khó tính tới rồi.',
      'Tui chỉnh đơn lắt nhắt vậy mà tiệm vẫn nhớ hết.',
      'Mở bịch ra định kiểm tra, xong bận ăn quên kiểm luôn.',
      'Dặn riêng mà không phải nhắc hai lần, hiếm nha.',
      'Tui gửi phiếu cho đứa bạn khó tính học cách đặt món.',
    ],
    neighbor: [
      'Cô dặn sao làm đúng vậy, cảm ơn con nghen.',
      'Tiệm nhớ lời cô dặn. Lần sau cô ghé nữa.',
    ],
  },
  noHeat: {
    genZ: [
      'Tui dặn không cay mà sa tế vẫn có mặt. Giờ nước lọc cũng có mặt.',
      'Đơn ghi không cay. Miếng đầu tiên khiến tui kiểm tra lại khả năng đọc của mình.',
      'Xin không cay để ăn thong thả, ai dè ăn một miếng phải chạy đi mua nước.',
      'Không cay trên phiếu, có cay ngoài đời.',
      'Sa tế ghé bất ngờ, tui chưa mời mà.',
    ],
    neighbor: ['Cô dặn không cay mà bánh có sa tế. Lần sau cho cô phần để riêng nha.'],
  },
  tooHot: {
    genZ: [
      'Phần này cay hơn tui dặn. Chai nước bên cạnh làm việc hết công suất.',
      'Mức cay lên cao hơn yêu cầu. Ăn xong tui phải xin nghỉ giải lao.',
      'Tui gọi mức cay thấp hơn. Mới hai miếng đã phải gọi thêm nước.',
      'Dặn cay nhẹ, miếng đầu mở hẳn cảnh hành động.',
      'Cay hơn đơn nha, giờ tui đang ăn kèm ly nước thứ hai.',
    ],
    neighbor: ['Phần này cay hơn cô dặn, lần sau bớt sa tế giùm cô nha.'],
  },
  tooMild: {
    genZ: [
      'Tui gọi cay hơn mà ăn tới cuối vẫn đang chờ vị cay xuất hiện.',
      'Có vị tắc rồi, còn độ cay tui dặn chắc đang kẹt ở quầy.',
      'Mức cay nhẹ hơn đơn nha. Tui chuẩn bị sẵn chai nước mà chưa cần mở.',
      'Tui dặn cay hơn, sa tế chắc đang trên đường tới.',
      'Cay ít hơn đơn, tui chưa kịp dùng tới ly nước.',
    ],
    neighbor: ['Bánh hơi nhẹ vị cay so với cô dặn. Lần sau thêm chút sa tế nghen.'],
  },
  cilantro: {
    genZ: [
      'Dặn không rau răm mà rau răm có mặt đông đủ. Tui ngồi nhặt lâu hơn ngồi ăn.',
      'Xin bỏ rau răm, mở bịch ra thấy rau răm vẫn tới dự.',
      'Tiệm ơi, lần sau cho rau răm nghỉ phép giùm. Tui có dặn bỏ á.',
      'Dặn bỏ rau răm. Rau răm đọc phiếu xong vẫn ở lại.',
      'Tui gọi không rau răm mà giờ đang chơi gắp lá.',
    ],
    neighbor: ['Cô dặn không rau răm mà vẫn có. Lần sau nhớ bỏ giùm cô nghen.'],
  },
  mango: {
    genZ: [
      'Tui xin nhiều xoài, mở bịch ra chơi trò tìm sợi xoài.',
      'Dặn nhiều xoài mà xoài xuất hiện đúng một cameo. Tiệm cho thêm xíu nha.',
      'Xoài ngon á, vấn đề là tui xin nhiều mà ăn chưa đã mà đã hết.',
      'Xin nhiều xoài mà xoài ghé chào có một miếng.',
      'Xoài xuất hiện hơi ít so với phần quảng cáo trong phiếu.',
    ],
    neighbor: ['Cô dặn nhiều xoài mà phần này hơi ít. Lần sau thêm giùm cô chút nha.'],
  },
  soggy: {
    genZ: [
      'Topping giòn bị ỉu. Tui chờ tiếng rốp rốp mà chỉ nghe tiếng xé bịch.',
      'Topping giòn bị ỉu hết rồi. Mới mở bịch mà tưởng mình để qua đêm.',
      'Topping giòn bị ỉu nha. Tiệm thử rắc sau khi trộn xem sao.',
      'Topping mềm quá, cái tên “giòn” nghe hơi lạc quẻ.',
      'Tui chờ tiếng rắc, topping chọn im lặng.',
    ],
    neighbor: ['Topping giòn bị ỉu rồi con. Lần sau rắc sau khi trộn cho thơm giòn nha.'],
  },
  missing: {
    genZ: [
      'Tui lật bánh hai lượt vẫn chưa thấy {ingredient}. Tiệm coi lại đơn giúp nha.',
      'Phần này thiếu {ingredient}. Tui ăn tới đáy bịch để xác minh luôn rồi.',
      'Hình như {ingredient} xin nghỉ ca này. Lần sau nhớ cho vào giùm nha.',
      'Thiếu {ingredient}, tui kiểm tra cả góc bịch rồi.',
      '{ingredient} được ghi trên phiếu chứ chưa thấy trong bánh.',
    ],
    neighbor: ['Phần cô thiếu {ingredient}. Con coi lại đơn giùm cô nghen.'],
  },
  extra: {
    genZ: [
      'Phần này dư {ingredient}. Tui ăn xong mới hiểu thế nào là thêm hơi nhiệt tình.',
      'Tiệm mạnh tay với {ingredient} quá. Lần sau cho đúng phần mình gọi nha.',
      '{ingredient} nhiều hơn đơn rồi tiệm ơi. Tui gọi phần thường á.',
      'Hơi dư {ingredient}, phần thường mà tiệm cho ăn mừng dữ.',
      'Tui gọi bánh, {ingredient} giành hết spotlight rồi.',
    ],
    neighbor: ['Bịch này hơi dư {ingredient}. Lần sau lấy đúng phần cô dặn nghen.'],
  },
  uneven: {
    genZ: [
      'Gia vị dồn về một phía. Mấy sợi phía bên kia chắc chưa được phổ biến công thức.',
      'Miếng đầu đậm quá, miếng sau nhạt hẳn. Tiệm đảo đều tay hơn xíu nha.',
      'Chỗ thấm vị, chỗ chưa. Tui vừa ăn vừa tự lắc bịch phụ tiệm.',
      'Có miếng vị đậm tới mức miếng sau tưởng đang ăn món khác.',
      'Gia vị ở một góc hết rồi, góc còn lại hơi cô đơn.',
    ],
    neighbor: ['Gia vị chưa thấm đều đó con, bữa sau đảo kỹ thêm một chút nha.'],
  },
  noFinalMix: {
    genZ: [
      'Topping nằm riêng một góc. Tui phải lắc bịch để tụi nó làm quen với bánh.',
      'Bánh với topping chưa gặp nhau. Mình tự trộn nốt ở nhà vậy.',
      'Topping chưa được đảo đều, ăn nửa bịch mới tới phần thêm.',
      'Topping đứng một bên, bánh đứng một bên, tui đứng giữa.',
    ],
    neighbor: ['Topping chưa trộn đều với bánh. Cô về nhà phải đảo thêm một lượt.'],
  },
  noFinalMixPlain: {
    genZ: [
      'Bánh còn dính thành cục. Tui phải gỡ từng sợi mới chia được hai miếng.',
      'Mấy sợi bánh cuộn thành một cục, chắc còn thiếu lượt đảo cuối.',
      'Bánh dính nhau hơi nhiều. Tiệm đảo nhẹ thêm một lượt giúp tui nha.',
      'Đũa gắp một sợi mà nguyên búi đi theo luôn.',
    ],
    neighbor: ['Bánh hơi dính cục. Bữa sau đảo nhẹ thêm một lượt nha con.'],
  },
  slow: {
    genZ: [
      'Tui đứng đợi hơi lâu. Bạn nhắn “tới đâu rồi” hai lần mới nhận được bánh.',
      'Bánh ổn áp nhưng chờ hơi lâu. Lần sau nhanh hơn là tui quay lại liền.',
      'Đợi lâu tới mức tui chọn xong món cho lần sau rồi mới tới đơn hôm nay.',
      'Tui đứng hàng lâu tới mức sắp quen mặt hết cả xóm.',
      'Chờ lâu quá, story đi mua bánh chuyển thành vlog rồi.',
    ],
    neighbor: ['Cô đợi hơi lâu mới có bánh. Bữa nào quầy vắng cô ghé lại nha.'],
  },
  pricey: {
    genZ: [
      'Giá hơi chát. Ăn xong tui vẫn nhớ rõ số tiền hơn vị tắc.',
      'Bánh một bịch, hóa đơn khiến tui cân nhắc lại kế hoạch ăn vặt tuần này.',
      'Mức giá này tui kỳ vọng phần đầy hơn. Cái ví đã lên tiếng.',
      'Giá nhỉnh quá so với phần bánh. Tui mua thử một lần cho biết thôi.',
      'Giá này tui tưởng mở bịch ra có quà kèm.',
      'Bánh ăn hết rồi, giá vẫn còn đọng lại.',
    ],
    neighbor: ['Giá hơi chát so với phần bánh, cô mua thử bữa nay thôi nghen.'],
  },
  priceRefusal: {
    genZ: [
      'Chát quá! Tui nhìn bảng giá xong tự dưng hết thèm.',
      'Đọc giá hai lần cho chắc rồi đi. Bụng muốn ăn mà ví xin rút.',
      'Tui tới mua bánh tráng, tới bảng giá thì thôi để dịp lãnh lương.',
      'Giá này nhóm bạn tui cần mở cuộc họp trước khi chốt một bịch.',
      'Đứng ngó bảng giá xong quyết định về nhà ăn cơm.',
      'Tui với cái ví vừa nhìn nhau và cùng xin phép đi trước.',
      'Bảng giá vừa cho cơn thèm của tui nghỉ giải lao.',
    ],
    neighbor: ['Cô thấy giá hơi cao nên đi trước. Hôm khác cô ghé coi lại nghen.'],
  },
  timeout: {
    genZ: [
      'Chờ từ lúc còn thèm tới lúc phải chạy về. Tui đi trước nha.',
      'Xếp hàng lâu quá, điện thoại báo pin yếu trước khi tiệm báo có bánh.',
      'Tui đứng đợi hết mấy bài trong playlist rồi. Bụng đói xin phép rút.',
      'Đợi lâu quá nên tui đi mua món khác. Hẹn tiệm lúc quầy bớt đông.',
      'Tới mua đồ ăn vặt, đứng chờ xong lỡ luôn giờ ăn cơm.',
      'Tui chờ tới lúc ứng dụng hỏi có còn ở quầy không.',
      'Bánh chưa tới, giờ hẹn tới trước. Tui đi nha.',
    ],
    neighbor: [
      'Cô đứng chờ lâu quá, phải về nấu cơm nên đi trước nghen.',
      'Cô đợi hoài chưa tới lượt, bữa khác ghé sớm hơn vậy.',
    ],
  },
  closed: {
    genZ: [
      'Đang đợi thì quầy đóng cửa. Tui với cái bụng đói nhìn nhau.',
      'Hết ca mà chưa tới lượt. Tui xin chuyển cơn thèm sang ngày mai.',
      'Tiệm đóng cửa trước khi có bánh. Kèo ăn vặt hôm nay tự hủy.',
      'Chờ tới lúc tiệm dọn quầy vẫn chưa có phần. Đành hẹn hôm khác nha.',
      'Nghe đóng cửa nhanh hơn nghe gọi tên tui.',
      'Mới chuẩn bị đũa trong đầu thì tiệm dọn gánh.',
    ],
    neighbor: ['Tiệm dọn quầy mà cô chưa có phần. Bữa khác cô qua sớm nghen.'],
  },
} as const

export function reviewLine(
  kind: keyof typeof reviewCopy, customer: Pick<Customer, 'id' | 'profile'>, history: readonly Review[], ingredient = '',
): string {
  const copy = reviewCopy[kind]
  const voice = profiles[customer.profile].style === 'neighbor' ? copy.neighbor : copy.genZ
  const start = (customer.id - 1) % voice.length
  let oldestLine = '', oldestIndex = history.length
  for (let offset = 0; offset < voice.length; offset++) {
    const template = voice[(start + offset) % voice.length]
    const [prefix, suffix] = template.split('{ingredient}')
    const rendered = template.replace('{ingredient}', ingredient)
    const line = rendered[0].toLocaleUpperCase('vi') + rendered.slice(1)
    let usedAt = history.length - 1
    for (; usedAt >= 0; usedAt--) {
      const text = history[usedAt].text
      const begin = text.indexOf(prefix)
      // Changing the ingredient should not make a familiar joke feel new.
      if (suffix ? begin >= 0 && text.includes(suffix, begin + prefix.length) : text.includes(line)) break
    }
    if (usedAt < 0) return line
    if (usedAt < oldestIndex) { oldestIndex = usedAt; oldestLine = line }
  }
  return oldestLine
}

const ingredientList = new Intl.ListFormat('vi')
export const saltReviewLimit = 125

export function saltIssueLine(extra: Order['extra'], issues: OrderIssue[], customer?: Customer, history: readonly Review[] = []): string | undefined {
  if (!issues.length || issues.some(issue => !['missing', 'extra', 'uneven', 'soggy', 'slow', 'price'].includes(issue.kind))) return undefined
  const special = extra && issues.some(issue => issue.kind === 'missing' && issue.ingredient === extra) ? extra : undefined
  const names = (kind: OrderIssue['kind']) => issues.flatMap(issue => issue.kind === kind && issue.ingredient
    && !(kind === 'missing' && issue.ingredient === special) ? [ingredients[issue.ingredient].short.toLocaleLowerCase('vi')] : [])
  const missing = names('missing'), excess = names('extra'), uneven = names('uneven')
  const entries: Array<{ kind: keyof typeof reviewCopy; short: string; ingredient?: string }> = []
  if (special) {
    const note = extraNotes[special].toLocaleLowerCase('vi')
    entries.push({ kind: 'saltNoteMissed', short: `Hình như mình có dặn ${note}.`, ingredient: note })
  }
  if (missing.length) entries.push({ kind: 'saltMissing', short: `Thiếu ${ingredientList.format(missing)}.`, ingredient: ingredientList.format(missing) })
  if (excess.length) entries.push({ kind: 'saltExtra', short: `Hơi dư ${ingredientList.format(excess)}.`, ingredient: ingredientList.format(excess) })
  if (uneven.length) entries.push({ kind: 'saltUneven', short: `Rải ${ingredientList.format(uneven)} chưa đều.`, ingredient: ingredientList.format(uneven) })
  if (issues.some(issue => issue.kind === 'soggy')) entries.push({ kind: 'soggy', short: 'Topping bị ỉu, rắc sau cùng nha.' })
  const slow = issues.some(issue => issue.kind === 'slow'), pricey = issues.some(issue => issue.kind === 'price')
  if (slow) entries.push({ kind: 'saltSlow', short: 'Chờ hơi lâu.' })
  if (pricey) entries.push({ kind: 'saltPrice', short: 'Giá hơi cao.' })
  const lines = entries.map(entry => entry.short)
  const first = entries[0]
  if (customer && first) {
    const playful = [reviewLine(first.kind, customer, history, first.ingredient), ...lines.slice(1)].join(' ')
    if (playful.length <= saltReviewLimit) return playful
  }
  return lines.join(' ')
}

const departureLines: Record<DepartureReason, readonly [string, string]> = {
  priceRefusal: ['Giá này ví tui xin rút!', 'Giá hơi cao, cô ghé bữa khác.'],
  timeout: ['Đợi lâu quá, tui đi trước nha!', 'Cô phải về trước rồi nghen.'],
  closed: ['Hết ca rồi, hẹn bữa khác!', 'Bữa khác cô ghé sớm nghen.'],
}

export function departureLine(review: Review): string {
  if (!review.departureReason) return 'Mình đi trước nha…'
  return departureLines[review.departureReason][profiles[review.profile].style === 'neighbor' ? 1 : 0]
}
