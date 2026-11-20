import assert from 'node:assert/strict'
import test from 'node:test'
import { ingredientIds } from '../src/data.ts'
import { defaultPrice, fairPrice, money, priceBand, priceOf, sumReports } from '../src/economy.ts'
import {
  addHeat, addIngredient, changePrice, CLOSE_MINUTE, closeShop, currentCustomer, deliver, finishMix, makeOrder, mixDuration,
  mixProgress, newGame, nextDay, openShop, packBowl, PATIENCE_MS, purchase, replyToReview,
  selectCustomer, tick, toggleDish, toggleMix, toggleStaff, trashBowl,
} from '../src/game.ts'
import { parseSave } from '../src/storage.ts'
import { departureLine } from '../src/reviews.ts'
import { advanceTutorial, currentLesson, lessonAllows } from '../src/tutorial.ts'
import { renderApp } from '../src/ui.ts'
import { createDailyActivity } from '../src/engagement.ts'
import type { GameState, Heat, IngredientId } from '../src/types.ts'

const first = () => 0
const SHIFT_MS = 240000

function setUp(): GameState {
  const state = newGame()
  for (const id of ['rice', 'shrimpSalt', 'kumquat', 'pack']) assert.equal(purchase(state, id).ok, true)
  return state
}

function start(state: GameState, random = first): void {
  // These original rule tests also protect open shifts migrated from older builds.
  state.dayRules = 'legacy-240'
  if (state.daily) state.daily = createDailyActivity(state.day, state.level, 'legacy-240')
  assert.equal(openShop(state, () => .99).ok, true)
  tick(state, 901, random)
}

function gather(state: GameState, items: IngredientId[]): void {
  for (const id of items) assert.equal(addIngredient(state, id).ok, true, id)
}

function mix(state: GameState): void {
  assert.equal(toggleMix(state).ok, true)
  tick(state, mixDuration(state), first)
  assert.equal(mixProgress(state), 100)
}

function serve(state: GameState): void {
  assert.equal(finishMix(state).ok, true)
  assert.equal(packBowl(state, 'bag').ok, true)
  assert.equal(deliver(state).ok, true)
}

test('the salt menu only needs four ingredients, and sells a correctly finished bowl at five stars', () => {
  const state = newGame()
  assert.equal(openShop(state).ok, false)
  assert.equal(purchase(state, 'egg').ok, false)
  assert.equal(toggleDish(state, 'salt').ok, true)
  assert.equal(openShop(state).ok, false)

  const supplied = setUp()
  assert.equal(supplied.cash, 105000)
  assert.equal(supplied.inventory.oil, 0)
  assert.equal(toggleDish(supplied, 'classic').ok, true)
  assert.equal(openShop(supplied).ok, false)
  assert.equal(toggleDish(supplied, 'classic').ok, true)
  start(supplied)
  const customer = currentCustomer(supplied)!
  assert.equal(customer.order.dish, 'salt')
  assert.deepEqual(customer.order.recipe, { rice: 1, kumquat: 1, shrimpSalt: 1, pack: 1 })
  gather(supplied, ['rice', 'kumquat', 'shrimpSalt'])
  assert.equal(packBowl(supplied, 'bag').ok, false)
  assert.equal(deliver(supplied).ok, false)
  assert.equal(supplied.cash, 105000)
  mix(supplied)
  serve(supplied)
  assert.equal(supplied.cash, 113000)
  assert.equal(deliver(supplied).ok, false)
  assert.equal(supplied.cash, 113000)
  assert.equal(supplied.reviews[0].stars, 5)
  assert.equal(supplied.reputation, 4)
  assert.equal(supplied.tally.used, 3250)
  assert.equal(supplied.inventory.rice, 9)
  assert.equal(supplied.inventory.pack, 19)
  assert.equal(supplied.tally.sales.salt?.revenue, 8000)
})

test('the price change uses integer steps and the demand thresholds are strict', () => {
  const state = setUp()
  assert.equal(defaultPrice('salt'), 8000)
  assert.equal(money(245500), '245.500đ')
  assert.equal(money(-0), '0đ')
  assert.equal(changePrice(state, 'salt', 1).ok, true)
  assert.equal(state.menu.salt.price, 9000)
  assert.equal(priceBand('salt', 3899), 'low')
  assert.equal(priceBand('salt', 3900), 'fair')
  assert.equal(priceBand('salt', fairPrice('salt') * 1.35), 'fair')
  assert.equal(priceBand('salt', 11000), 'high')

  const busy = setUp()
  busy.menu.salt.price = 3000
  start(busy)
  start(state)
  assert.ok(busy.shift!.nextArrivalMs < state.shift!.nextArrivalMs)
})

