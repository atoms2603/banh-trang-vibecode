import { engagementRules, ingredientIds, menuIds, profiles, regularStories, shiftPolicies } from './data.ts'
import { bowlZones, emptyZones, extraPortionIds, isSeasoning } from './coating.ts'
import { salesRevenue } from './economy.ts'
import { createDailyActivity, createStories } from './engagement.ts'
import { CLOSE_MINUTE, OPEN_MINUTE } from './game.ts'
import { upgradeTutorialStep, validTutorialStep } from './tutorial.ts'
import type { DailyMission, DailyReport, DayRulesId, GameState, HighlightVisit, SpecialKind } from './types.ts'

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

function orderExtra(order: Record<string, unknown>): boolean {
  return order.extra === undefined || (object(order.recipe)
    && extraPortionIds.some(id => id === order.extra && (order.recipe as Record<string, unknown>)[id] === 2))
}

function portionDetails(value: unknown): boolean {
  return object(value) && recipe(value.recipe) && integer(value.heat, 0, 3) && Array.isArray(value.issues)
    && value.issues.every(issue => object(issue) && ['missing', 'extra', 'uneven', 'heat', 'soggy', 'sequence', 'final-mix', 'slow', 'price'].includes(String(issue.kind))
      && (issue.ingredient === undefined || ingredientIds.some(id => id === issue.ingredient)))
}

function reviewDetails(value: unknown): boolean {
  if (!object(value) || !object(value.order) || !Array.isArray(value.portions)) return false
  const { order, portions } = value
  return menuIds.some(id => id === order.dish) && recipe(order.recipe) && orderExtra(order) && (order.heat === undefined || integer(order.heat, 0, 3))
    && typeof order.extraMango === 'boolean' && typeof order.noCilantro === 'boolean' && integer(order.quantity, 1, 3)
    && portions.length <= order.quantity && portions.some(portion => portion !== null)
    && portions.every(portion => portion === null || portionDetails(portion))
}

