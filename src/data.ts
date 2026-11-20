import type { Ingredient, IngredientId, Level, MarketPack, MenuId, MenuItem, MissionKind, ReplyId, Reward, SpecialKind, StoryChapter } from './types.ts'

export const ingredients: Record<IngredientId, Ingredient> = {
  rice:       { name: 'Bánh tráng cắt sợi', short: 'Bánh tráng', level: 1, category: 'base', cost: 2000 },
  kumquat:    { name: 'Nước cốt tắc', short: 'Tắc', level: 1, category: 'seasoning', cost: 250 },
  shrimpSalt: { name: 'Muối tôm Tây Ninh', short: 'Muối tôm', level: 1, category: 'seasoning', cost: 500 },
  chili:      { name: 'Sa tế ớt', short: 'Sa tế', level: 1, category: 'seasoning', cost: 150 },
  oil:        { name: 'Dầu điều / Mỡ hành', short: 'Dầu hành', level: 1, category: 'seasoning', cost: 100 },
  mango:      { name: 'Xoài xanh bào sợi', short: 'Xoài xanh', level: 1, category: 'topping', cost: 700, fresh: true },
  cilantro:   { name: 'Rau răm cắt nhỏ', short: 'Rau răm', level: 1, category: 'topping', cost: 300, fresh: true },
  egg:        { name: 'Trứng cút luộc (2 quả)', short: 'Trứng cút', level: 2, category: 'topping', cost: 1500, fresh: true },
  peanut:     { name: 'Đậu phộng rang', short: 'Đậu phộng', level: 2, category: 'crunch', cost: 500 },
  shallot:    { name: 'Hành phi giòn', short: 'Hành phi', level: 2, category: 'crunch', cost: 500 },
  redBeef:    { name: 'Khô bò đỏ xé sợi', short: 'Khô bò đỏ', level: 2, category: 'topping', cost: 3000 },
  blackBeef:  { name: 'Khô bò đen', short: 'Khô bò đen', level: 3, category: 'topping', cost: 4000 },
  chicken:    { name: 'Khô gà lá chanh', short: 'Khô gà', level: 3, category: 'topping', cost: 3000 },
  tamarind:   { name: 'Sốt me đặc biệt', short: 'Sốt me', level: 3, category: 'seasoning', cost: 1000 },
  blackSauce: { name: 'Sốt bò đen', short: 'Sốt bò đen', level: 3, category: 'seasoning', cost: 1000 },
  squid:      { name: 'Khô mực xé', short: 'Khô mực', level: 4, category: 'topping', cost: 4000 },
  pack:       { name: 'Bộ đóng gói và đũa tre', short: 'Bộ đóng gói', level: 1, category: 'pack', cost: 500 },
}

export const ingredientIds = Object.keys(ingredients) as IngredientId[]

export const market: MarketPack[] = [
  { id: 'rice', name: 'Bánh tráng cắt sợi', detail: 'Bịch 10 phần', items: { rice: 10 } },
  { id: 'shrimpSalt', name: 'Muối tôm Tây Ninh', detail: 'Hũ 20 phần', items: { shrimpSalt: 20 } },
  { id: 'kumquat', name: 'Tắc tươi', detail: '20 phần nước cốt', items: { kumquat: 20 } },
  { id: 'pack', name: 'Bộ đóng gói', detail: 'Lốc 20 bộ kèm đũa tre', items: { pack: 20 } },
  { id: 'wet', name: 'Bộ gia vị ướt', detail: '20 phần mỗi loại · Tắc, sa tế, dầu hành', items: { kumquat: 20, chili: 20, oil: 20 } },
  { id: 'greens', name: 'Xoài xanh và rau răm', detail: '10 phần mỗi loại', items: { mango: 10, cilantro: 10 } },
  { id: 'egg', name: 'Trứng cút luộc', detail: 'Vỉ 10 phần', items: { egg: 10 } },
  { id: 'crunch', name: 'Topping giòn', detail: '10 phần mỗi loại · Đậu phộng, hành phi', items: { peanut: 10, shallot: 10 } },
  { id: 'redBeef', name: 'Khô bò đỏ xé sợi', detail: 'Gói 10 phần', items: { redBeef: 10 } },
  { id: 'blackBeef', name: 'Khô bò đen', detail: 'Gói 10 phần', items: { blackBeef: 10 } },
  { id: 'chicken', name: 'Khô gà lá chanh', detail: 'Gói 10 phần', items: { chicken: 10 } },
  { id: 'tamarind', name: 'Sốt me đặc biệt', detail: 'Chai 15 phần', items: { tamarind: 15 } },
  { id: 'blackSauce', name: 'Sốt bò đen', detail: 'Chai 15 phần', items: { blackSauce: 15 } },
  { id: 'squid', name: 'Khô mực xé', detail: 'Gói 10 phần', items: { squid: 10 } },
]

