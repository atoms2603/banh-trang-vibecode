import { avatar, bowlArt, food, guestSprite, icon, storefront, trayContents } from './art.ts'
import { heatLabels, ingredientIds, ingredients, levels, market, menu, menuIds, profiles, replies, staffWage, missionLabels, regularStories, specialChallenges } from './data.ts'
import { currentShiftPhase, getShiftRules, shiftNotice } from './engagement.ts'
import { hasStock, money, priceBand, priceOf, sumReports } from './economy.ts'
import { canDeliver, CLOSE_MINUTE, currentCustomer, enabledDishes, formatShopTime, marketUnlocked, mixProgress, OPEN_MINUTE, openingProblem, patienceLeft, shopTime } from './game.ts'
import type { Bowl, Customer, DailyMission, DailyReport, GameState, IngredientId, Level, MenuId, Order, ReplyId } from './types.ts'
import { currentLesson } from './tutorial.ts'
import { counterItems, counterPage, counterTabs, initialCounterTab, missingIngredient, trayPageSize } from './counter.ts'
import type { CounterTab } from './counter.ts'

export type Modal = 'help' | 'reviews' | 'reset' | 'ledger' | 'close-shop' | 'missions' | 'shop-menu' | 'order' | null
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
  departure: { profile: number; text: string; durationMs: number } | null
  counterTab?: CounterTab
  trayPages?: Partial<Record<CounterTab, number>>
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
  if (!home && state?.phase === 'shop') {
    const notice = shiftNotice(state)
    return `<header class="topbar counter-hud" aria-label="Thông tin ca bán">
      <span class="counter-day">${icon('calendar', 16)} Ngày ${state.day}</span>
      <span class="counter-time">${icon('clock', 16)}<span><b data-clock>${shopTime(state)}</b><small>Đóng ${formatShopTime(CLOSE_MINUTE)}</small></span></span>
      <button type="button" class="counter-rating" data-action="reviews" aria-label="${starsLabel(total, count)} sao, ${count} đánh giá">${icon('star', 14)} ${starsLabel(total, count)}</button>
      <span class="status-cash">${icon('coin', 17)} <strong>${money(state.cash)}</strong></span>
      <div class="counter-extra-hud" aria-label="Cấp tiệm và nhiệm vụ">${activityProgress(state)}</div>
      <button type="button" class="icon-button counter-menu-button" data-action="shop-menu" aria-label="Menu ca bán, nhiệm vụ và EXP">${icon('menu', 21)}<span class="counter-menu-dot" ${state.level < 4 && state.reputation >= levels[(state.level + 1) as Level].threshold ? '' : 'hidden'}></span></button>
      <span class="counter-notice" role="status" ${notice?.id === 'warning' || notice?.id === 'special' ? '' : 'hidden'}>${notice ? icon(notice.id === 'special' ? 'star' : 'bell', 14) : ''}<span data-counter-notice>${notice?.label ?? ''}</span></span>
    </header>`
  }
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

function activityProgress(state: GameState): string {
  const nextLevel = Math.min(4, state.level + 1) as Level
  const threshold = levels[nextLevel].threshold
  const ready = state.level < 4 && state.reputation >= threshold
  const percent = state.level === 4 ? 100 : Math.min(100, state.reputation / threshold * 100)
  return `<div class="xp-status${ready ? ' xp-ready' : ''}"><span>Cấp ${state.level} <b>${state.reputation}${state.level < 4 ? '/' + threshold : ''} EXP</b></span>
      <div class="xp-track" role="progressbar" aria-label="EXP của tiệm" aria-valuemin="0" aria-valuemax="${state.level === 4 ? Math.max(1, state.reputation) : threshold}" aria-valuenow="${state.level === 4 ? state.reputation : Math.min(threshold, state.reputation)}"><i style="width:${percent}%"></i></div>
      ${ready ? '<small class="xp-unlock">Đủ EXP lên cấp</small>' : ''}
    </div>
    ${state.daily ? `<div class="mission-chips" aria-label="Nhiệm vụ hôm nay">${state.daily.missions.map(task => `<button type="button" data-action="missions" class="mission-chip${task.rewarded ? ' complete' : ''}" aria-label="${missionLabels[task.kind].detail}: ${task.progress}/${task.target}, ${task.rewarded ? 'đã nhận thưởng' : 'xem nhiệm vụ'}"><span>${task.rewarded ? '✓' : task.kind === 'orders' ? '▤' : '★'} ${missionLabels[task.kind].short}</span><b>${task.progress}/${task.target}</b></button>`).join('')}</div>` : ''}`
}

