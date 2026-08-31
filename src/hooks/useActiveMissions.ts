import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// 지금 켜져 있는 활동 미션 목록.
//
// 참여형 기능(활동 미션·살아가는 이야기)의 '스위치' 역할을 한다.
// 관리자(/admin/missions)에서 미션을 하나도 켜지 않으면 홈·마이페이지의 진입구가 아예 렌더되지 않으므로,
// 코드가 배포돼 있어도 쇼핑몰 화면은 그대로다. 실제로 열 때는 미션을 켜기만 하면 된다.
// (기능 자체는 /app/missions · /app/diary 주소로 언제든 직접 들어가 확인할 수 있다)

export interface ActiveMission {
  key: string
  title: string
  icon: string | null
}

export function useActiveMissions(): { missions: ActiveMission[]; loading: boolean } {
  const [missions, setMissions] = useState<ActiveMission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data } = await supabase
        .from('missions')
        .select('key, title, icon')
        .eq('active', true)
        .order('sort_order')
      if (!alive) return
      setMissions((data ?? []) as ActiveMission[])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  return { missions, loading }
}
