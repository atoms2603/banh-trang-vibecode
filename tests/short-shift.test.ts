import assert from 'node:assert/strict'
import test from 'node:test'
import { ingredientIds, ingredients, levels, menuIds, profiles } from '../src/data.ts'
import { createDailyActivity, currentShiftPhase, shiftNotice } from '../src/engagement.ts'
import { priceOf, salesRevenue, sumReports } from '../src/economy.ts'
import { addHeat, addIngredient, closeShop, currentCustomer, deliver, finishMix, mixDuration, newGame,
  nextDay, openShop, packBowl, purchase, SHIFT_MS, tick, toggleMix } from '../src/game.ts'
import { parseSave } from '../src/storage.ts'
import { dialogContent, renderApp } from '../src/ui.ts'
import type { GameState, Level, MenuId } from '../src/types.ts'

function stocked(day = 2, level: Level = 1, dish: MenuId = 'salt') {
  const state = newGame()
  state.day = day
  state.level = level
  state.reputation = levels[level].threshold
  state.daily = createDailyActivity(day, level)
  for (const id of ingredientIds) state.inventory[id] = 100
  for (const id of menuIds) state.menu[id].enabled = id === dish
  return state
}

function start(state = stocked(), random = () => .5) {
  assert.equal(openShop(state, random).ok, true)
  return state
}

function firstGuest(state: GameState) {
  tick(state, 900, () => .1)
  state.shift!.nextArrivalMs = 1e9
  return currentCustomer(state)!
}

function cook(state: GameState, omitSalt = false) {
  const guest = currentCustomer(state)!
  for (const category of ['base', 'seasoning', 'topping', 'crunch']) {
    if (category === 'topping') {
      assert.equal(toggleMix(state).ok, true)
      tick(state, mixDuration(state), () => .1)
    }
    for (const id of ingredientIds.filter(id => ingredients[id].category === category)) {
      for (let n = 0; n < (guest.order.recipe[id] ?? 0); n++) {
        if (omitSalt && id === 'shrimpSalt') continue
        assert.equal((id === 'chili' ? addHeat(state, guest.order.heat) : addIngredient(state, id)).ok, true, id)
      }
    }
  }
  assert.equal(finishMix(state).ok, true)
  assert.equal(packBowl(state, 'bag').ok, true)
  return deliver(state)
}

function reachHighlight(state: GameState, random = () => .1) {
  // Empty the queue through deliveries rather than removing guests from the saved state.
  while (currentCustomer(state)) cook(state)
  state.shift!.elapsedMs = 59999
  state.shift!.nextArrivalMs = 1e9
  tick(state, 1, random)
  return currentCustomer(state)!
}

test('short policy boundaries, countdown, gentle day one and tutorial all use played time', () => {
  assert.equal(SHIFT_MS, 105000)
  const state = start()
  assert.equal(state.version, 7)
  assert.equal(state.dayRules, 'short-105')
  for (const [time, phase, factor] of [[0, 'warmup', 1.3], [9999, 'warmup', 1.3], [10000, 'normal', 1],
    [29999, 'normal', 1], [30000, 'rush', .6], [44999, 'rush', .6], [45000, 'rest', 0],
    [54999, 'rest', 0], [55000, 'last', 1], [84999, 'last', 1], [85000, 'closing', 0], [104999, 'closing', 0]] as const) {
    state.shift!.elapsedMs = time
    assert.equal(currentShiftPhase(state).id, phase)
    assert.equal(currentShiftPhase(state).intervalFactor, factor)
  }
  for (const [time, label] of [[14999, null], [15000, 'Tăng tốc sau 15s'], [29999, 'Tăng tốc sau 1s'], [30000, null]] as const) {
    state.shift!.elapsedMs = time
    assert.equal(shiftNotice(state)?.label ?? null, label)
  }
  state.day = 1
  state.daily!.highlight = null
  for (const time of [10000, 30000, 45000, 55000, 84999]) {
    state.shift!.elapsedMs = time
    assert.equal(currentShiftPhase(state).intervalFactor, 1.3)
    assert.equal(shiftNotice(state), null)
  }
  const guided = stocked(1)
  guided.tutorialStep = 0
  start(guided)
  tick(guided, 100000)
  assert.equal(guided.shift!.elapsedMs, 900)
  tick(guided, 100000)
  assert.equal(guided.shift!.elapsedMs, 900)
})

