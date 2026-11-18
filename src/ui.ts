import { avatar, bowlArt, counterScene, food, guestSprite, icon, storefront, trayContents } from './art.ts'
import { heatLabels, ingredientIds, ingredients, levels, market, menu, menuIds, profiles, replies, staffWage } from './data.ts'
import { hasStock, money, priceBand, priceOf, sumReports } from './economy.ts'
import { canDeliver, CLOSE_MINUTE, currentCustomer, enabledDishes, formatShopTime, marketUnlocked, mixProgress, OPEN_MINUTE, openingProblem, patienceLeft, shopTime } from './game.ts'
import type { Bowl, Customer, DailyReport, GameState, IngredientId, MenuId, Order, ReplyId } from './types.ts'
import { currentLesson } from './tutorial.ts'

export type Modal = 'help' | 'reviews' | 'reset' | 'ledger' | 'close-shop' | null
export interface ScreenOptions {
  home: boolean
  initialMute: boolean
  prepTab: 'market' | 'menu'
  previousCustomers: ReadonlySet<number>
  customerSpeechId: number | null
  modal: Modal
  heatOpen: boolean
  replyFor: number | null
  reportPeriod: 'day' | 'week'
  reportDay: number
  warning: string
  departure: { profile: number; text: string } | null
}

function escape(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function signMoney(amount: number): string {
  return (amount > 0 ? '+' : '') + money(amount)
}

function starsLabel(stars: number, count: number): string {
  return count ? (stars / count).toFixed(1) : '—'
}

function labelButton(action: string, label: string, glyph: Parameters<typeof icon>[0], extra = ''): string {
  return `<button class="icon-button ${extra}" type="button" data-action="${action}" title="${label}" aria-label="${label}">${icon(glyph, 19)}</button>`
}

function header(state: GameState | null, home: boolean, initialMute: boolean): string {
  const total = state?.reviews.reduce((sum, review) => sum + review.stars, 0) ?? 0
  const count = state?.reviews.length ?? 0
  const silent = state?.muted ?? initialMute
  return `<header class="topbar">
    <button type="button" class="brand" data-action="${home ? 'brand' : 'home'}" aria-label="Màn hình chính">
      <span class="brand-icon">${icon('storefront', 23)}</span>
      <span>Tiệm nhỏ</span>
    </button>
    <div class="topbar-actions">
      <button type="button" class="rating-chip" data-action="reviews" aria-label="${starsLabel(total, count)} sao, ${count} đánh giá" title="Đánh giá của khách">
        ${icon('star', 15)} <strong>${starsLabel(total, count)}</strong><span class="rating-divider"></span><span>${count} đánh giá</span>
      </button>
      ${labelButton('mute', silent ? 'Bật âm thanh' : 'Tắt âm thanh', silent ? 'muted' : 'volume')}
    </div>
  </header>`
}

function homeScreen(state: GameState | null): string {
  return `<main class="home-screen">
    <div class="hero-illustration">${storefront(state?.level ?? 1)}</div>
    <div class="home-copy">
      <h1>Tiệm Bánh Tráng<br><em>Trộn Nhỏ</em></h1>
      <p>Đi chợ sớm, trộn bánh thật đều<br>và đón khách ghé tiệm.</p>
    </div>
    <div class="home-actions">
      ${state ? `<button type="button" class="button primary home-primary" data-action="continue"><span>${icon('storefront')} Chơi tiếp</span>${icon('arrow')}</button>
        <div class="resume-meta">Ngày ${state.day} <i></i> ${money(state.cash)} <i></i> Cấp ${state.level}</div>
        <div class="home-secondary">
          <button type="button" class="button quiet" data-action="new">${icon('plus', 18)} Chơi mới</button>
          <button type="button" class="button quiet" data-action="help">${icon('book', 18)} Hướng dẫn nhanh</button>
        </div>` : `<button type="button" class="button primary home-primary" data-action="new"><span>${icon('storefront')} Chơi mới</span>${icon('arrow')}</button>
        <button type="button" class="button quiet home-help" data-action="help">${icon('book', 19)} Hướng dẫn nhanh</button>`}
    </div>
    <div class="local-note"><span aria-hidden="true"></span> Tiến trình lưu trên trình duyệt này</div>
  </main>`
}

function statusStrip(state: GameState, shop: boolean): string {
  return `<div class="status-strip">
     <span class="status-day">${icon('calendar', 16)} Ngày ${state.day}</span>
     <span class="status-grade">${shop ? icon('clock', 16) : icon('storefront', 16)} <span ${shop ? 'data-clock' : ''}>${shop ? shopTime(state) : 'Cấp ' + state.level}</span></span>
     ${shop ? `<span class="status-close">Đóng lúc ${formatShopTime(CLOSE_MINUTE)}</span>` : ''}
     <span class="status-cash">${icon('coin', 17)} <strong>${money(state.cash)}</strong></span>
  </div>`
}

function marketScreen(state: GameState): string {
  const dishes: MenuId[] = state.day === 1 && state.tutorialStep !== undefined ? ['salt'] : enabledDishes(state)
  const needed = ingredientIds.filter(id => dishes.some(dish => (menu[dish].recipe[id] ?? 0) > state.inventory[id]))
  const available = market.filter(pack => marketUnlocked(state, pack.items))
  const locked = market.filter(pack => !marketUnlocked(state, pack.items))
  return `<section aria-label="Chợ sáng">
    ${needed.length ? `<div class="market-tip">${icon('basket', 19)}<div><strong>Cần nhập cho menu</strong><p>${needed.map(id => ingredients[id].short).join(' · ')}</p></div></div>` :
      '<div class="market-tip stocked">' + icon('check', 19) + '<p>' + (dishes.length ? 'Đã đủ nguyên liệu theo menu. Bạn có thể nhập thêm để bán cả ca.' : 'Bật món trong Menu hôm nay để xem gợi ý nhập hàng.') + '</p></div>'}
    <div class="market-list">
      ${available.map(pack => {
        const first = ingredientIds.find(id => pack.items[id])!
        const stock = ingredientIds.filter(id => pack.items[id]).map(id => state.inventory[id]).join(' / ')
        const price = priceOf(pack.items)
        return `<article class="market-card ${needed.some(id => pack.items[id]) ? 'recommended' : ''}">
          <span class="food-tile ${first}">${food(first)}</span>
          <div class="market-info"><h3>${pack.name}</h3><p>${pack.detail}</p><span>Kho · ${stock}</span></div>
          <button type="button" class="buy-button" data-action="buy" data-id="${pack.id}" aria-label="Nhập ${pack.name}, ${money(price)}" ${state.cash < price ? 'disabled' : ''}>${icon('plus', 13)} ${money(price)}</button>
        </article>`
      }).join('')}
    </div>
    ${locked.length ? `<details class="locked-stock"><summary>${icon('lock', 16)} Nguyên liệu mở khóa sau</summary>
      <ul>${locked.map(pack => `<li><span>${pack.name}</span><strong>Cấp ${Math.max(...ingredientIds.filter(id => pack.items[id]).map(id => ingredients[id].level))}</strong></li>`).join('')}</ul>
    </details>` : ''}
  </section>`
}

function menuScreen(state: GameState): string {
  return `<section class="chalkboard" aria-label="Menu hôm nay">
    <div class="chalk-heading">${icon('menu', 22)}<div><h2>Menu hôm nay</h2><p>Khách chỉ gọi những món bạn bật.</p></div></div>
    ${menuIds.map(id => dishRow(state, id)).join('')}
  </section>`
}

function dishRow(state: GameState, id: MenuId): string {
  const dish = menu[id]
  const locked = dish.level > state.level
  const setting = state.menu[id]
  const band = priceBand(id, setting.price)
  const enough = hasStock(state.inventory, dish.recipe)
  return `<article class="dish-row ${locked ? 'dish-locked' : ''}">
    <div class="dish-line"><span class="food-tile ${dish.icon}">${food(dish.icon)}</span>
      <div><h3>${dish.name}</h3><p>${dish.note}</p></div>
      ${locked ? `<span class="dish-lock">${icon('lock', 14)} Cấp ${dish.level}</span>`
        : `<button type="button" data-action="toggle-dish" data-id="${id}" class="switch" role="switch" aria-checked="${setting.enabled}" aria-label="Bán ${dish.name}"><span></span></button>`}
    </div>
    ${locked ? '' : `<div class="dish-price"><div><small>Vốn ${money(priceOf(dish.recipe))}</small>
      <span class="price-band ${band}">${band === 'high' ? 'Giá cao' : band === 'low' ? 'Giá thấp' : 'Giá hợp lý'}</span></div>
      <div class="price-stepper" data-price-for="${id}">
        <button type="button" data-action="price-down" data-id="${id}" aria-label="Giảm giá ${dish.name}" ${setting.price <= 1000 ? 'disabled' : ''}>${icon('minus', 15)}</button>
        <strong>${money(setting.price)}</strong>
        <button type="button" data-action="price-up" data-id="${id}" aria-label="Tăng giá ${dish.name}">${icon('plus', 15)}</button>
      </div>
    </div>${setting.enabled && !enough ? '<p class="stock-reminder">Chưa đủ nguyên liệu</p>' : ''}`}
  </article>`
}

function prepScreen(state: GameState, options: ScreenOptions): string {
  const warning = openingProblem(state)
  return `<main class="game-screen prep-screen">
    ${statusStrip(state, false)}
    <div class="screen-heading">
      <div><p class="eyebrow">${formatShopTime(OPEN_MINUTE)} · ${levels[state.level].name}</p><h1>Chuẩn bị mở tiệm</h1></div>
      <div class="heading-buttons">
        ${state.reports.length ? labelButton('ledger', 'Sổ thu chi', 'ledger') : ''}
        ${labelButton('help', 'Hướng dẫn nhanh', 'help')}
      </div>
    </div>
    <div class="segmented prep-tabs" role="group" aria-label="Chuẩn bị">
      <button type="button" data-action="prep-market" aria-pressed="${options.prepTab === 'market'}">${icon('basket', 18)} Chợ sáng</button>
      <button type="button" data-action="prep-menu" aria-pressed="${options.prepTab === 'menu'}">${icon('menu', 18)} Menu hôm nay</button>
    </div>
    ${options.prepTab === 'market' ? marketScreen(state) : menuScreen(state)}
    ${state.level === 4 ? `<div class="staff-card">
      <div><strong>Phụ bếp</strong><p>Trộn nhanh và nhắc tồn kho · ${money(staffWage)}/ngày</p></div>
      <button type="button" class="switch" role="switch" data-action="staff" aria-label="Thuê phụ bếp" aria-checked="${state.staff}"><span></span></button>
    </div>` : ''}
    <div class="bottom-actions">
      ${warning ? `<p class="open-warning">${warning}</p>` : ''}
      <button type="button" class="button primary" data-action="open" ${warning ? 'aria-disabled="true"' : ''}>${icon('storefront', 19)} Mở cửa bán hàng ${icon('arrow', 18)}</button>
    </div>
  </main>`
}

function patienceColor(percent: number): string {
  return percent > 55 ? 'green' : percent > 25 ? 'yellow' : 'red'
}

function customerFigure(state: GameState, customer: Customer, options: ScreenOptions): string {
  const percent = Math.round(patienceLeft(state, customer) * 100)
  const arriving = !options.previousCustomers.has(customer.id) && (state.shift?.elapsedMs ?? 0) - customer.arrivalMs < 750
  const active = state.shift?.activeId === customer.id
  const speaking = active && options.customerSpeechId === customer.id
  const person = profiles[customer.profile]
  const quantity = customer.order.quantity
  const served = customer.servedPortions.length
  const line = quantity > 1 ? `Cho ${quantity} bịch nha!` : person.line
  return `<button type="button" class="customer-figure${arriving ? ' arriving' : ''}${customer.id % 2 ? '' : ' from-right'}" data-action="customer" data-id="${customer.id}"
     aria-label="${person.name}" aria-pressed="${active}" title="${person.role}"${speaking ? ' aria-describedby="customer-speech"' : ''}>
    ${speaking ? `<span class="customer-speech" id="customer-speech">${escape(line)}</span>` : ''}
    <span class="customer-sprite">${guestSprite(customer.profile)}${quantity > 1 ? `<span class="customer-order-count" aria-label="Đã giao ${served} trên ${quantity} bịch">${served ? `${served}/${quantity}` : `×${quantity}`}</span>` : ''}</span>
    <b>${person.name}</b>
    <span class="patience" role="progressbar" aria-label="Kiên nhẫn của ${person.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" data-patience="${customer.id}">
      <i class="${patienceColor(percent)}" style="width:${percent}%"></i>
    </span>
  </button>`
}

function queueScene(state: GameState, options: ScreenOptions): string {
  const queue = state.shift?.queue ?? []
  return `<section class="queue-scene" aria-label="Hàng khách đợi">
    ${counterScene(state.level)}
    <div class="customers">${queue.length ? queue.map(customer => customerFigure(state, customer, options)).join('')
      : `<p class="queue-empty">${enabledDishes(state).some(id => hasStock(state.inventory, menu[id].recipe)) ? 'Đang đợi khách ghé tiệm…' : 'Nguyên liệu đã hết cho các món đang bán.'}</p>`}</div>
    ${options.departure ? `<div class="departure" aria-hidden="true"><span>${escape(options.departure.text)}</span><div>${guestSprite(options.departure.profile)}</div></div>` : ''}
  </section>`
}

function ingredientProgress(id: IngredientId, order: Order, bowl?: Bowl) {
  const quantity = order.recipe[id] ?? 0
  const present = bowl?.ingredients[id] ?? 0
  const wrongHeat = id === 'chili' && present > 0 && bowl?.heat !== order.heat
  const wrong = present > quantity || wrongHeat
  return { quantity, present, wrongHeat, wrong, complete: present === quantity && !wrong, missing: present < quantity }
}

function orderIngredient(id: IngredientId, order: Order, bowl?: Bowl): string {
  const { quantity, present, wrongHeat, wrong, complete } = ingredientProgress(id, order, bowl)
  const short = ingredients[id].short
  const label = short + ', ' + present + '/' + quantity + ' phần'
    + (wrongHeat ? ', sai mức cay' : wrong ? ', lấy dư' : complete ? ', đã đủ' : '')
  return `<li>
    <button type="button" class="order-ingredient${complete ? ' checked' : ''}${wrong ? ' mismatched' : ''}"
      data-action="order-ingredient" data-id="${id}" aria-label="${label}" title="${label}">
      ${trayContents(id)}
      ${quantity > 1 ? `<b class="order-quantity" aria-hidden="true">×${quantity}</b>` : ''}
      <span class="order-check" aria-hidden="true">${complete ? icon('check', 10) : wrong ? '!' : ''}</span>
    </button>
  </li>`
}

function orderIngredientIds(order: Order): IngredientId[] {
  return ingredientIds.filter(id => id !== 'pack' && order.recipe[id])
}

function orderSlip(customer: Customer, bowl?: Bowl): string {
  const order = customer.order
  const person = profiles[customer.profile]
  const foodList = orderIngredientIds(order)
  const heatMismatch = Boolean(bowl?.ingredients.chili && bowl.heat !== order.heat)
  return `<div class="order-slip">
    <div class="order-ticket-head">
      <span class="order-stamp">${icon('storefront', 16)}</span>
      <div><p class="order-ticket-title">Phiếu order</p><span class="order-customer">${person.name}</span></div>
      <b class="order-number">#${String(customer.id).padStart(3, '0')}</b>
    </div>
    <table class="order-table">
      <thead><tr><th scope="col">Món</th><th scope="col">SL</th><th scope="col">Tổng</th></tr></thead>
      <tbody><tr><td><h2>${menu[order.dish].name}</h2></td><td>${order.quantity}</td><td>${money(order.price * order.quantity)}</td></tr></tbody>
    </table>
    ${order.quantity > 1 ? `<p class="order-portions" role="status">Đã giao <strong>${customer.servedPortions.length}/${order.quantity}</strong> bịch</p>` : ''}
    <ul class="order-ingredients" aria-label="Nguyên liệu theo đơn">${foodList.map(id => orderIngredient(id, order, bowl)).join('')}</ul>
    <div class="order-notes"><b>Ghi chú</b><span${heatMismatch ? ' class="note-mismatch"' : ''}>${heatLabels[order.heat]}</span>
      ${order.noCilantro ? `<span${bowl?.ingredients.cilantro ? ' class="note-mismatch"' : ''}>Bỏ rau răm</span>` : ''}
    </div>
  </div>`
}

function receiptSummary(guest: Customer, active: boolean, bowl?: Bowl): string {
  const { order } = guest
  const ids = orderIngredientIds(order)
  const checked = ids.filter(id => ingredientProgress(id, order, bowl).complete).length
  const notes = [heatLabels[order.heat], ...(order.noCilantro ? ['Bỏ rau răm'] : []), ...(order.extraMango ? ['×2 xoài'] : [])]
  const dish = menu[order.dish].name.replace(/^Bánh tráng (trộn )?/, '')
  return `<li>
    <button type="button" class="order-receipt" data-action="select-order" data-id="${guest.id}"
      aria-current="${active}" aria-controls="order-details">
      <span class="receipt-meta"><b>#${String(guest.id).padStart(3, '0')}</b><span>${profiles[guest.profile].name}</span></span>
      <b class="receipt-dish">${dish}</b>
      ${order.quantity > 1 ? `<span class="receipt-portions">Đã giao ${guest.servedPortions.length}/${order.quantity} bịch</span>` : ''}
      <span class="receipt-notes">${notes.join(' · ')}</span>
      <span class="receipt-summary-footer"><b>${money(order.price * order.quantity)}</b><span aria-label="${checked} trên ${ids.length} nguyên liệu">${checked}/${ids.length}</span></span>
    </button>
  </li>`
}

function orderDock(state: GameState): string {
  const queue = state.shift?.queue ?? []
  const active = currentCustomer(state)
  const bowl = state.shift?.bowl
  return `<aside class="order-dock" aria-label="Phiếu order và hàng chờ">
    <section class="order-details" id="order-details" aria-label="Phiếu order đang làm" data-order-id="${active?.id ?? ''}">
      ${active ? orderSlip(active, bowl) : '<div class="order-slip order-slip-empty"><p class="order-ticket-title">Phiếu order</p></div>'}
      ${active && currentLesson(state)?.action === 'read-order' ? '<button type="button" class="button quiet order-read" data-action="read-order">Đã xem phiếu</button>' : ''}
    </section>
    <section class="order-board" aria-labelledby="order-board-title">
      <h2 class="dock-heading" id="order-board-title">${icon('ledger', 15)} Phiếu chờ <span>${queue.length}</span></h2>
      <div class="order-sheet">
        ${queue.length ? `<ol class="order-list" aria-label="Phiếu đang chờ" role="list">
          ${queue.map(guest => receiptSummary(guest, guest.id === active?.id, guest.id === active?.id ? bowl : undefined)).join('')}
        </ol>` : ''}
      </div>
    </section>
  </aside>`
}

function nextKitchenAction(order: Order, bowl: Bowl, percent: number): 'mix' | 'toppings' | 'final-mix' | null {
  if (bowl.pack || bowl.mixing) return null
  if (percent < 100) {
    const ready = ingredientIds.every(id => {
      const category = ingredients[id].category
      return (category !== 'base' && category !== 'seasoning') || ingredientProgress(id, order, bowl).complete
    })
    return ready ? 'mix' : null
  }
  const needsToppings = ingredientIds.some(id => {
    const category = ingredients[id].category
    return (category === 'topping' || category === 'crunch') && ingredientProgress(id, order, bowl).missing
  })
  if (needsToppings) return 'toppings'
  return bowl.finalMixed ? null : 'final-mix'
}

function kitchen(state: GameState, options: ScreenOptions): string {
  const customer = currentCustomer(state)
  const bowl = state.shift?.bowl
  const percent = Math.floor(mixProgress(state))
  const next = customer && bowl ? nextKitchenAction(customer.order, bowl, percent) : null
  const stage = bowl?.pack ? 5 : percent === 100 ? next === 'toppings' ? 3 : bowl?.finalMixed ? 5 : 4 : bowl?.ingredients.rice ? 2 : 1
  return `<section class="kitchen" aria-label="Quầy chế biến">
    <div class="kitchen-steps" aria-label="Tiến trình chế biến">
      ${['Nền', 'Nêm & trộn', 'Topping', 'Trộn nhẹ', 'Gói'].map((name, index) => `<span class="${index + 1 === stage ? 'current' : index + 1 < stage ? 'done' : ''}">
        <i>${index + 1 < stage ? icon('check', 10) : index + 1}</i>${name}</span>`).join('')}
    </div>
    <div class="bowl-area" data-drop-zone>
      <div class="bowl-caption"><strong>Thau trộn${customer && customer.order.quantity > 1 ? ` · Bịch ${customer.servedPortions.length + 1}/${customer.order.quantity}` : ''}</strong><span>${bowl?.pack ? 'Đã gói · kèm đũa tre' : 'Bấm hoặc kéo nguyên liệu vào thau'}</span></div>
      ${next === 'toppings' ? '<span class="topping-cue">Thêm topping ↓</span>' : ''}
      ${bowlArt(bowl)}
      <button type="button" class="icon-button waste-button" data-action="trash" aria-label="Đổ bỏ phần bánh" title="Đổ bỏ phần bánh" ${priceOf(bowl?.ingredients ?? {}) ? '' : 'disabled'}>${icon('trash', 18)}</button>
    </div>
    <div class="mix-controls">
      <button type="button" class="button mix-button${bowl?.mixing ? ' active' : ''}${next === 'mix' ? ' suggested-action' : ''}" data-action="mix" ${!bowl?.ingredients.rice || percent === 100 ? 'disabled' : ''}>
        ${icon(percent === 100 ? 'check' : 'mix', 17)} ${percent === 100 ? 'Đã trộn đều' : bowl?.mixing ? 'Đang trộn…' : 'Trộn đều tay'}
      </button>
      <div class="mix-meter" role="progressbar" aria-label="Tiến độ trộn lần đầu" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
        <span><i data-mix-fill style="width:${percent}%"></i></span><b data-mix-percent>${percent}%</b>
      </div>
      <button type="button" class="button quiet final-mix-button${next === 'final-mix' ? ' suggested-action' : ''}" data-action="final-mix" ${percent < 100 || bowl?.finalMixed || bowl?.pack ? 'disabled' : ''}>${icon(bowl?.finalMixed ? 'check' : 'mix', 16)} Trộn nhẹ</button>
    </div>
    ${ingredientStation(state, options, next === 'toppings', customer)}
    <div class="pack-controls" role="group" aria-label="Đóng gói">
      <button type="button" class="button quiet ${bowl?.pack === 'bag' ? 'packed' : ''}" data-action="pack" data-id="bag"
        aria-pressed="${bowl?.pack === 'bag'}" ${percent < 100 || (!bowl?.pack && !state.inventory.pack) ? 'disabled' : ''}>Bịch nilon</button>
      ${state.level >= 3 ? `<button type="button" class="button quiet ${bowl?.pack === 'box' ? 'packed' : ''}" data-action="pack" data-id="box"
        aria-pressed="${bowl?.pack === 'box'}" ${percent < 100 || (!bowl?.pack && !state.inventory.pack) ? 'disabled' : ''}>Hộp giấy</button>` : ''}
      <span class="pack-stock">${state.inventory.pack} bộ gói</span>
    </div>
    <button type="button" class="button primary serve-button" data-action="deliver" ${canDeliver(state) ? '' : 'disabled'}>
      ${icon('check', 19)} ${customer && customer.order.quantity > 1 ? `Giao bịch ${customer.servedPortions.length + 1}/${customer.order.quantity}` : 'Giao món'} ${icon('arrow', 17)}
    </button>
  </section>`
}

const trayGroups = {
  base: ['rice', 'kumquat', 'shrimpSalt', 'chili', 'oil', 'tamarind', 'blackSauce'],
  vegetables: ['mango', 'cilantro'],
  crunch: ['peanut', 'shallot'],
  protein: ['egg', 'redBeef', 'blackBeef', 'chicken', 'squid'],
} as const satisfies Record<string, readonly IngredientId[]>

function ingredientStation(state: GameState, options: ScreenOptions, suggestToppings: boolean, customer?: Customer): string {
  const filledSlots = (ids: readonly IngredientId[]) => ids.filter(id => ingredients[id].level <= state.level)
    .map(id => tray(state, id, customer)).join('')
  const crunchy = filledSlots(trayGroups.crunch)
  const protein = filledSlots(trayGroups.protein)
  return `<section class="ingredient-station" aria-label="Khay nguyên liệu">
    <section class="ingredient-bank" aria-labelledby="seasoning-bank">
      <h3 id="seasoning-bank">Bánh tráng &amp; gia vị</h3>
      <div class="ingredient-grid">${filledSlots(trayGroups.base)}</div>
      ${options.heatOpen ? `<div class="heat-options" role="group" aria-label="Chọn mức cay">
        ${heatLabels.map((label, index) => `<button type="button" data-action="heat" data-id="${index}" ${index > 0 && state.inventory.chili === 0 ? 'disabled' : ''}>${label}</button>`).join('')}
      </div>` : ''}
    </section>
    <section class="ingredient-bank${suggestToppings ? ' suggested-bank' : ''}" aria-labelledby="topping-bank">
      <h3 id="topping-bank">Rau &amp; topping</h3>
      <div class="topping-groups">
        <div class="topping-group" role="group" aria-label="Rau củ"><h4>Rau củ</h4><div class="ingredient-grid paired">${filledSlots(trayGroups.vegetables)}</div></div>
        ${crunchy ? `<div class="topping-group" role="group" aria-label="Đồ giòn"><h4>Đồ giòn</h4><div class="ingredient-grid paired">${crunchy}</div></div>` : ''}
      </div>
      ${protein ? `<div class="topping-group protein-group" role="group" aria-label="Đạm"><h4>Đạm</h4><div class="ingredient-grid">${protein}</div></div>` : ''}
    </section>
  </section>`
}

function tray(state: GameState, id: IngredientId, customer?: Customer): string {
  const item = ingredients[id]
  const stock = state.inventory[id]
  const bowl = state.shift?.bowl
  const present = bowl?.ingredients[id] ?? 0
  const needed = customer && ingredientProgress(id, customer.order, bowl).missing
  const disabled = !customer || (id !== 'chili' && stock === 0) || bowl?.mixing || Boolean(bowl?.pack)
  return `<button type="button" class="tray ${id}${needed ? ' needed' : ''}${!stock ? ' empty-tray' : ''}${state.staff && stock <= 2 ? ' low-stock' : ''}"
    data-action="ingredient" data-id="${id}" aria-label="${item.name}, kho ${stock}, trong thau ${present}" ${disabled ? 'disabled' : ''}>
    <span class="tray-well">${stock ? trayContents(id) : ''}<b class="tray-count">${stock}</b>${present ? `<small>+${present}</small>` : ''}</span>
    <span class="tray-label">${item.short}</span>
  </button>`
}

function shopScreen(state: GameState, options: ScreenOptions): string {
  return `<main class="game-screen shop-screen">
    ${statusStrip(state, true)}
    <section class="shop-front" aria-label="Quầy đón khách">
      <div class="queue-heading"><h1>Quầy bán hàng</h1><div class="heading-buttons">
        <button type="button" class="button quiet close-shift" data-action="close-shop">Kết thúc sớm</button>
        ${labelButton('help', 'Hướng dẫn nhanh', 'help')}
      </div></div>
      ${queueScene(state, options)}
    </section>
    ${kitchen(state, options)}
  </main>`
}

function reportNavigation(state: GameState, options: ScreenOptions): { report?: DailyReport; html: string } {
  const latest = state.reports.at(-1)?.day ?? 1
  const selected = Math.max(1, Math.min(options.reportDay, latest))
  const week = Math.ceil(selected / 7)
  const weekly = options.reportPeriod === 'week'
  const report = weekly ? sumReports(state.reports.filter(entry => Math.ceil(entry.day / 7) === week))
    : state.reports.find(entry => entry.day === selected)
  const label = weekly ? 'Tuần ' + week + ' · Ngày ' + (week * 7 - 6) + '–' + Math.min(week * 7, latest) : 'Ngày ' + selected
  const hasPrev = weekly ? week > 1 : selected > 1
  const hasNext = weekly ? week < Math.ceil(latest / 7) : selected < latest
  return { report, html: `<div class="report-nav">
      <button class="icon-button" type="button" data-action="report-prev" aria-label="Kỳ trước" ${hasPrev ? '' : 'disabled'}>${icon('back', 16)}</button>
      <strong>${label}</strong>
      <button class="icon-button" type="button" data-action="report-next" aria-label="Kỳ sau" ${hasNext ? '' : 'disabled'}>${icon('arrow', 16)}</button>
    </div>` }
}

function reportBody(state: GameState, options: ScreenOptions): string {
  const { report, html } = reportNavigation(state, options)
  if (!report) return '<p>Chưa có ngày bán nào được chốt.</p>'
  const sold = menuIds.filter(id => report.sales[id]?.count)
  return `<div class="segmented report-tabs" role="group" aria-label="Kỳ báo cáo">
      <button type="button" data-action="period-day" aria-pressed="${options.reportPeriod === 'day'}">Ngày</button>
      <button type="button" data-action="period-week" aria-pressed="${options.reportPeriod === 'week'}">Tuần</button>
    </div>${html}
    <div class="report-metrics">
      <div><strong>${report.sold}</strong><span>Phần đã bán</span></div>
      <div><strong>${report.lost}</strong><span>Khách bỏ về</span></div>
      <div><strong>${starsLabel(report.stars, report.reviewCount)} <small>★</small></strong><span>Sao trung bình</span></div>
    </div>
    <section class="receipt">
      <h3>Doanh thu <strong>${money(report.revenue)}</strong></h3>
      ${sold.length ? sold.map(id => `<div><span>${menu[id].name} × ${report.sales[id]!.count}</span><b>${money(report.sales[id]!.revenue)}</b></div>`).join('') : '<p>Chưa bán được phần nào.</p>'}
      <h3>Chi phí</h3>
      <div><span>Nguyên liệu món đã bán</span><b>${money(-report.used)}</b></div>
      <div><span>Phần đã đổ bỏ</span><b>${money(-report.waste)}</b></div>
      <div><span>Nguyên liệu tươi hư</span><b>${money(-report.spoilage)}</b></div>
      <div><span>Mặt bằng và điện nước</span><b>${money(-report.overhead)}</b></div>
      ${report.wages ? `<div><span>Lương phụ bếp</span><b>${money(-report.wages)}</b></div>` : ''}
      <div><span>Thuế (3% doanh thu)</span><b>${money(-report.tax)}</b></div>
      <div class="receipt-total"><strong>Lợi nhuận sau thuế</strong><strong class="${report.profit < 0 ? 'negative' : ''}">${signMoney(report.profit)}</strong></div>
    </section>
    <section class="cash-report">
      <h3>${icon('coin', 18)} Két của tiệm</h3>
      <div><span>Đã trả tiền nhập hàng</span><b>${money(-report.purchases)}</b></div>
      <div><span>Biến động két</span><b>${signMoney(report.cashDelta)}</b></div>
      <div><strong>Két cuối kỳ</strong><strong>${money(report.cash)}</strong></div>
    </section>`
}

function reportScreen(state: GameState, options: ScreenOptions): string {
  const closedAt = state.reports.at(-1)?.closedAt ?? CLOSE_MINUTE
  return `<main class="game-screen report-screen">
    ${statusStrip(state, false)}
    <div class="screen-heading"><div><p class="eyebrow">${formatShopTime(closedAt)} · ${closedAt < CLOSE_MINUTE ? 'Đã kết thúc sớm' : 'Tiệm đã đóng cửa'}</p><h1>Hết ngày ${state.day}</h1></div><div class="report-icon">${icon('ledger', 25)}</div></div>
    <h2 class="financial-heading">Tổng kết tài chính</h2>
    ${reportBody(state, options)}
    <div class="bottom-actions"><button type="button" class="button primary" data-action="next-day">Chuẩn bị ngày ${state.day + 1} ${icon('arrow', 18)}</button></div>
  </main>`
}

function reviewList(state: GameState | null, options: ScreenOptions): string {
  if (!state?.reviews.length) return `<div class="reviews-empty">${icon('chat', 28)}<p>Khách sẽ để lại lời nhắn sau khi ghé tiệm.</p></div>`
  return `<div class="reviews-list">${[...state.reviews].reverse().map(review => {
    const person = profiles[review.profile]
    return `<article class="review">
      <div class="review-head"><span class="review-avatar">${avatar(review.profile)}</span>
        <div><strong>${person.name}</strong><p>${person.role} · Ngày ${review.day}</p></div>
        <span class="review-stars" aria-label="${review.stars} sao">${'★'.repeat(review.stars)}${'<i>' + '★'.repeat(5 - review.stars) + '</i>'}</span>
      </div>
      <p>${escape(review.text)}</p>
      ${review.reply ? `<div class="review-reply"><strong>Tiệm nhỏ</strong><p>${replies[review.reply].text}</p></div>`
        : `<button type="button" class="text-button" data-action="reply-toggle" data-id="${review.customerId}" aria-expanded="${options.replyFor === review.customerId}">Trả lời</button>
           ${options.replyFor === review.customerId ? `<div class="reply-options">${(Object.keys(replies) as ReplyId[]).map(id =>
              `<button type="button" class="button quiet" data-action="reply" data-id="${review.customerId}" data-value="${id}">${replies[id].label}</button>`).join('')}</div>` : ''}`}
    </article>`
  }).join('')}</div>`
}

function guide(): string {
  return `<ol class="guide-list">
    <li><div><strong>Đi chợ và chọn menu</strong><p>Nhập bánh tráng, muối tôm, tắc và bộ đóng gói để bán món muối tắc. Mở Menu hôm nay để đổi món hoặc chỉnh giá.</p></div></li>
    <li><div><strong>Đọc đơn trước khi làm</strong><p>Chọn một khách rồi xem phiếu trên thanh gỗ bên phải. So hình nguyên liệu trên phiếu với các khay. Chạm hoặc kéo nguyên liệu lên thau.</p></div></li>
    <li><div><strong>Nêm rồi trộn đến 100%</strong><p>Cho bánh tráng vào trước, thêm tắc rồi các gia vị theo đơn. Bấm Trộn đều tay và đợi thanh chạy hết.</p></div></li>
    <li><div><strong>Thêm topping, trộn nhẹ và giao</strong><p>Thêm rau, topping rồi mới rắc đậu phộng hoặc hành phi. Trộn nhẹ, chọn bao bì kèm đũa và bấm Giao món.</p></div></li>
    <li><div><strong>Xem sổ cuối ngày</strong><p>Ca bán dài 4 phút, đến 21:00. Bạn có thể chọn Kết thúc sớm ở quầy. Xem tiền lời, trả lời khách và tích danh tiếng để mở món mới.</p></div></li>
  </ol>`
}

export function dialogContent(state: GameState | null, options: ScreenOptions): string {
  if (!options.modal) return ''
  const titles = { help: 'Hướng dẫn nhanh', reviews: 'Đánh giá của khách', reset: 'Mở một tiệm mới?', ledger: 'Sổ thu chi', 'close-shop': 'Kết thúc ngày sớm?' }
  const content = options.modal === 'help' ? guide() : options.modal === 'reviews' ? reviewList(state, options)
    : options.modal === 'ledger' && state ? reportBody(state, options)
    : options.modal === 'close-shop' && state ? `<p class="reset-copy">Tiệm sẽ đóng lúc ${shopTime(state)} và chốt sổ ngay. Chi phí trong ngày vẫn được tính.</p>
    ${state.shift?.queue.length ? `<p class="close-detail">${state.shift.queue.length} khách đang chờ sẽ rời quầy. Phần đang làm sẽ tính vào hao hụt.</p>` : ''}
    <div class="reset-buttons">
      <button type="button" class="button quiet" data-action="modal-close">Bán tiếp</button>
      <button type="button" class="button primary" data-action="close-confirm">Kết thúc ngày</button>
    </div>` : `<p class="reset-copy">Bản chơi hiện tại sẽ bị thay thế.</p><div class="reset-buttons">
      <button type="button" class="button quiet" data-action="modal-close">Giữ tiệm hiện tại</button>
      <button type="button" class="button primary" data-action="reset-confirm">Chơi mới</button>
    </div>`
  return `<dialog class="sheet" aria-labelledby="dialog-title">
    <header class="sheet-header"><h2 id="dialog-title">${titles[options.modal]}</h2>${labelButton('modal-close', 'Đóng bảng', 'close')}</header>
    <div class="sheet-body">${content}</div>
  </dialog>`
}

export function renderApp(state: GameState | null, options: ScreenOptions): string {
  const topbar = header(state, options.home, options.initialMute)
  const warning = options.warning ? `<div class="save-warning" role="status">${escape(options.warning)}</div>` : ''
  if (!options.home && state?.phase === 'shop') {
    return `<div class="shop-layout">
      ${topbar}
      <div class="game-frame">${warning}${shopScreen(state, options)}</div>
      ${orderDock(state)}
    </div>`
  }
  return `<div class="game-frame standalone-layout">
    ${topbar}
    ${warning}
    ${options.home || !state ? homeScreen(state) : state.phase === 'prep' ? prepScreen(state, options) : reportScreen(state, options)}
  </div>`
}

export function updateClocks(root: HTMLElement, state: GameState): void {
  const clock = root.querySelector('[data-clock]')
  if (clock) clock.textContent = shopTime(state)
  const percent = Math.floor(mixProgress(state))
  const fill = root.querySelector<HTMLElement>('[data-mix-fill]')
  if (fill) {
    fill.style.width = percent + '%'
    fill.closest('[role=progressbar]')?.setAttribute('aria-valuenow', String(percent))
  }
  const mixLabel = root.querySelector('[data-mix-percent]')
  if (mixLabel) mixLabel.textContent = percent + '%'
  for (const customer of state.shift?.queue ?? []) {
    const node = root.querySelector<HTMLElement>('[data-patience="' + customer.id + '"]')
    const bar = node?.querySelector('i')
    if (!bar) continue
    const amount = Math.round(patienceLeft(state, customer) * 100)
    bar.style.width = amount + '%'
    bar.className = patienceColor(amount)
    node?.setAttribute('aria-valuenow', String(amount))
  }
}