const simple = { rice: 1, kumquat: 1, shrimpSalt: 1, pack: 1 }
const classic = { ...simple, chili: 1, oil: 1, mango: 1, cilantro: 1 }

export const menu: Record<MenuId, MenuItem> = {
  salt: { name: 'Bánh tráng muối tắc', note: 'Dẻo thơm, chua nhẹ vị tắc', level: 1, icon: 'kumquat', recipe: simple },
  classic: { name: 'Bánh tráng trộn truyền thống', note: 'Sa tế, xoài xanh và rau răm', level: 1, icon: 'mango', recipe: classic },
  eggs: { name: 'Bánh tráng trộn trứng cút', note: 'Hai trứng cút, đậu phộng giòn', level: 2, icon: 'egg', recipe: { ...classic, egg: 1, peanut: 1 } },
  beef: { name: 'Bánh tráng trộn khô bò', note: 'Khô bò đỏ, hành phi và đậu phộng', level: 2, icon: 'redBeef', recipe: { ...classic, redBeef: 1, peanut: 1, shallot: 1 } },
  tamarind: { name: 'Bánh tráng trộn sốt me', note: 'Sốt me chua ngọt, khô gà lá chanh', level: 3, icon: 'tamarind', recipe: { ...classic, tamarind: 1, chicken: 1 } },
  mixed: { name: 'Bánh tráng trộn thập cẩm', note: 'Sốt bò đen, trứng cút, khô bò đen và topping giòn', level: 3, icon: 'blackBeef', recipe: { ...classic, blackBeef: 1, blackSauce: 1, egg: 1, peanut: 1, shallot: 1 } },
  squid: { name: 'Bánh tráng trộn khô mực', note: 'Khô mực xé, xoài xanh và hành phi', level: 4, icon: 'squid', recipe: { ...classic, squid: 1, shallot: 1 } },
}

export const menuIds = Object.keys(menu) as MenuId[]

export const levels: Record<Level, { name: string; threshold: number; overhead: number }> = {
  1: { name: 'Xe đẩy vỉa hè', threshold: 0, overhead: 15000 },
  2: { name: 'Quầy nhỏ có mái hiên', threshold: 40, overhead: 25000 },
  3: { name: 'Tiệm ăn vặt', threshold: 120, overhead: 35000 },
  4: { name: 'Thương hiệu nổi tiếng', threshold: 240, overhead: 50000 },
}

export const heatLabels = ['Không cay', 'Ít cay', 'Cay vừa', 'Siêu cay'] as const
export const staffWage = 20000

export const legacyShiftRhythm = [
  { id: 'warmup', untilMs: 40000, label: 'Khởi động', intervalFactor: 1.3 },
  { id: 'normal', untilMs: 90000, label: 'Khách ghé đều', intervalFactor: 1 },
  { id: 'rush', untilMs: 110000, label: 'Giờ tan học!', intervalFactor: .6 },
  { id: 'rest', untilMs: 160000, label: 'Thưa khách', intervalFactor: 1.6 },
  { id: 'last', untilMs: 180000, label: 'Lượt khách cuối', intervalFactor: 1 },
  { id: 'closing', untilMs: 240000, label: 'Giao nốt hàng chờ', intervalFactor: 0 },
] as const

