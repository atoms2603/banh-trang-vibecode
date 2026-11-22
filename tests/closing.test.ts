import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import * as game from '../src/game.ts'
import * as data from '../src/data.ts'
import * as counter from '../src/counter.ts'
import * as tutorial from '../src/tutorial.ts'
import * as economy from '../src/economy.ts'
import * as reviews from '../src/reviews.ts'

const main = ts.transpileModule(readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText

// Exercise the real entry point with a controlled clock and only the DOM it uses.
function mount(reason: 'time' | 'queue-cleared') {
  type Handler = (event: Record<string, unknown>) => void
  class Element {
    innerHTML = ''
    className = ''
    inert = false
    hidden = false
    disabled = false
    removed = false
    dataset: Record<string, string> = {}
    children: Element[] = []
    listeners = new Map<string, Handler>()
    classList = { toggle() {}, remove() {} }
    style = { setProperty() {} }
    setAttribute() {}
    append(...nodes: Element[]) { this.children.push(...nodes) }
    remove() { this.removed = true }
    querySelector(selector: string): Element | null {
      return ['.tutorial-ring', '.tutorial-tip', 'strong', 'p'].includes(selector) ? new Element() : null
    }
    querySelectorAll() { return [] }
    closest(selector: string) {
      return selector.includes('data-action=') && !selector.includes('data-action=' + this.dataset.action)
        ? null : this
    }
    contains() { return false }
    getAnimations() { return [{ pause: () => paused++, cancel() {} }] }
    addEventListener(name: string, handler: Handler) { this.listeners.set(name, handler) }
    fire(name: string, event: Record<string, unknown> = {}) { this.listeners.get(name)?.(event) }
  }
  let now = 0
  let paused = 0
  let frame: (now: number) => void = () => {}
  let timerId = 0
  const timers = new Map<number, { at: number; callback: () => void }>()
  const app = new Element()
  const body = new Element()
  const doc = new Element()
  const win = new Element()
  const state = game.newGame()
  for (const id of data.ingredientIds) state.inventory[id] = 50
  game.openShop(state)
  game.tick(state, 900, () => .1)
  state.shift!.elapsedMs = game.SHIFT_MS - 10
  state.shift!.queue[0].arrivalMs = game.SHIFT_MS - 1000
  if (reason === 'queue-cleared') {
    state.shift!.queue = []
    state.shift!.elapsedMs = 85000
  }
  let saved = ''
  const modules: Record<string, unknown> = {
    './game.ts': game, './data.ts': data, './counter.ts': counter, './tutorial.ts': tutorial,
    './economy.ts': economy, './reviews.ts': reviews,
    './art.ts': { food: () => '', icon: () => '' },
    './audio.ts': { backgroundMusic() {}, mixingSound() {}, sound() {} },
    './storage.ts': { loadGame: () => ({ game: state, warning: '' }), saveGame: () => { saved = JSON.stringify(state); return '' } },
    './ui.ts': { renderApp: () => state.phase, dialogContent: () => '', updateClocks() {} },
  }
  Object.assign(doc, { querySelector: () => app, createElement: () => new Element(), body, documentElement: new Element() })
  Object.assign(win, {
    innerHeight: 800, scrollX: 0, scrollY: 0, scrollTo() {},
    setTimeout(callback: () => void, delay: number) { timers.set(++timerId, { at: now + delay, callback }); return timerId },
    clearTimeout(id: number) { timers.delete(id) },
  })
  runInNewContext(main, {
    exports: {}, require: (id: string) => {
      if (id.endsWith('.css') || id.startsWith('@fontsource')) return {}
      assert.ok(Object.hasOwn(modules, id), id)
      return modules[id]
    },
    document: doc, window: win, Element, HTMLElement: Element, HTMLButtonElement: Element,
    performance: { now: () => now }, requestAnimationFrame: (callback: typeof frame) => { frame = callback },
    setTimeout: win.setTimeout,
  })
  const screen = app.children[0]
  function click(action: string) {
    const button = new Element()
    button.dataset.action = action
    app.fire('click', { target: button, detail: 0 })
  }
  click('continue')
  function advance(ms: number) {
    now += ms
    for (const [id, timer] of timers) {
      if (timer.at > now) continue
      timers.delete(id)
      timer.callback()
    }
    frame(now)
  }
  function pointerDown(action: string) {
    const button = new Element()
    button.dataset = { action, id: 'rice' }
    screen.fire('pointerdown', { target: button, button: 0, pointerId: 1, clientX: 0, clientY: 0 })
  }
  return { app, screen, body, state, win, click, advance, pointerDown, timers,
    saved: () => saved, paused: () => paused }
}

test('time expiry freezes the scene, cancels dragging and blocks clicks until the 1.5s notice ends', () => {
  const ui = mount('time')
  ui.pointerDown('ingredient')
  ui.win.fire('pointermove', { pointerId: 1, clientX: 30, clientY: 30 })
  assert.equal(ui.body.children.length, 1)
  ui.advance(10)
  const notice = ui.app.children.find(node => node.className === 'closing-notice')!
  assert.match(notice.innerHTML, /Đã đến giờ đóng cửa/)
  assert.equal(ui.screen.inert, true)
  assert.equal(ui.screen.innerHTML, 'shop')
  assert.equal(ui.body.children[0].removed, true)
  assert.ok(ui.paused() > 0)
  assert.equal(ui.state.reports.length, 1)
  const settled = ui.saved()
  ui.click('next-day')
  ui.click('mute')
  ui.win.fire('pointerup', { pointerId: 1 })
  ui.advance(1499)
  assert.equal(JSON.stringify(ui.state), settled)
  assert.equal(ui.screen.innerHTML, 'shop')
  assert.equal(notice.removed, false)
  ui.advance(1)
  assert.equal(notice.removed, true)
  assert.equal(ui.screen.inert, false)
  assert.equal(ui.screen.innerHTML, 'report')
  assert.equal(ui.state.reports.length, 1)
  ui.click('next-day')
  assert.equal(ui.state.phase, 'prep')
})

test('time expiry cancels a pending mix hold; clearing the queue still shows the report immediately', () => {
  const ui = mount('time')
  ui.pointerDown('mix')
  assert.ok([...ui.timers.values()].some(timer => timer.at === 180))
  ui.advance(10)
  assert.equal(ui.timers.size, 1, 'only the closing notice timer remains')
  assert.equal([...ui.timers.values()][0].at, 1510)
  const cleared = mount('queue-cleared')
  cleared.advance(10)
  assert.equal(cleared.screen.innerHTML, 'report')
  assert.equal(cleared.screen.inert, false)
  assert.equal(cleared.app.children.some(node => node.className === 'closing-notice'), false)
})
