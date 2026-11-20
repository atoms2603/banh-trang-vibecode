import { engagementRules, heatLabels, ingredientIds, ingredients, levels, market, menu, menuIds, profiles, regularStories, shiftPolicies } from './data.ts'
import { addExperience, defaultPrice, emptyTally, hasStock, money, priceBand, priceOf, settleDay, tallySale } from './economy.ts'
import { completeVisit, createDailyActivity, createStories, currentShiftPhase, getShiftRules, shiftNotice } from './engagement.ts'
import { reviewLine } from './reviews.ts'
import { advanceTutorial, currentLesson } from './tutorial.ts'
import type { Bowl, CloseReason, Customer, DepartureReason, GameState, Heat, HighlightVisit, IngredientId, Inventory, Level, MenuId, Order, Packaging, Recipe, ReplyId, SpecialKind, Stars } from './types.ts'

export const OPEN_MINUTE = 8 * 60
export const CLOSE_MINUTE = 21 * 60
export const SHIFT_MS = shiftPolicies['short-105'].durationMs
export const PATIENCE_MS = engagementRules.patienceMs
const EXTRA_PORTION_PATIENCE_MS = engagementRules.extraPortionPatienceMs

interface Result {
  ok: boolean
  message: string
  departureText?: string
}

function success(message = ''): Result {
  return { ok: true, message }
}

function problem(message: string): Result {
  return { ok: false, message }
}

function emptyBowl(): Bowl {
  return { ingredients: {}, heat: 0, mixMs: 0, mixing: false, finalMixed: false, pack: null, sequenceErrors: 0, soggy: false }
}

export function newGame(guided = false): GameState {
  return {
    version: 7, dayRules: 'short-105', ...(guided ? { tutorialStep: 0 } : {}), phase: 'prep', day: 1, cash: 150000, reputation: 0, level: 1,
    inventory: Object.fromEntries(ingredientIds.map(id => [id, 0])) as Inventory,
    menu: Object.fromEntries(menuIds.map(id => [id, { enabled: !guided && id === 'salt', price: defaultPrice(id) }])) as GameState['menu'],
    reviews: [], reports: [], staff: false, muted: false, nextCustomerId: 1,
    tally: emptyTally(), shift: null, daily: createDailyActivity(1, 1), stories: createStories(),
  }
}

export function enabledDishes(state: GameState): MenuId[] {
  return menuIds.filter(id => menu[id].level <= state.level && state.menu[id].enabled)
}

export function marketUnlocked(state: GameState, items: Recipe): boolean {
  return ingredientIds.every(id => !items[id] || state.level >= ingredients[id].level)
}

export function purchase(state: GameState, packId: string): Result {
  const pack = market.find(item => item.id === packId)
  if (state.phase !== 'prep' || !pack || !marketUnlocked(state, pack.items)) return problem('Mặt hàng này chưa mở bán.')
  const price = priceOf(pack.items)
  if (state.cash < price) return problem('Két chưa đủ tiền để nhập lô này.')
  state.cash -= price
  state.tally.purchases += price
  for (const id of ingredientIds) state.inventory[id] += pack.items[id] ?? 0
  return success('Đã nhập ' + pack.name.toLocaleLowerCase('vi') + '.')
}

export function toggleDish(state: GameState, id: MenuId): Result {
  if (state.phase !== 'prep' || menu[id].level > state.level) return problem('Món này chưa mở khóa.')
  state.menu[id].enabled = !state.menu[id].enabled
  return success()
}

export function changePrice(state: GameState, id: MenuId, direction: -1 | 1): Result {
  if (state.phase !== 'prep' || menu[id].level > state.level) return problem('Chỉnh giá trong lúc chuẩn bị mở tiệm.')
  state.menu[id].price = Math.max(1000, state.menu[id].price + direction * 1000)
  return success()
}

export function toggleStaff(state: GameState): Result {
  if (state.phase !== 'prep' || state.level < 4) return problem('Có thể thuê phụ bếp từ cấp 4.')
  state.staff = !state.staff
  return success(state.staff ? 'Đã thuê phụ bếp cho ca bán.' : 'Hôm nay bạn tự đứng bếp.')
}