export const shiftRhythm = [
  { id: 'warmup', untilMs: 10000, label: 'Khởi động', intervalFactor: 1.3 },
  { id: 'normal', untilMs: 30000, label: 'Khách ghé đều', intervalFactor: 1 },
  { id: 'rush', untilMs: 45000, label: 'Giờ tan học!', intervalFactor: .6 },
  { id: 'rest', untilMs: 55000, label: 'Khoảng thở', intervalFactor: 0 },
  { id: 'last', untilMs: 85000, label: 'Lượt khách cuối', intervalFactor: 1 },
  { id: 'closing', untilMs: 105000, label: 'Giao nốt hàng chờ', intervalFactor: 0 },
] as const

export const shiftPolicies = {
  'legacy-240': {
    durationMs: 240000, arrivalsEndMs: 180000, highlightStartMs: 160000, highlightEndMs: 180000,
    rhythm: legacyShiftRhythm, orderTargets: [10, 10, 12, 14], qualityTargets: { perfect: 3, quick: 4, good: 5 },
  },
  'short-105': {
    durationMs: 105000, arrivalsEndMs: 85000, highlightStartMs: 60000, highlightEndMs: 85000,
    rhythm: shiftRhythm, orderTargets: [6, 7, 8, 9], qualityTargets: { perfect: 2, quick: 3, good: 3 },
  },
} as const

export const engagementRules = {
  firstArrivalMs: 900,
  patienceMs: 70000,
  extraPortionPatienceMs: 18000,
  regularStartDay: 2,
  specialStartDay: 3,
  rushWarningMs: 15000,
  specialWarningMs: 10000,
  specialChance: .35,
  specialProfile: 4,
  firstDayOrderTarget: 5,
  firstDayPerfectTarget: 2,
  qualityRotation: ['perfect', 'quick', 'good'] as readonly MissionKind[],
  orderReward: { cash: 5000, xp: 5 },
  qualityReward: { cash: 3000, xp: 3 },
  storyReward: { cash: 1500, xp: 2 },
  storyFinalReward: { cash: 3000, xp: 3 },
} as const

export const missionLabels: Record<MissionKind, { short: string; detail: string }> = {
  orders: { short: 'Đơn trọn vẹn', detail: 'Giao đủ số bịch cho mỗi khách. Một khách tính một đơn.' },
  perfect: { short: 'Đơn 5 sao', detail: 'Giao đủ đơn và nhận đánh giá 5 sao.' },
  quick: { short: 'Nhanh & đúng', detail: 'Đạt ít nhất 3 sao và còn tối thiểu 50% kiên nhẫn khi giao đủ đơn.' },
  good: { short: 'Khách hài lòng', detail: 'Giao đủ đơn và nhận đánh giá từ 4 sao.' },
}

export const specialChallenges: Record<SpecialKind, Reward & { label: string; detail: string }> = {
  perfect: { label: 'Phần bánh hoàn hảo', detail: 'Làm một bịch đạt 5 sao.', cash: 5000, xp: 5 },
  crispy: { label: 'Topping giòn', detail: 'Đủ topping giòn, thêm sau trộn đầu, trộn nhẹ và đạt từ 4 sao.', cash: 4000, xp: 4 },
}

