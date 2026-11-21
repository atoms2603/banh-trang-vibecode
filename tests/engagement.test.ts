import assert from 'node:assert/strict'
import test from 'node:test'
import { ingredientIds, ingredients, levels, menuIds, profiles, regularStories } from '../src/data.ts'
import { createDailyActivity as createActivity, currentShiftPhase, shiftNotice } from '../src/engagement.ts'
import { priceOf, salesRevenue, sumReports } from '../src/economy.ts'
import { addHeat, addIngredient, closeShop, currentCustomer, deliver, finishMix, mixDuration, newGame,
  nextDay, openShop, packBowl, PATIENCE_MS, purchase, replyToReview, selectCustomer, tick, toggleMix } from '../src/game.ts'
import { parseSave } from '../src/storage.ts'
import { dialogContent, renderApp } from '../src/ui.ts'
import type { GameState, IngredientId, Level, MenuId } from '../src/types.ts'

// Retain coverage of the 240-second policy used by migrated, in-progress days.
const SHIFT_MS = 240000
const createDailyActivity = (day: number, level: number) => createActivity(day, level, 'legacy-240')

function stocked(day = 2, level: Level = 1, dish: MenuId = 'salt'): GameState {
  const state = newGame()
  state.day = day
  state.dayRules = 'legacy-240'
  state.level = level
  state.reputation = levels[level].threshold
  state.daily = createDailyActivity(day, level)
  for (const id of ingredientIds) state.inventory[id] = 100
  for (const id of menuIds) state.menu[id].enabled = id === dish
  return state
}

function start(state: GameState, random = () => .99): void {
  if (state.dayRules !== 'legacy-240' && state.daily) state.daily = createDailyActivity(state.day, state.level)
  state.dayRules = 'legacy-240'
  assert.equal(openShop(state, random).ok, true)
}

function arrive(state: GameState, profile = 1) {
  const available = profiles.map((_, index) => index).filter(index => !state.shift!.queue.some(guest => guest.profile === index)
    && !(state.daily?.highlight && index === 4))
  const values = [0, (available.indexOf(profile) + .1) / available.length]
  state.shift!.nextArrivalMs = state.shift!.elapsedMs
  tick(state, 1, () => values.shift() ?? .5)
  const guest = state.shift!.queue.at(-1)!
  assert.equal(guest.profile, profile)
  assert.equal(selectCustomer(state, guest.id).ok, true)
  state.shift!.nextArrivalMs = 1e9
  return guest
}

function cook(state: GameState, options: { omit?: IngredientId[]; earlyCrunch?: boolean; light?: boolean } = {}) {
  const recipe = currentCustomer(state)!.order.recipe
  const add = (id: IngredientId) => {
    if (id === 'pack' || options.omit?.includes(id)) return
    for (let dose = 0; dose < (recipe[id] ?? 0); dose++) {
      const result = id === 'chili' ? addHeat(state, currentCustomer(state)!.order.heat) : addIngredient(state, id)
      assert.equal(result.ok, true, id)
    }
  }
  for (const id of ingredientIds.filter(id => ['base', 'seasoning'].includes(ingredients[id].category))) add(id)
  if (options.earlyCrunch) for (const id of ['peanut', 'shallot'] as const) add(id)
  assert.equal(toggleMix(state).ok, true)
  tick(state, mixDuration(state), () => .5)
  for (const id of ingredientIds.filter(id => ingredients[id].category === 'topping')) add(id)
  if (!options.earlyCrunch) for (const id of ['peanut', 'shallot'] as const) add(id)
  if (options.light !== false) assert.equal(finishMix(state).ok, true)
  assert.equal(packBowl(state, 'bag').ok, true)
  return deliver(state)
}

