import assert from 'node:assert/strict'
import test from 'node:test'
import { counterItems, counterPage, ingredientPage, ingredientTab, initialCounterTab, missingIngredient } from '../src/counter.ts'
import { ingredientIds } from '../src/data.ts'
import { addIngredient, currentCustomer, deliver, finishMix, makeOrder, newGame, openShop, packBowl, tick, toggleMix } from '../src/game.ts'
import { parseSave } from '../src/storage.ts'
import { dialogContent, renderApp } from '../src/ui.ts'
import type { ScreenOptions } from '../src/ui.ts'

const options: ScreenOptions = {
  home: false, initialMute: true, prepTab: 'market', previousCustomers: new Set(), customerSpeechId: null,
  modal: null, heatOpen: false, replyFor: null, reportPeriod: 'day', reportDay: 1, warning: '', departure: null,
}

function stocked() {
  const state = newGame()
  state.level = 4
  for (const id of ingredientIds) state.inventory[id] = 50
  openShop(state, () => .99)
  tick(state, 901, () => 0)
  return state
}

test('all unlocked ingredients remain reachable in stable groups of at most eight trays', () => {
  const state = stocked()
  for (const level of [1, 2, 3, 4] as const) {
    state.level = level
    const reachable = new Set([...counterItems(state, 'seasoning'), ...counterItems(state, 'topping')])
    for (const id of reachable) {
      const tab = ingredientTab(id)
      const page = counterPage(state, tab, ingredientPage(state, id))
      assert.ok(page.items.includes(id), id)
      assert.ok(page.items.length <= 8)
    }
    assert.equal(counterItems(state, 'seasoning')[0], 'rice')
  }
  assert.deepEqual(counterPage(state, 'topping', 1).items, ['shallot'])
  state.level = 1
  assert.equal(counterPage(state, 'topping', 200).index, 0)
  assert.equal(counterItems(state, 'topping').includes('shallot'), false)
})

test('a partial order retains required quantities and offers the right next action after restoring', () => {
  const state = stocked()
  const customer = currentCustomer(state)!
  customer.order = makeOrder(state, 'classic', () => .6)
  customer.order.recipe.mango = 2
  assert.equal(initialCounterTab(state), 'seasoning')
  for (const id of ['rice', 'kumquat', 'shrimpSalt', 'oil'] as const) addIngredient(state, id)
  assert.equal(missingIngredient(state, 'mango'), true)
  toggleMix(state)
  tick(state, 1200, () => 0)
  assert.equal(initialCounterTab(state), 'seasoning')
  tick(state, 1200, () => 0)
  assert.equal(initialCounterTab(state), 'topping')
  addIngredient(state, 'mango')
  assert.equal(missingIngredient(state, 'mango'), true)
  addIngredient(state, 'mango')
  assert.equal(missingIngredient(state, 'mango'), false)
  finishMix(state)
  assert.equal(initialCounterTab(state), 'topping')
  packBowl(state, 'bag')
  const html = renderApp(state, options)
  assert.match(html, /counter-main-action suggested-action" data-action="deliver"/)
})

test('the direct bag button shows stock, disables when empty, and old packed boxes resume without another charge', () => {
  const state = stocked()
  for (const id of ['rice', 'kumquat', 'shrimpSalt'] as const) addIngredient(state, id)
  toggleMix(state)
  tick(state, 2400, () => 0)
  finishMix(state)
  state.inventory.pack = 1
  const html = renderApp(state, options)
  assert.match(html, /data-action="pack" data-id="bag"/)
  assert.match(html, /Còn 1 bộ/)
  assert.doesNotMatch(html, /tab-pack|pack-tray|Hộp \+|data-id="box"/)
  state.inventory.pack = 0
  assert.match(renderApp(state, options), /data-action="pack" data-id="bag" disabled/)
  state.inventory.pack = 1
  assert.equal(packBowl(state).ok, true)
  assert.equal(state.inventory.pack, 0)
  const old = structuredClone(state)
  const resumed = parseSave(JSON.stringify({ ...old, shift: { ...old.shift, bowl: { ...old.shift!.bowl, pack: 'box' } } }))!
  assert.ok(resumed)
  assert.equal(resumed.shift!.bowl.pack, 'bag')
  assert.equal(resumed.inventory.pack, 0)
  assert.equal(resumed.cash, state.cash)
  assert.equal(deliver(resumed).ok, true)
})

test('compact receipt preserves every request in the paused detail sheet, including hidden ingredients', () => {
  const state = stocked()
  const customer = currentCustomer(state)!
  customer.order = makeOrder(state, 'beef', () => .65)
  customer.order.noCilantro = true
  customer.order.extraMango = true
  customer.order.recipe.mango = 2
  customer.order.quantity = 3
  customer.special = 'crispy'
  const html = renderApp(state, { ...options, counterTab: 'topping' })
  assert.match(html, /recipe-more/)
  assert.match(html, /còn nguyên liệu cần dùng/)
  const details = dialogContent(state, { ...options, modal: 'order' })
  assert.match(details, /Tạm dừng/)
  assert.match(details, /Bỏ rau răm/)
  assert.match(details, /×2 xoài/)
  assert.match(details, /Topping giòn/)
  assert.match(details, /data-id="shallot"/)
  assert.match(details, /data-id="redBeef"/)
  assert.match(details, /0\/3/)
})