test('all four heat levels match the order and without chili no dose is deducted', () => {
  for (const heat of [0, 1, 2, 3] as Heat[]) {
    const state = setUp()
    purchase(state, 'wet')
    purchase(state, 'greens')
    toggleDish(state, 'salt')
    toggleDish(state, 'classic')
    start(state, () => (heat + .1) / 4)
    const order = currentCustomer(state)!.order
    assert.equal(order.heat, heat)
    gather(state, ['rice', 'kumquat', 'shrimpSalt'])
    assert.equal(addHeat(state, heat).ok, true)
    gather(state, ['oil'])
    mix(state)
    for (const id of ['mango', 'cilantro'] as const) {
      gather(state, Array.from({ length: order.recipe[id] ?? 0 }, () => id))
    }
    serve(state)
    assert.equal(state.inventory.chili, heat ? 19 : 20)
    assert.equal(state.reviews[0].stars, 5)
  }
})

test('remembers no rau răm and double mango and detects ignored notes or soggy peanuts', () => {
  const state = setUp()
  state.level = 2
  for (const id of ['wet', 'greens', 'egg', 'crunch']) purchase(state, id)
  toggleDish(state, 'salt')
  toggleDish(state, 'eggs')
  start(state)
  const order = currentCustomer(state)!.order
  assert.equal(order.noCilantro, true)
  assert.equal(order.extraMango, true)
  assert.equal(order.recipe.cilantro, undefined)
  assert.equal(order.recipe.mango, 2)
  gather(state, ['rice', 'kumquat', 'shrimpSalt', 'oil', 'peanut'])
  mix(state)
  gather(state, ['mango', 'cilantro', 'egg'])
  serve(state)
  assert.equal(state.reviews[0].stars, 1)
  assert.match(state.reviews[0].text, /rau răm|giòn bị ỉu/)
  assert.equal(state.inventory.peanut, 9)
})

test('rejects stockouts, protects the current order, and accounts for a timed-out draft', () => {
  const state = setUp()
  start(state)
  const firstId = currentCustomer(state)!.id
  gather(state, ['rice'])
  assert.equal(addIngredient(state, 'cilantro').ok, false)
  const wait = state.shift!.nextArrivalMs - state.shift!.elapsedMs + 1
  tick(state, wait, first)
  const second = state.shift!.queue[1]
  assert.equal(selectCustomer(state, second.id).ok, false)
  tick(state, PATIENCE_MS - wait, first)
  assert.equal(state.shift?.queue.some(guest => guest.id === firstId), false)
  assert.equal(state.shift?.activeId, second.id)
  assert.equal(state.tally.lost, 1)
  assert.equal(state.tally.waste, 2000)
  assert.equal(state.reviews[0].stars, 1)
  assert.equal(state.reviews[0].departureReason, 'timeout')

  state.inventory.rice = 0
  const count = state.nextCustomerId
  tick(state, 15000, first)
  assert.equal(state.nextCustomerId, count)
})

test('price refusals and overpriced purchases create actionable reviews and a reply is counted once', () => {
  const refusal = setUp()
  refusal.menu.salt.price = 16000
  start(refusal)
  assert.equal(refusal.tally.lost, 1)
  assert.match(refusal.reviews[0].text, /Chát quá/)
  assert.equal(refusal.reviews[0].departureReason, 'priceRefusal')
  assert.match(departureLine(refusal.reviews[0]), /ví/)
  assert.deepEqual(parseSave(JSON.stringify(refusal)), refusal)
  const customerId = refusal.reviews[0].customerId
  assert.equal(replyToReview(refusal, customerId, 'voucher').ok, true)
  assert.equal(refusal.reputation, 1)
  assert.equal(replyToReview(refusal, customerId, 'polite').ok, false)
  assert.equal(refusal.reputation, 1)

  const sale = setUp()
  sale.menu.salt.price = 16000
  start(sale, () => .9)
  const quantity = currentCustomer(sale)!.order.quantity
  for (let portion = 0; portion < quantity; portion++) {
    gather(sale, ['rice', 'kumquat', 'shrimpSalt'])
    mix(sale)
    serve(sale)
  }
  assert.equal(sale.reviews[0].stars, 2)
  assert.match(sale.reviews[0].text, /Giá hơi chát|giá|hóa đơn|giá nhỉnh/i)
})