test('arrival phase changes rescale remaining delay; the ten-second rest never accumulates arrivals', () => {
  const state = start()
  tick(state, 899)
  assert.equal(state.shift!.queue.length, 0)
  tick(state, 1, () => .1)
  assert.equal(state.shift!.queue.length, 1)
  state.shift!.elapsedMs = 9999
  state.shift!.nextArrivalMs = 15200
  tick(state, 1)
  assert.equal(state.shift!.nextArrivalMs, 14000)
  state.shift!.elapsedMs = 29999
  state.shift!.nextArrivalMs = 40000
  tick(state, 1)
  assert.equal(state.shift!.nextArrivalMs, 36000)
  state.shift!.elapsedMs = 44999
  state.shift!.nextArrivalMs = 45000
  const id = state.nextCustomerId
  tick(state, 1)
  tick(state, 9999)
  assert.equal(state.nextCustomerId, id)
  tick(state, 1, () => 0)
  assert.equal(state.shift!.nextArrivalMs, 55000 + 10800)
  assert.equal(state.nextCustomerId, id)
  const cheap = start()
  cheap.menu.salt.price = 3000
  cheap.shift!.elapsedMs = 54999
  cheap.shift!.nextArrivalMs = 45000
  tick(cheap, 1, () => 0)
  assert.equal(cheap.shift!.nextArrivalMs, 55000 + 10800 * .72)
})

test('queues fit all available profiles at any level and retry without spawning duplicates', () => {
  for (const level of [1, 2] as const) {
    const state = start(stocked(2, level))
    for (let n = 0; n < profiles.length - 1; n++) {
      state.shift!.nextArrivalMs = state.shift!.elapsedMs
      tick(state, 1, () => .1)
    }
    assert.equal(new Set(state.shift!.queue.map(guest => guest.profile)).size, profiles.length - 1)
    assert.equal(parseSave(JSON.stringify(state))!.shift!.queue.length, profiles.length - 1)
    const count = state.nextCustomerId
    state.shift!.nextArrivalMs = state.shift!.elapsedMs
    tick(state, 1000, () => .1)
    assert.equal(state.nextCustomerId, count)
    assert.equal(state.shift!.nextArrivalMs, state.shift!.elapsedMs + 2000)
  }
})

test('scheduled regular is reserved, arrives at 60s and alone progresses a story', () => {
  for (const [day, profile] of [[2, 0], [3, 3], [4, 6]] as const) {
    const state = start(stocked(day))
    assert.deepEqual(state.daily!.highlight, { kind: 'story', profile, storyStage: 0, atMs: 60000, status: 'pending' })
    const ordinary = firstGuest(state)
    assert.notEqual(ordinary.profile, profile)
    assert.equal(ordinary.storyStage, undefined)
    state.shift!.elapsedMs = 50000
    assert.equal(shiftNotice(state)?.id, 'special')
    state.shift!.elapsedMs = 900
    cook(state)
    const guest = reachHighlight(state)
    assert.equal(guest.profile, profile)
    assert.equal(guest.storyStage, 0)
    assert.equal(state.daily!.highlight!.status, 'arrived')
    const before = state.cash
    const result = cook(state)
    assert.equal(state.cash - before, 9500 + (state.daily!.missions[1].rewarded ? 3000 : 0))
    assert.equal(state.stories[profile].stage, 1)
    assert.ok(result.departureText)
    assert.deepEqual(parseSave(JSON.stringify(state)), state)
  }
})

