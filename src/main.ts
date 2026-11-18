import '@fontsource-variable/quicksand'
import '@fontsource-variable/nunito'
import './styles.css'

import { sound } from './audio.ts'
import { food, icon } from './art.ts'
import { ingredientIds, ingredients, menuIds, replies } from './data.ts'
import { money } from './economy.ts'
import {
  addHeat, addIngredient, changePrice, closeShop, currentCustomer, deliver, finishMix, mixProgress, newGame,
  nextDay, openShop, packBowl, purchase, replyToReview, selectCustomer, tick,
  toggleDish, toggleMix, toggleStaff, trashBowl,
} from './game.ts'
import { departureLine } from './reviews.ts'
import { loadGame, saveGame } from './storage.ts'
import { advanceTutorial, currentLesson, lessonAllows } from './tutorial.ts'
import { dialogContent, renderApp, updateClocks } from './ui.ts'
import type { Modal, ScreenOptions } from './ui.ts'
import type { GameState, Heat, IngredientId, ReplyId } from './types.ts'

const app = document.querySelector<HTMLElement>('#app')!
const screen = document.createElement('div')
const modalRoot = document.createElement('div')
const toast = document.createElement('div')
toast.className = 'toast'
toast.setAttribute('role', 'status')
toast.setAttribute('aria-live', 'polite')
const spotlight = document.createElement('div')
spotlight.className = 'tutorial-overlay'
spotlight.hidden = true
spotlight.innerHTML = `<div class="tutorial-ring" aria-hidden="true"></div>
  <div class="tutorial-tip" role="status"><strong></strong><p id="tutorial-instruction"></p></div>`
const ring = spotlight.querySelector<HTMLElement>('.tutorial-ring')!
const tip = spotlight.querySelector<HTMLElement>('.tutorial-tip')!
const stepLabel = tip.querySelector('strong')!
const instruction = tip.querySelector('p')!
app.append(screen, toast, spotlight, modalRoot)

const loaded = loadGame()
let state = loaded.game
const options: ScreenOptions = {
  home: true, initialMute: false, prepTab: 'market', previousCustomers: new Set(), customerSpeechId: null,
  modal: null, heatOpen: false, replyFor: null,
  reportPeriod: 'day', reportDay: state?.reports.at(-1)?.day ?? 1, warning: loaded.warning,
  departure: null,
}

let lastFrame = performance.now()
let lastPaint = 0
let lastSave = 0
let flashTimer = 0
let departureTimer = 0
let drag: { pointerId: number; id: IngredientId; x: number; y: number; ghost: HTMLElement | null } | null = null
let suppressClickUntil = 0
let mixHold: { pointerId: number; timer: number } | null = null
let suppressMixClickUntil = 0
let deferredRender = false
let modalTrigger: { action?: string; id?: string } | null = null
let tutorialTarget: HTMLElement | null = null
let tutorialKey = ''

function muted(): boolean {
  return state?.muted ?? options.initialMute
}

function flash(message: string, ok = true): void {
  if (!message) return
  window.clearTimeout(flashTimer)
  toast.classList.toggle('error', !ok)
  toast.textContent = message
  toast.classList.add('visible')
  flashTimer = window.setTimeout(() => toast.classList.remove('visible'), 2300)
}

function persist(): boolean {
  if (!state) return false
  lastSave = performance.now()
  const warning = saveGame(state)
  if (warning === options.warning) return false
  options.warning = warning
  return true
}

function restoreFocus(root: HTMLElement, target: { action?: string; id?: string; value?: string }): void {
  if (!target.action) return
  const buttons = root.querySelectorAll<HTMLButtonElement>('button[data-action]')
  for (const button of buttons) {
    if (button.dataset.action !== target.action || button.dataset.id !== target.id
      || (target.value && button.dataset.value !== target.value) || button.disabled) continue
    button.focus({ preventScroll: true })
    return
  }
}

