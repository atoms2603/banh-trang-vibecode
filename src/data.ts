import type { Ingredient, IngredientId, Level, MarketPack, MenuId, MenuItem, ReplyId } from './types.ts'

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