export function openingProblem(state: GameState): string {
  const dishes = enabledDishes(state)
  if (!dishes.length) return 'Bật ít nhất một món trong Menu hôm nay.'
  const missing = dishes.find(id => !hasStock(state.inventory, menu[id].recipe))
  return missing ? 'Chưa đủ hàng cho ' + menu[missing].name.toLocaleLowerCase('vi') + '.' : ''
}

export function openShop(state: GameState, random: () => number = Math.random): Result {
  if (state.phase !== 'prep') return problem('Tiệm đã qua giờ chuẩn bị.')
  const warning = openingProblem(state)
  if (warning) return problem(warning)
  state.phase = 'shop'
  state.shift = { elapsedMs: 0, nextArrivalMs: engagementRules.firstArrivalMs, queue: [], activeId: null, bowl: emptyBowl() }
  if (state.daily) state.daily.highlight = planHighlight(state, random)
  return success()
}

export function currentCustomer(state: GameState): Customer | undefined {
  return state.shift?.queue.find(customer => customer.id === state.shift?.activeId)
}

export function mixDuration(state: GameState): number {
  return state.staff ? 1600 : 2400
}

export function mixProgress(state: GameState): number {
  return Math.min(100, (state.shift?.bowl.mixMs ?? 0) / mixDuration(state) * 100)
}

export function patienceLeft(state: GameState, customer: Customer): number {
  return Math.max(0, 1 - ((state.shift?.elapsedMs ?? 0) - customer.arrivalMs) / customer.patienceMs)
}

export function selectCustomer(state: GameState, id: number): Result {
  const shift = state.shift
  if (!shift || !shift.queue.some(customer => customer.id === id)) return problem('Khách đã rời hàng chờ.')
  if (shift.activeId === id) return success()
  if (priceOf(shift.bowl.ingredients) > 0) return problem('Hãy giao hoặc đổ phần trong thau trước khi đổi đơn.')
  shift.activeId = id
  shift.bowl = emptyBowl()
  return success()
}

function needsCrunchLast(bowl: Bowl): boolean {
  return Boolean(bowl.ingredients.peanut || bowl.ingredients.shallot)
}

export function addIngredient(state: GameState, id: IngredientId): Result {
  const bowl = state.shift?.bowl
  if (!bowl || !currentCustomer(state)) return problem('Chọn khách trước khi lấy nguyên liệu.')
  if (bowl.mixing) return problem('Đợi trộn lần đầu xong rồi thêm nguyên liệu nhé.')
  if (bowl.pack) return problem('Phần bánh đã đóng gói.')
  if (state.level < ingredients[id].level) return problem('Nguyên liệu chưa mở khóa.')
  if (id === 'pack' || state.inventory[id] <= 0) return problem(ingredients[id].short + ' đã hết.')
  const amount = bowl.ingredients[id] ?? 0
  if (amount >= 3 || (id === 'rice' && amount)) return problem('Thau đã có đủ ' + ingredients[id].short.toLocaleLowerCase('vi') + '.')

  const category = ingredients[id].category
  const firstMixed = mixProgress(state) >= 100
  if (category !== 'base' && !bowl.ingredients.rice) bowl.sequenceErrors++
  if (category === 'seasoning' && (id !== 'kumquat' && !bowl.ingredients.kumquat)) bowl.sequenceErrors++
  if (category === 'seasoning' && firstMixed) bowl.sequenceErrors++
  if (category === 'topping' && (!firstMixed || needsCrunchLast(bowl))) bowl.sequenceErrors++
  if ((category === 'crunch' && !firstMixed) || (category === 'seasoning' && needsCrunchLast(bowl))) bowl.soggy = true
  if (bowl.finalMixed) {
    bowl.sequenceErrors++
    bowl.finalMixed = false
  }

  bowl.ingredients[id] = amount + 1
  state.inventory[id]--
  return success('Đã thêm ' + ingredients[id].short.toLocaleLowerCase('vi') + '.')
}

export function addHeat(state: GameState, heat: Heat): Result {
  const bowl = state.shift?.bowl
  if (!bowl || !currentCustomer(state)) return problem('Chọn khách trước khi chọn mức cay.')
  if (bowl.ingredients.chili) return problem('Sa tế đã vào thau. Đổ phần bánh nếu muốn làm lại mức cay.')
  if (bowl.pack) return problem('Phần bánh đã đóng gói.')
  if (!heat) return success('Để phần này không cay.')
  const added = addIngredient(state, 'chili')
  if (!added.ok) return added
  bowl.heat = heat
  return success('Đã thêm sa tế · ' + heatLabels[heat] + '.')
}