test('scheduled stories require stock for every bag, avoid overbooking extra mango and retain partial progress', () => {
  let state = stocked(3, 2, 'classic')
  state.stories[3].stage = 2
  state.inventory.mango = 3
  start(state)
  let guest = reachHighlight(state)
  assert.equal(guest.profile, 3)
  assert.equal(guest.order.quantity, 3)
  assert.equal(guest.order.extraMango, false)
  assert.equal(guest.order.recipe.mango, 1)
  assert.equal(guest.patienceMs, 106000)
  cook(state)
  assert.equal(state.tally.completedOrders, 0)
  assert.equal(state.stories[3].stage, 2)
  state = parseSave(JSON.stringify(state))!
  guest = currentCustomer(state)!
  assert.equal(guest.servedPortions.length, 1)
  assert.equal(guest.storyStage, 2)
  cook(state)
  cook(state)
  assert.equal(state.tally.completedOrders, 1)
  assert.equal(state.daily!.missions[0].progress, 1)
  assert.equal(state.stories[3].stage, 3)
  assert.equal(state.tally.tips, 3000)
  assert.equal(state.tally.xpEarned, 7)
  const cash = state.cash
  state = parseSave(JSON.stringify(state))!
  assert.equal(deliver(state).ok, false)
  assert.equal(state.cash, cash)
})

test('poor stories progress without bonus; abandoned stories retry on another day', () => {
  const poor = start()
  reachHighlight(poor)
  const response = cook(poor, true)
  // Missing salt is a four-star serving; also check an actual poor complete visit.
  assert.equal(poor.stories[0].stage, 1)
  assert.ok(response.departureText)
  const state = start()
  const guest = reachHighlight(state)
  guest.order.pricey = true
  cook(state)
  assert.equal(state.reviews[0].stars, 2)
  assert.equal(state.tally.tips, 0)
  assert.equal(state.stories[0].stage, 1)
  const abandoned = start()
  reachHighlight(abandoned)
  closeShop(abandoned)
  assert.equal(abandoned.stories[0].stage, 0)
  nextDay(abandoned)
  assert.equal(abandoned.stories[0].lastVisitDay, 2)
  // Make the other regulars unavailable so the retry is selected.
  abandoned.stories[3].stage = abandoned.stories[6].stage = 3
  start(abandoned)
  assert.equal(abandoned.daily!.highlight!.profile, 0)
})

test('special visits use the 35% threshold, retain priority and fall back if the eligible dish disappears', () => {
  for (const [roll, kind] of [[.34999, 'special'], [.35, 'story']] as const) {
    const state = start(stocked(3), () => roll)
    assert.equal(state.daily!.highlight!.kind, kind)
    assert.deepEqual(parseSave(JSON.stringify(state))!.daily, state.daily)
  }
  const state = start(stocked(3), () => 0)
  firstGuest(state)
  while (state.shift!.queue.length < profiles.length - 1) {
    state.shift!.nextArrivalMs = state.shift!.elapsedMs
    tick(state, 1, () => .1)
  }
  state.shift!.elapsedMs = 59999
  state.shift!.nextArrivalMs = 60000
  const lastId = state.nextCustomerId
  tick(state, 1, () => .1)
  assert.equal(state.shift!.queue.length, profiles.length)
  assert.equal(state.shift!.queue.at(-1)!.special, 'perfect')
  assert.equal(state.nextCustomerId, lastId + 1)
  assert.equal(state.daily!.highlight!.status, 'arrived')
  assert.ok(state.shift!.nextArrivalMs >= state.shift!.elapsedMs + 2000)
  const fallback = start(stocked(3), () => 0)
  fallback.menu.salt.price = 50000 // No longer eligible for a special.
  const guest = reachHighlight(fallback, () => .5)
  assert.equal(fallback.daily!.highlight!.kind, 'story')
  assert.equal(guest.special, undefined)
})

test('finished stories fall back to two bags; impossible visits expire at 85s without fabricated losses', () => {
  const state = stocked(4)
  for (const story of Object.values(state.stories)) story.stage = 3
  start(state)
  assert.equal(state.daily!.highlight!.kind, 'group')
  const guest = reachHighlight(state)
  assert.equal(guest.order.quantity, 2)
  assert.equal(guest.storyStage, undefined)
  cook(state)
  cook(state)
  assert.equal(state.tally.completedOrders, 1)
  const empty = start(stocked(3), () => 0)
  empty.inventory.rice = 0
  empty.shift!.elapsedMs = 59999
  empty.shift!.nextArrivalMs = 1e9
  tick(empty, 1)
  assert.equal(empty.daily!.highlight!.status, 'pending')
  const restored = parseSave(JSON.stringify(empty))!
  tick(restored, 25000)
  assert.equal(restored.daily!.highlight!.status, 'skipped')
  assert.equal(restored.phase, 'report')
  assert.equal(restored.tally.lost, 0)
  assert.equal(restored.tally.tips, 0)
  assert.equal(restored.reviews.length, 0)
})