test('purchases, use, waste, spoilage, tax and cash reconcile across days and weekly totals', () => {
  const state = setUp()
  purchase(state, 'greens')
  start(state)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  mix(state)
  serve(state)
  tick(state, 12000, first)
  gather(state, ['rice'])
  assert.equal(trashBowl(state).ok, true)
  assert.equal(trashBowl(state).ok, false)
  tick(state, SHIFT_MS, first)
  const firstReport = state.reports[0]
  assert.equal(firstReport.revenue, 8000)
  assert.equal(firstReport.used, 3250)
  assert.equal(firstReport.spoilage, 3000)
  assert.equal(firstReport.waste, 2000)
  assert.equal(firstReport.tax, 240)
  assert.equal(firstReport.cash, 87760)
  assert.equal(firstReport.cashDelta, -62240)
  assert.equal(firstReport.profit, -15490)
  assert.equal(state.inventory.mango, 7)
  assert.equal(state.inventory.cilantro, 7)
  assert.equal(closeShop(state), false)
  assert.equal(state.cash, 87760)

  nextDay(state)
  start(state)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  mix(state)
  serve(state)
  closeShop(state)
  assert.equal(state.reports[1].purchases, 0)
  const week = sumReports(state.reports)!
  assert.equal(week.sold, 2)
  assert.equal(week.sales.salt?.count, 2)
  assert.equal(week.revenue, 17500)
  assert.equal(week.tips, 1500)
  assert.equal(week.tax, 525)
  assert.equal(week.cashDelta, state.cash - 150000)
})

test('reputation unlocks four levels, staff and the alternate packaging', () => {
  const state = newGame()
  for (const [quantity, nextLevel, cost] of [[10, 2, 15000], [20, 3, 25000], [20, 3, 35000], [10, 4, 35000]]) {
    // Isolate the original review-based unlock path, as in an upgraded open shift.
    state.daily = null
    for (const id of ['rice', 'shrimpSalt', 'kumquat', 'pack'] as const) {
      while (state.inventory[id] < quantity) assert.equal(purchase(state, id).ok, true)
    }
    start(state)
    for (let order = 0; order < quantity; order++) {
      if (order > 0) tick(state, state.shift!.nextArrivalMs - state.shift!.elapsedMs + 1, first)
      gather(state, ['rice', 'kumquat', 'shrimpSalt'])
      mix(state)
      serve(state)
    }
    assert.equal(closeShop(state), true)
    assert.equal(state.reports.at(-1)?.overhead, cost)
    nextDay(state)
    assert.equal(state.level, nextLevel)
  }
  for (const id of ['rice', 'shrimpSalt', 'kumquat', 'pack'] as const) {
    if (!state.inventory[id]) assert.equal(purchase(state, id).ok, true)
  }
  assert.equal(purchase(state, 'squid').ok, true)
  assert.equal(toggleStaff(state).ok, true)
  assert.equal(mixDuration(state), 1600)
  start(state)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  mix(state)
  assert.equal(finishMix(state).ok, true)
  const packs = state.inventory.pack
  assert.equal(packBowl(state, 'box').ok, true)
  assert.equal(packBowl(state, 'bag').ok, true)
  assert.equal(state.inventory.pack, packs - 1)
  deliver(state)
  closeShop(state)
  assert.equal(state.reports.at(-1)?.wages, 20000)
  assert.equal(state.reports.at(-1)?.overhead, 50000)
})

test('persists a partial mix and the settled report without regenerating customers or charging again', () => {
  const state = setUp()
  start(state)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  toggleMix(state)
  tick(state, 900, first)
  const restored = parseSave(JSON.stringify(state))!
  assert.deepEqual(restored, state)
  tick(restored, 1500, first)
  assert.equal(mixProgress(restored), 100)
  serve(restored)
  closeShop(restored)
  const report = parseSave(JSON.stringify(restored))!
  assert.deepEqual(report, restored)
  assert.equal(closeShop(report), false)
  assert.equal(report.reports.length, 1)
  assert.equal(parseSave('{oops'), null)
  assert.equal(parseSave(JSON.stringify({ ...state, inventory: {} })), null)
})