function positionTutorial(): void {
  if (!tutorialTarget?.isConnected) return
  const rect = tutorialTarget.getBoundingClientRect()
  const inset = 4
  const tipRect = tip.getBoundingClientRect()
  const below = rect.bottom + 14
  const above = rect.top - tipRect.height - 14
  const top = below + tipRect.height <= window.innerHeight - 8 || above < 8 ? below : above
  const left = Math.max(10, Math.min(rect.left + rect.width / 2 - tipRect.width / 2, window.innerWidth - tipRect.width - 10))
  ring.style.left = rect.left - inset + 'px'
  ring.style.top = rect.top - inset + 'px'
  ring.style.width = rect.width + inset * 2 + 'px'
  ring.style.height = rect.height + inset * 2 + 'px'
  tip.style.left = left + 'px'
  tip.style.top = Math.max(8, Math.min(top, window.innerHeight - tipRect.height - 8)) + 'px'
}

function actionOf(button: HTMLButtonElement): string | undefined {
  const action = button.dataset.action
  return action === 'select-order' ? 'customer' : action
}

function renderTutorial(): void {
  const lesson = !options.home && !options.modal ? currentLesson(state) : undefined
  spotlight.hidden = true
  tutorialTarget = null
  if (!lesson) {
    tutorialKey = ''
    return
  }
  const controls = Array.from(screen.querySelectorAll<HTMLButtonElement>('button[data-action]'))
  const button = controls.find(control => control.dataset.action === lesson.action && control.dataset.id === lesson.id)
  const allowed = controls.filter(control => {
    const action = actionOf(control)
    return action !== undefined && lessonAllows(state, action, control.dataset.id)
  })
  const entrance = button?.matches('.customer-figure.arriving')
    ? button.getAnimations({ subtree: true }).filter(animation =>
      (animation.pending || animation.playState === 'running')
      && Number.isFinite(animation.effect?.getComputedTiming().endTime))
    : []
  for (const control of controls) control.inert = !allowed.includes(control) || entrance.length > 0
  for (const summary of screen.querySelectorAll('summary')) summary.inert = true

  // The customer card still moves during its entrance, so its bounds are not ready yet.
  const priceStepper = lesson.action === 'price' ? screen.querySelector<HTMLElement>(`[data-price-for="${lesson.id}"]`) : null
  const orderPanel = lesson.action === 'read-order' ? screen.querySelector<HTMLElement>('.order-details') : null
  const target = orderPanel ?? button ?? priceStepper ?? (lesson.action === 'mix-ready' ? screen.querySelector<HTMLElement>('.mix-meter') : null)
  if (!target) return

  const reveal = () => {
    if (!target.isConnected) return
    for (const control of allowed) control.inert = false
    const focusTarget = orderPanel && button ? button : priceStepper?.querySelector<HTMLButtonElement>('[data-action="price-up"]') ?? target
    if (!button && !priceStepper) target.tabIndex = -1
    tutorialTarget = target
    focusTarget.setAttribute('aria-describedby', instruction.id)
    if (priceStepper) for (const control of allowed) control.setAttribute('aria-describedby', instruction.id)
    const label = 'Hướng dẫn ngày 1 · ' + (lesson.step + 1) + '/' + lesson.total
    if (stepLabel.textContent !== label) stepLabel.textContent = label
    if (instruction.textContent !== lesson.instruction) instruction.textContent = lesson.instruction
    spotlight.hidden = false
    const key = lesson.step + ':' + (lesson.id ?? '')
    const stepChanged = key !== tutorialKey
    if (stepChanged) {
      target.scrollIntoView({ block: 'center', inline: 'nearest' })
      tutorialKey = key
    }
    if (stepChanged || !allowed.some(control => control === document.activeElement)) focusTarget.focus({ preventScroll: true })
    positionTutorial()
  }

  if (entrance.length) void Promise.allSettled(entrance.map(animation => animation.finished)).then(reveal)
  else reveal()
}

function sizeOrderDock(): void {
  const dock = screen.querySelector<HTMLElement>('.order-dock')
  const frame = screen.querySelector('.shop-layout .game-frame')
  if (!dock || !frame) return
  const style = getComputedStyle(dock)
  if (style.position !== 'sticky') {
    dock.style.removeProperty('--dock-visible-top')
    return
  }
  const stickyTop = Number.parseFloat(style.top)
  const visibleTop = Math.max(stickyTop, frame.getBoundingClientRect().top)
  dock.style.setProperty('--dock-visible-top', visibleTop + 'px')
}

