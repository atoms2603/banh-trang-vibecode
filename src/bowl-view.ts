import { food } from './art.ts'
import { bowlZones, crunchIds, isSeasoning, seasoningIds, seasoningsReady } from './coating.ts'
import { ingredientIds } from './data.ts'
import type { Bowl, Recipe, SeasoningId } from './types.ts'

export interface BowlPreview { id: SeasoningId; weights: number[] }
export interface BowlFlip { zone: number; dx: number; dy: number }

function point(angle: number, radius: number): string {
  return `${(radius * Math.cos(angle)).toFixed(2)} ${(radius * Math.sin(angle)).toFixed(2)}`
}

const tones = ['#fffdf6', '#f7f4e9', '#fdfaf0', '#e3e6db', '#f1efe0']

const stripsByZone = Array.from({ length: bowlZones }, (_, zone) => Array.from({ length: 38 }, (_, i) => {
  const repeatable = (seed: number) => ((zone * 269 + i * seed + i * i * 13) % 997) / 997
  const angle = zone * Math.PI / 3 + (repeatable(73) - .5) * Math.PI / 3
  const radius = 2 + Math.sqrt(repeatable(199)) * 67
  const half = 11 + repeatable(193) * 18
  const width = 1.15 + repeatable(71) * 1.65
  const bend = repeatable(137) * 5
  const turn = 360 * repeatable(359)
  const outline = `M${-half} ${-width} Q${-half * .42} ${-width - bend} ${half * .08} ${-width}
    T${half} ${-width * .72} L${half * .97} ${width * .5} Q${half * .48} ${width * 1.65} ${half * .08} ${width * .82}
    T${-half * .96} ${width * .6}Z`
  const saltSpecks = i % 3 === 0 ? '<path class="bowl-salt-specks" d="M-5 0h.1 M2 1h.1 M8 -1h.1"/>' : ''
  return `<g transform="translate(${point(angle, radius)}) rotate(${turn.toFixed(1)})">
    <path class="bowl-rice-strip" d="${outline}" style="--rice-tone:${tones[(i + zone * 2) % tones.length]}"/>
    ${saltSpecks}
  </g>`
}))

const glazeColors = {
  kumquat: [239, 189, 85], chili: [195, 60, 35], oil: [226, 157, 80], tamarind: [132, 72, 44], blackSauce: [80, 51, 43],
} as const

function seasoningLayers(bowl?: Bowl, preview?: BowlPreview): Array<{ glaze: string; strength: number; salt: number }> {
  const previewTotal = preview?.weights.reduce((sum, weight) => sum + weight, 0) ?? 0
  return Array.from({ length: bowlZones }, (_, zone) => {
    const dose = (id: SeasoningId) => (bowl?.coating?.[id]?.[zone] ?? 0)
      + (preview?.id === id && previewTotal ? preview.weights[zone] / previewTotal : 0)
    let strength = 0, red = 0, green = 0, blue = 0
    for (const id of Object.keys(glazeColors) as Array<keyof typeof glazeColors>) {
      const weight = dose(id) * (id === 'oil' ? .45 : 1)
      strength += weight
      red += glazeColors[id][0] * weight
      green += glazeColors[id][1] * weight
      blue += glazeColors[id][2] * weight
    }
    const glaze = strength ? `rgb(${Math.round(red / strength)} ${Math.round(green / strength)} ${Math.round(blue / strength)})` : '#efbd55'
    return { glaze, strength: Math.min(82, strength * 145), salt: Math.min(1, dose('shrimpSalt') * 2.2) }
  })
}

function toppingArt(bowl: Bowl | undefined, zone: number): string {
  return ingredientIds.map((id, index) => {
    if (id === 'rice' || id === 'pack' || isSeasoning(id)) return ''
    const portions = Math.min(3, bowl?.coating?.[id]?.[zone] ?? 0)
    return Array.from({ length: portions }, (_, i) => {
      const angle = zone * Math.PI / 3 + ((index + i * 2) % 5 - 2) * .2
      const radius = 25 + (index * 17 + i * 19) % 38
      const x = (Math.cos(angle) * radius - 13).toFixed(1)
      const y = (Math.sin(angle) * radius - 13).toFixed(1)
      return food(id).replace('class="food-art"', `data-bowl-topping="${id}" x="${x}" y="${y}" width="26" height="26"`)
    }).join('')
  }).join('')
}