test('every actual order is priced using its menu and contains only registered ingredients', () => {
  const state = newGame()
  for (const id of Object.keys(state.menu) as Array<keyof GameState['menu']>) {
    const order = makeOrder(state, id, () => .5)
    assert.equal(order.price, defaultPrice(id))
    assert.ok(priceOf(order.recipe) > 0)
    assert.ok(Object.keys(order.recipe).every(id => ingredientIds.some(known => known === id)))
  }
})

test('the first lesson retains its place in a save and waits without running down the shift', () => {
  let state = newGame(true)
  assert.equal(state.menu.salt.enabled, false)
  assert.equal(lessonAllows(state, 'buy', 'kumquat'), false)
  for (const id of ['rice', 'shrimpSalt', 'kumquat', 'pack']) {
    assert.equal(lessonAllows(state, 'buy', id), true)
    assert.equal(purchase(state, id).ok, true)
    advanceTutorial(state, 'buy', id)
  }
  advanceTutorial(state, 'prep-menu')
  assert.equal(lessonAllows(state, 'open'), false)
  assert.equal(lessonAllows(state, 'toggle-dish', 'salt'), true)
  assert.equal(toggleDish(state, 'salt').ok, true)
  advanceTutorial(state, 'toggle-dish', 'salt')
  state = parseSave(JSON.stringify(state))!
  assert.equal(currentLesson(state)?.prepTab, 'menu')
  assert.equal(lessonAllows(state, 'price-down', 'salt'), true)
  assert.equal(lessonAllows(state, 'price-up', 'salt'), true)
  assert.equal(lessonAllows(state, 'price-up', 'classic'), false)
  assert.equal(lessonAllows(state, 'open'), false)
  assert.equal(changePrice(state, 'salt', 1).ok, true)
  advanceTutorial(state, 'price-up', 'salt')
  assert.equal(currentLesson(state)?.action, 'open')
  assert.equal(lessonAllows(state, 'price-down', 'salt'), true)
  assert.equal(changePrice(state, 'salt', -1).ok, true)
  advanceTutorial(state, 'price-down', 'salt')
  assert.equal(currentLesson(state)?.action, 'open')
  assert.equal(openShop(state).ok, true)
  advanceTutorial(state, 'open')
  tick(state, SHIFT_MS, first)
  const customer = currentCustomer(state)!
  const arrival = state.shift!.elapsedMs
  assert.equal(lessonAllows(state, 'customer', String(customer.id)), true)
  advanceTutorial(state, 'customer', String(customer.id))
  tick(state, SHIFT_MS, first)
  assert.equal(state.shift!.elapsedMs, arrival)
  assert.equal(state.shift!.queue.length, 1)
  assert.equal(state.reviews.length, 0)
  assert.equal(currentLesson(state)?.action, 'read-order')
  assert.equal(lessonAllows(state, 'ingredient', 'rice'), false)
  state = parseSave(JSON.stringify(state))!
  assert.equal(currentLesson(state)?.action, 'read-order')
  advanceTutorial(state, 'read-order')
  assert.equal(lessonAllows(state, 'ingredient', 'rice'), true)
  for (const id of ['rice', 'kumquat', 'shrimpSalt'] as const) {
    gather(state, [id])
    advanceTutorial(state, 'ingredient', id)
  }
  toggleMix(state)
  advanceTutorial(state, 'mix')
  tick(state, 800, first)
  const resumed = parseSave(JSON.stringify(state))!
  assert.equal(currentLesson(resumed)?.action, 'mix-ready')
  tick(resumed, 1600, first)
  assert.equal(currentLesson(resumed)?.action, 'final-mix')
  finishMix(resumed)
  advanceTutorial(resumed, 'final-mix')
  packBowl(resumed, 'bag')
  advanceTutorial(resumed, 'pack', 'bag')
  deliver(resumed)
  assert.equal(advanceTutorial(resumed, 'deliver'), true)
  assert.equal(resumed.reviews[0].stars, 5)
  assert.equal(currentLesson(resumed), undefined)
  tick(resumed, 1000, first)
  assert.equal(resumed.shift!.elapsedMs, arrival + 1000)
  assert.equal(currentLesson(parseSave(JSON.stringify(newGame()))), undefined)
})

