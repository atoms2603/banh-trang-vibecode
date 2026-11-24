import type { GameState } from './types.ts'

interface Lesson {
  action: string
  id?: string
  prepTab?: 'menu'
  instruction: string
}

const menuLessonCount = 2
const legacyOpenStep = 5
const orderLessonStep = 9

const lessons: readonly Lesson[] = [
  { action: 'buy', id: 'rice', instruction: 'Nhập một bịch bánh tráng cắt sợi.' },
  { action: 'buy', id: 'shrimpSalt', instruction: 'Nhập muối tôm Tây Ninh để nêm bánh.' },
  { action: 'buy', id: 'kumquat', instruction: 'Nhập tắc tươi. Nước cốt tắc giúp bánh mềm hơn.' },
  { action: 'buy', id: 'pack', instruction: 'Nhập bộ đóng gói kèm đũa tre.' },
  { action: 'prep-menu', instruction: 'Mở Menu hôm nay để chuẩn bị món đầu tiên.' },
  { action: 'toggle-dish', id: 'salt', prepTab: 'menu', instruction: 'Bật công tắc Bánh tráng muối tắc để khách có thể gọi món.' },
  { action: 'price', id: 'salt', prepTab: 'menu', instruction: 'Bấm − hoặc + để chỉnh giá Bánh tráng muối tắc. Mỗi nấc là 1.000đ.' },
  { action: 'open', prepTab: 'menu', instruction: 'Bạn có thể chỉnh thêm giá. Khi đã sẵn sàng, bấm Mở cửa bán hàng!' },
  { action: 'customer', instruction: 'Chọn vị khách đầu tiên để đọc đơn.' },
  { action: 'read-order', instruction: 'Đây là phiếu order của khách. Xem tên món, hình nguyên liệu và mức cay ở đây để làm đúng đơn. Bấm Đã xem phiếu để bắt đầu.' },
  { action: 'ingredient', id: 'rice', instruction: 'Chạm hoặc kéo bánh tráng vào thau.' },
  { action: 'ingredient', id: 'kumquat', instruction: 'Vắt tắc vào thau để làm mềm bánh.' },
  { action: 'ingredient', id: 'shrimpSalt', instruction: 'Thêm một phần muối tôm.' },
  { action: 'mix', instruction: 'Bấm Trộn đều tay để bánh thấm gia vị.' },
  { action: 'mix-ready', instruction: 'Đợi thanh tiến độ đạt 100%.' },
  { action: 'final-mix', instruction: 'Bấm Trộn nhẹ để các sợi bánh hòa đều.' },
  { action: 'pack', id: 'bag', instruction: 'Bấm Đóng bịch + đũa ở dưới. Số bộ gói còn lại hiển thị ngay trên nút.' },
  { action: 'deliver', instruction: 'Bấm Giao món để phục vụ vị khách đầu tiên.' },
]

const directLessons: readonly Lesson[] = [
  ...lessons.slice(0, 10),
  { action: 'ingredient', id: 'rice', instruction: 'Kéo một phần bánh tráng vào lòng thau rồi thả.' },
  { action: 'ingredient', id: 'kumquat', instruction: 'Kéo tắc vào thau, rê qua vài chỗ trên bánh rồi thả để rải nước tắc.' },
  { action: 'ingredient', id: 'shrimpSalt', instruction: 'Rê muối tôm theo đường gợi ý để rải vào nhiều chỗ.' },
  { action: 'stir-bowl', instruction: 'Kéo ngay trên thau để đảo bánh. Thử đảo từ chỗ đậm sang vùng còn nhạt.' },
  ...lessons.slice(-2),
]

export function validTutorialStep(value: unknown, version: number): boolean {
  const count = lessons.length - (version < 3 ? menuLessonCount : 0) - (version < 4 ? 1 : 0)
  return value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < count)
}

export function upgradeTutorialStep(step: number, version: number): number {
  const menuStep = version < 3 && step >= legacyOpenStep ? step + menuLessonCount : step
  return version < 4 && menuStep >= orderLessonStep ? menuStep + 1 : menuStep
}

export function currentLesson(state: GameState | null) {
  const step = state?.tutorialStep
  if (state?.day !== 1 || state.phase === 'report' || step === undefined) return undefined
  const sequence = state.shift?.directBowl ? directLessons : lessons
  const lesson = sequence[step]
  if (!lesson) return undefined
  const customerId = state.shift?.queue[0]?.id
  return {
    ...lesson,
    id: lesson.action === 'customer' && customerId !== undefined ? String(customerId) : lesson.id,
    instruction: lesson.action === 'customer' && customerId === undefined ? 'Đợi vị khách đầu tiên ghé quầy.' : lesson.instruction,
    step,
    total: sequence.length,
  }
}

export function lessonAllows(state: GameState | null, action: string, id?: string): boolean {
  const lesson = currentLesson(state)
  if (!lesson || (lesson.action === action && lesson.id === id)) return true
  return (lesson.action === 'price' || lesson.action === 'open') && id === 'salt'
    && (action === 'price-down' || action === 'price-up')
}

export function advanceTutorial(state: GameState, action: string, id?: string): boolean {
  const lesson = currentLesson(state)
  if (!lesson || !lessonAllows(state, action, id) || (lesson.action === 'open' && action !== 'open')) return false
  if (lesson.step + 1 === lesson.total) {
    delete state.tutorialStep
    return true
  }
  // Older saves can reach the menu with the starter dish already enabled.
  const alreadyEnabled = lesson.action === 'prep-menu' && state.menu.salt.enabled
  state.tutorialStep = lesson.step + (alreadyEnabled ? 2 : 1)
  return false
}
