import { profiles } from './data.ts'
import type { Customer, DepartureReason, Review } from './types.ts'

const reviewCopy = {
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
    ],
    neighbor: ['Cô dặn không cay mà bánh có sa tế. Lần sau cho cô phần để riêng nha.'],
  },
  tooHot: {
    genZ: [
      'Phần này cay hơn tui dặn. Chai nước bên cạnh làm việc hết công suất.',
      'Mức cay lên cao hơn yêu cầu. Ăn xong tui phải xin nghỉ giải lao.',
      'Tui gọi mức cay thấp hơn. Mới hai miếng đã phải gọi thêm nước.',
    ],
    neighbor: ['Phần này cay hơn cô dặn, lần sau bớt sa tế giùm cô nha.'],
  },
  tooMild: {
    genZ: [
      'Tui gọi cay hơn mà ăn tới cuối vẫn đang chờ vị cay xuất hiện.',
      'Có vị tắc rồi, còn độ cay tui dặn chắc đang kẹt ở quầy.',
      'Mức cay nhẹ hơn đơn nha. Tui chuẩn bị sẵn chai nước mà chưa cần mở.',
    ],
    neighbor: ['Bánh hơi nhẹ vị cay so với cô dặn. Lần sau thêm chút sa tế nghen.'],
  },
  cilantro: {
    genZ: [
      'Dặn không rau răm mà rau răm có mặt đông đủ. Tui ngồi nhặt lâu hơn ngồi ăn.',
      'Xin bỏ rau răm, mở bịch ra thấy rau răm vẫn tới dự.',
      'Tiệm ơi, lần sau cho rau răm nghỉ phép giùm. Tui có dặn bỏ á.',
    ],
    neighbor: ['Cô dặn không rau răm mà vẫn có. Lần sau nhớ bỏ giùm cô nghen.'],
  },
  mango: {
    genZ: [
      'Tui xin nhiều xoài, mở bịch ra chơi trò tìm sợi xoài.',
      'Dặn nhiều xoài mà xoài xuất hiện đúng một cameo. Tiệm cho thêm xíu nha.',
      'Xoài ngon á, vấn đề là tui xin nhiều mà ăn chưa đã mà đã hết.',
    ],
    neighbor: ['Cô dặn nhiều xoài mà phần này hơi ít. Lần sau thêm giùm cô chút nha.'],
  },
  soggy: {
    genZ: [
      'Topping giòn bị ỉu. Tui chờ tiếng rốp rốp mà chỉ nghe tiếng xé bịch.',
      'Topping giòn bị ỉu hết rồi. Mới mở bịch mà tưởng mình để qua đêm.',
      'Topping giòn bị ỉu nha. Tiệm thử rắc sau khi trộn xem sao.',
    ],
    neighbor: ['Topping giòn bị ỉu rồi con. Lần sau rắc sau khi trộn cho thơm giòn nha.'],
  },
  missing: {
    genZ: [
      'Tui lật bánh hai lượt vẫn chưa thấy {ingredient}. Tiệm coi lại đơn giúp nha.',
      'Phần này thiếu {ingredient}. Tui ăn tới đáy bịch để xác minh luôn rồi.',
      'Hình như {ingredient} xin nghỉ ca này. Lần sau nhớ cho vào giùm nha.',
    ],
    neighbor: ['Phần cô thiếu {ingredient}. Con coi lại đơn giùm cô nghen.'],
  },
  extra: {
    genZ: [
      'Phần này dư {ingredient}. Tui ăn xong mới hiểu thế nào là thêm hơi nhiệt tình.',
      'Tiệm mạnh tay với {ingredient} quá. Lần sau cho đúng phần mình gọi nha.',
      '{ingredient} nhiều hơn đơn rồi tiệm ơi. Tui gọi phần thường á.',
    ],
    neighbor: ['Bịch này hơi dư {ingredient}. Lần sau lấy đúng phần cô dặn nghen.'],
  },
  uneven: {
    genZ: [
      'Gia vị dồn về một phía. Mấy sợi phía bên kia chắc chưa được phổ biến công thức.',
      'Miếng đầu đậm quá, miếng sau nhạt hẳn. Tiệm đảo đều tay hơn xíu nha.',
      'Chỗ thấm vị, chỗ chưa. Tui vừa ăn vừa tự lắc bịch phụ tiệm.',
    ],
    neighbor: ['Gia vị chưa thấm đều đó con, bữa sau đảo kỹ thêm một chút nha.'],
  },
  noFinalMix: {
    genZ: [
      'Topping nằm riêng một góc. Tui phải lắc bịch để tụi nó làm quen với bánh.',
      'Bánh với topping chưa gặp nhau. Mình tự trộn nốt ở nhà vậy.',
      'Topping chưa được đảo đều, ăn nửa bịch mới tới phần thêm.',
    ],
    neighbor: ['Topping chưa trộn đều với bánh. Cô về nhà phải đảo thêm một lượt.'],
  },
  noFinalMixPlain: {
    genZ: [
      'Bánh còn dính thành cục. Tui phải gỡ từng sợi mới chia được hai miếng.',
      'Mấy sợi bánh cuộn thành một cục, chắc còn thiếu lượt đảo cuối.',
      'Bánh dính nhau hơi nhiều. Tiệm đảo nhẹ thêm một lượt giúp tui nha.',
    ],
    neighbor: ['Bánh hơi dính cục. Bữa sau đảo nhẹ thêm một lượt nha con.'],
  },
  slow: {
    genZ: [
      'Tui đứng đợi hơi lâu. Bạn nhắn “tới đâu rồi” hai lần mới nhận được bánh.',
      'Bánh ổn áp nhưng chờ hơi lâu. Lần sau nhanh hơn là tui quay lại liền.',
      'Đợi lâu tới mức tui chọn xong món cho lần sau rồi mới tới đơn hôm nay.',
    ],
    neighbor: ['Cô đợi hơi lâu mới có bánh. Bữa nào quầy vắng cô ghé lại nha.'],
  },
  pricey: {
    genZ: [
      'Giá hơi chát. Ăn xong tui vẫn nhớ rõ số tiền hơn vị tắc.',
      'Bánh một bịch, hóa đơn khiến tui cân nhắc lại kế hoạch ăn vặt tuần này.',
      'Mức giá này tui kỳ vọng phần đầy hơn. Cái ví đã lên tiếng.',
      'Giá nhỉnh quá so với phần bánh. Tui mua thử một lần cho biết thôi.',
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
    ],
    neighbor: ['Tiệm dọn quầy mà cô chưa có phần. Bữa khác cô qua sớm nghen.'],
  },
} as const

export function reviewLine(
  kind: keyof typeof reviewCopy, customer: Customer, history: readonly Review[], ingredient = '',
): string {
  const copy = reviewCopy[kind]
  const voice = profiles[customer.profile].style === 'neighbor' ? copy.neighbor : copy.genZ
  const start = (customer.id - 1) % voice.length
  const recent = history.slice(-12).reverse()
  const candidates = [...voice.slice(start), ...voice.slice(0, start)].map(template => {
    const line = template.replace('{ingredient}', ingredient)
    return { line, lastUsed: recent.findIndex(review => review.text.includes(line)) }
  })
  return (candidates.find(candidate => candidate.lastUsed < 0)
    ?? candidates.reduce((oldest, candidate) => candidate.lastUsed > oldest.lastUsed ? candidate : oldest)).line
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