function statusStrip(state: GameState, shop: boolean): string {
  const notice = shiftNotice(state)
  return `<div class="status-strip">
     <span class="status-day">${icon('calendar', 16)} Ngày ${state.day}</span>
     <span class="status-grade">${shop ? icon('clock', 16) : icon('storefront', 16)} <span ${shop ? 'data-clock' : ''}>${shop ? shopTime(state) : 'Cấp ' + state.level}</span></span>
     ${shop ? `<span class="status-close">Đóng lúc ${formatShopTime(CLOSE_MINUTE)}</span>` : ''}
     <span class="status-cash">${icon('coin', 17)} <strong>${money(state.cash)}</strong></span>
  </div>
  <div class="activity-hud">
    ${shop && notice?.id === 'warning' ? `<span class="shift-notice phase-warning" role="status">${icon('bell', 14)} <span data-rush-countdown>${notice.label}</span></span>` : ''}
    ${activityProgress(state)}
  </div>`
}

function missionDetails(tasks: DailyMission[]): string {
  return `<div class="mission-details">${tasks.map(task => `<article class="mission-detail${task.rewarded ? ' complete' : ''}"><h3>${task.rewarded ? '✓' : task.kind === 'orders' ? '▤' : '★'} ${missionLabels[task.kind].short}<b>${task.progress}/${task.target}</b></h3><p>${missionLabels[task.kind].detail}</p><progress max="${task.target}" value="${task.progress}" aria-label="${missionLabels[task.kind].short}"></progress><span>${task.rewarded ? 'Đã nhận' : 'Thưởng'} ${money(task.cash)} · ${task.xp} EXP</span></article>`).join('')}</div>`
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
  const chapter = customer.storyStage === undefined ? undefined : regularStories[customer.profile]?.chapters[customer.storyStage]
  return `<button type="button" class="customer-figure${arriving ? ' arriving' : ''}" data-action="customer" data-id="${customer.id}"
     aria-label="${person.name}" aria-pressed="${active}" title="${person.role}"${speaking ? ' aria-describedby="customer-speech"' : ''}>
    <span class="customer-sprite">${guestSprite(customer.profile)}${quantity > 1 ? `<span class="customer-order-count" aria-label="Đã giao ${served} trên ${quantity} bịch">${served ? `${served}/${quantity}` : `×${quantity}`}</span>` : ''}</span>
    <b>${customer.special ? '★ ' : chapter ? '♡ ' : ''}${person.name}</b>
    <span class="patience" role="progressbar" aria-label="Kiên nhẫn của ${person.name}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" data-patience="${customer.id}">
      <i class="${patienceColor(percent)}" style="width:${percent}%"></i>
    </span>
  </button>`
}