export function toggleMix(state: GameState): Result {
  const bowl = state.shift?.bowl
  if (!bowl?.ingredients.rice) return problem('Cho bánh tráng vào thau trước.')
  if (mixProgress(state) >= 100) return problem('Bánh đã thấm gia vị. Bạn có thể thêm topping.')
  bowl.mixing = !bowl.mixing
  return success(bowl.mixing ? 'Đang trộn bánh…' : 'Đã tạm dừng trộn.')
}

export function finishMix(state: GameState): Result {
  const bowl = state.shift?.bowl
  if (!bowl || mixProgress(state) < 100) return problem('Trộn lần đầu đến 100% trước nhé.')
  if (bowl.pack) return problem('Phần bánh đã đóng gói.')
  if (bowl.finalMixed) return problem('Phần bánh đã được trộn nhẹ.')
  bowl.finalMixed = true
  return success('Trộn nhẹ xong. Đóng gói cho khách nào!')
}

export function packBowl(state: GameState, type: Packaging): Result {
  const bowl = state.shift?.bowl
  if (!bowl?.ingredients.rice || bowl.mixing) return problem('Chuẩn bị bánh trong thau trước khi đóng gói.')
  if (mixProgress(state) < 100) return problem('Trộn lần đầu đến 100% trước khi đóng gói.')
  if (type === 'box' && state.level < 3) return problem('Hộp giấy mở khóa ở cấp 3.')
  if (bowl.pack) {
    bowl.pack = type
    return success()
  }
  if (state.inventory.pack <= 0) return problem('Đã hết bộ đóng gói và đũa tre.')
  bowl.pack = type
  bowl.ingredients.pack = 1
  state.inventory.pack--
  return success(type === 'bag' ? 'Đã đóng bịch và kèm đũa tre.' : 'Đã đóng hộp và kèm đũa tre.')
}

export function trashBowl(state: GameState): Result {
  const shift = state.shift
  const cost = priceOf(shift?.bowl.ingredients ?? {})
  if (!shift || !cost) return problem('Thau đang trống.')
  state.tally.waste += cost
  shift.bowl = emptyBowl()
  return success('Đã đổ phần bánh · hao hụt ' + money(cost) + '.')
}

function recordReview(state: GameState, customer: Customer, stars: Stars, text: string, departureReason?: DepartureReason): void {
  state.reviews.push({ customerId: customer.id, profile: customer.profile, day: state.day, stars, text, ...(departureReason ? { departureReason } : {}) })
  state.tally.stars += stars
  state.tally.reviewCount++
  if (stars >= 3) addExperience(state, stars - 1)
}

function leaveQueue(state: GameState, customer: Customer, fulfilled: boolean): void {
  const shift = state.shift
  if (!shift) return
  shift.queue = shift.queue.filter(guest => guest.id !== customer.id)
  if (customer.id !== shift.activeId) return
  if (!fulfilled) trashBowl(state)
  shift.activeId = shift.queue[0]?.id ?? null
  shift.bowl = emptyBowl()
}

function loseCustomer(state: GameState, customer: Customer, reason: DepartureReason, stars: Stars = 1): void {
  state.tally.lost++
  recordReview(state, customer, stars, reviewLine(reason, customer, state.reviews), reason)
  leaveQueue(state, customer, false)
}

export function canDeliver(state: GameState): boolean {
  return Boolean(currentCustomer(state) && state.shift?.bowl.ingredients.rice && state.shift.bowl.pack && mixProgress(state) >= 100)
}