test('shift boundaries and the final 15-second countdown use played time, with no persistent phase label', () => {
  const state = stocked()
  start(state)
  for (const [time, phase] of [[0, 'warmup'], [39999, 'warmup'], [40000, 'normal'], [89999, 'normal'],
    [90000, 'rush'], [109999, 'rush'], [110000, 'rest'], [159999, 'rest'], [160000, 'last'],
    [179999, 'last'], [180000, 'closing'], [239999, 'closing']] as const) {
    state.shift!.elapsedMs = time
    assert.equal(currentShiftPhase(state).id, phase)
  }
  state.shift!.elapsedMs = 74999
  state.shift!.nextArrivalMs = 1e9
  assert.equal(shiftNotice(state), null)
  assert.equal(tick(state, 1), true)
  assert.equal(shiftNotice(state)?.label, 'Tăng tốc sau 15s')
  // Seconds update without rebuilding the entire counter and restarting animations.
  assert.equal(tick(state, 1000), false)
  assert.equal(shiftNotice(state)?.label, 'Tăng tốc sau 14s')
  assert.equal(shiftNotice(parseSave(JSON.stringify(state))!)?.label, 'Tăng tốc sau 14s')
  tick(state, 0)
  assert.equal(shiftNotice(state)?.label, 'Tăng tốc sau 14s')
  state.shift!.elapsedMs = 89999
  assert.equal(shiftNotice(state)?.label, 'Tăng tốc sau 1s')
  assert.equal(tick(state, 1), true)
  assert.equal(shiftNotice(state), null)
  state.day = 1
  state.shift!.elapsedMs = 80000
  assert.equal(shiftNotice(state), null)
  state.daily = null
  assert.equal(shiftNotice(state), null)
  state.shift!.elapsedMs = 200000
  assert.equal(currentShiftPhase(state).intervalFactor, 1)
})

test('arrival intervals combine phase and pricing, and the first guest arrives at 900ms', () => {
  for (const [time, factor] of [[0, 1.3], [40000, 1], [90000, .6], [110000, 1.6], [160000, 1]]) {
    for (const lowPrice of [false, true]) {
      const state = stocked()
      if (lowPrice) state.menu.salt.price = 3000
      start(state)
      state.shift!.elapsedMs = time
      state.shift!.nextArrivalMs = time + 900
      tick(state, 899, () => 0)
      assert.equal(state.shift!.queue.length, 0)
      tick(state, 1, () => 0)
      assert.equal(state.shift!.queue.length, 1)
      assert.ok(Math.abs(state.shift!.nextArrivalMs - state.shift!.elapsedMs - 10800 * factor * (lowPrice ? .72 : 1)) < .0001)
    }
  }
})

test('full queues skip arrivals without backlog; stockouts and the last minute admit nobody', () => {
  for (const level of [1, 2] as Level[]) {
    const state = stocked(2, level)
    start(state)
    for (let count = 0; count < (level === 1 ? 3 : 4); count++) {
      state.shift!.nextArrivalMs = state.shift!.elapsedMs
      tick(state, 1, () => .5)
    }
    const nextId = state.nextCustomerId
    tick(state, 20000, () => .5)
    assert.equal(state.nextCustomerId, nextId)
    const nextArrival = state.shift!.nextArrivalMs
    assert.ok(nextArrival > state.shift!.elapsedMs)
    cook(state)
    const afterServing = state.nextCustomerId
    tick(state, 1, () => .5)
    assert.equal(state.nextCustomerId, afterServing)
  }
  const state = stocked()
  start(state)
  state.inventory.rice = 0
  tick(state, 1000)
  assert.equal(state.shift!.queue.length, 0)
  state.inventory.rice = 100
  state.shift!.elapsedMs = 179999
  state.shift!.nextArrivalMs = 180000
  tick(state, 1)
  assert.equal(state.shift!.queue.length, 0)
  tick(state, 59999)
  assert.equal(state.phase, 'shop')
  tick(state, 1)
  assert.equal(state.phase, 'report')
})

