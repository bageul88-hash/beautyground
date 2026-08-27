import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconCheck } from '@tabler/icons-react'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import { supabase } from '../lib/supabase'
import { subscribeToPush } from '../lib/pushNotifications'

// 매장(호스트) QR 팔로우 랜딩 — 매장 계산대·매대에 QR로 붙여두고, 방송을 직접 보고 있지 않은
// 손님도 미리 팔로우해두면 다음 라이브 시작 때 웹푸시가 가도록(2026-08-27, host_follows 신설).
// 브랜드 팔로우(AppBrandDetail)와 달리 별도 상품 목록 없이 팔로우 유도 하나에 집중한 랜딩.
export default function AppHostFollow() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [hostName, setHostName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!id) { setLoading(false); return }
      const { data } = await supabase.from('hosts').select('name,status').eq('id', id).eq('status', 'active').maybeSingle()
      if (!active) return
      setHostName((data?.name as string) ?? null)

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: followRow } = await supabase
          .from('host_follows')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('host_id', id)
          .maybeSingle()
        if (active) setIsFollowing(!!followRow)
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [id])

  const follow = async () => {
    if (!id || busy) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/app/login', { state: { from: `/app/host/${id}/follow` } })
      return
    }
    setBusy(true)
    const { error } = await supabase.from('host_follows').insert([{ user_id: session.user.id, host_id: id }])
    setBusy(false)
    if (error) return
    setIsFollowing(true)
    void subscribeToPush()
  }

  if (!loading && !hostName) {
    return (
      <AppFrame>
        <BackHeader title="매장" />
        <div className="px-5 py-16 text-center">
          <p className="text-[14px] text-ink-soft">매장 정보를 찾을 수 없습니다.</p>
        </div>
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      <BackHeader title="매장 팔로우" />
      <div className="px-5 pt-10 pb-16 flex flex-col items-center text-center">
        <img src="/images/bg-logo-mark.png" alt="" className="w-16 h-16 object-contain mb-5" />
        {loading ? (
          <p className="text-[14px] text-ink-faint">불러오는 중…</p>
        ) : (
          <>
            <h1 className="text-[19px] font-bold text-ink mb-2">{hostName}</h1>
            <p className="text-[13.5px] text-ink-soft leading-relaxed mb-8">
              팔로우해두면 이 매장이 다음 라이브 방송을 시작할 때<br />바로 알림을 보내드려요.
            </p>
            <button
              type="button"
              onClick={follow}
              disabled={isFollowing || busy}
              className={`w-full max-w-[280px] rounded-control py-4 text-[15px] font-bold flex items-center justify-center gap-2 ${
                isFollowing ? 'bg-quiet text-ink-soft' : 'bg-ink text-paper'
              } disabled:opacity-70`}
            >
              {isFollowing ? (
                <>
                  <IconCheck size={18} /> 팔로우 완료
                </>
              ) : busy ? '처리 중…' : '팔로우하기'}
            </button>
            {isFollowing && (
              <p className="text-[12px] text-ink-faint mt-4">다음 라이브 시작 알림을 보내드릴게요.</p>
            )}
          </>
        )}
      </div>
    </AppFrame>
  )
}