export function assessOrder(state: GameState, customer: Customer, bowl: Bowl): { stars: Stars; text: string } {
  const problems: string[] = []
  let deductions = 0
  const order = customer.order
  const comment = (kind: Parameters<typeof reviewLine>[0], ingredient?: string) => reviewLine(kind, customer, state.reviews, ingredient)

  if (bowl.heat !== order.heat) {
    problems.push(comment(order.heat === 0 ? 'noHeat' : bowl.heat > order.heat ? 'tooHot' : 'tooMild'))
    deductions += 2
  }
  if (order.noCilantro && bowl.ingredients.cilantro) {
    problems.push(comment('cilantro'))
    deductions += 2
  }
  if (order.extraMango && (bowl.ingredients.mango ?? 0) < 2) {
    problems.push(comment('mango'))
    deductions++
  }
  if (bowl.soggy) {
    problems.push(comment('soggy'))
    deductions += 2
  }

  const mismatch = ingredientIds.filter(id => id !== 'chili'
    && !(id === 'cilantro' && order.noCilantro)
    && !(id === 'mango' && order.extraMango)
    && (bowl.ingredients[id] ?? 0) !== (order.recipe[id] ?? 0))
  for (const id of mismatch) {
    problems.push(comment((bowl.ingredients[id] ?? 0) < (order.recipe[id] ?? 0) ? 'missing' : 'extra',
      ingredients[id].short.toLocaleLowerCase('vi')))
    deductions++
  }
  if (bowl.sequenceErrors) {
    problems.push(comment('uneven'))
    deductions += Math.min(2, bowl.sequenceErrors)
  }
  if (!bowl.finalMixed) {
    const hasToppings = ingredientIds.some(id => (ingredients[id].category === 'topping' || ingredients[id].category === 'crunch') && bowl.ingredients[id])
    problems.push(comment(hasToppings ? 'noFinalMix' : 'noFinalMixPlain'))
    deductions++
  }
  const patience = patienceLeft(state, customer)
  if (patience < 0.55) {
    problems.push(comment('slow'))
    deductions += patience < 0.25 ? 2 : 1
  }

  if (order.pricey) return {
    stars: deductions > 1 ? 1 : 2,
    text: [comment('pricey'), problems[0]].filter(Boolean).join(' '),
  }
  const stars = Math.max(1, 5 - deductions) as Stars
  if (problems.length) return { stars, text: problems.slice(0, 2).join(' ') }

  const custom = order.extraMango || order.noCilantro || order.heat > 0
  const praise = priceBand(order.dish, order.price) === 'low' ? 'budget' : custom ? 'custom' : 'praise'
  return { stars, text: comment(praise) }
}

export function deliver(state: GameState): Result {
  const customer = currentCustomer(state)
  const bowl = state.shift?.bowl
  if (!customer || !bowl || !canDeliver(state)) return problem('Trộn lần đầu và đóng gói trước khi giao.')
  const assessment = assessOrder(state, customer, bowl)
  const price = customer.order.price
  tallySale(state.tally, customer.order.dish, price, priceOf(bowl.ingredients))
  state.cash += price
  customer.servedPortions.push(assessment)
  if (customer.servedPortions.length < customer.order.quantity) {
    state.shift!.bowl = emptyBowl()
    return success(profiles[customer.profile].name + ' đã nhận ' + customer.servedPortions.length + '/' + customer.order.quantity + ' bịch. Làm tiếp bịch kế nhé!')
  }
  const stars = Math.round(customer.servedPortions.reduce((sum, portion) => sum + portion.stars, 0) / customer.order.quantity) as Stars
  const feedback = customer.servedPortions.reduce((worst, portion) => portion.stars < worst.stars ? portion : worst)
  state.tally.completedOrders++
  recordReview(state, customer, stars, feedback.text)
  const departureText = completeVisit(state, customer, stars, patienceLeft(state, customer), bowl)
  leaveQueue(state, customer, true)
  return { ...success(profiles[customer.profile].name + ' đã nhận món · ' + stars + ' ★'), departureText }
}

export function replyToReview(state: GameState, customerId: number, reply: ReplyId): Result {
  const review = state.reviews.find(entry => entry.customerId === customerId)
  if (!review || review.reply) return problem('Đánh giá này đã được phản hồi.')
  review.reply = reply
  if (review.stars <= 2) addExperience(state, 1)
  return success(review.stars <= 2 ? 'Đã gửi phản hồi · +1 EXP.' : 'Đã gửi phản hồi.')
}

export function makeOrder(state: GameState, dish: MenuId, random: () => number): Order {
  const recipe = { ...menu[dish].recipe }
  const heat = recipe.chili ? Math.floor(random() * 4) as Heat : 0
  const noCilantro = Boolean(recipe.cilantro && random() < 0.22)
  const extraMango = Boolean(recipe.mango && state.inventory.mango >= 2 && random() < 0.24)
  if (!heat) delete recipe.chili
  if (noCilantro) delete recipe.cilantro
  if (extraMango) recipe.mango = 2
  const price = state.menu[dish].price
  return { dish, quantity: 1, price, recipe, heat, noCilantro, extraMango, pricey: priceBand(dish, price) === 'high' }
}