export const regularStories: Record<number, { title: string; chapters: readonly StoryChapter[] }> = {
  0: { title: 'Chuyện của Bé Mây', chapters: [
    { quantity: 1, greeting: 'Con sắp kiểm tra rồi, ăn một bịch lấy tinh thần!', goodReply: 'Ngon quá, con có động lực làm bài rồi!', poorReply: 'Hơi lệch gu con, mai cô trộn ngon hơn nha!' },
    { quantity: 1, greeting: 'Con làm bài ổn lắm! Ghé tiệm ăn mừng nè.', goodReply: 'Điểm cao, bánh ngon, hôm nay quá đỉnh!', poorReply: 'Bài làm ổn hơn bịch bánh rồi cô ơi!' },
    { quantity: 2, greeting: 'Con rủ bạn tới ăn mừng, cho tụi con hai bịch!', goodReply: 'Bạn con cũng mê! Tụi con thành khách ruột nha!', poorReply: 'Tụi con góp ý thật lòng, lần sau ghé tiếp nha!' },
  ] },
  3: { title: 'Đồng đội của Anh Tín', chapters: [
    { quantity: 1, greeting: 'Chạy đơn ngang thấy thơm quá, cho anh ăn thử!', goodReply: 'Đúng gu anh rồi! Lưu địa chỉ tiệm liền.', poorReply: 'Chưa đúng gu lắm, bữa sau anh thử lại.' },
    { quantity: 2, greeting: 'Đồng nghiệp nhờ mua ké, hôm nay anh lấy hai bịch!', goodReply: 'Anh em khen quá trời, quán sắp đông đó!', poorReply: 'Anh em góp ý chút, bữa sau mình cải thiện nha!' },
    { quantity: 3, greeting: 'Cả đội nhờ anh đặt chung ba bịch, nhờ tiệm nha!', goodReply: 'Cả đội duyệt! Giờ nghỉ là tụi anh ghé.', poorReply: 'Anh nhận đủ rồi, lần tới mong tiệm lên tay!' },
  ] },
  6: { title: 'Tiếng lành trong xóm', chapters: [
    { quantity: 1, greeting: 'Tiệm mới hả con? Cho cô một bịch ăn thử.', goodReply: 'Được đó con, cô sẽ ghé thường xuyên!', poorReply: 'Chưa vừa miệng cô, con cứ từ từ lên tay.' },
    { quantity: 1, greeting: 'Cô quay lại nè, hôm nay để cô góp ý khẩu vị.', goodReply: 'Vị này vừa miệng! Cô giới thiệu hàng xóm nhé.', poorReply: 'Vị hơi lệch rồi, nhớ lời cô góp ý nha!' },
    { quantity: 2, greeting: 'Cô dẫn hàng xóm tới ủng hộ, cho cô hai bịch!', goodReply: 'Cả xóm có tiệm ruột mới rồi đó con!', poorReply: 'Cô vẫn ủng hộ, mai mình trộn kỹ hơn nha!' },
  ] },
}

export const profiles = [
  { name: 'Bé Mây', role: 'Học sinh', line: 'Cô ơi, cho con một phần nha!', tint: '#e695aa', skin: '#f5c7a4', hair: '#583b36', style: 'school' },
  { name: 'Khánh An', role: 'Sinh viên', line: 'Đi ngang thơm quá, ghé một chút!', tint: '#92b99c', skin: '#f3bb96', hair: '#5a3e33', style: 'student' },
  { name: 'Chị Hương', role: 'Dân văn phòng', line: 'Ăn chút trước giờ tan làm nè.', tint: '#b2a5cf', skin: '#f6c5a1', hair: '#55352c', style: 'office' },
  { name: 'Anh Tín', role: 'Shipper', line: 'Cho anh một phần mang đi nghen!', tint: '#77aa8d', skin: '#dba780', hair: '#45332a', style: 'rider' },
  { name: 'Bảo Ngọc', role: 'Food reviewer', line: 'Mình nghe nói ở đây trộn ngon lắm!', tint: '#e7ad70', skin: '#f2c29b', hair: '#674032', style: 'reviewer' },
  { name: 'Minh Khoa', role: 'Sinh viên', line: 'Chua chua cay cay là đúng bài!', tint: '#86adb7', skin: '#ebbd9e', hair: '#48382e', style: 'student' },
  { name: 'Cô Sáu', role: 'Khách trong xóm', line: 'Bán cho cô một bịch nha con.', tint: '#e8a489', skin: '#dfac88', hair: '#755748', style: 'neighbor' },
]

export const replies: Record<ReplyId, { label: string; text: string }> = {
  polite: { label: 'Lịch sự, cầu thị', text: 'Tiệm cảm ơn bạn đã góp ý. Tụi mình sẽ chú ý hơn ở phần tiếp theo nha.' },
  friendly: { label: 'Hài hước, thân thiện', text: 'Tiệm ghi ngay vào sổ tay rồi. Hẹn bạn một bịch ngon hơn lần sau nha!' },
  voucher: { label: 'Tặng voucher xin lỗi', text: 'Tiệm gửi bạn voucher xin lỗi cho lần ghé sau. Cảm ơn bạn đã cho tiệm cơ hội nhé!' },
}