function queueScene(state: GameState, options: ScreenOptions): string {
  const queue = state.shift?.queue ?? []
  const active = currentCustomer(state)
  const speaking = active && options.customerSpeechId === active.id ? active : undefined
  const chapter = speaking?.storyStage === undefined ? undefined : regularStories[speaking.profile]?.chapters[speaking.storyStage]
  const line = speaking ? speaking.special ? 'Mình ghé thử thách tiệm một chút nha!' : chapter?.greeting
    ?? (speaking.order.quantity > 1 ? `Cho ${speaking.order.quantity} bịch nha!` : profiles[speaking.profile].line) : ''
  return `<section class="queue-scene" aria-label="Hàng khách đợi">
    <img class="ganh-art" src="./art/ganh.webp" width="640" height="480" alt="Gánh bánh tráng với hai thúng tre và dù hồng" draggable="false">
    ${speaking ? `<div class="customer-speech" id="customer-speech"><div class="customer-speech-body"><strong>${profiles[speaking.profile].name}</strong><br>${escape(line)}</div></div>` : ''}
    <div class="customers">${queue.length ? queue.map(customer => customerFigure(state, customer, options)).join('')
      : `<p class="queue-empty">${currentShiftPhase(state).id === 'closing' ? 'Đã ngừng đón khách mới.' : enabledDishes(state).some(id => hasStock(state.inventory, menu[id].recipe)) ? 'Đang đợi khách ghé tiệm…' : 'Nguyên liệu đã hết cho các món đang bán.'}</p>`}</div>
    ${options.departure ? `<div class="departure" style="--departure-duration:${options.departure.durationMs}ms" aria-hidden="true"><span>${escape(options.departure.text)}</span><div>${guestSprite(options.departure.profile)}</div></div>` : ''}
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
      <span class="order-ingredient-name">${short}</span>
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
      ${order.extraMango ? '<span>×2 xoài</span>' : ''}
    </div>
    ${customer.special ? `<div class="special-request"><b>★ ${specialChallenges[customer.special].label}</b><span>${specialChallenges[customer.special].detail}</span><small>+${money(specialChallenges[customer.special].cash)} · ${specialChallenges[customer.special].xp} EXP</small></div>` : ''}
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
      ${guest.special ? `<span class="receipt-challenge">★ ${specialChallenges[guest.special].label}</span>` : ''}
      ${order.quantity > 1 ? `<span class="receipt-portions">Đã giao ${guest.servedPortions.length}/${order.quantity} bịch</span>` : ''}
      <span class="receipt-notes">${notes.join(' · ')}</span>
      <span class="receipt-summary-footer"><b>${money(order.price * order.quantity)}</b><span aria-label="${checked} trên ${ids.length} nguyên liệu">${checked}/${ids.length}</span></span>
    </button>
  </li>`
}

