import { ingredientIds, menuIds, profiles } from './data.ts'
import { salesRevenue } from './economy.ts'
import { CLOSE_MINUTE, OPEN_MINUTE, SHIFT_MS } from './game.ts'
import { validTutorialStep } from './tutorial.ts'
import type { GameState } from './types.ts'

export const SAVE_KEY = 'tiem-banh-trang-tron-nho-v1'

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function integer(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
}

function timer(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function recipe(value: unknown): boolean {
  return object(value) && Object.entries(value).every(([key, count]) => ingredientIds.some(id => id === key) && integer(count))
}

function tally(value: unknown): value is Record<string, unknown> {
  if (!object(value) || !object(value.sales)) return false
  return ['lost', 'used', 'waste', 'purchases', 'stars', 'reviewCount'].every(key => integer(value[key]))
    && Object.entries(value.sales).every(([key, line]) => menuIds.some(id => id === key)
      && object(line) && integer(line.count) && integer(line.revenue))
}

function report(value: unknown): boolean {
  return tally(value) && integer(value.day, 1) && integer(value.level, 1, 4)
    && (value.closedAt === undefined || integer(value.closedAt, OPEN_MINUTE, CLOSE_MINUTE))
    && ['sold', 'revenue', 'spoilage', 'overhead', 'wages', 'tax'].every(key => integer(value[key]))
    && ['profit', 'cashDelta', 'cash'].every(key => integer(value[key], Number.MIN_SAFE_INTEGER))
}

function validShift(value: unknown): boolean {
  if (!object(value) || !timer(value.elapsedMs) || value.elapsedMs >= SHIFT_MS
    || !timer(value.nextArrivalMs) || !Array.isArray(value.queue) || !object(value.bowl)) return false
  const validGuests = value.queue.every(guest => object(guest) && integer(guest.id, 1)
    && integer(guest.profile, 0, profiles.length - 1)
    && timer(guest.arrivalMs) && timer(guest.patienceMs) && guest.patienceMs > 0
    && object(guest.order) && menuIds.some(id => id === (guest.order as Record<string, unknown>).dish)
    && recipe(guest.order.recipe) && integer(guest.order.price, 1000) && integer(guest.order.heat, 0, 3)
    && ['noCilantro', 'extraMango', 'pricey'].every(flag => typeof (guest.order as Record<string, unknown>)[flag] === 'boolean'))
  const { bowl } = value
  return validGuests && (value.activeId === null ? value.queue.length === 0 : value.queue.some(guest => guest.id === value.activeId))
    && recipe(bowl.ingredients) && integer(bowl.heat, 0, 3) && timer(bowl.mixMs) && bowl.mixMs <= 2400
    && ['mixing', 'finalMixed', 'soggy'].every(flag => typeof bowl[flag] === 'boolean')
    && integer(bowl.sequenceErrors) && (bowl.pack === null || bowl.pack === 'bag' || bowl.pack === 'box')
}

type SavedGame = GameState | (Omit<GameState, 'version'> & { version: 1 })

function validSave(value: unknown): value is SavedGame {
  if (!object(value) || (value.version !== 1 && value.version !== 2) || !validTutorialStep(value.tutorialStep) || !integer(value.day, 1) || !integer(value.level, 1, 4)
    || !integer(value.cash, Number.MIN_SAFE_INTEGER) || !integer(value.reputation) || !integer(value.nextCustomerId, 1)
    || typeof value.staff !== 'boolean' || typeof value.muted !== 'boolean' || !tally(value.tally)) return false
  const { inventory, menu, phase, shift, reviews, reports } = value
  if (!object(inventory) || !ingredientIds.every(id => integer(inventory[id])) || !object(menu)
    || !menuIds.every(id => {
      const setting = menu[id]
      return object(setting) && typeof setting.enabled === 'boolean' && integer(setting.price, 1000)
    })) return false
  if (!Array.isArray(reports) || !reports.every(report) || !Array.isArray(reviews)
    || !reviews.every(review => object(review) && integer(review.customerId, 1)
      && integer(review.profile, 0, profiles.length - 1) && integer(review.day, 1)
      && integer(review.stars, 1, 5) && typeof review.text === 'string'
      && (review.departureReason === undefined || ['priceRefusal', 'timeout', 'closed'].some(reason => review.departureReason === reason))
      && (review.reply === undefined || ['polite', 'friendly', 'voucher'].some(id => review.reply === id)))) return false
  if (phase === 'shop') return validShift(shift)
  return shift === null && (phase === 'prep' || (phase === 'report' && reports.at(-1)?.day === value.day))
}

export function parseSave(raw: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!validSave(parsed)) return null
    if (parsed.version === 2) return parsed
    // Older builds credited sales when the day closed. Only open shifts have unpaid sales.
    const pendingRevenue = parsed.phase === 'shop' ? salesRevenue(parsed.tally) : 0
    return { ...parsed, version: 2, cash: parsed.cash + pendingRevenue }
  } catch {
    return null
  }
}

export function loadGame(): { game: GameState | null; warning: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return { game: null, warning: '' }
    const game = parseSave(raw)
    return { game, warning: game ? '' : 'Bản lưu bị lỗi. Bạn có thể bắt đầu một tiệm mới.' }
  } catch {
    return { game: null, warning: 'Trình duyệt đang chặn lưu tiến trình trên thiết bị này.' }
  }
}

export function saveGame(state: GameState): string {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    return ''
  } catch {
    return 'Chưa lưu được tiến trình. Kiểm tra dung lượng hoặc quyền lưu của trình duyệt.'
  }
}