function updateLayout(): void {
  sizeOrderDock()
  positionTutorial()
}

function resizeLayout(): void {
  updateLayout()
  tutorialTarget?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  requestAnimationFrame(updateLayout)
}

function renderScreen(move = false): void {
  if (drag?.ghost && !move) {
    deferredRender = true
    return
  }
  const active = document.activeElement instanceof HTMLButtonElement && screen.contains(document.activeElement)
    ? { ...document.activeElement.dataset } : null
  options.previousCustomers = new Set(Array.from(screen.querySelectorAll<HTMLElement>('[data-action=customer]'),
    customer => Number(customer.dataset.id)))
  const orderScroll = screen.querySelector<HTMLElement>('.order-sheet')?.scrollTop ?? 0
  const shopScroll = screen.querySelector<HTMLElement>('.shop-screen')?.scrollTop ?? 0
  const previousDetails = screen.querySelector<HTMLElement>('.order-details')
  const detailScroll = previousDetails?.scrollTop ?? 0
  screen.innerHTML = renderApp(state, options)
  if (move) {
    window.scrollTo(0, 0)
    const heading = screen.querySelector<HTMLElement>('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  } else if (active) restoreFocus(screen, active)
  const sheet = screen.querySelector<HTMLElement>('.order-sheet')
  if (sheet) sheet.scrollTop = orderScroll
  const shop = screen.querySelector<HTMLElement>('.shop-screen')
  if (shop && !move) shop.scrollTop = shopScroll
  const details = screen.querySelector<HTMLElement>('.order-details')
  if (details && details.dataset.orderId === previousDetails?.dataset.orderId) details.scrollTop = detailScroll
  sizeOrderDock()
  renderTutorial()
  updateLayout()
}

function renderModal(): void {
  const scroll = modalRoot.querySelector('.sheet-body')?.scrollTop ?? 0
  const active = document.activeElement instanceof HTMLButtonElement && modalRoot.contains(document.activeElement)
    ? { ...document.activeElement.dataset } : null
  modalRoot.querySelector('dialog')?.close()
  modalRoot.innerHTML = dialogContent(state, options)
  const dialog = modalRoot.querySelector('dialog')
  if (!dialog) return
  dialog.showModal()
  const body = dialog.querySelector('.sheet-body')
  if (body) body.scrollTop = scroll
  if (active) restoreFocus(modalRoot, active)
  dialog.addEventListener('cancel', event => {
    event.preventDefault()
    showModal(null)
  })
  dialog.addEventListener('click', event => {
    if (event.target === dialog) showModal(null)
  })
}

function showModal(name: Modal): void {
  if (name && !options.modal && document.activeElement instanceof HTMLButtonElement) {
    modalTrigger = { ...document.activeElement.dataset }
  }
  options.modal = name
  options.replyFor = null
  lastFrame = performance.now()
  if (persist()) renderScreen()
  renderModal()
  if (!name && modalTrigger) {
    restoreFocus(screen, modalTrigger)
    modalTrigger = null
  }
}

function beginGame(): void {
  const keepMuted = muted()
  state = newGame(true)
  state.muted = keepMuted
  options.home = false
  options.prepTab = 'market'
  options.customerSpeechId = null
  options.heatOpen = false
  options.reportDay = 1
  options.reportPeriod = 'day'
  options.departure = null
  showModal(null)
  renderScreen(true)
}

function announceDeparture(profile: number, text: string): void {
  window.clearTimeout(departureTimer)
  options.departure = { profile, text }
  departureTimer = window.setTimeout(() => {
    options.departure = null
    screen.querySelector('.departure')?.remove()
  }, 1700)
}

const coinSpread = [
  [-44, -36, 22, 0], [-30, -49, -42, 18], [-12, -33, 37, 44],
  [13, -53, -34, 32], [32, -48, 31, 16], [46, -29, -21, 4],
] as const

function paymentSource(customerId: number): DOMRect | undefined {
  const sprite = screen.querySelector('[data-action="customer"][data-id="' + customerId + '"] .customer-sprite')
  const register = screen.querySelector('.status-cash')
  if (!sprite || !register) return undefined
  const registerBounds = register.getBoundingClientRect()
  const spriteBounds = sprite.getBoundingClientRect()
  if (registerBounds.top < 0 || spriteBounds.bottom > window.innerHeight) window.scrollTo(0, 0)
  return sprite.getBoundingClientRect()
}

function showPayment(origin: DOMRect, amount: number): void {
  const register = screen.querySelector('.status-cash')
  if (!register) return
  const target = register.getBoundingClientRect()
  const x = origin.left + origin.width / 2
  const y = origin.top + origin.height / 2
  const burst = document.createElement('div')
  burst.className = 'payment-burst'
  burst.setAttribute('aria-hidden', 'true')
  burst.style.left = x + window.scrollX + 'px'
  burst.style.top = y + window.scrollY + 'px'
  burst.style.setProperty('--cash-x', target.left + target.width / 2 - x + 'px')
  burst.style.setProperty('--cash-y', target.top + target.height / 2 - y + 'px')
  burst.innerHTML = coinSpread.map(([dx, dy, spin, delay]) => {
    const spreadX = Math.max(10 - x, Math.min(dx, window.innerWidth - x - 10))
    return `<span class="payment-coin" style="--coin-x:${spreadX}px;--coin-y:${dy}px;--coin-spin:${spin}deg;--coin-delay:${delay}ms">${icon('coin', 17)}</span>`
  }).join('') + `<strong class="payment-amount">+${money(amount)}</strong>`
  burst.querySelector('.payment-amount')?.addEventListener('animationend', () => {
    if (state?.phase !== 'shop' || options.home) return
    const currentRegister = screen.querySelector('.status-cash')
    currentRegister?.classList.add('cash-received')
    currentRegister?.addEventListener('animationend', () => currentRegister.classList.remove('cash-received'), { once: true })
  }, { once: true })
  app.append(burst)
  window.setTimeout(() => burst.remove(), 1250)
}

function changeReport(delta: number): void {
  if (!state) return
  const last = state.reports.at(-1)?.day ?? 1
  const current = options.reportDay
  const target = options.reportPeriod === 'week'
    ? (delta > 0 ? Math.ceil(current / 7) * 7 + 1 : Math.ceil(current / 7) * 7 - 13)
    : current + delta
  options.reportDay = Math.max(1, Math.min(last, target))
  if (options.modal) renderModal()
  else renderScreen()
}

function chooseIngredient(id: IngredientId): void {
  if (!state || !lessonAllows(state, 'ingredient', id)) return
  if (id === 'chili') {
    options.heatOpen = !options.heatOpen
    renderScreen()
    return
  }
  const result = addIngredient(state, id)
  if (result.ok) {
    advanceTutorial(state, 'ingredient', id)
    persist()
  }
  flash(result.message, result.ok)
  renderScreen()
}

function showReport(game: GameState): void {
  options.reportDay = game.day
  options.reportPeriod = 'day'
  if (options.modal) showModal(null)
  else persist()
  renderScreen(true)
}

function handle(button: HTMLButtonElement): void {
  const { action: buttonAction, id, value } = button.dataset
  const action = actionOf(button)
  if (!action || action === 'brand' || (!options.home && !lessonAllows(state, action, id))) return
  if (action !== 'mute' && action !== 'deliver') sound(action === 'mix' ? 'mix' : 'tap', muted())
  if (action === 'new') {
    if (state) showModal('reset')
    else beginGame()
    return
  }
  if (action === 'reset-confirm') return beginGame()
  if (action === 'modal-close') return showModal(null)
  if (action === 'help' || action === 'reviews' || action === 'ledger') return showModal(action)
  if (action === 'mute') {
    if (state) {
      state.muted = !state.muted
      persist()
    } else options.initialMute = !options.initialMute
    sound('tap', muted())
    renderScreen()
    return
  }
  if (!state) return

  if (action === 'read-order' && currentLesson(state)?.action === 'read-order') {
    advanceTutorial(state, action)
    persist()
    renderScreen()
    return
  }

  if (action === 'close-shop' && state.phase === 'shop') return showModal('close-shop')
  if (action === 'close-confirm' && options.modal === 'close-shop') {
    if (closeShop(state)) showReport(state)
    return
  }

  if (action === 'home' || action === 'continue') {
    options.home = action === 'home'
    lastFrame = performance.now()
    persist()
    if (!options.home && state.phase === 'report') options.reportDay = state.day
    if (!options.home && currentLesson(state)?.prepTab === 'menu') options.prepTab = 'menu'
    renderScreen(true)
    return
  }
  if (action === 'period-day' || action === 'period-week') {
    options.reportPeriod = action === 'period-day' ? 'day' : 'week'
    if (options.modal) renderModal()
    else renderScreen()
    return
  }
  if (action === 'report-prev' || action === 'report-next') return changeReport(action === 'report-prev' ? -1 : 1)
  if (action === 'reply-toggle') {
    options.replyFor = options.replyFor === Number(id) ? null : Number(id)
    renderModal()
    return
  }
  if (action === 'reply' && value && Object.hasOwn(replies, value)) {
    const result = replyToReview(state, Number(id), value as ReplyId)
    options.replyFor = null
    persist()
    flash(result.message, result.ok)
    renderModal()
    return
  }
  if (action === 'prep-market' || action === 'prep-menu') {
    options.prepTab = action === 'prep-market' ? 'market' : 'menu'
    if (currentLesson(state)) {
      advanceTutorial(state, action)
      persist()
    }
    renderScreen()
    return
  }
  const ingredient = ingredientIds.find(key => key === id)
  if (action === 'ingredient' && ingredient) return chooseIngredient(ingredient)
  if (action === 'order-ingredient' && ingredient) return flash(ingredients[ingredient].name)
  const dish = menuIds.find(key => key === id)

  const guest = currentCustomer(state)
  let result: { ok: boolean; message: string } | undefined
  let move = false
  let payment: { amount: number; origin?: DOMRect } | undefined
  switch (action) {
    case 'buy': result = purchase(state, id ?? ''); break
    case 'toggle-dish': if (dish) result = toggleDish(state, dish); break
    case 'price-down':
    case 'price-up': if (dish) result = changePrice(state, dish, action === 'price-down' ? -1 : 1); break
    case 'staff': result = toggleStaff(state); break
    case 'open':
      result = openShop(state)
      if (result.ok) {
        options.heatOpen = false
        options.departure = null
        lastFrame = performance.now()
        move = true
      }
      break
    case 'customer': {
      const customerId = Number(id)
      result = selectCustomer(state, customerId)
      if (result.ok) {
        if (buttonAction === 'customer') options.customerSpeechId = customerId
        else if (guest?.id !== customerId) options.customerSpeechId = null
        if (guest?.id !== customerId) options.heatOpen = false
      }
      break
    }
    case 'heat':
      if (['0', '1', '2', '3'].includes(id ?? '')) result = addHeat(state, Number(id) as Heat)
      options.heatOpen = false
      break
    case 'mix': result = toggleMix(state); options.heatOpen = false; break
    case 'final-mix': result = finishMix(state); break
    case 'pack': if (id === 'bag' || id === 'box') result = packBowl(state, id); break
    case 'trash':
      result = trashBowl(state)
      if (result.ok) options.heatOpen = false
      break
    case 'deliver':
      result = deliver(state)
      if (result.ok && guest) {
        payment = { amount: guest.order.price, origin: paymentSource(guest.id) }
        sound('serve', muted())
        announceDeparture(guest.profile, 'Đã nhận món!')
        options.heatOpen = false
      }
      break
    case 'next-day':
      result = nextDay(state)
      if (result.ok) {
        options.prepTab = 'market'
        options.reportDay = state.day - 1
        move = true
      }
      break
  }
  if (!result) return
  let completedLesson = false
  if (result.ok) {
    completedLesson = advanceTutorial(state, action, id)
    persist()
  }
  let message = result.message
  if (payment) message += ' · +' + money(payment.amount)
  if (completedLesson) message += ' · Xong hướng dẫn!'
  flash(message, result.ok)
  renderScreen(move)
  if (payment?.origin) showPayment(payment.origin, payment.amount)
}

app.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest<HTMLButtonElement>('button[data-action]')
  if (!button || button.disabled) return
  if (event.detail > 0 && (
    button.dataset.action === 'ingredient' && performance.now() < suppressClickUntil
    || button.dataset.action === 'mix' && performance.now() < suppressMixClickUntil
  )) return
  handle(button)
})