function makeCustomer(state: GameState, dish: MenuId, profile: number, random: () => number, visit?: HighlightVisit): Customer {
  const shift = state.shift!
  const customer: Customer = {
    id: state.nextCustomerId++,
    profile,
    arrivalMs: shift.elapsedMs,
    patienceMs: PATIENCE_MS,
    order: makeOrder(state, dish, random),
    servedPortions: [],
    ...(visit?.specialKind ? { special: visit.specialKind } : {}),
  }
  if (visit) {
    customer.order.quantity = visit.kind === 'story' ? regularStories[profile].chapters[visit.storyStage!].quantity : visit.kind === 'group' ? 2 : 1
    // An optional extra must also fit every bag in the planned visit.
    if (customer.order.extraMango && state.inventory.mango < customer.order.quantity * 2) {
      customer.order.extraMango = false
      customer.order.recipe.mango = 1
    }
    if (visit.kind === 'story') {
      customer.storyStage = visit.storyStage
      state.stories[profile].lastVisitDay = state.day
    }
  } else if (!currentLesson(state)) {
    const roll = random()
    const desired = roll < 0.8 ? 1 : roll < 0.96 ? 2 : 3
    const available = Math.min(...ingredientIds.filter(id => customer.order.recipe[id])
      .map(id => Math.floor(state.inventory[id] / customer.order.recipe[id]!)))
    customer.order.quantity = Math.min(desired, available) as Order['quantity']
    const progress = state.stories[profile]
    const chapter = regularStories[profile]?.chapters[progress?.stage]
    if (state.dayRules === 'legacy-240' && state.daily && state.day >= engagementRules.regularStartDay && chapter && progress.lastVisitDay < state.day && available >= chapter.quantity) {
      customer.storyStage = progress.stage
      customer.order.quantity = chapter.quantity
      progress.lastVisitDay = state.day
    }
  }
  customer.patienceMs += (customer.order.quantity - 1) * EXTRA_PORTION_PATIENCE_MS
  return customer
}

function arrivalDelay(state: GameState, random: () => number, dish: MenuId): number {
  const baseInterval = [0, 10800, 9500, 8300, 7300][state.level]
  return (baseInterval + random() * 1500) * (priceBand(dish, state.menu[dish].price) === 'low' ? .72 : 1)
    * currentShiftPhase(state).intervalFactor
}

function spawnCustomer(state: GameState, random: () => number): boolean {
  const shift = state.shift
  if (!shift) return false
  const dishes = enabledDishes(state).filter(id => hasStock(state.inventory, menu[id].recipe))
  if (!dishes.length || shift.queue.length >= (state.level === 1 ? 3 : 4)) {
    shift.nextArrivalMs = shift.elapsedMs + 2000
    return false
  }
  const options = dishes.flatMap(id => priceBand(id, state.menu[id].price) === 'low' ? [id, id] : [id])
  const dish = options[Math.floor(random() * options.length)]
  const freeProfiles = profiles.map((_, index) => index).filter(index => !shift.queue.some(customer => customer.profile === index)
    && index !== state.daily?.highlight?.profile)
  const customer = makeCustomer(state, dish, freeProfiles[Math.floor(random() * freeProfiles.length)], random)

  shift.nextArrivalMs = shift.elapsedMs + arrivalDelay(state, random, dish)
  if (customer.order.pricey && random() < 0.45) {
    loseCustomer(state, customer, 'priceRefusal', customer.id % 2 ? 1 : 2)
    return true
  }

  shift.queue.push(customer)
  shift.activeId ??= customer.id
  return true
}

function specialDishes(state: GameState, kind?: SpecialKind): MenuId[] {
  return enabledDishes(state).filter(id => hasStock(state.inventory, menu[id].recipe)
    && priceBand(id, state.menu[id].price) !== 'high'
    && (kind !== 'crispy' || Boolean(menu[id].recipe.peanut || menu[id].recipe.shallot)))
}

function visitDishes(state: GameState, quantity: number): MenuId[] {
  return enabledDishes(state).filter(dish => ingredientIds.every(id => state.inventory[id] >= (menu[dish].recipe[id] ?? 0) * quantity))
}

