import { ingredients } from './data.ts'
import { currentCustomer, mixProgress } from './game.ts'
import type { GameState, IngredientId } from './types.ts'

export type CounterTab = 'seasoning' | 'topping'
export const trayPageSize = 8
export const counterTabs: Record<CounterTab, string> = { seasoning: 'Nêm', topping: 'Topping' }
const groups = {
  seasoning: ['rice', 'kumquat', 'shrimpSalt', 'chili', 'oil', 'tamarind', 'blackSauce'],
  topping: ['mango', 'cilantro', 'egg', 'redBeef', 'blackBeef', 'chicken', 'squid', 'peanut', 'shallot'],
} as const satisfies Record<string, readonly IngredientId[]>

export function ingredientTab(id: IngredientId): CounterTab {
  return id === 'pack' || (groups.seasoning as readonly IngredientId[]).includes(id) ? 'seasoning' : 'topping'
}

export function counterItems(state: GameState, tab: CounterTab): IngredientId[] {
  return groups[tab].filter(id => ingredients[id].level <= state.level)
}

export function missingIngredient(state: GameState, id: IngredientId): boolean {
  const customer = currentCustomer(state)
  const bowl = state.shift?.bowl
  return Boolean(customer && (customer.order.recipe[id] ?? 0) > (bowl?.ingredients[id] ?? 0))
}

export function initialCounterTab(state: GameState): CounterTab {
  const order = currentCustomer(state)?.order
  return mixProgress(state) >= 100 && counterItems(state, 'topping').some(id => order?.recipe[id]) ? 'topping' : 'seasoning'
}

export function counterPage(state: GameState, tab: CounterTab, requested = 0) {
  const all = counterItems(state, tab)
  const count = Math.max(1, Math.ceil(all.length / trayPageSize))
  const index = Math.max(0, Math.min(count - 1, Number.isInteger(requested) ? requested : 0))
  return { all, count, index, items: all.slice(index * trayPageSize, (index + 1) * trayPageSize) }
}

export function ingredientPage(state: GameState, id: IngredientId): number {
  return Math.max(0, Math.floor(counterItems(state, ingredientTab(id)).indexOf(id) / trayPageSize))
}