test('all three regulars follow their quantities over different days and react to poor/good bowls', () => {
  for (const profile of [0, 3, 6]) {
    let state = stocked()
    let expectedTips = 0
    for (let stage = 0; stage < 3; stage++) {
      start(state)
      const guest = arrive(state, profile)
      assert.equal(guest.storyStage, stage)
      assert.equal(guest.order.quantity, regularStories[profile].chapters[stage].quantity)
      assert.equal(guest.patienceMs, PATIENCE_MS + (guest.order.quantity - 1) * 18000)
      for (let bag = 0; bag < guest.order.quantity; bag++) {
        const result = cook(state, stage === 0 ? { omit: ['shrimpSalt'], light: false } : {})
        if (bag < guest.order.quantity - 1) {
          assert.equal(state.stories[profile].stage, stage)
          assert.equal(result.departureText, undefined)
          state = parseSave(JSON.stringify(state))!
        } else assert.equal(result.departureText, regularStories[profile].chapters[stage][stage === 0 ? 'poorReply' : 'goodReply'])
      }
      assert.equal(state.stories[profile].stage, stage + 1)
      expectedTips += stage === 0 ? 0 : stage === 2 ? 3000 : 1500
      assert.equal(state.tally.tips, stage === 0 ? 0 : stage === 2 ? 3000 : 1500)
      assert.equal(arrive(state, profile).storyStage, undefined)
      closeShop(state)
      state = parseSave(JSON.stringify(state))!
      nextDay(state)
    }
    assert.equal(state.reports.reduce((total, report) => total + report.tips, 0), expectedTips)
  }
})

test('a timed-out story retries next day, and insufficient stock never assigns an oversized chapter', () => {
  let state = stocked()
  start(state)
  const guest = arrive(state, 3)
  tick(state, guest.patienceMs)
  assert.equal(state.stories[3].stage, 0)
  assert.equal(arrive(state, 3).storyStage, undefined)
  closeShop(state)
  nextDay(state)
  start(state)
  assert.equal(arrive(state, 3).storyStage, 0)
  cook(state)
  closeShop(state)
  nextDay(state)
  state.inventory.rice = 1
  start(state)
  const limited = arrive(state, 3)
  assert.equal(limited.order.quantity, 1)
  assert.equal(limited.storyStage, undefined)
  assert.equal(state.stories[3].stage, 1)
})

test('a three-bag customer advances missions once and reload cannot duplicate a paid reward', () => {
  let state = stocked(1)
  state.daily!.missions[0].target = 1
  start(state)
  const guest = arrive(state)
  guest.order.quantity = 3
  for (let portion = 0; portion < 2; portion++) {
    cook(state)
    assert.equal(state.tally.completedOrders, 0)
    assert.equal(state.daily!.missions[0].progress, 0)
    state = parseSave(JSON.stringify(state))!
  }
  const before = state.cash
  cook(state)
  assert.equal(state.cash - before, 8000 + 5000)
  assert.equal(state.tally.completedOrders, 1)
  assert.equal(state.tally.sales.salt!.count, 3)
  assert.equal(state.reviews.length, 1)
  assert.equal(state.daily!.missions[0].rewarded, true)
  assert.equal(state.reputation, 4 + 5)
  state = parseSave(JSON.stringify(state))!
  const paidCash = state.cash
  assert.equal(deliver(state).ok, false)
  assert.equal(state.cash, paidCash)
  arrive(state)
  cook(state)
  assert.equal(state.daily!.missions[0].progress, 1)
  assert.equal(state.tally.tips, 5000 + 3000)
  assert.equal(state.reputation, 4 + 5 + 4 + 3)
})

test('day missions lock targets and rewards, rotate quality, and check quick-service patience precisely', () => {
  assert.deepEqual(createDailyActivity(1, 1).missions.map(task => task.target), [5, 2])
  for (const level of [1, 2, 3, 4]) assert.equal(createDailyActivity(2, level).missions[0].target, [10, 10, 12, 14][level - 1])
  assert.deepEqual([2, 3, 4, 5].map(day => createDailyActivity(day, 1).missions[1].kind), ['perfect', 'quick', 'good', 'perfect'])
  for (const late of [false, true]) {
    const state = stocked(3)
    start(state)
    const guest = arrive(state)
    state.shift!.elapsedMs = guest.arrivalMs + guest.patienceMs / 2 - mixDuration(state) + (late ? 1 : 0)
    cook(state)
    assert.equal(state.daily!.missions[1].progress, late ? 0 : 1)
    state.level = 4
    assert.equal(parseSave(JSON.stringify(state))!.daily!.missions[0].target, 10)
  }
  const state = stocked(4)
  start(state)
  arrive(state)
  cook(state, { omit: ['shrimpSalt'] })
  assert.equal(state.reviews[0].stars, 4)
  assert.equal(state.daily!.missions[1].progress, 1)
})