function storyHighlight(state: GameState, atMs: number, onlyFree = false): HighlightVisit | null {
  const profiles = Object.keys(regularStories).map(Number)
  const start = (state.day - engagementRules.regularStartDay) % profiles.length
  for (let offset = 0; offset < profiles.length; offset++) {
    const profile = profiles[(start + offset) % profiles.length]
    const progress = state.stories[profile]
    const chapter = regularStories[profile].chapters[progress.stage]
    if (chapter && progress.lastVisitDay < state.day && visitDishes(state, chapter.quantity).length
      && (!onlyFree || !state.shift?.queue.some(guest => guest.profile === profile))) {
      return { kind: 'story', profile, storyStage: progress.stage, atMs, status: 'pending' }
    }
  }
  return null
}

function fallbackHighlight(state: GameState, atMs: number, onlyFree = false): HighlightVisit | null {
  const story = storyHighlight(state, atMs, onlyFree)
  if (story) return story
  const candidates = [1, 2, 5]
  const ordered = [...candidates.slice((state.day - 2) % 3), ...candidates.slice(0, (state.day - 2) % 3)]
  const profile = ordered.find(profile => !onlyFree || !state.shift?.queue.some(guest => guest.profile === profile))
  return profile === undefined ? null : { kind: 'group', profile, atMs, status: 'pending' }
}

function planHighlight(state: GameState, random: () => number): HighlightVisit | null {
  const rules = getShiftRules(state)
  if (state.day < engagementRules.regularStartDay) return null
  if (state.day >= engagementRules.specialStartDay && random() < engagementRules.specialChance && specialDishes(state).length) {
    const hasCrunch = specialDishes(state, 'crispy').length > 0
    const specialKind: SpecialKind = hasCrunch && random() < .5 ? 'crispy' : 'perfect'
    const atMs = state.dayRules === 'legacy-240'
      ? rules.highlightStartMs + Math.floor(random() * (rules.highlightEndMs - rules.highlightStartMs + 1))
      : rules.highlightStartMs
    return { kind: 'special', profile: engagementRules.specialProfile, specialKind, atMs, status: 'pending' }
  }
  return state.dayRules === 'short-105' ? fallbackHighlight(state, rules.highlightStartMs) : null
}

function dishesForHighlight(state: GameState, visit: HighlightVisit): MenuId[] {
  if (visit.kind === 'special') return specialDishes(state, visit.specialKind)
  const quantity = visit.kind === 'story' ? regularStories[visit.profile].chapters[visit.storyStage!].quantity : 2
  return visitDishes(state, quantity)
}

function spawnHighlight(state: GameState, random: () => number): boolean {
  let schedule = state.daily?.highlight
  const shift = state.shift
  if (!shift || schedule?.status !== 'pending') return false
  const deadline = getShiftRules(state).highlightEndMs
  if (state.dayRules === 'short-105' ? shift.elapsedMs >= deadline : shift.elapsedMs > deadline) {
    schedule.status = 'skipped'
    return true
  }
  if (shift.elapsedMs < schedule.atMs || shift.queue.length >= (state.level === 1 ? 3 : 4)
    || shift.queue.some(customer => customer.profile === schedule!.profile)) return false
  let dishes = dishesForHighlight(state, schedule)
  if (!dishes.length && state.dayRules === 'short-105') {
    const fallback = fallbackHighlight(state, schedule.atMs, true)
    if (fallback) {
      state.daily!.highlight = schedule = fallback
      dishes = dishesForHighlight(state, schedule)
    }
  }
  if (!dishes.length) return false
  const dish = dishes[Math.floor(random() * dishes.length)]
  const customer = makeCustomer(state, dish, schedule.profile, random, schedule)
  if (customer.order.pricey && random() < .45) {
    schedule.status = 'arrived'
    loseCustomer(state, customer, 'priceRefusal', customer.id % 2 ? 1 : 2)
    return true
  }
  shift.queue.push(customer)
  shift.activeId ??= customer.id
  schedule.status = 'arrived'
  // Keep the special arrival separate from the next regular arrival.
  shift.nextArrivalMs = Math.max(shift.nextArrivalMs, shift.elapsedMs + 2000)
  return true
}

