import assert from 'node:assert/strict'
import test from 'node:test'
import { bowlZone, traceBowl, zoneIsEven } from '../src/coating.ts'
import { addIngredient, closeShop, currentCustomer, deliver, newGame, nextDay, openShop, packBowl, stirBowl, tick, usesDirectBowl } from '../src/game.ts'
import { parseSave } from '../src/storage.ts'
import { reviewLine } from '../src/reviews.ts'
import { ingredientIds, ingredients, menuIds } from '../src/data.ts'
import { dialogContent, renderApp } from '../src/ui.ts'
import type { GameState, MenuId } from '../src/types.ts'
import type { ScreenOptions } from '../src/ui.ts'

const options: ScreenOptions = {
  home: false, initialMute: true, prepTab: 'market', previousCustomers: new Set(), customerSpeechId: null,
  modal: null, reportPeriod: 'day', reportDay: 1, warning: '', departure: null,
}
const spread = { weights: [1, 1, 1, 1, 1, 1], zone: 0 }
const heap = { weights: [0, 0, 0, 0, 0, 0], zone: 0 }

function shift(noteChoice: number, stock = 25, noteChance = .29) {
  const state = newGame()
  for (const id of ['rice', 'kumquat', 'shrimpSalt', 'pack'] as const) state.inventory[id] = stock
  assert.equal(openShop(state).ok, true)
  const rolls = [.5, .5, .85, noteChance, noteChoice, .5]
  tick(state, 905, () => rolls.shift() ?? .5)
  assert.ok(usesDirectBowl(state))
  return state
}

function serve(state: GameState) {
  assert.equal(packBowl(state).ok, true)
  assert.equal(deliver(state).ok, true)
}

test('muối tắc notes request one extra portion per bag and keep quantities behind order details', () => {
  for (const [id, note, choice] of [['rice', 'Nhiều bánh', .1], ['kumquat', 'Nhiều chua', .4], ['shrimpSalt', 'Nhiều muối', .9]] as const) {
    const state = shift(choice)
    const order = currentCustomer(state)!.order
    assert.equal(order.quantity, 2)
    assert.equal(order.extra, id)
    assert.equal(order.recipe[id], 2)
    assert.equal(Object.values(order.recipe).filter(value => value === 2).length, 1)
    const compact = renderApp(state, options)
    assert.ok(compact.includes(note))
    assert.doesNotMatch(compact, /class="order-quantity"/)
    assert.match(dialogContent(state, { ...options, modal: 'order' }), /×2 mỗi bịch/)
    assert.equal(currentCustomer(parseSave(JSON.stringify(state))!)!.order.extra, id)
  }
  assert.equal(currentCustomer(shift(.4, 3))!.order.extra, undefined, 'cannot promise double portions for both bags')
  assert.equal(currentCustomer(shift(.4, 25, .30))!.order.extra, undefined)
})

test('strokes transfer coating locally, preserve each dose and let a clumped portion earn five stars after repair', () => {
  const state = shift(.4, 25, .5)
  const guest = currentCustomer(state)!
  guest.order.quantity = 3
  for (let i = 0; i < 3; i++) {
    assert.equal(addIngredient(state, 'rice').ok, false)
    assert.equal(addIngredient(state, 'rice', heap).ok, true)
    assert.equal(addIngredient(state, 'shrimpSalt', spread).ok, true)
    assert.equal(addIngredient(state, 'kumquat', i === 0 ? spread : heap).ok, true)
    if (i === 2) {
      const citrus = state.shift!.bowl.coating!.kumquat!
      assert.equal(zoneIsEven(citrus), false)
      assert.ok(stirBowl(state, 0))
      assert.deepEqual(citrus.slice(2, 5), [0, 0, 0])
      for (let repetition = 0; repetition < 3; repetition++) {
        for (let zone = 5; zone >= 0; zone--) assert.ok(stirBowl(state, zone))
      }
      assert.ok(zoneIsEven(citrus))
      assert.ok(Math.abs(citrus.reduce((sum, dose) => sum + dose, 0) - 1) < 1e-8)
      assert.ok(parseSave(JSON.stringify(state)), 'partly cooked bowl and already delivered bags survive reload')
    }
    serve(state)
  }
  assert.equal(state.inventory.kumquat, 22)
  assert.equal(state.inventory.rice, 22)
  assert.deepEqual(guest.servedPortions.map(portion => portion.stars), [5, 4, 5])
  assert.equal(state.reviews.length, 1)
  assert.deepEqual(state.reviews[0].details!.portions[1]!.issues, [{ kind: 'uneven', ingredient: 'kumquat' }])
  assert.deepEqual(parseSave(JSON.stringify(state))!.reviews, state.reviews)
  const view = dialogContent(state, { ...options, modal: 'reviews' })
  assert.match(view, /Xem lại phiếu/)
  assert.match(view, /Bịch 3/)
  assert.match(view, /Chưa đều · cần 1, đã cho 1/)
})

