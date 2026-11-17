import type { GameState } from './types.ts'

interface Lesson {
  action: string
  id?: string
  instruction: string
}

const lessons: readonly Lesson[] = [
  { action: 'buy', id: 'rice', instruction: 'Nhập một bịch bánh tráng cắt sợi.' },
  { action: 'buy', id: 'shrimpSalt', instruction: 'Nhập muối tôm Tây Ninh để nêm bánh.' },
  { action: 'buy', id: 'kumquat', instruction: 'Nhập tắc tươi. Nước cốt tắc giúp bánh mềm hơn.' },
  { action: 'buy', id: 'pack', instruction: 'Nhập bộ đóng gói kèm đũa tre.' },
  { action: 'prep-menu', instruction: 'Mở Menu hôm nay để xem món muối tắc đang bật.' },
  { action: 'open', instruction: 'Bánh tráng muối tắc đã sẵn sàng bán. Hãy mở cửa tiệm!' },
  { action: 'customer', instruction: 'Chọn vị khách đầu tiên để đọc đơn.' },
  { action: 'ingredient', id: 'rice', instruction: 'Chạm hoặc kéo bánh tráng vào thau.' },
  { action: 'ingredient', id: 'kumquat', instruction: 'Vắt tắc vào thau để làm mềm bánh.' },
  { action: 'ingredient', id: 'shrimpSalt', instruction: 'Thêm một phần muối tôm.' },
  { action: 'mix', instruction: 'Bấm Trộn đều tay để bánh thấm gia vị.' },
  { action: 'mix-ready', instruction: 'Đợi thanh tiến độ đạt 100%.' },
  { action: 'final-mix', instruction: 'Bấm Trộn nhẹ để các sợi bánh hòa đều.' },
  { action: 'pack', id: 'bag', instruction: 'Chọn Bịch nilon. Tiệm sẽ kèm một đôi đũa tre.' },
  { action: 'deliver', instruction: 'Bấm Giao món để phục vụ vị khách đầu tiên.' },
]

export function validTutorialStep(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < lessons.length)
}

export function currentLesson(state: GameState | null) {
  const step = state?.tutorialStep
  if (state?.day !== 1 || state.phase === 'report' || step === undefined) return undefined
  const lesson = lessons[step]
  if (!lesson) return undefined
  const customerId = state.shift?.queue[0]?.id
  return {
    ...lesson,
    id: lesson.action === 'customer' && customerId !== undefined ? String(customerId) : lesson.id,
    instruction: lesson.action === 'customer' && customerId === undefined ? 'Đợi vị khách đầu tiên ghé quầy.' : lesson.instruction,
    step,
    total: lessons.length,
  }
}

export function lessonAllows(state: GameState | null, action: string, id?: string): boolean {
  const lesson = currentLesson(state)
  return !lesson || (lesson.action === action && lesson.id === id)
}

export function advanceTutorial(state: GameState, action: string, id?: string): boolean {
  const lesson = currentLesson(state)
  if (!lesson || !lessonAllows(state, action, id)) return false
  if (lesson.step + 1 === lesson.total) {
    delete state.tutorialStep
    return true
  }
  state.tutorialStep = lesson.step + 1
  return false
}
