import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resolveActiveSeason, type Season } from '../lib/season'

export const DEFAULT_MARQUEE_ITEMS = [
  '🎁 회원가입하면 다양한 혜택이 준비되어 있어요',
  '💛 뷰티그라운드 셀렉트 신상품을 만나보세요',
]

// 홈 화면 공지 마퀴 문구·현재 시즌(계절 추천 기준)을 담는 싱글턴 1행.
export function useHomeSettings() {
  const [marqueeItems, setMarqueeItems] = useState<string[]>(DEFAULT_MARQUEE_ITEMS)
  const [activeSeasonSetting, setActiveSeasonSetting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('home_settings')
        .select('marquee_items, active_season')
        .eq('id', 1)
        .maybeSingle()
      if (!active) return
      if (data?.marquee_items && data.marquee_items.length > 0) {
        setMarqueeItems(data.marquee_items)
      }
      setActiveSeasonSetting(data?.active_season ?? null)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  const activeSeason: Season = resolveActiveSeason(activeSeasonSetting)

  return { marqueeItems, activeSeasonSetting, activeSeason, loading }
}