test('special chance and menu eligibility are decided on opening and survive save/reload', () => {
  const early = stocked(2)
  start(early, () => 0)
  assert.equal(early.daily!.highlight, null)
  const noSpecial = stocked(3)
  start(noSpecial, () => .35)
  assert.equal(noSpecial.daily!.highlight, null)
  const expensive = stocked(3)
  expensive.menu.salt.price = 20000
  start(expensive, () => 0)
  assert.equal(expensive.daily!.highlight, null)
  let state = stocked(3)
  start(state, () => 0)
  assert.deepEqual(state.daily!.highlight, { atMs: 160000, kind: 'special', profile: 4, specialKind: 'perfect', status: 'pending' })
  const values = [0, .6]
  tick(state, 900, () => values.shift() ?? .5)
  assert.notEqual(currentCustomer(state)!.profile, 4)
  state.shift!.nextArrivalMs = 1e9
  state.shift!.elapsedMs = 149999
  assert.notEqual(shiftNotice(state)?.id, 'special')
  tick(state, 1)
  assert.equal(shiftNotice(state)?.id, 'special')
  state = parseSave(JSON.stringify(state))!
  assert.equal(state.daily!.highlight!.atMs, 160000)
  tick(state, 10000, () => .5)
  const special = state.shift!.queue.find(guest => guest.special)!
  assert.equal(special.profile, 4)
  assert.equal(special.order.quantity, 1)
  assert.equal(special.patienceMs, PATIENCE_MS)
  assert.equal(state.daily!.highlight!.status, 'arrived')
  assert.equal(selectCustomer(state, special.id).ok, true)
  const before = state.cash
  const xp = state.reputation
  cook(state)
  assert.equal(state.cash - before, 8000 + 5000)
  assert.equal(state.reputation - xp, 4 + 5)
  state = parseSave(JSON.stringify(state))!
  tick(state, 1)
  assert.equal(state.shift!.queue.some(guest => guest.special), false)
})

test('special waits for capacity until 180s, then drops the event without charging or rewards', () => {
  for (const blocked of ['queue', 'stock', 'price'] as const) {
    let state = stocked(3)
    start(state, () => 0)
    for (let i = 0; i < 3; i++) arrive(state, i)
    state.shift!.elapsedMs = 160000
    for (const guest of state.shift!.queue) guest.arrivalMs = 159000
    if (blocked !== 'queue') {
      state.shift!.queue = []
      state.shift!.activeId = null
      if (blocked === 'stock') state.inventory.rice = 0
      else state.menu.salt.price = 20000
    }
    tick(state, 1)
    assert.equal(state.daily!.highlight!.status, 'pending')
    state = parseSave(JSON.stringify(state))!
    tick(state, 20000)
    assert.equal(state.daily!.highlight!.status, 'skipped')
    assert.equal(state.tally.tips, 0)
  }
  const state = stocked(3)
  start(state, () => 0)
  state.shift!.elapsedMs = 170000
  state.shift!.nextArrivalMs = 1e9
  tick(state, 1)
  assert.equal(state.daily!.highlight!.status, 'arrived')
  const early = stocked(3)
  start(early, () => 0)
  closeShop(early)
  assert.equal(early.daily!.highlight!.status, 'skipped')
})

test('a scheduled special takes a newly freed queue slot without replaying missed ordinary arrivals', () => {
  const state = stocked(3)
  start(state, () => 0)
  for (let profile = 0; profile < 3; profile++) arrive(state, profile)
  state.shift!.elapsedMs = 160000
  for (const guest of state.shift!.queue) guest.arrivalMs = 159000
  tick(state, 1)
  assert.equal(state.daily!.highlight!.status, 'pending')
  cook(state)
  tick(state, 1)
  assert.equal(state.daily!.highlight!.status, 'arrived')
  assert.equal(state.shift!.queue.length, 3)
  assert.equal(state.shift!.queue.filter(guest => guest.special).length, 1)
})