test('legacy day-one saves keep their existing menu and tutorial progress', () => {
  const state = setUp()
  assert.equal(changePrice(state, 'salt', 1).ok, true)
  const beforeMenu = parseSave(JSON.stringify({ ...state, version: 2, tutorialStep: 4 }))!
  assert.equal(currentLesson(beforeMenu)?.action, 'prep-menu')
  advanceTutorial(beforeMenu, 'prep-menu')
  assert.equal(currentLesson(beforeMenu)?.action, 'price')
  assert.deepEqual(beforeMenu.menu, state.menu)

  const readyToOpen = parseSave(JSON.stringify({ ...state, version: 2, tutorialStep: 5 }))!
  assert.equal(currentLesson(readyToOpen)?.action, 'open')
  assert.deepEqual(readyToOpen.menu, state.menu)

  start(state)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  toggleMix(state)
  tick(state, 800, first)
  const mixing = parseSave(JSON.stringify({ ...state, version: 2, tutorialStep: 11 }))!
  assert.equal(currentLesson(mixing)?.action, 'mix-ready')
  assert.deepEqual(mixing.shift, state.shift)
  assert.equal(mixing.cash, state.cash)

  const previousMixing = parseSave(JSON.stringify({ ...state, version: 3, tutorialStep: 13 }))!
  assert.equal(currentLesson(previousMixing)?.action, 'mix-ready')
  assert.deepEqual(previousMixing.shift, state.shift)
  assert.equal(previousMixing.cash, state.cash)

  const selected = parseSave(JSON.stringify({ ...state, version: 3, tutorialStep: 8 }))!
  advanceTutorial(selected, 'customer', String(currentCustomer(selected)!.id))
  assert.equal(currentLesson(selected)?.action, 'read-order')
  const alreadyStarted = parseSave(JSON.stringify({ ...state, version: 3, tutorialStep: 9 }))!
  assert.equal(currentLesson(alreadyStarted)?.action, 'ingredient')
  assert.equal(currentLesson(alreadyStarted)?.id, 'rice')
})

test('an early close records the actual hour, writes off the active bowl, and settles once', () => {
  const state = setUp()
  start(state)
  gather(state, ['rice'])
  for (let i = 0; i < 3; i++) tick(state, 20000, first)
  assert.equal(closeShop(state), true)
  const report = state.reports[0]
  assert.equal(report.closedAt, 677)
  assert.equal(report.waste, 2000)
  assert.equal(report.lost, 3)
  assert.equal(report.overhead, 15000)
  const resumed = parseSave(JSON.stringify(state))!
  assert.equal(resumed.reports[0].closedAt, report.closedAt)
  assert.equal(closeShop(resumed), false)
  assert.equal(resumed.cash, state.cash)

  const scheduled = setUp()
  start(scheduled)
  tick(scheduled, SHIFT_MS, first)
  assert.equal(scheduled.reports[0].closedAt, CLOSE_MINUTE)
})

test('correct orders get varied praise when the same customer profile returns', () => {
  const state = setUp()
  start(state)
  for (let i = 0; i < 9; i++) {
    if (i > 0) tick(state, state.shift!.nextArrivalMs - state.shift!.elapsedMs + 1, first)
    gather(state, ['rice', 'kumquat', 'shrimpSalt'])
    mix(state)
    serve(state)
  }
  assert.ok(state.reviews.every(review => review.stars === 5))
  assert.equal(new Set(state.reviews.slice(0, 8).map(review => review.text)).size, 8)
  assert.notEqual(state.reviews[7].text, state.reviews[8].text)
})

test('a negative review identifies missing ingredients and uses Cô Sáu’s voice', () => {
  const state = setUp()
  start(state, () => .99)
  const quantity = currentCustomer(state)!.order.quantity
  for (let portion = 0; portion < quantity; portion++) {
    gather(state, ['rice', 'kumquat'])
    mix(state)
    serve(state)
  }
  assert.equal(state.reviews[0].stars, 4)
  assert.match(state.reviews[0].text, /Phần cô thiếu muối tôm/)
})

