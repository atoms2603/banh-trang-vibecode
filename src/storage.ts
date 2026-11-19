import { engagementRules, ingredientIds, menuIds, profiles, regularStories } from './data.ts'
import { salesRevenue } from './economy.ts'
import { createDailyActivity, createStories } from './engagement.ts'
import { CLOSE_MINUTE, OPEN_MINUTE, SHIFT_MS } from './game.ts'
import { upgradeTutorialStep, validTutorialStep } from './tutorial.ts'
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

function tally(value: unknown, version: number): value is Record<string, unknown> {
  if (!object(value) || !object(value.sales)) return false
  return ['lost', 'used', 'waste', 'purchases', 'stars', 'reviewCount'].every(key => integer(value[key]))
    && (version < 6 || ['completedOrders', 'tips', 'xpEarned'].every(key => integer(value[key])))
    && Object.entries(value.sales).every(([key, line]) => menuIds.some(id => id === key)
      && object(line) && integer(line.count) && integer(line.revenue))
}

function mission(value: unknown): boolean {
  return object(value) && ['orders', 'perfect', 'quick', 'good'].includes(String(value.kind))
    && integer(value.target, 1) && integer(value.progress, 0, value.target)
    && integer(value.cash) && integer(value.xp) && typeof value.rewarded === 'boolean'
    && value.rewarded === (value.progress === value.target)
}

function dailyActivity(value: unknown, day: number): boolean {
  if (!object(value) || value.day !== day || !Array.isArray(value.missions) || value.missions.length !== 2
    || !value.missions.every(mission) || !object(value.missions[0]) || !object(value.missions[1])
    || value.missions[0].kind !== 'orders' || value.missions[1].kind === 'orders') return false
  const special = value.special
  return special === null || (day >= engagementRules.specialStartDay && object(special) && timer(special.atMs)
    && special.atMs >= engagementRules.specialStartMs && special.atMs <= engagementRules.specialEndMs
    && ['perfect', 'crispy'].includes(String(special.kind)) && ['pending', 'arrived', 'skipped'].includes(String(special.status)))
}

function report(value: unknown, version: number): boolean {
  return tally(value, version) && integer(value.day, 1) && integer(value.level, 1, 4)
    && (version < 6 || (Array.isArray(value.missions) && value.missions.every(mission)))
    && (value.closedAt === undefined || integer(value.closedAt, OPEN_MINUTE, CLOSE_MINUTE))
    && ['sold', 'revenue', 'spoilage', 'overhead', 'wages', 'tax'].every(key => integer(value[key]))
    && ['profit', 'cashDelta', 'cash'].every(key => integer(value[key], Number.MIN_SAFE_INTEGER))
}

function validShift(value: unknown, version: number): boolean {
  if (!object(value) || !timer(value.elapsedMs) || value.elapsedMs >= SHIFT_MS
    || !timer(value.nextArrivalMs) || !Array.isArray(value.queue) || !object(value.bowl)) return false
  const validGuests = value.queue.every(guest => object(guest) && integer(guest.id, 1)
    && integer(guest.profile, 0, profiles.length - 1)
    && timer(guest.arrivalMs) && timer(guest.patienceMs) && guest.patienceMs > 0
    && object(guest.order) && menuIds.some(id => id === (guest.order as Record<string, unknown>).dish)
    && recipe(guest.order.recipe) && integer(guest.order.price, 1000) && integer(guest.order.heat, 0, 3)
    && (version < 5 || (integer(guest.order.quantity, 1, 3) && Array.isArray(guest.servedPortions)
      && guest.servedPortions.length < guest.order.quantity
      && guest.servedPortions.every(portion => object(portion) && integer(portion.stars, 1, 5) && typeof portion.text === 'string')))
    && (version < 6 || ((guest.storyStage === undefined || (integer(guest.storyStage, 0, 2)
      && Boolean(regularStories[Number(guest.profile)])))
      && (guest.special === undefined || (guest.profile === engagementRules.specialProfile && guest.order.quantity === 1 && guest.storyStage === undefined
        && ['perfect', 'crispy'].includes(String(guest.special))))))
    && ['noCilantro', 'extraMango', 'pricey'].every(flag => typeof (guest.order as Record<string, unknown>)[flag] === 'boolean'))
  const { bowl } = value
  return validGuests && (value.activeId === null ? value.queue.length === 0 : value.queue.some(guest => guest.id === value.activeId))
    && recipe(bowl.ingredients) && integer(bowl.heat, 0, 3) && timer(bowl.mixMs) && bowl.mixMs <= 2400
    && ['mixing', 'finalMixed', 'soggy'].every(flag => typeof bowl[flag] === 'boolean')
    && integer(bowl.sequenceErrors) && (bowl.pack === null || bowl.pack === 'bag' || bowl.pack === 'box')
}