export function closeShop(state: GameState, reason: CloseReason = 'manual'): boolean {
  if (state.phase !== 'shop' || !state.shift || state.reports.some(report => report.day === state.day)) return false
  if (state.daily?.highlight?.status === 'pending') state.daily.highlight.status = 'skipped'
  for (const customer of [...state.shift.queue]) loseCustomer(state, customer, 'closed')
  trashBowl(state)
  const closedAt = shopMinute(state)
  state.reports.push({ ...settleDay(state, reason), closedAt })
  delete state.tutorialStep
  state.shift = null
  state.phase = 'report'
  return true
}

export function tick(state: GameState, elapsed: number, random: () => number = Math.random): boolean {
  const shift = state.shift
  if (!shift || state.phase !== 'shop' || elapsed <= 0) return false
  const guided = Boolean(currentLesson(state))
  const rules = getShiftRules(state)
  const previousNotice = shiftNotice(state)
  const previousPhase = currentShiftPhase(state)
  // Let the first guest arrive, then give the player time to learn the controls.
  const limit = guided ? shift.queue.length ? shift.elapsedMs : shift.nextArrivalMs : rules.durationMs
  const delta = Math.min(elapsed, Math.max(0, limit - shift.elapsedMs))
  shift.elapsedMs += delta
  let changed = false
  if (shift.bowl.mixing) {
    shift.bowl.mixMs = Math.min(mixDuration(state), shift.bowl.mixMs + (guided ? elapsed : delta))
    if (mixProgress(state) >= 100) {
      shift.bowl.mixing = false
      advanceTutorial(state, 'mix-ready')
      changed = true
    }
  }

  if (shift.elapsedMs >= rules.durationMs) return closeShop(state, 'time')
  for (const customer of [...shift.queue]) {
    if (patienceLeft(state, customer) > 0) continue
    loseCustomer(state, customer, 'timeout')
    changed = true
  }
  if (!guided) {
    const phase = currentShiftPhase(state)
    if (state.dayRules === 'short-105' && previousPhase.id !== phase.id && phase.intervalFactor > 0) {
      if (previousPhase.intervalFactor > 0) {
        shift.nextArrivalMs = shift.elapsedMs + Math.max(0, shift.nextArrivalMs - shift.elapsedMs) * phase.intervalFactor / previousPhase.intervalFactor
      } else {
        const dish = enabledDishes(state).find(dish => priceBand(dish, state.menu[dish].price) === 'low') ?? enabledDishes(state)[0]
        shift.nextArrivalMs = shift.elapsedMs + (dish ? arrivalDelay(state, random, dish) : 2000)
      }
    }
    changed = spawnHighlight(state, random) || changed
    if (state.dayRules === 'short-105' && shift.elapsedMs >= rules.arrivalsEndMs && !shift.queue.length) return closeShop(state, 'queue-cleared')
    if (currentShiftPhase(state).intervalFactor > 0 && shift.elapsedMs >= shift.nextArrivalMs) changed = spawnCustomer(state, random) || changed
  } else if (!shift.queue.length && shift.elapsedMs >= shift.nextArrivalMs) changed = spawnCustomer(state, random) || changed
  if (previousNotice?.id !== shiftNotice(state)?.id || previousPhase.id !== currentShiftPhase(state).id) changed = true
  return changed
}

export function nextDay(state: GameState): Result {
  if (state.phase !== 'report') return problem('Chốt ngày trước khi mở ca mới.')
  const oldLevel = state.level
  for (const level of [2, 3, 4] as Level[]) {
    if (level > state.level && state.reputation >= levels[level].threshold) state.level = level
  }
  state.day++
  state.phase = 'prep'
  state.tally = emptyTally()
  state.dayRules = 'short-105'
  state.daily = createDailyActivity(state.day, state.level)
  return success(state.level > oldLevel ? 'Tiệm lên cấp ' + state.level + '! Có món và nguyên liệu mới ở chợ.' : '')
}

function shopMinute(state: GameState): number {
  return OPEN_MINUTE + Math.floor((CLOSE_MINUTE - OPEN_MINUTE) * (state.shift?.elapsedMs ?? 0) / getShiftRules(state).durationMs)
}

export function shopTime(state: GameState): string {
  return formatShopTime(shopMinute(state))
}

export function formatShopTime(minutes: number): string {
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')
}
