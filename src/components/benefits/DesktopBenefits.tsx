import { useNavigate } from 'react-router-dom'
import DesktopHeader from '../layout/DesktopHeader'
import { isPushSupported } from '../../lib/pushNotifications'
import { KAKAO_CHANNEL_URL } from '../../constants'
import type { ValidCoupon } from '../../lib/rewards'

interface Props {
  loggedIn: boolean | null
  points: number
  coupons: ValidCoupon[]
  kakaoClaimed: boolean
  claiming: boolean
  pushEnabled: boolean
  pushBusy: boolean
  minOrderText: string
  onClaimKakao: () => void
  onEnablePush: () => void
}

// PC 버전 — 다른 마이페이지 연결 화면(찜·최근본상품·리뷰관리)과 동일한 1280px 폭·카드 톤 유지.
export default function DesktopBenefits({
  loggedIn,
  points,
  coupons,
  kakaoClaimed,
  claiming,
  pushEnabled,
  pushBusy,
  minOrderText,
  onClaimKakao,
  onEnablePush,
}: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-paper min-h-screen">
      <DesktopHeader />

      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <h1 className="text-[22px] font-bold text-ink mb-8">혜택</h1>

        {loggedIn === false ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-[15px] text-ink-soft mb-6">로그인하면 혜택을 확인하고 받을 수 있어요.</p>
            <button
              onClick={() => navigate('/app/login', { state: { from: '/app/benefits' } })}
              className="rounded-control bg-ink text-paper font-bold text-[14px] px-8 py-3 focus:outline-none focus-visible:shadow-ring"
            >
              로그인
            </button>
            <p className="text-[13px] text-ink-faint mt-4">
              아직 회원이 아니신가요?{' '}
              <button onClick={() => navigate('/app/signup')} className="text-ink font-bold underline focus:outline-none focus-visible:shadow-ring">
                회원가입하고 3,000P 받기
              </button>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              {/* ① 회원가입 축하 적립금 */}
              <div className="border border-rule p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-ink">회원가입 축하 적립금</h2>
                  <span className="text-[14px] font-bold tabular-nums text-ink bg-signal-yellow px-2.5 py-1">3,000P</span>
                </div>
                <p className="text-[13px] text-ink-soft mt-3 leading-relaxed">
                  회원가입 시 자동으로 지급돼요. {minOrderText}(지급일로부터 30일 이내).
                </p>
              </div>

              {/* ② 카카오 친구추가 혜택 */}
              <div className="border border-rule p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-bold text-ink">카카오 채널 친구추가 혜택</h2>
                  {kakaoClaimed && (
                    <span className="flex items-center gap-1 text-[13px] font-bold text-ink-soft">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]" aria-hidden="true">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      받았어요
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-ink-soft mt-3 leading-relaxed">
                  무료배송 쿠폰 + 3,000P를 드려요. {minOrderText}(지급일로부터 30일 이내).
                </p>

                {!kakaoClaimed && (
                  <div className="flex gap-2.5 mt-4">
                    <a
                      href={KAKAO_CHANNEL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-control border border-rule text-ink font-bold text-[13.5px] py-3 focus:outline-none focus-visible:shadow-ring"
                    >
                      <span className="inline-flex items-center justify-center w-[16px] h-[16px] rounded-full bg-[#FEE500] shrink-0" aria-hidden="true">
                        <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="#3C1E1E" d="M12 3.5C6.75 3.5 2.5 6.86 2.5 11c0 2.66 1.79 5 4.5 6.34-.2.72-.72 2.62-.82 3.03-.13.5.18.5.39.36.16-.11 2.53-1.72 3.56-2.42.44.06.9.09 1.37.09 5.25 0 9.5-3.36 9.5-7.5S17.25 3.5 12 3.5Z" />
                        </svg>
                      </span>
                      채널 추가하기
                    </a>
                    <button
                      onClick={onClaimKakao}
                      disabled={claiming}
                      className="flex-1 rounded-control bg-ink text-paper font-bold text-[13.5px] py-3 disabled:opacity-50 focus:outline-none focus-visible:shadow-ring"
                    >
                      {claiming ? '처리 중…' : '혜택 받기'}
                    </button>
                  </div>
                )}
                <p className="text-[12px] text-ink-faint mt-2.5">
                  친구추가 후 &lsquo;혜택 받기&rsquo;를 눌러주세요.
                </p>
              </div>

              {/* ③ 보유 적립금 */}
              <div className="border border-rule p-6 flex items-center justify-between">
                <span className="text-[15px] font-bold text-ink">보유 적립금</span>
                <span className="text-[15px] font-bold tabular-nums text-ink">{points.toLocaleString('ko-KR')}P</span>
              </div>
            </div>

            {/* 쿠폰함 */}
            <div className="border border-rule p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-ink">쿠폰함 ({coupons.length})</h2>
                {isPushSupported() && !pushEnabled && (
                  <button
                    onClick={onEnablePush}
                    disabled={pushBusy}
                    className="text-[13px] font-semibold text-signal-blue disabled:opacity-50"
                  >
                    {pushBusy ? '설정 중...' : '🔔 쿠폰 알림 받기'}
                  </button>
                )}
              </div>
              {coupons.length === 0 ? (
                <p className="text-[14px] text-ink-faint py-2">보유 중인 쿠폰이 없어요.</p>
              ) : (
                <div className="space-y-3">
                  {coupons.map((c) => (
                    <div key={c.id} className="border-b border-rule pb-3 last:border-0 last:pb-0">
                      {c.bannerImage && (
                        <img src={c.bannerImage} alt={c.label} className="w-full rounded-control mb-2 border border-rule" />
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[14px] font-bold text-ink">{c.label}</p>
                          <p className="text-[12px] text-ink-faint mt-0.5">
                            {c.minOrderAmount > 0 ? `${c.minOrderAmount.toLocaleString('ko-KR')}원 이상 · ` : ''}
                            {new Date(c.expiresAt).toLocaleDateString('ko-KR')}까지
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