type SavedGame = GameState | (Omit<GameState, 'version'> & { version: 1 | 2 | 3 | 4 | 5 })

function validSave(value: unknown): value is SavedGame {
  if (!object(value) || !integer(value.version, 1, 6)
    || !validTutorialStep(value.tutorialStep, value.version) || !integer(value.day, 1) || !integer(value.level, 1, 4)
    || !integer(value.cash, Number.MIN_SAFE_INTEGER) || !integer(value.reputation) || !integer(value.nextCustomerId, 1)
    || typeof value.staff !== 'boolean' || typeof value.muted !== 'boolean' || !tally(value.tally, value.version)) return false
  if (value.version === 6 && ((value.daily !== null && !dailyActivity(value.daily, value.day))
    || (value.phase === 'prep' && value.daily === null) || !object(value.stories)
    || !Object.keys(regularStories).every(profile => {
      const story = (value.stories as Record<string, unknown>)[profile]
      return object(story) && integer(story.stage, 0, 3) && integer(story.lastVisitDay, 0, value.day as number)
    }))) return false
  const { inventory, menu, phase, shift, reviews, reports } = value
  if (!object(inventory) || !ingredientIds.every(id => integer(inventory[id])) || !object(menu)
    || !menuIds.every(id => {
      const setting = menu[id]
      return object(setting) && typeof setting.enabled === 'boolean' && integer(setting.price, 1000)
    })) return false
  if (!Array.isArray(reports) || !reports.every(entry => report(entry, Number(value.version))) || !Array.isArray(reviews)
    || !reviews.every(review => object(review) && integer(review.customerId, 1)
      && integer(review.profile, 0, profiles.length - 1) && integer(review.day, 1)
      && integer(review.stars, 1, 5) && typeof review.text === 'string'
      && (review.departureReason === undefined || ['priceRefusal', 'timeout', 'closed'].some(reason => review.departureReason === reason))
      && (review.reply === undefined || ['polite', 'friendly', 'voucher'].some(id => review.reply === id)))) return false
  if (phase === 'shop') return validShift(shift, value.version)
  return shift === null && (phase === 'prep' || (phase === 'report' && reports.at(-1)?.day === value.day))
}

export function parseSave(raw: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!validSave(parsed)) return null
    if (parsed.version === 6) return parsed
    // Older builds credited sales when the day closed. Only open shifts have unpaid sales.
    const pendingRevenue = parsed.version === 1 && parsed.phase === 'shop' ? salesRevenue(parsed.tally) : 0
    const upgraded: GameState = {
      ...parsed, version: 6, cash: parsed.cash + pendingRevenue,
      daily: parsed.phase === 'prep' ? createDailyActivity(parsed.day, parsed.level) : null,
      stories: createStories(),
      tally: { ...parsed.tally, completedOrders: 0, tips: 0, xpEarned: 0 },
      reports: parsed.reports.map(entry => ({ ...entry, completedOrders: 0, tips: 0, xpEarned: 0, missions: [] })),
    }
    if (upgraded.shift) {
      upgraded.shift = {
        ...upgraded.shift,
        queue: upgraded.shift.queue.map(guest => ({
          ...guest,
          order: { ...guest.order, quantity: parsed.version < 5 ? 1 : guest.order.quantity },
          servedPortions: parsed.version < 5 ? [] : guest.servedPortions,
        })),
      }
    }
    if (parsed.tutorialStep !== undefined) upgraded.tutorialStep = upgradeTutorialStep(parsed.tutorialStep, parsed.version)
    return upgraded
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
