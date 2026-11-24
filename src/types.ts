export type Level = 1 | 2 | 3 | 4
export type Stage = 'prep' | 'shop' | 'report'
export type Category = 'base' | 'seasoning' | 'topping' | 'crunch' | 'pack'
export type IngredientId =
  | 'rice' | 'kumquat' | 'shrimpSalt' | 'chili' | 'oil' | 'mango' | 'cilantro'
  | 'egg' | 'peanut' | 'shallot' | 'redBeef' | 'blackBeef' | 'chicken'
  | 'tamarind' | 'blackSauce' | 'squid' | 'pack'
export type MenuId = 'salt' | 'classic' | 'eggs' | 'beef' | 'tamarind' | 'mixed' | 'squid'
export type Inventory = Record<IngredientId, number>
export type Recipe = Partial<Inventory>
export type Heat = 0 | 1 | 2 | 3
export type Stars = 1 | 2 | 3 | 4 | 5
export type Packaging = 'bag'
export type ReplyId = 'polite' | 'friendly' | 'voucher'
export type MissionKind = 'orders' | 'perfect' | 'quick' | 'good'
export type SpecialKind = 'perfect' | 'crispy'
export type DayRulesId = 'legacy-240' | 'short-105'
export type CloseReason = 'time' | 'queue-cleared' | 'manual'

export interface HighlightVisit {
  kind: 'special' | 'story' | 'group'
  profile: number
  atMs: number
  status: 'pending' | 'arrived' | 'skipped'
  storyStage?: number
  specialKind?: SpecialKind
}

export interface Reward {
  cash: number
  xp: number
}

export interface DailyMission extends Reward {
  kind: MissionKind
  target: number
  progress: number
  rewarded: boolean
}

export interface DailyActivity {
  day: number
  missions: DailyMission[]
  highlight: HighlightVisit | null
}

export interface StoryProgress {
  stage: number
  lastVisitDay: number
}

export interface StoryChapter {
  quantity: 1 | 2 | 3
  greeting: string
  goodReply: string
  poorReply: string
}

export interface Ingredient {
  name: string
  short: string
  level: Level
  category: Category
  cost: number
  fresh?: true
}

export interface MarketPack {
  id: string
  name: string
  detail: string
  items: Recipe
}

export interface MenuItem {
  name: string
  note: string
  level: Level
  icon: IngredientId
  recipe: Recipe
}

export interface MenuSetting {
  enabled: boolean
  price: number
}

export interface Order {
  dish: MenuId
  quantity: 1 | 2 | 3
  // Price and recipe describe one bag.
  price: number
  recipe: Recipe
  heat?: Heat
  extraMango: boolean
  noCilantro: boolean
  pricey: boolean
  extra?: 'rice' | 'kumquat' | 'shrimpSalt' | 'chili'
}

export type SeasoningId = 'kumquat' | 'shrimpSalt' | 'chili' | 'oil' | 'tamarind' | 'blackSauce'
export type Coating = Partial<Record<Exclude<IngredientId, 'rice' | 'pack'>, number[]>>
export type IssueKind = 'missing' | 'extra' | 'uneven' | 'heat' | 'soggy' | 'sequence' | 'final-mix' | 'slow' | 'price'
export interface OrderIssue { kind: IssueKind; ingredient?: IngredientId }
export interface PortionDetails { recipe: Recipe; heat: Heat; issues: OrderIssue[] }
export interface PortionAssessment { stars: Stars; text: string; details?: PortionDetails }

export interface Customer {
  id: number
  profile: number
  arrivalMs: number
  patienceMs: number
  order: Order
  servedPortions: PortionAssessment[]
  storyStage?: number
  special?: SpecialKind
}

export type DepartureReason = 'priceRefusal' | 'timeout' | 'closed'

export interface Review {
  customerId: number
  profile: number
  day: number
  stars: Stars
  text: string
  departureReason?: DepartureReason
  reply?: ReplyId
  details?: { order: Pick<Order, 'dish' | 'recipe' | 'heat' | 'extra' | 'quantity' | 'noCilantro' | 'extraMango'>; portions: Array<PortionDetails | null> }
}

export interface Bowl {
  ingredients: Recipe
  heat: Heat
  mixMs: number
  mixing: boolean
  finalMixed: boolean
  pack: Packaging | null
  sequenceErrors: number
  soggy: boolean
  coating?: Coating
  crunchFolds?: number
  evenCuePlayed?: true
}

export interface SalesLine {
  count: number
  revenue: number
}

export interface DayTally {
  sales: Partial<Record<MenuId, SalesLine>>
  lost: number
  used: number
  waste: number
  purchases: number
  stars: number
  reviewCount: number
  completedOrders: number
  tips: number
  xpEarned: number
}

export interface Shift {
  elapsedMs: number
  nextArrivalMs: number
  queue: Customer[]
  activeId: number | null
  bowl: Bowl
  directBowl?: true
}

export interface DailyReport extends DayTally {
  missions: DailyMission[]
  day: number
  closedAt?: number
  endReason: CloseReason
  level: Level
  sold: number
  revenue: number
  spoilage: number
  overhead: number
  wages: number
  tax: number
  profit: number
  cashDelta: number
  cash: number
}

export interface GameState {
  version: 9
  dayRules: DayRulesId
  tutorialStep?: number
  phase: Stage
  day: number
  cash: number
  reputation: number
  level: Level
  inventory: Inventory
  menu: Record<MenuId, MenuSetting>
  reviews: Review[]
  reports: DailyReport[]
  staff: boolean
  muted: boolean
  nextCustomerId: number
  tally: DayTally
  shift: Shift | null
  daily: DailyActivity | null
  stories: Record<number, StoryProgress>
}
