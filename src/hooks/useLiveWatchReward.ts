import { useEffect, useRef, useState } from 'react'
import { getMyMissions, claimMission } from '../lib/missions'

// 라이브 시청 시간 적립 — 방송을 보는 동안 쌓인 분(minute)을 live_watch 미션에 보고한다.
//
// 규칙
//  - 방송이 실제로 '진행 중'일 때만 센다(예정·종료 화면에서는 세지 않는다).
//  - 탭이 백그라운드면 세지 않는다. 틀어놓고 자리를 비운 시간까지 주면 적립 의미가 없다.
//  - 하루 누적값 기준이라, 오늘 이미 쌓인 분(base)에 이번 세션 분을 더해 보고한다.
//    claim_mission이 누적형 지표를 greatest()로 처리하므로 세션이 나뉘어도 값이 뒤로 가지 않는다.
//  - live_watch 미션이 꺼져 있으면 타이머 자체를 돌리지 않는다.

const TICK_MS = 10_000

export interface LiveWatchReward {
  minutes: number       // 오늘 누적 시청 분(보고 기준)
  awarded: number       // 방금 받은 포인트(토스트용, 표시 후 0으로 되돌아감)
}

export function useLiveWatchReward(watching: boolean): LiveWatchReward {
  const [minutes, setMinutes] = useState(0)
  const [awarded, setAwarded] = useState(0)

  const enabledRef = useRef(false)      // live_watch 미션이 켜져 있는지
  const baseRef = useRef(0)             // 오늘 이미 쌓인 분
  const secondsRef = useRef(0)          // 이번 세션에서 실제로 본 초
  const reportedRef = useRef(0)         // 마지막으로 보고한 분

  // 미션 활성 여부와 오늘 누적값을 먼저 확인
  useEffect(() => {
    let alive = true
    void (async () => {
      const ms = await getMyMissions()
      const m = ms.find((x) => x.metric === 'live_minutes')
      if (!alive || !m) return
      enabledRef.current = true
      baseRef.current = m.current_value
      reportedRef.current = m.current_value
      setMinutes(m.current_value)
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!watching) return
    const timer = setInterval(() => {
      if (!enabledRef.current) return
      if (document.visibilityState !== 'visible') return

      secondsRef.current += TICK_MS / 1000
      const total = baseRef.current + Math.floor(secondsRef.current / 60)
      if (total <= reportedRef.current) return

      reportedRef.current = total
      setMinutes(total)
      void claimMission('live_watch', total).then((res) => {
        if (res && res.awarded > 0) {
          setAwarded(res.awarded)
          setTimeout(() => setAwarded(0), 3000)
        }
      })
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [watching])

  return { minutes, awarded }
}