test('the selected order’s tray and mixing highlights follow the bowl’s progress', () => {
  const state = setUp()
  purchase(state, 'wet')
  purchase(state, 'greens')
  toggleDish(state, 'salt')
  toggleDish(state, 'classic')
  start(state)
  const random = [.6, 0, 0]
  currentCustomer(state)!.order = makeOrder(state, 'classic', () => random.shift()!)
  const render = () => renderApp(state, {
    home: false, initialMute: false, prepTab: 'market', previousCustomers: new Set(), customerSpeechId: null,
    modal: null,
    heatOpen: false, replyFor: null, reportPeriod: 'day', reportDay: 1, warning: '', departure: null,
  })
  const cue = (action: string) => new RegExp('suggested-action" data-action="' + action + '"')
  assert.match(render(), /class="tray rice needed"/)
  assert.match(render(), /class="tray mango needed"/)
  assert.doesNotMatch(render(), /class="tray cilantro needed"/)
  assert.doesNotMatch(render(), cue('mix'))

  gather(state, ['rice', 'kumquat', 'shrimpSalt', 'oil'])
  assert.doesNotMatch(render(), cue('mix'))
  assert.equal(addHeat(state, 2).ok, true)
  assert.doesNotMatch(render(), /class="tray rice needed"/)
  assert.match(render(), /Bánh tráng, 1\/1 phần, đã đủ/)
  assert.match(render(), cue('mix'))
  mix(state)
  assert.match(render(), /suggested-bank/)
  assert.match(render(), /Thêm topping ↓/)
  assert.doesNotMatch(render(), cue('final-mix'))

  gather(state, ['mango'])
  assert.match(render(), /class="tray mango needed"/)
  assert.doesNotMatch(render(), cue('final-mix'))
  gather(state, ['mango'])
  assert.doesNotMatch(render(), /class="tray mango needed"|suggested-bank/)
  assert.match(render(), /Xoài xanh, 2\/2 phần, đã đủ/)
  assert.match(render(), cue('final-mix'))
  assert.equal(finishMix(state).ok, true)
  assert.doesNotMatch(render(), cue('final-mix'))
})

test('sidewalk customers keep their order, selection and accessible dialogue', () => {
  const state = setUp()
  start(state)
  const guest = currentCustomer(state)!
  state.shift!.queue.push({ ...structuredClone(guest), id: guest.id + 1, profile: 2 })
  const html = renderApp(state, {
    home: false, initialMute: false, prepTab: 'market', previousCustomers: new Set(), customerSpeechId: guest.id,
    modal: null, heatOpen: false, replyFor: null, reportPeriod: 'day', reportDay: 1, warning: '', departure: null,
  })
  const scene = html.slice(html.indexOf('class="queue-scene"'), html.indexOf('class="order-board"'))
  assert.match(scene, /src="\.\/art\/ganh\.webp"/)
  assert.doesNotMatch(scene, /counter-art|preserveAspectRatio="none"/)
  assert.equal((scene.match(/id="customer-speech"/g) ?? []).length, 1)
  assert.match(scene, /aria-pressed="true"[^>]*aria-describedby="customer-speech"/)
  assert.ok(scene.indexOf('id="customer-speech"') < scene.indexOf('class="customers"'))
  assert.ok(scene.indexOf(`data-action="customer" data-id="${guest.id}"`) < scene.indexOf(`data-action="customer" data-id="${guest.id + 1}"`))
  assert.match(scene, new RegExp(`data-patience="${guest.id}"`))
})

test('waiting paper tickets stay between customers and preparation with their order details intact', () => {
  const state = setUp()
  start(state, () => .9)
  const guest = currentCustomer(state)!
  guest.order.noCilantro = true
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  mix(state)
  serve(state)
  gather(state, ['rice'])
  const html = renderApp(state, {
    home: false, initialMute: false, prepTab: 'market', previousCustomers: new Set(), customerSpeechId: null,
    modal: null, heatOpen: false, replyFor: null, reportPeriod: 'day', reportDay: 1, warning: '', departure: null,
  })
  assert.ok(html.indexOf('class="shop-front"') < html.indexOf('class="order-board"'))
  assert.ok(html.indexOf('class="order-board"') < html.indexOf('class="prep-workspace"'))
  assert.ok(html.indexOf('class="order-details"') < html.indexOf('class="kitchen"'))
  const ticket = html.match(/<button type="button" class="order-receipt"[\s\S]*?<\/button>/)![0]
  assert.match(ticket, new RegExp(`data-id="${guest.id}"`))
  assert.match(ticket, /aria-current="true" aria-controls="order-details"/)
  assert.match(ticket, /Đã giao 1\/2 bịch/)
  assert.match(ticket, /Bỏ rau răm/)
  assert.match(ticket, /16\.000đ/)
  assert.match(ticket, /1\/3<\/span>/)
})