test('review text uses its full pool before repeating and hides old shop replies', () => {
  const state = shift(.4, 40, .5)
  const guest = currentCustomer(state)!
  guest.order.quantity = 1
  for (let count = 0; count < 25; count++) {
    if (count) {
      state.shift!.nextArrivalMs = state.shift!.elapsedMs
      tick(state, 1, () => .5)
    }
    addIngredient(state, 'rice', heap)
    addIngredient(state, 'kumquat', spread)
    addIngredient(state, 'shrimpSalt', spread)
    serve(state)
  }
  const lines = state.reviews.map(review => review.text)
  assert.equal(new Set(lines.slice(0, 24)).size, 24)
  assert.equal(lines[24], lines[0], 'reuse the least recently used line when the pool is exhausted')
  const firstJoke = reviewLine('saltExtra', guest, [], 'tắc')
  state.reviews[0].text = firstJoke
  assert.notEqual(reviewLine('saltExtra', guest, state.reviews, 'muối tôm'), firstJoke.replace('tắc', 'muối tôm'))

  state.reviews[0].reply = 'friendly'
  const restored = parseSave(JSON.stringify(state))!
  const view = dialogContent(restored, { ...options, modal: 'reviews' })
  assert.equal(restored.reviews[0].reply, 'friendly')
  assert.match(view, /Xem lại phiếu/)
  assert.doesNotMatch(view, /Trả lời|review-reply|reply-toggle/)
})

test('a short stroke cannot double-charge and missing extra rice is highlighted in the delivered receipt', () => {
  const weights = [0, 0, 0, 0, 0, 0]
  const start = { x: .6, y: 0 }
  traceBowl(start, start, () => assert.fail('stationary pointer must not apply another dose'))
  traceBowl(start, { x: -.6, y: 0 }, (sample, distance) => { weights[bowlZone(sample)] += distance })
  assert.equal(weights.filter(Boolean).length, 2)
  const state = shift(.1)
  for (let i = 0; i < 2; i++) {
    addIngredient(state, 'rice', heap)
    addIngredient(state, 'kumquat', spread)
    addIngredient(state, 'shrimpSalt', spread)
    serve(state)
  }
  const view = dialogContent(state, { ...options, modal: 'reviews' })
  assert.match(view, /Hình như mình có dặn <strong class="review-error">nhiều bánh<\/strong>/)
  assert.match(view, /Thiếu · cần 2, đã cho 1/)
})

test('an old in-progress shift retains its bowl and switches to direct mixing only after closing', () => {
  const model = shift(.4, 25, .5)
  const original = { ...model, version: 7, shift: { ...model.shift, directBowl: undefined,
    queue: model.shift!.queue.map(guest => ({ ...guest, order: { ...guest.order, heat: 0 } })) } }
  const restored = parseSave(JSON.stringify(original))!
  assert.equal(usesDirectBowl(restored), false)
  assert.ok(addIngredient(restored, 'rice').ok)
  assert.equal(restored.shift!.bowl.ingredients.rice, 1)
  assert.ok(closeShop(restored))
  assert.ok(nextDay(restored).ok)
  assert.ok(openShop(restored).ok)
  tick(restored, 905, () => .5)
  assert.ok(usesDirectBowl(restored))
})

function openDish(dish: MenuId, rolls: number[] = [], chili = 30) {
  const state = newGame()
  state.level = 4
  for (const id of ingredientIds) state.inventory[id] = id === 'chili' ? chili : 30
  for (const id of menuIds) state.menu[id].enabled = id === dish
  assert.ok(openShop(state).ok)
  tick(state, 905, () => rolls.shift() ?? .5)
  return state
}

