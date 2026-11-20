import { engagementRules, regularStories, shiftPolicies, specialChallenges } from './data.ts'
import { awardBonus } from './economy.ts'
import type { Bowl, Customer, DailyActivity, DailyMission, DayRulesId, GameState, MissionKind, Stars, StoryProgress } from './types.ts'

export function getShiftRules(state: Pick<GameState, 'dayRules'>) {
  return shiftPolicies[state.dayRules]
}

export function createStories(): Record<number, StoryProgress> {
  return Object.fromEntries(Object.keys(regularStories).map(profile => [profile, { stage: 0, lastVisitDay: 0 }]))
}

export function createDailyActivity(day: number, level: number, dayRules: DayRulesId = 'short-105'): DailyActivity {
  const rules = shiftPolicies[dayRules]
  const quality = day === 1 ? 'perfect' : engagementRules.qualityRotation[(day - 2) % engagementRules.qualityRotation.length]
  const targets: Record<MissionKind, number> = { orders: 0, ...rules.qualityTargets }
  const orders: DailyMission = {
    kind: 'orders', target: day === 1 ? engagementRules.firstDayOrderTarget : rules.orderTargets[level - 1],
    progress: 0, rewarded: false, ...engagementRules.orderReward,
  }
  const second: DailyMission = {
    kind: quality, target: day === 1 ? engagementRules.firstDayPerfectTarget : targets[quality],
    progress: 0, rewarded: false, ...engagementRules.qualityReward,
  }
  return { day, missions: [orders, second], highlight: null }
}

export function currentShiftPhase(state: GameState) {
  if (!state.daily) return { id: 'normal', label: 'Ca bán', intervalFactor: 1 }
  const rules = getShiftRules(state)
  const elapsed = state.shift?.elapsedMs ?? 0
  if (elapsed >= rules.arrivalsEndMs) return rules.rhythm[5]
  if (state.day < engagementRules.regularStartDay) return { ...rules.rhythm[0], label: 'Ca đầu nhẹ nhàng' }
  return rules.rhythm.find(phase => elapsed < phase.untilMs) ?? rules.rhythm[5]
}

export function shiftNotice(state: GameState): { id: 'warning' | 'special'; label: string } | null {
  const elapsed = state.shift?.elapsedMs ?? 0
  const rules = getShiftRules(state)
  const highlight = state.daily?.highlight
  if (highlight?.status === 'pending' && elapsed >= highlight.atMs - engagementRules.specialWarningMs
    && elapsed < rules.highlightEndMs) return { id: 'special', label: 'Khách mời sắp ghé' }
  const rushStart = rules.rhythm[1].untilMs
  if (state.daily && state.day >= engagementRules.regularStartDay && elapsed >= rushStart - engagementRules.rushWarningMs && elapsed < rushStart) {
    const seconds = Math.ceil((rushStart - elapsed) / 1000)
    return { id: 'warning', label: `Tăng tốc sau ${seconds}s` }
  }
  return null
}

export function completeVisit(state: GameState, customer: Customer, stars: Stars, patience: number, bowl: Bowl): string | undefined {
  let reply: string | undefined
  if (customer.storyStage !== undefined) {
    const story = regularStories[customer.profile]
    const progress = state.stories[customer.profile]
    const chapter = story?.chapters[customer.storyStage]
    if (chapter && progress?.stage === customer.storyStage) {
      progress.stage++
      progress.lastVisitDay = state.day
      reply = stars >= 4 ? chapter.goodReply : chapter.poorReply
      if (stars >= 4) {
        const reward = progress.stage === story.chapters.length ? engagementRules.storyFinalReward : engagementRules.storyReward
        awardBonus(state, reward.cash, reward.xp)
      }
    }
  }
  if (customer.special) {
    const crunchy = (['peanut', 'shallot'] as const).filter(id => customer.order.recipe[id])
    const crispy = crunchy.length > 0 && crunchy.every(id => bowl.ingredients[id] === customer.order.recipe[id])
      && !bowl.soggy && bowl.finalMixed && stars >= 4
    const passed = customer.special === 'perfect' ? stars === 5 : crispy
    if (passed) {
      const reward = specialChallenges[customer.special]
      awardBonus(state, reward.cash, reward.xp)
      reply = 'Đúng gu mình! Tiệm xứng đáng được thưởng thêm!'
    } else reply = 'Lần này chưa trúng thử thách, hẹn tiệm lần sau nha!'
  }
  const matched: Record<MissionKind, boolean> = {
    orders: true, perfect: stars === 5, quick: stars >= 3 && patience >= .5, good: stars >= 4,
  }
  for (const mission of state.daily?.missions ?? []) {
    if (mission.rewarded || !matched[mission.kind]) continue
    mission.progress = Math.min(mission.target, mission.progress + 1)
    if (mission.progress === mission.target) {
      mission.rewarded = true
      awardBonus(state, mission.cash, mission.xp)
    }
  }
  return reply
}