test('crispy special requires correct late crunch and light mixing; failure remains an ordinary review', () => {
  for (const scenario of ['perfect', 'early', 'missing', 'no-light', 'four-stars'] as const) {
    const state = stocked(3, 2, 'eggs')
    start(state, () => 0)
    assert.equal(state.daily!.highlight!.specialKind, 'crispy')
    state.shift!.elapsedMs = 159999
    state.shift!.nextArrivalMs = 1e9
    tick(state, 1, () => .5)
    const guest = currentCustomer(state)!
    assert.equal(guest.special, 'crispy')
    cook(state, { earlyCrunch: scenario === 'early', light: scenario !== 'no-light',
      omit: scenario === 'missing' ? ['peanut'] : scenario === 'four-stars' ? ['egg'] : [] })
    const passes = scenario === 'perfect' || scenario === 'four-stars'
    assert.equal(state.tally.tips, passes ? 4000 : 0, scenario)
    assert.equal(state.tally.xpEarned, state.reputation - levels[2].threshold)
    assert.equal(state.tally.completedOrders, 1)
    assert.equal(state.reviews.length, 1)
    if (scenario === 'four-stars') assert.equal(state.reviews[0].stars, 4)
  }
  const failed = stocked(3)
  start(failed, () => 0)
  failed.shift!.elapsedMs = 159999
  failed.shift!.nextArrivalMs = 1e9
  tick(failed, 1)
  cook(failed, { omit: ['shrimpSalt'] })
  assert.equal(failed.tally.tips, 0)
  assert.equal(failed.reviews[0].stars, 4)
})

test('EXP from orders, missions and replies unlocks only at next day, including all four levels', () => {
  for (const [level, threshold] of [[1, 40], [2, 120], [3, 240]] as const) {
    const state = stocked(1, level)
    state.reputation = threshold - 5
    state.daily!.missions[0].target = 1
    start(state)
    arrive(state)
    cook(state)
    assert.equal(state.level, level)
    assert.ok(state.reputation >= threshold)
    closeShop(state)
    nextDay(state)
    assert.equal(state.level, level + 1)
    assert.equal(state.daily!.day, state.day)
    assert.equal(state.daily!.missions[0].progress, 0)
  }
  const state = stocked()
  start(state)
  const guest = arrive(state)
  tick(state, guest.patienceMs)
  closeShop(state)
  const before = state.reputation
  assert.equal(replyToReview(state, guest.id, 'friendly').ok, true)
  assert.equal(replyToReview(state, guest.id, 'friendly').ok, false)
  assert.equal(state.reputation, before + 1)
  assert.equal(state.reports[0].xpEarned, state.tally.xpEarned)
})

test('cash, sales, rewards, tax, profit and remaining stock reconcile across paid partial orders and days', () => {
  const state = newGame()
  for (const id of ['rice', 'shrimpSalt', 'kumquat', 'pack']) purchase(state, id)
  let openingCash = 150000
  for (let day = 1; day <= 3; day++) {
    start(state)
    for (let i = 0; i < 2; i++) { arrive(state); cook(state) }
    const group = arrive(state)
    group.order.quantity = 3
    cook(state)
    assert.equal(addIngredient(state, 'rice').ok, true)
    closeShop(state)
    const report = state.reports.at(-1)!
    assert.equal(report.completedOrders, 2)
    assert.equal(report.sold, 3)
    assert.equal(report.tips, day === 1 ? 3000 : 0)
    assert.equal(report.revenue, salesRevenue(report) + report.tips)
    assert.equal(report.tax, Math.round(report.revenue * .03))
    assert.equal(report.cashDelta, state.cash - openingCash)
    assert.equal(report.profit, report.revenue - report.used - report.waste - report.spoilage - report.tax - report.overhead)
    assert.deepEqual(parseSave(JSON.stringify(state)), state)
    assert.equal(closeShop(state), false)
    openingCash = state.cash
    if (day < 3) {
      nextDay(state)
      for (const id of ['rice', 'shrimpSalt', 'kumquat', 'pack']) if (state.inventory[id as IngredientId] < 5) purchase(state, id)
    }
  }
  const week = sumReports(state.reports)!
  assert.equal(week.cashDelta, state.cash - 150000)
  assert.equal(week.tips, 3000)
  assert.equal(week.revenue, 72000 + 3000)
  assert.equal(week.completedOrders, 6)
  assert.equal(week.sold, 9)
  const remainingCost = priceOf(state.inventory)
  assert.equal(week.profit - week.cashDelta, remainingCost)
})