screen.addEventListener('pointerdown', event => {
  if (!(event.target instanceof Element) || event.button !== 0 || drag) return
  const mixer = event.target.closest<HTMLButtonElement>('button[data-action=mix]')
  if (mixer && !mixer.disabled && lessonAllows(state, 'mix') && !state?.shift?.bowl.mixing && !mixHold) {
    mixHold = { pointerId: event.pointerId, timer: window.setTimeout(() => {
      if (!mixer.isConnected || mixer.disabled || !state?.shift || state.shift.bowl.mixing) return
      suppressMixClickUntil = Infinity
      handle(mixer)
    }, 180) }
    return
  }
  const tray = event.target.closest<HTMLButtonElement>('button[data-action=ingredient]')
  const id = ingredientIds.find(key => key === tray?.dataset.id)
  if (!id || tray?.disabled || !lessonAllows(state, 'ingredient', id)) return
  drag = { pointerId: event.pointerId, id, x: event.clientX, y: event.clientY, ghost: null }
})

window.addEventListener('pointermove', event => {
  if (!drag || drag.pointerId !== event.pointerId) return
  if (!drag.ghost) {
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return
    const ghost = document.createElement('div')
    ghost.className = 'drag-ghost'
    ghost.innerHTML = food(drag.id)
    document.body.append(ghost)
    drag.ghost = ghost
  }
  const bowl = screen.querySelector('[data-drop-zone]')
  const rect = bowl?.getBoundingClientRect()
  const inside = rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
  bowl?.classList.toggle('drop-ready', Boolean(inside))
  drag.ghost.style.transform = 'translate(' + (event.clientX - 23) + 'px,' + (event.clientY - 23) + 'px)'
})

