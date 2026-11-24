import type { Bowl, Coating, IngredientId, Order, Recipe, SeasoningId } from './types.ts'

export const bowlZones = 6
export const seasoningIds: readonly SeasoningId[] = ['kumquat', 'shrimpSalt', 'chili', 'oil', 'tamarind', 'blackSauce']
export const isSeasoning = (id: IngredientId): id is SeasoningId => (seasoningIds as readonly IngredientId[]).includes(id)
export const extraNotes = { rice: 'Nhiều bánh', kumquat: 'Nhiều chua', shrimpSalt: 'Nhiều muối', chili: 'Nhiều cay' } satisfies Record<NonNullable<Order['extra']>, string>
export const extraPortionIds = ['rice', 'kumquat', 'shrimpSalt', 'chili'] as const
export const saltIngredients = ['rice', 'kumquat', 'shrimpSalt'] as const
export const crunchIds = ['peanut', 'shallot'] as const
export const emptyZones = () => Array<number>(bowlZones).fill(0)
export const wrapZone = (zone: number) => (zone + bowlZones) % bowlZones

export interface BowlPoint { x: number; y: number }

export function bowlZone({ x, y }: BowlPoint): number {
  return wrapZone(Math.floor((Math.atan2(y, x) + Math.PI / bowlZones) / (2 * Math.PI / bowlZones)))
}

export function zoneIsEven(amounts: number[]): boolean {
  const total = amounts.reduce((sum, amount) => sum + amount, 0)
  return total > 0 && Math.max(...amounts) <= .4 * total + 1e-9
    && amounts.filter(amount => amount >= .08 * total - 1e-9).length >= 4
}

export function foldCoating(coating: Coating, zone: number): void {
  const neighbors = [wrapZone(zone - 1), zone, wrapZone(zone + 1)]
  for (const id of seasoningIds) {
    const amounts = coating[id]
    if (!amounts) continue
    const mean = neighbors.reduce((sum, i) => sum + amounts[i], 0) / neighbors.length
    for (const i of neighbors) amounts[i] += (mean - amounts[i]) / 3
  }
}

export function pourCoating(coating: Coating, id: keyof Coating, weights: number[], fallback: number): void {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const amounts = coating[id] ??= emptyZones()
  if (total > 0) weights.forEach((weight, zone) => { amounts[zone] += weight / total })
  else amounts[fallback]++
}

export function seasoningsReady(bowl: Bowl, recipe: Recipe): boolean {
  return seasoningIds.every(id => !recipe[id] || ((bowl.ingredients[id] ?? 0) >= recipe[id] && zoneIsEven(bowl.coating?.[id] ?? [])))
}

// Fine samples keep fast and slow movement through the same path comparable.
export function traceBowl(from: BowlPoint, to: BowlPoint, sample: (point: BowlPoint, distance: number) => void): void {
  const dx = to.x - from.x, dy = to.y - from.y
  const distance = Math.hypot(dx, dy)
  if (!distance) return
  const steps = Math.ceil(distance / .08)
  for (let i = 0; i < steps; i++) {
    const point = { x: from.x + dx * (i + .5) / steps, y: from.y + dy * (i + .5) / steps }
    if (Math.hypot(point.x, point.y) <= 1) sample(point, distance / steps)
  }
}
