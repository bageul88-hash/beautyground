import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import AppFrame from '../components/layout/AppFrame'
import { supabase } from '../lib/supabase'
import {
  getMyPointsBalance,
  getMyValidCoupons,
  claimKakaoFriendBonus,
  hasClaimedKakaoFriendBonus,
  type ValidCoupon,
} from '../lib/rewards'
import { BENEFIT_MIN_ORDER_AMOUNT, KAKAO_CHANNEL_URL } from '../constants'

// 회원 혜택 모음 — 메인 상단 프로모션 띠(PromoBar)와 마이페이지 메뉴에서 여기로 연결된다.
// ① 회원가입 축하 적립금(자동 지급, supabase/signup_bonus.sql) ② 카카오 친구추가 혜택(자율신고 방식,
// supabase/kakao_friend_bonus.sql — 카카오 비즈니스 채널 친구확인 API 인증 전까지 임시) ③ 보유 적립금·쿠폰함.
export default function AppBenefits() {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [points, setPoints] = useState(0)
  const [coupons, setCoupons] = useState<ValidCoupon[]>([])
  const [kakaoClaimed, setKakaoClaimed] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [toast, setToast] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoggedIn(false); return }
    setLoggedIn(true)
    const [pts, cps, claimed] = await Promise.all([
      getMyPointsBalance(),
      getMyValidCoupons(),
      hasClaimedKakaoFriendBonus(),
    ])
    setPoints(pts)
    setCoupons(cps)
    setKakaoClaimed(claimed)
  }

  useEffect(() => {
    load()
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }

  const handleClaimKakao = async () => {
    setClaiming(true)
    try {
      const granted = await claimKakaoFriendBonus()
      if (granted) {
        showToast('무료배송 쿠폰 + 3,000P 지급되었습니다')
        await load()
      } else {
        showToast('이미 받은 혜택이에요')
        setKakaoClaimed(true)
      }
    } catch {
      showToast('혜택 받기에 실패했습니다. 다시 시도해 주세요')
    } finally {
      setClaiming(false)
    }
  }

  const minOrderText = `${BENEFIT_MIN_ORDER_AMOUNT.toLocaleString('ko-KR')}원 이상 구매 시 사용 가능`

  return (
    <AppFrame>
      <BackHeader title="혜택" />

      {loggedIn === false ? (
        <div className="px-5 py-16 text-center">
          <p className="text-[14px] text-ink-soft mb-5">로그인하면 혜택을 확인하고 받을 수 있어요.</p>
          <button
            onClick={() => navigate('/app/login', { state: { from: '/app/benefits' } })}
            className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
          >
            로그인
          </button>
          <p className="text-[12.5px] text-ink-faint mt-4">
            아직 회원이 아니신가요?{' '}
            <button onClick={() => navigate('/app/signup')} className="text-ink font-bold underline focus:outline-none focus-visible:shadow-ring">
              회원가입하고 3,000P 받기
            </button>
          </p>
        </div>
      ) : (
        <div className="px-4 py-5 space-y-3">
          {/* ① 회원가입 축하 적립금 — 가입 시 자동 지급, 여기서는 안내만 */}
          <div className="border border-rule px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">회원가입 축하 적립금</h2>
              <span className="text-[13px] font-bold tabular-nums text-ink bg-signal-yellow px-2 py-0.5">3,000P</span>
            </div>
            <p className="text-[12.5px] text-ink-soft mt-2 leading-relaxed">
              회원가입 시 자동으로 지급돼요. {minOrderText}(지급일로부터 30일 이내).
            </p>
          </div>

          {/* ② 카카오 친구추가 혜택 */}
          <div className="border border-rule px-4 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-ink">카카오 채널 친구추가 혜택</h2>
              {kakaoClaimed && (
                <span className="flex items-center gap-1 text-[12px] font-bold text-ink-soft">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]" aria-hidden="true">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                  받았어요
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-ink-soft mt-2 leading-relaxed">
              무료배송 쿠폰 + 3,000P를 드려요. {minOrderText}(지급일로부터 30일 이내).
            </p>

            {!kakaoClaimed && (
              <div className="flex gap-2 mt-3.5">
                <a
                  href={KAKAO_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-control border border-rule text-ink font-bold text-[13px] py-3 focus:outline-none focus-visible:shadow-ring"
                >
                  <span className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-full bg-[#FEE500] shrink-0" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#3C1E1E" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.79 5 4.5 6.34-.2.72-.72 2.62-.82 3.03-.13.5.18.5.39.36.16-.11 2.53-1.72 3.56-2.42.44.06.9.09 1.37.09 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5Z" />
                    </svg>
                  </span>
                  채널 추가하기
                </a>
                <button
                  onClick={handleClaimKakao}
                  disabled={claiming}
                  className="flex-1 rounded-control bg-ink text-paper font-bold text-[13px] py-3 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring"
                >
                  {claiming ? '처리 중…' : '혜택 받기'}
                </button>
              </div>
            )}
            <p className="text-[11px] text-ink-faint mt-2">
              친구추가 후 &lsquo;혜택 받기&rsquo;를 눌러주세요.
            </p>
          </div>

          {/* ③ 보유 적립금 · 쿠폰함 */}
          <div className="border border-rule px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-ink">보유 적립금</span>
              <span className="text-[13px] font-bold tabular-nums text-ink">{points.toLocaleString('ko-KR')}P</span>
            </div>
          </div>

          <div className="border border-rule px-4 py-4">
            <h2 className="text-[14px] font-bold text-ink mb-3">쿠폰함 ({coupons.length})</h2>
            {coupons.length === 0 ? (
              <p className="text-[13px] text-ink-faint py-2">보유 중인 쿠폰이 없어요.</p>
            ) : (
              <div className="space-y-2.5">
                {coupons.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b border-rule pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <p className="text-[13px] font-bold text-ink">{c.label}</p>
                      <p className="text-[11px] text-ink-faint mt-0.5">
                        {c.minOrderAmount > 0 ? `${c.minOrderAmount.toLocaleString('ko-KR')}원 이상 · ` : ''}
                        {new Date(c.expiresAt).toLocaleDateString('ko-KR')}까지
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 rounded-control bg-ink text-paper text-[13px] px-4 py-2.5" role="status">
          {toast}
        </div>
      )}
    </AppFrame>
  )
}