function orderDetails(state: GameState): string {
  const active = currentCustomer(state)
  const bowl = state.shift?.bowl
  const ids = active ? orderIngredientIds(active.order) : []
  const visible = ids.slice(0, 5)
  const remainder = ids.slice(5)
  const missing = active ? remainder.filter(id => ingredientProgress(id, active.order, bowl).missing).length : 0
  return `<section class="order-details" id="order-details" aria-label="Phiếu order đang làm" data-order-id="${active?.id ?? ''}">
      <div class="compact-order">
        <div class="compact-order-head"><span>${active ? `#${String(active.id).padStart(3, '0')} · ${profiles[active.profile].name}` : 'Phiếu order'}</span>
          ${active ? `<button type="button" data-action="order" aria-label="Xem toàn bộ phiếu order của ${profiles[active.profile].name}">${icon('ledger', 14)} Chi tiết</button>` : ''}
        </div>
        ${active ? `<div class="compact-order-dish"><strong>${menu[active.order.dish].name.replace(/^Bánh tráng (trộn )?/, '')}</strong><span>${active.servedPortions.length}/${active.order.quantity} bịch · ${money(active.order.price)}</span></div>
          <ul class="compact-order-recipe" aria-label="Nguyên liệu theo đơn">${visible.map(id => orderIngredient(id, active.order, bowl)).join('')}${remainder.length ? `<li><button type="button" class="recipe-more" data-action="order" aria-label="Xem ${remainder.length} nguyên liệu còn lại, còn thiếu ${missing}">+${remainder.length}<small>${missing ? `Thiếu ${missing}` : '✓ Đủ'}</small></button></li>` : ''}</ul>
          <div class="compact-order-notes"><span>${heatLabels[active.order.heat]}</span>${active.order.noCilantro ? '<span>Bỏ rau răm</span>' : ''}${active.order.extraMango ? '<span>×2 xoài</span>' : ''}${active.special ? `<span class="compact-special">★ ${specialChallenges[active.special].label}</span>` : ''}</div>`
          : '<p class="compact-order-empty">Chọn khách để xem món cần làm.</p>'}
      </div>
      <div class="desktop-order">${active ? `<button type="button" class="desktop-order-open" data-action="order">${icon('ledger', 15)} Xem phiếu đầy đủ</button>${orderSlip(active, bowl)}` : '<div class="order-slip order-slip-empty"><p class="order-ticket-title">Phiếu order</p></div>'}</div>
      ${active && currentLesson(state)?.action === 'read-order' ? '<button type="button" class="button quiet order-read" data-action="read-order">Đã xem phiếu</button>' : ''}
    </section>`
}

function orderBoard(state: GameState): string {
  const queue = state.shift?.queue ?? []
  const active = currentCustomer(state)
  const bowl = state.shift?.bowl
  return `<section class="order-board" aria-labelledby="order-board-title">
      <h2 class="dock-heading" id="order-board-title">${icon('ledger', 15)} Phiếu chờ <span>${queue.length}</span></h2>
      <div class="order-sheet">
        ${queue.length ? `<ol class="order-list" aria-label="Phiếu đang chờ" role="list">
          ${queue.map(guest => receiptSummary(guest, guest.id === active?.id, guest.id === active?.id ? bowl : undefined)).join('')}
        </ol>` : ''}
      </div>
    </section>`
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
  const tab = options.counterTab ?? initialCounterTab(state)
  const packEnabled = Boolean(bowl?.ingredients.rice && percent === 100 && (bowl.pack || state.inventory.pack))
  let action = 'mix'
  let actionId = ''
  let label = bowl?.mixing ? 'Tạm dừng trộn' : percent ? 'Tiếp tục trộn' : 'Trộn đều tay'
  let disabled = !customer || !bowl?.ingredients.rice
  if (bowl?.pack) {
    action = 'deliver'
    label = customer && customer.order.quantity > 1 ? `Giao bịch ${customer.servedPortions.length + 1}/${customer.order.quantity}` : 'Giao món'
    disabled = !canDeliver(state)
  } else if (percent === 100) {
    if (next === 'toppings' && tab !== 'topping' && !bowl?.finalMixed) {
      action = 'counter-tab'; actionId = 'topping'; label = 'Thêm topping'
    } else if (!bowl?.finalMixed) {
      action = 'final-mix'; label = 'Trộn nhẹ'
    } else {
      action = 'pack'; actionId = 'bag'; label = 'Đóng bịch + đũa'; disabled = !packEnabled
    }
  }
  const suggested = next === action || action === 'pack' || action === 'deliver' || action === 'counter-tab'
  return `<section class="kitchen" aria-label="Quầy chế biến">
    <div class="bowl-area" data-drop-zone>
      <div class="bowl-caption"><strong>Thau trộn${customer && customer.order.quantity > 1 ? ` · Bịch ${customer.servedPortions.length + 1}/${customer.order.quantity}` : ''}</strong><span>${bowl?.pack ? 'Đã gói · kèm đũa tre' : next === 'toppings' ? 'Thêm rau, đạm rồi đến đồ giòn' : 'Chạm hoặc kéo nguyên liệu vào thau'}</span></div>
      ${bowlArt(bowl)}
      <button type="button" class="icon-button waste-button" data-action="trash" aria-label="Đổ bỏ phần bánh" ${priceOf(bowl?.ingredients ?? {}) ? '' : 'disabled'}>${icon('trash', 18)}</button>
      <div class="mix-meter" role="progressbar" aria-label="Tiến độ trộn lần đầu" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span><i data-mix-fill style="width:${percent}%"></i></span><b data-mix-percent>${percent}%</b></div>
    </div>
    ${ingredientStation(state, options, next === 'toppings', customer)}
    <button type="button" class="button counter-main-action${suggested ? ' suggested-action' : ''}" data-action="${action}" ${actionId ? `data-id="${actionId}"` : ''} ${disabled ? 'disabled' : ''}>
      ${icon(action === 'deliver' ? 'check' : action === 'pack' ? 'basket' : 'mix', 20)} <span class="counter-action-label">${label}${action === 'pack' ? `<small class="counter-pack-count">Còn ${state.inventory.pack} bộ</small>` : ''}</span>${icon('arrow', 18)}
    </button>
  </section>`
}

function ingredientStation(state: GameState, options: ScreenOptions, suggestToppings: boolean, customer?: Customer): string {
  const tab = options.counterTab ?? initialCounterTab(state)
  const page = counterPage(state, tab, options.trayPages?.[tab])
  const suggestedTab = suggestToppings ? 'topping' : null
  const otherPage = (page.index + 1) % page.count
  const otherNeeds = page.all.slice(otherPage * trayPageSize, (otherPage + 1) * trayPageSize).some(id => missingIngredient(state, id))
  return `<section class="ingredient-station${suggestToppings ? ' suggested-bank' : ''}" aria-label="Khay nguyên liệu">
    <div class="counter-tabbar"><div class="counter-tabs" role="tablist" aria-label="Nhóm nguyên liệu">${(Object.keys(counterTabs) as CounterTab[]).map(key => {
      const missing = counterItems(state, key).some(id => missingIngredient(state, id))
      return `<button type="button" role="tab" id="tab-${key}" aria-controls="counter-trays" aria-selected="${tab === key}" data-action="counter-tab" data-id="${key}" class="${suggestedTab === key ? 'suggested-tab' : ''}">${counterTabs[key]}${missing ? '<span class="tab-needed" aria-label="Còn thiếu">•</span>' : ''}</button>`
    }).join('')}</div>${page.count > 1 ? `<div class="tray-pagination"><button type="button" data-action="tray-page" data-id="${otherPage}" aria-label="Trang ${page.index + 1}/${page.count}. Chuyển sang trang ${otherPage + 1}${otherNeeds ? ', còn nguyên liệu cần dùng' : ''}">${page.index + 1}/${page.count} ${icon('arrow', 13)}${otherNeeds ? '<span aria-hidden="true">•</span>' : ''}</button></div>` : ''}</div>
    <div class="counter-tray-panel" role="tabpanel" id="counter-trays" aria-labelledby="tab-${tab}">
      <div class="counter-trays">${page.items.map(id => tray(state, id, customer)).join('')}</div>
    </div>
    ${options.heatOpen ? `<div class="heat-options" role="group" aria-label="Chọn mức cay">${heatLabels.map((label, index) => `<button type="button" data-action="heat" data-id="${index}" ${index > 0 && state.inventory.chili === 0 ? 'disabled' : ''}>${label}</button>`).join('')}</div>` : ''}
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
    <section class="shop-front" aria-label="Quầy đón khách">
      <h1 class="visually-hidden">Quầy bán hàng</h1>
      ${queueScene(state, options)}
    </section>
    ${orderBoard(state)}
    <div class="prep-workspace">
      ${orderDetails(state)}
      ${kitchen(state, options)}
    </div>
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
      <div><strong>${report.sold}</strong><span>Phần đã bán · ${report.completedOrders} đơn đủ</span></div>
      <div><strong>${report.lost}</strong><span>Khách bỏ về</span></div>
      <div><strong>${starsLabel(report.stars, report.reviewCount)} <small>★</small></strong><span>Sao trung bình</span></div>
    </div>
    <section class="receipt">
      <h3>Tổng thu nhập <strong>${money(report.revenue)}</strong></h3>
      ${sold.length ? sold.map(id => `<div><span>${menu[id].name} × ${report.sales[id]!.count}</span><b>${money(report.sales[id]!.revenue)}</b></div>`).join('') : '<p>Chưa bán được phần nào.</p>'}
      <div><span>Tip & thưởng</span><b>${money(report.tips)}</b></div>
      <h3>Chi phí</h3>
      <div><span>Nguyên liệu món đã bán</span><b>${money(-report.used)}</b></div>
      <div><span>Phần đã đổ bỏ</span><b>${money(-report.waste)}</b></div>
      <div><span>Nguyên liệu tươi hư</span><b>${money(-report.spoilage)}</b></div>
      <div><span>Mặt bằng và điện nước</span><b>${money(-report.overhead)}</b></div>
      ${report.wages ? `<div><span>Lương phụ bếp</span><b>${money(-report.wages)}</b></div>` : ''}
      <div><span>Thuế (3% tổng thu nhập)</span><b>${money(-report.tax)}</b></div>
      <div class="receipt-total"><strong>Lợi nhuận sau thuế</strong><strong class="${report.profit < 0 ? 'negative' : ''}">${signMoney(report.profit)}</strong></div>
    </section>
    <section class="mission-report"><h3>+${report.xpEarned} EXP trong kỳ</h3>${options.reportPeriod === 'week' ? `<p>${report.missions.filter(task => task.rewarded).length}/${report.missions.length} nhiệm vụ hoàn thành</p>` : missionDetails(report.missions)}</section>
    <section class="cash-report">
      <h3>${icon('coin', 18)} Két của tiệm</h3>
      <div><span>Đã trả tiền nhập hàng</span><b>${money(-report.purchases)}</b></div>
      <div><span>Biến động két</span><b>${signMoney(report.cashDelta)}</b></div>
      <div><strong>Két cuối kỳ</strong><strong>${money(report.cash)}</strong></div>
    </section>`
}

function reportScreen(state: GameState, options: ScreenOptions): string {
  const report = state.reports.at(-1)
  const closedAt = report?.closedAt ?? CLOSE_MINUTE
  const reason = report?.endReason === 'queue-cleared' ? 'Đã giao hết đơn' : report?.endReason === 'manual' ? 'Đã kết thúc sớm' : 'Tiệm đã đóng cửa'
  return `<main class="game-screen report-screen">
    ${statusStrip(state, false)}
    <div class="screen-heading"><div><p class="eyebrow">${formatShopTime(closedAt)} · ${reason}</p><h1>Hết ngày ${state.day}</h1></div><div class="report-icon">${icon('ledger', 25)}</div></div>
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

function guide(state: GameState | null): string {
  const duration = !state || getShiftRules(state).durationMs === 105000 ? 'Ca tối đa 1:45; ngừng đón khách ở giây 85 và tự chốt khi giao hết hàng chờ.' : 'Ca đang chơi tiếp tục dài 4 phút; ngày tiếp theo chuyển sang ca tối đa 1 phút 45 giây.'
  return `<ol class="guide-list">
    <li><div><strong>Đi chợ và chọn menu</strong><p>Nhập bánh tráng, muối tôm, tắc và bộ đóng gói để bán món muối tắc. Mở Menu hôm nay để đổi món hoặc chỉnh giá.</p></div></li>
    <li><div><strong>Đọc đơn trước khi làm</strong><p>Chọn khách rồi xem phiếu gọn. Bấm Chi tiết để xem toàn bộ nguyên liệu và yêu cầu. So hình trên phiếu với khay; chạm hoặc kéo lên thau.</p></div></li>
    <li><div><strong>Nêm rồi trộn đến 100%</strong><p>Cho bánh tráng vào trước, thêm tắc rồi các gia vị theo đơn. Bấm Trộn đều tay và đợi thanh chạy hết.</p></div></li>
    <li><div><strong>Thêm topping, trộn nhẹ và giao</strong><p>Đổi tab Nêm / Topping để lấy nguyên liệu. Chấm bên tab hoặc trang khay báo nguyên liệu còn thiếu. Thêm rau, đạm rồi mới đến đồ giòn; trộn nhẹ, bấm Đóng bịch + đũa rồi giao món. Số bộ gói còn lại nằm ngay trên nút.</p></div></li>
    <li><div><strong>Xem sổ cuối ngày</strong><p>${duration} Mở Menu ca bán để xem EXP, nhiệm vụ hoặc Kết thúc sớm. Chi phí ngày vẫn giữ nguyên. Hoàn thành nhiệm vụ, trả lời đánh giá để tích EXP và mở cấp vào ngày kế tiếp.</p></div></li>
  </ol>`
}

export function dialogContent(state: GameState | null, options: ScreenOptions): string {
  if (!options.modal) return ''
  const titles = { help: 'Hướng dẫn nhanh', reviews: 'Đánh giá của khách', reset: 'Mở một tiệm mới?', ledger: 'Sổ thu chi', 'close-shop': 'Kết thúc ngày sớm?', missions: 'Nhiệm vụ hôm nay', 'shop-menu': 'Tiệm nhỏ · Tạm dừng', order: 'Phiếu order · Tạm dừng' }
  const active = state ? currentCustomer(state) : undefined
  const content = options.modal === 'help' ? guide(state) : options.modal === 'reviews' ? reviewList(state, options)
    : options.modal === 'order' ? `${active ? orderSlip(active, state?.shift?.bowl) : '<p>Chưa có khách đang chọn.</p>'}<button type="button" class="button primary" data-action="modal-close">Quay lại thau</button>`
    : options.modal === 'shop-menu' && state ? `${statusStrip(state, true)}
      <div class="counter-menu-list">
        <button type="button" class="button quiet" data-action="missions">${icon('ledger', 19)} Nhiệm vụ hôm nay ${icon('arrow', 16)}</button>
        <button type="button" class="button quiet" data-action="reviews">${icon('star', 19)} Đánh giá · ${starsLabel(state.reviews.reduce((sum, review) => sum + review.stars, 0), state.reviews.length)} (${state.reviews.length}) ${icon('arrow', 16)}</button>
        <button type="button" class="button quiet" data-action="mute">${icon(state.muted ? 'muted' : 'volume', 19)} Âm thanh · ${state.muted ? 'Tắt' : 'Bật'}</button>
        <button type="button" class="button quiet" data-action="help">${icon('help', 19)} Hướng dẫn nhanh</button>
        <button type="button" class="button quiet" data-action="close-shop">${icon('clock', 19)} Kết thúc sớm</button>
        <button type="button" class="button quiet" data-action="home">${icon('storefront', 19)} Màn hình chính</button>
        <button type="button" class="button primary" data-action="modal-close">Tiếp tục bán hàng ${icon('arrow', 18)}</button>
      </div>`
    : options.modal === 'missions' && state ? `${missionDetails(state.daily?.missions ?? [])}<p class="mission-help">Nhận đủ mọi bịch của một khách mới tính một đơn. Thưởng tự cộng vào két. EXP mở cấp quán vào ngày kế tiếp.</p>`
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
  return `<dialog class="sheet${state?.phase === 'shop' ? ' counter-sheet' : ''}${options.modal === 'order' ? ' order-dialog' : ''}" aria-labelledby="dialog-title">
    <header class="sheet-header"><h2 id="dialog-title">${titles[options.modal]}</h2>${labelButton('modal-close', 'Đóng bảng', 'close')}</header>
    <div class="sheet-body">${content}</div>
  </dialog>`
}

export function renderApp(state: GameState | null, options: ScreenOptions): string {
  const topbar = header(state, options.home, options.initialMute)
  const warning = options.warning ? `<div class="save-warning" role="status">${escape(options.warning)}</div>` : ''
  if (!options.home && state?.phase === 'shop') {
    return `<div class="shop-layout compact-layout">
      ${topbar}
      <div class="game-frame">${warning}${shopScreen(state, options)}</div>
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
  const countdown = root.querySelector('[data-rush-countdown]')
  const notice = shiftNotice(state)
  if (countdown && notice?.id === 'warning' && countdown.textContent !== notice.label) countdown.textContent = notice.label
  const compactNotice = root.querySelector('[data-counter-notice]')
  if (compactNotice && notice && compactNotice.textContent !== notice.label) compactNotice.textContent = notice.label
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