test('new special rewards pay once for perfect and crispy servings, and stockouts expire at the deadline', () => {
  for (const [dish, cash, xp] of [['salt', 5000, 5], ['eggs', 4000, 4]] as const) {
    let state = start(stocked(3, 2, dish), () => 0)
    reachHighlight(state)
    assert.equal(currentCustomer(state)!.special, dish === 'salt' ? 'perfect' : 'crispy')
    const before = state.cash
    cook(state)
    assert.equal(state.cash - before, state.menu[dish].price + cash)
    assert.equal(state.tally.tips, cash)
    assert.equal(state.tally.xpEarned, 4 + xp)
    state = parseSave(JSON.stringify(state))!
    assert.equal(deliver(state).ok, false)
    assert.equal(state.tally.tips, cash)
  }
  const full = start(stocked(3), () => 0)
  while (full.shift!.queue.length < 3) {
    full.shift!.nextArrivalMs = full.shift!.elapsedMs
    tick(full, 1, () => .1)
  }
  for (const guest of full.shift!.queue) guest.arrivalMs = 59000
  full.inventory.rice = 0
  full.shift!.elapsedMs = 59999
  full.shift!.nextArrivalMs = 1e9
  tick(full, 1)
  assert.equal(full.daily!.highlight!.status, 'pending')
  tick(full, 25000)
  assert.equal(full.daily!.highlight!.status, 'skipped')
  assert.equal(full.shift!.queue.length, 3)
  assert.equal(full.tally.lost, 0)
})

test('mission targets fit short shifts and a complete shift can achieve them without a customer quota', () => {
  assert.deepEqual(createDailyActivity(1, 1).missions.map(m => m.target), [5, 2])
  assert.deepEqual([1, 2, 3, 4].map(level => createDailyActivity(2, level).missions[0].target), [6, 7, 8, 9])
  assert.deepEqual([2, 3, 4].map(day => createDailyActivity(day, 1).missions[1].target), [2, 3, 3])
  for (const level of [1, 2, 3, 4] as const) {
    let state = start(stocked(2, level))
    while (state.phase === 'shop') {
      if (currentCustomer(state)) cook(state)
      else tick(state, 100, () => .1)
      if (state.phase === 'shop') state = parseSave(JSON.stringify(state))!
    }
    assert.ok(state.daily!.missions.every(m => m.rewarded), JSON.stringify({ level, missions: state.daily!.missions }))
    assert.equal(state.reports[0].endReason, 'queue-cleared')
    assert.ok(state.tally.completedOrders > state.daily!.missions[0].target)
    assert.equal(state.reports.length, 1)
  }
})

test('closing keeps the final receipt positive, then settles once on the next tick', () => {
  let state = start()
  const guest = firstGuest(state)
  guest.arrivalMs = 84000
  state.shift!.elapsedMs = 85000
  const before = state.cash
  assert.equal(cook(state).ok, true)
  assert.equal(state.cash - before, 8000)
  assert.equal(state.phase, 'shop')
  assert.equal(state.tally.lost, 0)
  state = parseSave(JSON.stringify(state))!
  tick(state, 16)
  assert.equal(state.phase, 'report')
  assert.equal(state.reports[0].endReason, 'queue-cleared')
  assert.ok(state.reports[0].closedAt! < 1260)
  assert.equal(state.reports[0].overhead, 15000)
  assert.equal(state.reports[0].tax, 240)
  assert.equal(state.cash, before + 8000 - 15000 - 240)
  const settled = parseSave(JSON.stringify(state))!
  assert.equal(closeShop(settled), false)
  assert.equal(tick(settled, 100000), false)
  assert.deepEqual(settled, state)
})