test('version 5 migration keeps partial sales and disables new features until the next day', () => {
  const state = stocked(3)
  start(state, () => 0)
  arrive(state)
  currentCustomer(state)!.order.quantity = 3
  cook(state)
  const legacy = JSON.parse(JSON.stringify(state))
  legacy.version = 5
  delete legacy.daily
  delete legacy.stories
  delete legacy.tally.completedOrders
  delete legacy.tally.tips
  delete legacy.tally.xpEarned
  const migrated = parseSave(JSON.stringify(legacy))!
  assert.equal(migrated.version, 7)
  assert.equal(migrated.daily, null)
  assert.equal(currentCustomer(migrated)!.servedPortions.length, 1)
  assert.equal(currentCustomer(migrated)!.order.quantity, 3)
  assert.equal(migrated.cash, state.cash)
  assert.equal(migrated.tally.tips, 0)
  assert.deepEqual(parseSave(JSON.stringify(migrated)), migrated)
  closeShop(migrated)
  nextDay(migrated)
  assert.equal(migrated.daily!.day, 4)
  const prep = stocked(3)
  const resumed = parseSave(JSON.stringify({ ...prep, version: 5, daily: undefined, stories: undefined }))!
  assert.equal(resumed.daily!.missions.length, 2)
})

test('save validation rejects broken rewards, story progress and special schedules', () => {
  const state = stocked(3)
  start(state, () => 0)
  for (const corrupt of [
    (s: GameState) => { s.daily!.missions[0].rewarded = true },
    (s: GameState) => { s.daily!.missions[0].progress = 999 },
    (s: GameState) => { s.daily!.highlight!.atMs = 180001 },
    (s: GameState) => { s.stories[0].stage = 4 },
    (s: GameState) => { s.tally.tips = -1 },
  ]) {
    const invalid = structuredClone(state)
    corrupt(invalid)
    assert.equal(parseSave(JSON.stringify(invalid)), null)
  }
})

test('a complete four-minute shift drains its queue and settles exactly once', () => {
  let state = stocked()
  start(state)
  while (state.phase === 'shop') {
    if (currentCustomer(state) && state.shift!.elapsedMs < SHIFT_MS - mixDuration(state)) cook(state)
    else tick(state, 1000, () => .5)
    if (state.phase === 'shop' && state.tally.completedOrders === 4) state = parseSave(JSON.stringify(state))!
  }
  assert.ok(state.tally.completedOrders >= 10)
  assert.ok(state.daily!.missions.every(task => task.rewarded))
  assert.equal(state.reports.length, 1)
  assert.equal(state.reports[0].closedAt, 1260)
  assert.equal(closeShop(state), false)
})

test('HUD and receipts expose mission progress, story dialogue, special requirements and EXP', () => {
  const state = stocked()
  start(state)
  const guest = arrive(state, 0)
  const options = { home: false, initialMute: false, prepTab: 'market' as const, previousCustomers: new Set<number>(), customerSpeechId: guest.id,
    modal: null, heatOpen: false, replyFor: null, reportPeriod: 'day' as const, reportDay: 2, warning: '', departure: null }
  let html = renderApp(state, options)
  assert.match(html, /data-action="shop-menu"/)
  const menu = () => dialogContent(state, { ...options, modal: 'shop-menu' })
  assert.match(menu(), /Đơn trọn vẹn/)
  assert.match(menu(), /0\/10/)
  assert.match(html, /Con sắp kiểm tra/)
  state.reputation = 40
  html = renderApp(state, options)
  assert.match(menu(), /Đủ EXP lên cấp/)
  const details = dialogContent(state, { ...options, modal: 'missions' })
  assert.match(details, /5.000đ/)
  assert.match(details, /mọi bịch/)
  const special = stocked(3)
  start(special, () => 0)
  special.shift!.elapsedMs = 159999
  special.shift!.nextArrivalMs = 1e9
  tick(special, 1)
  assert.match(renderApp(special, options), /Phần bánh hoàn hảo/)
  assert.match(renderApp(special, options), /Làm một bịch đạt 5 sao/)
})
