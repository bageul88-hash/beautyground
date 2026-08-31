import { supabase } from './supabase'
import type { MissionMilestone } from './types'

// 활동 미션(참여 리워드) — 관리자가 /admin/missions에서 만든 미션을 유저 화면에 노출하고 적립을 처리한다.
// Vercel 함수가 12/12로 꽉 차 새 API 라우트를 못 만들기 때문에, 기존 파트너 기능들과 같은 방식으로
// Supabase RPC(security definer)를 쓴다. 적립 판정·중복 방지는 전부 DB 함수(claim_mission) 안에서 처리.

export interface MyMission {
  id: string
  key: string
  title: string
  description: string | null
  icon: string | null
  type: 'daily' | 'streak' | 'cumulative' | 'once'
  metric: string
  target_value: number
  reward_points: number
  milestones: MissionMilestone[]
  reward_note: string | null
  max_per_day: number
  cooldown_sec: number
  current_value: number
  claim_count: number
  awarded_points: number
  last_claim_at: string | null
  completed_at: string | null
}

export interface ClaimResult {
  awarded: number
  total_awarded: number
  balance: number
  message: string
}

export async function getMyMissions(): Promise<MyMission[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  const { data, error } = await supabase.rpc('get_my_missions')
  if (error) return []
  return (data ?? []) as MyMission[]
}

// p_value: 걸음수·시청분처럼 누적값을 보고하는 미션은 실제 값, 출석·일기처럼 1회성이면 1.
export async function claimMission(key: string, value = 1): Promise<ClaimResult | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data, error } = await supabase.rpc('claim_mission', { p_key: key, p_value: value })
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  return (row ?? null) as ClaimResult | null
}

// 미션의 남은 목표까지 진행률(0~1). 구간 보상이 있으면 마지막 구간을 기준으로 계산한다.
export function missionProgressRatio(m: MyMission): number {
  const goal = m.milestones.length > 0
    ? Math.max(...m.milestones.map((s) => s.value))
    : m.target_value
  if (goal <= 0) return 0
  return Math.min(m.current_value / goal, 1)
}

// 다음에 받을 수 있는 구간 (없으면 null = 오늘 다 받음)
export function nextMilestone(m: MyMission): MissionMilestone | null {
  const remaining = m.milestones
    .filter((s) => s.value > m.current_value)
    .sort((a, b) => a.value - b.value)
  return remaining[0] ?? null
}

// 오늘 이 미션에서 더 받을 수 있는 포인트 총합
export function remainingPoints(m: MyMission): number {
  if (m.milestones.length > 0) {
    return m.milestones
      .filter((s) => s.value > m.current_value)
      .reduce((sum, s) => sum + s.points, 0)
  }
  return m.current_value >= m.target_value ? 0 : m.reward_points
}