test('hard and manual endings keep full costs and waste only the unfinished portion of a paid group', () => {
  for (const manual of [false, true]) {
    const state = start(stocked(3, 4))
    state.staff = true
    const guest = firstGuest(state)
    guest.order.quantity = 3
    cook(state)
    state.shift!.elapsedMs = 104999
    guest.arrivalMs = 90000
    addIngredient(state, 'rice')
    const bowlCost = priceOf(state.shift!.bowl.ingredients)
    const cash = state.cash
    if (manual) closeShop(state)
    else tick(state, 1)
    const report = state.reports[0]
    assert.equal(report.endReason, manual ? 'manual' : 'time')
    assert.equal(report.sold, 1)
    assert.equal(report.completedOrders, 0)
    assert.equal(report.lost, 1)
    assert.equal(report.waste, bowlCost)
    assert.equal(report.overhead, 50000)
    assert.equal(report.wages, 20000)
    assert.equal(report.tax, Math.round(report.revenue * .03))
    assert.equal(state.cash, cash - report.overhead - report.wages - report.tax)
    assert.equal(report.profit, report.revenue - report.overhead - report.wages - report.tax - report.used - report.waste - report.spoilage)
    assert.equal(state.inventory.mango, 70)
    assert.equal(state.inventory.cilantro, 70)
    assert.equal(state.inventory.egg, 70)
  }
})

test('cash reconciles with profit and remaining inventory across a legacy day and two short days', () => {
  let state = newGame()
  state.dayRules = 'legacy-240'
  state.daily = createDailyActivity(1, 1, 'legacy-240')
  let openingCash = state.cash
  for (let day = 1; day <= 3; day++) {
    if (state.inventory.rice < 5) assert.equal(purchase(state, 'rice').ok, true)
    for (const id of ['shrimpSalt', 'kumquat', 'pack'] as const) {
      if (state.inventory[id] < 5) assert.equal(purchase(state, id).ok, true)
    }
    start(state)
    firstGuest(state)
    cook(state)
    for (let n = 0; n < 2; n++) {
      state.shift!.nextArrivalMs = state.shift!.elapsedMs
      tick(state, 1, () => .1)
      if (n === 1) currentCustomer(state)!.order.quantity = 3
      cook(state)
    }
    addIngredient(state, 'rice')
    closeShop(state)
    const report = state.reports.at(-1)!
    assert.equal(report.revenue, salesRevenue(report) + report.tips)
    assert.equal(report.tax, Math.round(report.revenue * .03))
    assert.equal(report.cashDelta, state.cash - openingCash)
    assert.equal(report.sold, 3)
    assert.equal(report.completedOrders, 2)
    assert.equal(report.waste, 2000)
    assert.equal(report.profit, report.revenue - report.used - report.waste - report.spoilage - report.tax - report.overhead)
    state = parseSave(JSON.stringify(state))!
    assert.equal(closeShop(state), false)
    openingCash = state.cash
    if (day < 3) nextDay(state)
  }
  const week = sumReports(state.reports)!
  assert.equal(week.cashDelta, state.cash - 150000)
  assert.equal(week.tips, 6000)
  assert.equal(week.revenue, 78000)
  assert.equal(week.profit - week.cashDelta, priceOf(state.inventory))
})

function versionSix(state: GameState) {
  const old = JSON.parse(JSON.stringify(state))
  old.version = 6
  delete old.dayRules
  old.daily.special = old.daily.highlight ? {
    atMs: old.daily.highlight.atMs, kind: old.daily.highlight.specialKind, status: old.daily.highlight.status,
  } : null
  delete old.daily.highlight
  for (const report of old.reports) delete report.endReason
  return old
}

test('v6 at 170s restores its old policy, locked missions, schedule, cash and partial mixing', () => {
  const state = stocked(3)
  state.dayRules = 'legacy-240'
  state.daily = createDailyActivity(3, 1, 'legacy-240')
  start(state, () => 0)
  firstGuest(state)
  currentCustomer(state)!.arrivalMs = 160000
  currentCustomer(state)!.order.quantity = 3
  cook(state)
  addIngredient(state, 'rice')
  toggleMix(state)
  tick(state, 1000)
  state.shift!.elapsedMs = 170000
  const old = versionSix(state)
  let restored = parseSave(JSON.stringify(old))!
  assert.ok(restored)
  assert.equal(restored.dayRules, 'legacy-240')
  assert.equal(restored.shift!.elapsedMs, 170000)
  assert.equal(restored.shift!.bowl.mixMs, 1000)
  assert.equal(currentCustomer(restored)!.servedPortions.length, 1)
  assert.equal(restored.cash, state.cash)
  assert.equal(restored.daily!.missions[0].target, 10)
  assert.equal(restored.daily!.highlight!.atMs, 160000)
  restored = parseSave(JSON.stringify(restored))!
  tick(restored, 1000)
  assert.equal(restored.phase, 'shop')
  closeShop(restored)
  const oldReport = structuredClone(restored.reports[0])
  nextDay(restored)
  assert.equal(restored.dayRules, 'short-105')
  assert.equal(restored.daily!.missions[0].target, 6)
  assert.deepEqual(restored.reports[0], oldReport)
})