function validCoating(value: unknown, used: Record<string, unknown>): boolean {
  const coatedIds = ingredientIds.filter(id => id !== 'rice' && id !== 'pack')
  if (!object(value) || !Object.keys(value).every(key => coatedIds.some(id => id === key))) return false
  return coatedIds.every(id => {
    const zones = value[id]
    if (zones === undefined) return !used[id]
    return Array.isArray(zones) && zones.length === bowlZones && zones.every(timer)
      && (isSeasoning(id) || zones.every(dose => Number.isInteger(dose)))
      && Math.abs(zones.reduce((sum, dose) => sum + dose, 0) - Number(used[id] ?? 0)) < 1e-6
  })
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

function highlight(value: unknown, day: number, rulesId: DayRulesId): boolean {
  if (value === null) return true
  const rules = shiftPolicies[rulesId]
  if (!object(value) || !integer(value.profile, 0, profiles.length - 1) || !timer(value.atMs)
    || value.atMs < rules.highlightStartMs || (rulesId === 'legacy-240' ? value.atMs > rules.highlightEndMs : value.atMs >= rules.highlightEndMs)
    || !['pending', 'arrived', 'skipped'].includes(String(value.status))) return false
  if (value.kind === 'special') return day >= engagementRules.specialStartDay && value.profile === engagementRules.specialProfile
    && value.storyStage === undefined && ['perfect', 'crispy'].includes(String(value.specialKind))
  if (rulesId === 'legacy-240' || day < engagementRules.regularStartDay || value.specialKind !== undefined) return false
  if (value.kind === 'story') return Boolean(regularStories[value.profile]) && integer(value.storyStage, 0, regularStories[value.profile].chapters.length - 1)
  return value.kind === 'group' && value.storyStage === undefined
}

function dailyActivity(value: unknown, day: number, version: number, rulesId: DayRulesId): boolean {
  if (!object(value) || value.day !== day || !Array.isArray(value.missions) || value.missions.length !== 2
    || !value.missions.every(mission) || !object(value.missions[0]) || !object(value.missions[1])
    || value.missions[0].kind !== 'orders' || value.missions[1].kind === 'orders') return false
  if (version >= 7) return highlight(value.highlight, day, rulesId)
  const special = value.special
  return special === null || (object(special) && highlight({ ...special, kind: 'special', profile: engagementRules.specialProfile, specialKind: special.kind }, day, 'legacy-240'))
}

function report(value: unknown, version: number): boolean {
  return tally(value, version) && integer(value.day, 1) && integer(value.level, 1, 4)
    && (version < 7 || ['time', 'queue-cleared', 'manual'].includes(String(value.endReason)))
    && (version < 6 || (Array.isArray(value.missions) && value.missions.every(mission)))
    && (value.closedAt === undefined || integer(value.closedAt, OPEN_MINUTE, CLOSE_MINUTE))
    && ['sold', 'revenue', 'spoilage', 'overhead', 'wages', 'tax'].every(key => integer(value[key]))
    && ['profit', 'cashDelta', 'cash'].every(key => integer(value[key], Number.MIN_SAFE_INTEGER))
}

function validShift(value: unknown, version: number, rulesId: DayRulesId): boolean {
  const duration = version < 7 ? shiftPolicies['legacy-240'].durationMs : shiftPolicies[rulesId].durationMs
  if (!object(value) || !timer(value.elapsedMs) || value.elapsedMs >= duration
    || !timer(value.nextArrivalMs) || !Array.isArray(value.queue) || !object(value.bowl)) return false
  const validGuests = value.queue.every(guest => object(guest) && integer(guest.id, 1)
    && integer(guest.profile, 0, profiles.length - 1)
    && timer(guest.arrivalMs) && timer(guest.patienceMs) && guest.patienceMs > 0
    && object(guest.order) && menuIds.some(id => id === (guest.order as Record<string, unknown>).dish)
    && recipe(guest.order.recipe) && orderExtra(guest.order) && integer(guest.order.price, 1000)
    && (version >= 9 && value.directBowl === true ? guest.order.heat === undefined : integer(guest.order.heat, 0, 3))
    && (version < 5 || (integer(guest.order.quantity, 1, 3) && Array.isArray(guest.servedPortions)
      && guest.servedPortions.length < guest.order.quantity
      && guest.servedPortions.every(portion => object(portion) && integer(portion.stars, 1, 5) && typeof portion.text === 'string'
        && (portion.details === undefined || portionDetails(portion.details)))))
    && (version < 6 || ((guest.storyStage === undefined || (integer(guest.storyStage, 0, 2)
      && Boolean(regularStories[Number(guest.profile)])))
      && (guest.special === undefined || (guest.profile === engagementRules.specialProfile && guest.order.quantity === 1 && guest.storyStage === undefined
        && ['perfect', 'crispy'].includes(String(guest.special))))))
    && ['noCilantro', 'extraMango', 'pricey'].every(flag => typeof (guest.order as Record<string, unknown>)[flag] === 'boolean'))
  const { bowl } = value
  return validGuests && (value.activeId === null ? value.queue.length === 0 : value.queue.some(guest => guest.id === value.activeId))
    && (value.directSalt === undefined || (version === 8 && value.directSalt === true))
    && (value.directBowl === undefined || (version >= 9 && value.directBowl === true))
    && recipe(bowl.ingredients) && object(bowl.ingredients)
    && (bowl.coating === undefined || ((value.directSalt === true || value.directBowl === true) && validCoating(bowl.coating, bowl.ingredients)))
    && (bowl.evenCuePlayed === undefined || (bowl.coating !== undefined && bowl.evenCuePlayed === true))
    && (bowl.crunchFolds === undefined || (value.directBowl === true && integer(bowl.crunchFolds, 1, 3)))
    && integer(bowl.heat, 0, 3) && timer(bowl.mixMs) && bowl.mixMs <= 2400
    && ['mixing', 'finalMixed', 'soggy'].every(flag => typeof bowl[flag] === 'boolean')
    && integer(bowl.sequenceErrors) && (bowl.pack === null || bowl.pack === 'bag')
}

type LegacyGame = Omit<GameState, 'version' | 'dayRules' | 'daily' | 'reports'> & {
  version: 1 | 2 | 3 | 4 | 5 | 6
  daily: { day: number; missions: DailyMission[]; special: { atMs: number; kind: SpecialKind; status: HighlightVisit['status'] } | null } | null
  reports: Array<Omit<DailyReport, 'endReason'>>
}
type PreviousGame = Omit<GameState, 'version' | 'shift'> & {
  version: 7 | 8
  shift: (NonNullable<GameState['shift']> & { directSalt?: true }) | null
}
type SavedGame = GameState | PreviousGame | LegacyGame

function upgradeDirectBowl(state: PreviousGame): GameState {
  const shift = state.shift
  if (!shift?.directSalt) return { ...state, version: 9 }
  delete shift.directSalt
  shift.directBowl = true
  for (const guest of shift.queue) delete guest.order.heat
  const bowl = shift.bowl
  bowl.mixing = false
  for (const id of ingredientIds) {
    if (id === 'rice' || id === 'pack') continue
    const dose = bowl.ingredients[id] ?? 0
    if (!dose || bowl.coating?.[id]) continue
    // The old bowl did not track placement. Credit ingredients already paid for.
    const zones = emptyZones()
    if (isSeasoning(id)) zones.fill(dose / bowlZones)
    else zones[0] = dose
    const coating = bowl.coating ??= {}
    coating[id] = zones
  }
  return { ...state, version: 9 }
}

function validSave(value: unknown): value is SavedGame {
  if (!object(value) || !integer(value.version, 1, 9)
    || !validTutorialStep(value.tutorialStep, value.version) || !integer(value.day, 1) || !integer(value.level, 1, 4)
    || !integer(value.cash, Number.MIN_SAFE_INTEGER) || !integer(value.reputation) || !integer(value.nextCustomerId, 1)
    || typeof value.staff !== 'boolean' || typeof value.muted !== 'boolean' || !tally(value.tally, value.version)) return false
  const rulesId = value.version < 7 ? 'legacy-240' : value.dayRules
  if (rulesId !== 'legacy-240' && rulesId !== 'short-105') return false
  if (value.version >= 6 && ((value.daily !== null && !dailyActivity(value.daily, value.day, value.version, rulesId))
    || (value.phase === 'prep' && value.daily === null) || !object(value.stories)
    || (rulesId === 'short-105' && value.daily === null)
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
      && (review.details === undefined || reviewDetails(review.details))
      && (review.departureReason === undefined || ['priceRefusal', 'timeout', 'closed'].some(reason => review.departureReason === reason))
      && (review.reply === undefined || ['polite', 'friendly', 'voucher'].some(id => review.reply === id)))) return false
  if (phase === 'shop') return validShift(shift, value.version, rulesId)
  return shift === null && (phase === 'prep' || (phase === 'report' && reports.at(-1)?.day === value.day))
}

export function parseSave(raw: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    // Existing packed meals remain deliverable without charging another set.
    if (object(parsed) && object(parsed.shift) && object(parsed.shift.bowl) && parsed.shift.bowl.pack === 'box') {
      parsed.shift.bowl.pack = 'bag'
    }
    if (!validSave(parsed)) return null
    if (parsed.version === 9) return parsed
    if (parsed.version === 7 || parsed.version === 8) return upgradeDirectBowl(parsed)
    // Older builds credited sales when the day closed. Only open shifts have unpaid sales.
    const pendingRevenue = parsed.version === 1 && parsed.phase === 'shop' ? salesRevenue(parsed.tally) : 0
    const oldHighlight = parsed.version === 6 ? parsed.daily?.special : null
    const upgraded: GameState = {
      ...parsed, version: 9, dayRules: parsed.phase === 'prep' ? 'short-105' : 'legacy-240', cash: parsed.cash + pendingRevenue,
      daily: parsed.phase === 'prep' ? createDailyActivity(parsed.day, parsed.level) : null,
      stories: parsed.version === 6 ? parsed.stories : createStories(),
      tally: parsed.version === 6 ? parsed.tally : { ...parsed.tally, completedOrders: 0, tips: 0, xpEarned: 0 },
      reports: parsed.reports.map(entry => ({
        ...entry, ...(parsed.version < 6 ? { completedOrders: 0, tips: 0, xpEarned: 0, missions: [] } : {}),
        endReason: entry.closedAt === undefined || entry.closedAt === CLOSE_MINUTE ? 'time' : 'manual',
      })),
    }
    if (parsed.phase !== 'prep' && parsed.version === 6 && parsed.daily) upgraded.daily = {
      day: parsed.daily.day, missions: parsed.daily.missions,
      highlight: oldHighlight ? { kind: 'special', profile: engagementRules.specialProfile, atMs: oldHighlight.atMs, status: oldHighlight.status, specialKind: oldHighlight.kind } : null,
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
