import { ingredientIds, ingredients, levels, menu, staffWage } from './data.ts'
import type { DailyReport, DayTally, GameState, Inventory, MenuId, Recipe } from './types.ts'

const vnd = new Intl.NumberFormat('vi-VN')

export function money(amount: number): string {
  return vnd.format(amount || 0) + 'đ'
}

export function priceOf(recipe: Recipe): number {
  return ingredientIds.reduce((total, id) => total + (recipe[id] ?? 0) * ingredients[id].cost, 0)
}

export function fairPrice(dish: MenuId): number {
  return priceOf(menu[dish].recipe) * 2.4
}

export function defaultPrice(dish: MenuId): number {
  return Math.round(fairPrice(dish) / 1000) * 1000
}

export function priceBand(dish: MenuId, price: number): 'low' | 'fair' | 'high' {
  if (price < priceOf(menu[dish].recipe) * 1.2) return 'low'
  if (price > fairPrice(dish) * 1.35) return 'high'
  return 'fair'
}

export function hasStock(inventory: Inventory, recipe: Recipe): boolean {
  return ingredientIds.every(id => inventory[id] >= (recipe[id] ?? 0))
}

export function emptyTally(): DayTally {
  return { sales: {}, lost: 0, used: 0, waste: 0, purchases: 0, stars: 0, reviewCount: 0 }
}

export function tallySale(tally: DayTally, dish: MenuId, price: number, cost: number): void {
  const line = tally.sales[dish] ?? { count: 0, revenue: 0 }
  tally.sales[dish] = { count: line.count + 1, revenue: line.revenue + price }
  tally.used += cost
}

export function salesRevenue(tally: DayTally): number {
  return Object.values(tally.sales).reduce((total, line) => total + line.revenue, 0)
}

export function settleDay(state: GameState): DailyReport {
  let spoilage = 0
  for (const id of ingredientIds) {
    if (!ingredients[id].fresh) continue
    const spoiled = Math.floor(state.inventory[id] * 0.3)
    state.inventory[id] -= spoiled
    spoilage += spoiled * ingredients[id].cost
  }

  const { tally } = state
  const sold = Object.values(tally.sales).reduce((total, line) => total + line.count, 0)
  const revenue = salesRevenue(tally)
  const overhead = levels[state.level].overhead
  const wages = state.staff ? staffWage : 0
  const tax = Math.round(revenue * 0.03)
  const fees = overhead + wages + tax
  const netReceipts = revenue - fees
  state.cash -= fees

  return {
    ...tally, sales: { ...tally.sales },
    day: state.day, level: state.level, sold, revenue, spoilage, overhead, wages, tax,
    profit: netReceipts - tally.used - tally.waste - spoilage,
    cashDelta: netReceipts - tally.purchases,
    cash: state.cash,
  }
}

export function sumReports(reports: DailyReport[]): DailyReport | undefined {
  const last = reports.at(-1)
  if (!last) return undefined
  const sum = { ...last, sales: {}, lost: 0, used: 0, waste: 0, purchases: 0, stars: 0, reviewCount: 0,
    sold: 0, revenue: 0, spoilage: 0, overhead: 0, wages: 0, tax: 0, profit: 0, cashDelta: 0 } satisfies DailyReport
  const totals: DailyReport = sum
  const keys = ['lost', 'used', 'waste', 'purchases', 'stars', 'reviewCount', 'sold', 'revenue',
    'spoilage', 'overhead', 'wages', 'tax', 'profit', 'cashDelta'] as const
  for (const report of reports) {
    for (const key of keys) totals[key] += report[key]
    for (const [dish, line] of Object.entries(report.sales) as [MenuId, { count: number; revenue: number }][]) {
      const previous = totals.sales[dish] ?? { count: 0, revenue: 0 }
      totals.sales[dish] = { count: previous.count + line.count, revenue: previous.revenue + line.revenue }
    }
  }
  return totals
}