function followRecipe(state: GameState, chili?: number) {
  const order = currentCustomer(state)!.order
  for (const category of ['base', 'seasoning', 'topping', 'crunch']) {
    for (const id of ingredientIds.filter(id => ingredients[id].category === category)) {
      const doses = id === 'chili' ? chili ?? order.recipe.chili ?? 0 : order.recipe[id] ?? 0
      for (let dose = 0; dose < doses; dose++) assert.ok(addIngredient(state, id, spread).ok, id)
    }
  }
}

test('every dish can be cooked from its receipt in the direct bowl, with toppings drawn separately from sauces', () => {
  for (const dish of menuIds) {
    const state = openDish(dish)
    assert.ok(usesDirectBowl(state), dish)
    followRecipe(state)
    const html = renderApp(state, options)
    assert.match(html, /data-direct-surface/)
    assert.doesNotMatch(html, /Chọn mức cay|data-action="heat"|data-action="mix"/)
    if (dish === 'eggs') assert.match(html, /data-bowl-topping="egg"/)
    if (dish === 'tamarind') assert.equal(state.shift!.bowl.coating!.tamarind!.length, 6)
    serve(state)
    assert.equal(state.reviews[0].stars, 5, dish)
  }
  const overmixed = openDish('eggs')
  followRecipe(overmixed)
  for (const zone of [0, 1, 2]) assert.ok(stirBowl(overmixed, zone))
  serve(overmixed)
  assert.deepEqual(overmixed.reviews[0].details!.portions[0]!.issues, [{ kind: 'soggy' }])
})

test('Nhiều cay means two sa tế drops and a missing one is highlighted with counts instead of heat labels', () => {
  const lotsOfChili = () => [.5, .5, .5, .5, .5, .15, .99]
  const state = openDish('classic', lotsOfChili())
  const order = currentCustomer(state)!.order
  assert.equal(order.extra, 'chili')
  assert.equal(order.recipe.chili, 2)
  assert.equal(order.heat, undefined)
  assert.match(renderApp(state, options), /Nhiều cay/)
  assert.match(dialogContent(state, { ...options, modal: 'order' }), /Sa tế ×2 mỗi bịch/)
  followRecipe(state, 1)
  serve(state)
  const review = dialogContent(state, { ...options, modal: 'reviews' })
  assert.match(review, /<strong class="review-error">nhiều cay<\/strong>/i)
  assert.match(review, /Thiếu · cần 2, đã cho 1/)
  assert.doesNotMatch(review, /Ít cay|Siêu cay|Không cay/)

  const enough = openDish('classic', lotsOfChili())
  followRecipe(enough)
  assert.equal(enough.inventory.chili, 28)
  serve(enough)
  assert.equal(enough.reviews[0].stars, 5)
  const limited = currentCustomer(openDish('classic', lotsOfChili(), 1))!.order
  assert.notEqual(limited.extra, 'chili')
  assert.equal(limited.recipe.chili, 1)
})

test('a half-finished bowl from the salt pilot keeps paid ingredients and resumes without the heat picker', () => {
  const experimental = openDish('classic')
  const shift = experimental.shift!
  const previous = { ...experimental, version: 8, shift: { ...shift, directBowl: undefined, directSalt: true,
    queue: shift.queue.map(guest => ({ ...guest, order: { ...guest.order, heat: 2 } })),
    bowl: { ...shift.bowl, ingredients: { rice: 1, chili: 1, mango: 1 }, mixing: true, mixMs: 900, heat: 2, coating: undefined },
  } }
  previous.inventory = { ...experimental.inventory, rice: 29, chili: 29, mango: 29 }
  const restored = parseSave(JSON.stringify(previous))!
  assert.ok(usesDirectBowl(restored))
  assert.deepEqual(restored.inventory, previous.inventory)
  assert.equal(currentCustomer(restored)!.order.heat, undefined)
  assert.equal(restored.shift!.bowl.mixing, false)
  assert.ok(zoneIsEven(restored.shift!.bowl.coating!.chili!))
  assert.equal(restored.shift!.bowl.coating!.mango![0], 1)
  assert.deepEqual(parseSave(JSON.stringify(restored)), restored)
})