test('a topping-free order suggests the light mix immediately after the first mix', () => {
  const state = setUp()
  start(state)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  mix(state)
  const html = renderApp(state, {
    home: false, initialMute: false, prepTab: 'market', previousCustomers: new Set(), customerSpeechId: null,
    modal: null,
    heatOpen: false, replyFor: null, reportPeriod: 'day', reportDay: 1, warning: '', departure: null,
  })
  assert.match(html, /suggested-action" data-action="final-mix"/)
  assert.doesNotMatch(html, /suggested-bank|Thêm topping ↓/)
})

test('a legacy save credits unpaid sales once and leaves settled days intact', () => {
  const state = setUp()
  start(state)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  mix(state)
  serve(state)

  // In the old save, the sale belonged to the tally but had yet to reach the register.
  const legacy = { ...state, version: 1, cash: 105000 }
  const migrated = parseSave(JSON.stringify(legacy))!
  assert.deepEqual(migrated, { ...state, daily: null, tally: { ...state.tally, completedOrders: 0, tips: 0, xpEarned: 0 } })
  assert.equal(migrated.cash, 113000)
  assert.deepEqual(parseSave(JSON.stringify(migrated)), migrated)

  assert.equal(closeShop(migrated), true)
  assert.equal(migrated.cash, 97760)
  assert.equal(migrated.reports[0].revenue, 8000)
  assert.equal(migrated.reports[0].tax, 240)
  assert.deepEqual(parseSave(JSON.stringify({ ...migrated, version: 1 })), migrated)
})

test('multi-bag arrivals are uncommon, stock-limited, and get modest extra patience', () => {
  const quantities = [0, 0, 0]
  for (let sample = 0; sample < 100; sample++) {
    const state = setUp()
    start(state, () => (sample + .5) / 100)
    const customer = currentCustomer(state)!
    quantities[customer.order.quantity - 1]++
    assert.equal(customer.patienceMs, PATIENCE_MS + (customer.order.quantity - 1) * 18000)
  }
  assert.deepEqual(quantities, [80, 16, 4])

  for (const [stock, expected] of [[1, 1], [2, 2], [3, 3]]) {
    const state = setUp()
    state.inventory.rice = stock
    start(state, () => .99)
    assert.equal(currentCustomer(state)!.order.quantity, expected)
  }
  const custom = setUp()
  purchase(custom, 'wet')
  purchase(custom, 'greens')
  custom.inventory.mango = 2
  toggleDish(custom, 'salt')
  toggleDish(custom, 'classic')
  const draws = [0, 0, 0, 0, 0, .99, 0]
  start(custom, () => draws.shift() ?? 0)
  assert.equal(currentCustomer(custom)!.order.recipe.mango, 2)
  assert.equal(currentCustomer(custom)!.order.quantity, 1)

  const guided = setUp()
  guided.tutorialStep = 8
  start(guided, () => .99)
  assert.equal(currentCustomer(guided)!.order.quantity, 1)
  assert.equal(currentCustomer(guided)!.patienceMs, PATIENCE_MS)
})

test('a three-bag order credits each bag, restores progress, and reviews once after completion', () => {
  let state = setUp()
  start(state, () => .99)
  const customerId = currentCustomer(state)!.id
  assert.equal(currentCustomer(state)!.order.quantity, 3)
  for (let portion = 1; portion <= 3; portion++) {
    gather(state, ['rice', 'kumquat', 'shrimpSalt'])
    mix(state)
    serve(state)
    assert.equal(state.cash, 105000 + portion * 8000)
    assert.equal(state.tally.sales.salt?.count, portion)
    assert.equal(state.inventory.rice, 10 - portion)
    assert.equal(state.inventory.pack, 20 - portion)
    assert.equal(deliver(state).ok, false)
    if (portion < 3) {
      assert.equal(currentCustomer(state)!.id, customerId)
      assert.equal(currentCustomer(state)!.servedPortions.length, portion)
      assert.deepEqual(state.shift!.bowl.ingredients, {})
      assert.equal(state.reviews.length, 0)
      assert.equal(state.reputation, 0)
      const restored = parseSave(JSON.stringify(state))!
      assert.deepEqual(restored, state)
      state = restored
    }
  }
  assert.equal(state.reviews.length, 1)
  assert.equal(state.reviews[0].customerId, customerId)
  assert.equal(state.reviews[0].stars, 5)
  assert.equal(state.reputation, 4)
  assert.equal(state.shift!.queue.some(guest => guest.id === customerId), false)
  closeShop(state)
  assert.equal(state.reports[0].sold, 3)
  assert.equal(state.reports[0].revenue, 24000)
  assert.equal(state.reports[0].used, 9750)
  assert.equal(state.reports[0].tax, 720)
  assert.equal(state.reports[0].profit, -1470)
  assert.equal(state.cash, 113280)
})

test('a group review accounts for every bag and retains feedback from the worst portion', () => {
  const state = setUp()
  start(state, () => .9)
  assert.equal(currentCustomer(state)!.order.quantity, 2)
  gather(state, ['rice', 'kumquat', 'shrimpSalt'])
  mix(state)
  serve(state)
  gather(state, ['rice'])
  mix(state)
  serve(state)
  assert.equal(state.reviews.length, 1)
  assert.equal(state.reviews[0].stars, 4)
  assert.match(state.reviews[0].text, /thiếu/)
  assert.equal(state.reputation, 3)
})

test('partial group orders retain paid sales and waste only the unfinished bowl on departure', () => {
  for (const reason of ['timeout', 'closed']) {
    let state = setUp()
    start(state, () => .99)
    const customer = currentCustomer(state)!
    state.shift!.nextArrivalMs = SHIFT_MS
    gather(state, ['rice', 'kumquat', 'shrimpSalt'])
    mix(state)
    serve(state)
    gather(state, ['rice'])
    toggleMix(state)
    tick(state, 800, first)
    const saved = parseSave(JSON.stringify(state))!
    assert.deepEqual(saved, state)
    state = saved
    if (reason === 'timeout') tick(state, customer.patienceMs - (state.shift!.elapsedMs - customer.arrivalMs), first)
    closeShop(state)
    assert.equal(state.reviews.length, 1)
    assert.equal(state.reviews[0].stars, 1)
    assert.equal(state.reviews[0].departureReason, reason)
    assert.equal(state.reports[0].sold, 1)
    assert.equal(state.reports[0].lost, 1)
    assert.equal(state.reports[0].used, 3250)
    assert.equal(state.reports[0].waste, 2000)
    assert.equal(state.reports[0].tax, 240)
    assert.equal(state.cash, 97760)
    assert.equal(closeShop(state), false)
    assert.equal(parseSave(JSON.stringify(state))!.cash, 97760)
  }
})

test('old single-bag saves migrate without adding sales and invalid group progress is rejected', () => {
  const state = setUp()
  start(state)
  const legacy = JSON.parse(JSON.stringify(state))
  legacy.version = 4
  delete legacy.shift.queue[0].order.quantity
  delete legacy.shift.queue[0].servedPortions
  assert.deepEqual(parseSave(JSON.stringify(legacy)), { ...state, daily: null })

  const guest = currentCustomer(state)!
  for (const quantity of [0, 4]) {
    const invalid = structuredClone(state)
    Object.assign(invalid.shift!.queue[0].order, { quantity })
    assert.equal(parseSave(JSON.stringify(invalid)), null)
  }
  guest.servedPortions.push({ stars: 5, text: 'Đã đủ đơn.' })
  assert.equal(parseSave(JSON.stringify(state)), null)
  guest.order.quantity = 2
  assert.ok(parseSave(JSON.stringify(state)))
  Object.assign(guest.servedPortions[0], { stars: 0 })
  assert.equal(parseSave(JSON.stringify(state)), null)
})