test('v6 prep adopts new targets, settled reports preserve all figures and invalid new metadata is rejected', () => {
  const prep = stocked(4)
  prep.daily = createDailyActivity(4, 1, 'legacy-240')
  prep.stories[0].stage = 2
  const migrated = parseSave(JSON.stringify(versionSix(prep)))!
  assert.equal(migrated.daily!.missions[0].target, 6)
  assert.equal(migrated.daily!.missions[1].target, 3)
  for (const key of ['cash', 'inventory', 'menu', 'stories'] as const) assert.deepEqual(migrated[key], prep[key])
  const state = start()
  firstGuest(state)
  cook(state)
  closeShop(state)
  state.daily!.highlight = null
  const old = versionSix(state)
  const restored = parseSave(JSON.stringify(old))!
  const { endReason, ...figures } = restored.reports[0]
  assert.deepEqual(figures, old.reports[0])
  assert.equal(endReason, 'manual')
  assert.equal(restored.cash, state.cash)
  const invalidReport = structuredClone(state)
  Reflect.set(invalidReport.reports[0], 'endReason', 'unknown')
  assert.equal(parseSave(JSON.stringify(invalidReport)), null)
  for (const corrupt of [
    (s: any) => { s.dayRules = 'short-999' },
    (s: any) => { s.daily.highlight.atMs = 85000 },
    (s: any) => { s.daily.highlight.profile = 4 },
    (s: any) => { s.shift.elapsedMs = 105000 },
  ]) {
    const invalid = start()
    corrupt(invalid)
    assert.equal(parseSave(JSON.stringify(invalid)), null)
  }
})

test('v1–5 shifts beyond 105 seconds remain loadable and keep the original four-minute clock', () => {
  for (const version of [1, 2, 3, 4, 5]) {
    const state = stocked(3)
    state.dayRules = 'legacy-240'
    state.daily = createDailyActivity(3, 1, 'legacy-240')
    start(state)
    firstGuest(state)
    state.shift!.elapsedMs = 170000
    currentCustomer(state)!.arrivalMs = 169000
    const old = versionSix(state)
    old.version = version
    delete old.daily
    delete old.stories
    delete old.tally.completedOrders
    delete old.tally.tips
    delete old.tally.xpEarned
    const restored = parseSave(JSON.stringify(old))!
    assert.ok(restored, `version ${version}`)
    assert.equal(restored.dayRules, 'legacy-240')
    assert.equal(restored.daily, null)
    tick(restored, 1000)
    assert.equal(restored.shift!.elapsedMs, 171000)
    assert.equal(restored.cash, state.cash)
  }
})

test('preparation stays concise, help explains the rules and reports explain their ending', () => {
  const options = { home: false, initialMute: false, prepTab: 'market' as const, previousCustomers: new Set<number>(), customerSpeechId: null,
    modal: null, heatOpen: false, replyFor: null, reportPeriod: 'day' as const, reportDay: 2, warning: '', departure: null }
  const state = stocked()
  assert.doesNotMatch(renderApp(state, options), /Ca tối đa|Ngừng đón khách/)
  assert.match(dialogContent(state, { ...options, modal: 'help' }), /1:45/)
  for (const [reason, label] of [['queue-cleared', 'Đã giao hết đơn'], ['manual', 'Đã kết thúc sớm'], ['time', 'Tiệm đã đóng cửa']] as const) {
    const state = start()
    closeShop(state, reason)
    assert.match(renderApp(state, options), new RegExp(label))
  }
  const legacy = stocked()
  legacy.dayRules = 'legacy-240'
  assert.match(dialogContent(legacy, { ...options, modal: 'help' }), /4 phút/)
})