function finishDrag(event: PointerEvent): void {
  if (mixHold?.pointerId === event.pointerId) {
    window.clearTimeout(mixHold.timer)
    mixHold = null
    if (suppressMixClickUntil === Infinity) suppressMixClickUntil = performance.now() + 300
  }
  if (!drag || drag.pointerId !== event.pointerId) return
  const { ghost, id } = drag
  drag = null
  if (ghost) {
    const bowl = screen.querySelector('.drop-ready')
    ghost.remove()
    bowl?.classList.remove('drop-ready')
    suppressClickUntil = performance.now() + 320
    if (event.type === 'pointerup' && bowl) {
      sound('tap', muted())
      chooseIngredient(id)
    }
  }
  if (deferredRender) {
    deferredRender = false
    renderScreen()
  }
}

window.addEventListener('pointerup', finishDrag)
window.addEventListener('pointercancel', finishDrag)
window.addEventListener('scroll', updateLayout, { passive: true })
screen.addEventListener('scroll', positionTutorial, { capture: true, passive: true })
window.addEventListener('resize', resizeLayout)
window.visualViewport?.addEventListener('resize', resizeLayout)
window.addEventListener('pagehide', () => persist())
document.addEventListener('visibilitychange', () => {
  persist()
  lastFrame = performance.now()
})

function loop(now: number): void {
  requestAnimationFrame(loop)
  const delta = now - lastFrame
  lastFrame = now
  if (!state || state.phase !== 'shop' || options.home || options.modal || document.hidden) return
  const progress = mixProgress(state)
  const guest = currentCustomer(state)
  const reviewCount = state.reviews.length
  const changed = tick(state, Math.max(0, delta))
  if (changed) {
    if (!state.shift) return showReport(state)
    if (guest?.id !== currentCustomer(state)?.id || (progress < 100 && mixProgress(state) >= 100)) options.heatOpen = false
    if (state.reviews.length > reviewCount) {
      const review = state.reviews.at(-1)!
      announceDeparture(review.profile, departureLine(review))
    }
    persist()
    renderScreen()
  } else if (now - lastPaint >= 75) {
    updateClocks(screen, state)
    lastPaint = now
  }
  if (now - lastSave >= 1000 && persist()) renderScreen()
}

renderScreen()
requestAnimationFrame(loop)