function bowlFood(bowl?: Bowl): string {
  const rice = bowl?.ingredients.rice ?? 0
  if (!rice) return ''
  return '<ellipse cx="2" cy="5" rx="65" ry="58" fill="#536362" opacity=".18"/>'
    + seasoningLayers(bowl).map(({ glaze, strength, salt }, zone) => `<g data-bowl-zone style="--glaze:${glaze};--glaze-strength:${strength.toFixed(1)}%;--salt:${salt.toFixed(2)}">
      ${stripsByZone[zone].slice(0, 17 + rice * 7).join('')}
      ${toppingArt(bowl, zone)}
    </g>`).join('')
}

export function paintBowlFood(root: Element, bowl?: Bowl, preview?: BowlPreview, flip?: BowlFlip): void {
  const layers = seasoningLayers(bowl, preview)
  const zones = root.querySelectorAll<SVGGElement>('[data-bowl-zone]')
  zones.forEach((zone, index) => {
    zone.style.setProperty('--glaze', layers[index].glaze)
    zone.style.setProperty('--glaze-strength', `${layers[index].strength.toFixed(1)}%`)
    zone.style.setProperty('--salt', layers[index].salt.toFixed(2))
  })
  if (!flip || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const group = zones[flip.zone]
  if (!group) return
  const angle = flip.zone * Math.PI / 3
  const turn = (Math.cos(angle) * flip.dy - Math.sin(angle) * flip.dx) * 16
  for (const animation of group.getAnimations()) animation.cancel()
  group.animate([
    { transform: `translate(${flip.dx * 8}px, ${flip.dy * 8}px) rotate(${turn}deg) scale(1.09)` },
    { transform: 'none' },
  ], { duration: 210, easing: 'ease-out' })
}

export function coatingLabel(bowl?: Bowl, recipe: Recipe = {}): string {
  if (!bowl?.ingredients.rice) return 'Kéo bánh tráng vào thau'
  if (bowl.soggy) return 'Đồ giòn bị ỉu · lần sau rắc cuối'
  if (seasoningIds.some(id => (bowl.ingredients[id] ?? 0) < (recipe[id] ?? 0))) return 'Rê gia vị qua mặt bánh'
  if (!seasoningsReady(bowl, recipe)) return 'Còn chỗ nhạt · kéo để đảo'
  if (crunchIds.some(id => (bowl.ingredients[id] ?? 0) < (recipe[id] ?? 0))) return 'Rắc đồ giòn sau cùng'
  if (ingredientIds.some(id => id !== 'pack' && (bowl.ingredients[id] ?? 0) < (recipe[id] ?? 0))) return 'Thêm nguyên liệu theo phiếu'
  return 'Gia vị đã rải đều'
}

export function directBowlArt(bowl?: Bowl, guide = false): string {
  return `<svg class="bowl-top" data-direct-surface viewBox="-100 -100 200 200" aria-hidden="true">
    <defs><radialGradient id="steel-bowl"><stop stop-color="#849899"/><stop offset=".81" stop-color="#adbdba"/><stop offset="1" stop-color="#d8dfd6"/></radialGradient>
    <clipPath id="bowl-interior"><circle r="86"/></clipPath></defs>
    <circle r="97" fill="#afad9a"/><circle r="95" fill="#e9eee4" stroke="#718584" stroke-width="2"/>
    <circle r="87" fill="url(#steel-bowl)" stroke="#8fa4a2" stroke-width="2"/>
    <path d="M-70 -45A83 83 0 0 1 22 -80M51 65A83 83 0 0 1 14 82" fill="none" stroke="#e9efdf" stroke-width="3" stroke-linecap="round"/>
    <g clip-path="url(#bowl-interior)" data-bowl-food>${bowlFood(bowl)}</g>
    ${guide ? '<path class="bowl-spread-guide" d="M-53 37 Q-84 -37 -18 -58 T61 -14 T26 56 m-5 -9 5 9 10 1"/>' : ''}
    <circle data-bowl-cursor r="5" fill="#fff6dd" stroke="#725740" stroke-width="2" visibility="hidden"/>
  </svg>`
}
