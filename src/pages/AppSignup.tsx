import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import DesktopAuthLayout from '../components/auth/DesktopAuthLayout'
import { useViewMode } from '../lib/viewMode'
import { supabase } from '../lib/supabase'

// 회원가입 진입 화면 — 신규 가입은 카카오만 받는다(대표님 지시 2026-08-15: 구매자는 카카오나
// 휴대폰인증으로만). 휴대폰인증은 SMS API 미도입으로 보류라 지금은 카카오만 노출.
// 네이버(api/auth-naver.ts + AppNaverCallback.tsx)·이메일(AppSignupEmail.tsx) 가입 버튼은
// 여기서 뺐을 뿐 코드 자체는 남겨둠 — 기존 이메일/비번 가입자는 AppLogin.tsx에서 계속 로그인 가능.
export default function AppSignup() {
  const location = useLocation()
  const { mode, isDesktop, toggle } = useViewMode()
  const from = (location.state as { from?: string } | null)?.from ?? '/app/mypage'
  const [notice, setNotice] = useState('')

  const handleKakao = async () => {
    setNotice('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}${from}`, scopes: 'profile_nickname' },
    })
    if (error) setNotice('카카오 로그인 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }

  const formContent = (
    <>
      <div className="rounded-control border border-rule p-6 space-y-3">
        {/* 카카오 — 공식 버튼 규격(#FEE500 배경 + 검정 85% 텍스트) */}
        <button
          type="button"
          onClick={handleKakao}
          className="w-full flex items-center justify-center gap-2 rounded-control font-bold text-[15px] py-3.5 focus:outline-none focus-visible:shadow-ring"
          style={{ backgroundColor: '#FEE500', color: 'rgba(0,0,0,0.85)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="rgba(0,0,0,0.85)"
              d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.66l-.95 3.52c-.08.31.27.56.54.38l4.19-2.79c.51.05 1.03.08 1.56.08 5.52 0 10-3.54 10-7.85C22 6.54 17.52 3 12 3z"
            />
          </svg>
          카카오 1초 회원가입
        </button>
      </div>

      {notice && (
        <p className="text-center text-[13px] text-ink-faint mt-4" role="status">{notice}</p>
      )}

      <p className="text-center text-[13px] text-ink-soft mt-6">
        이미 쇼핑몰 회원이세요?{' '}
        <Link to="/app/login" state={{ from }} className="text-ink font-bold underline focus:outline-none focus-visible:shadow-ring">로그인</Link>
      </p>
    </>
  )

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopAuthLayout title="회원가입">{formContent}</DesktopAuthLayout>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-quiet md:py-6">
    <ViewModeToggle mode={mode} onToggle={toggle} />
    <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule">
      <BackHeader title="" />
      <div className="px-6 py-10">
        <h1 className="text-[24px] font-bold text-ink text-center mb-8">회원가입</h1>
        {formContent}
      </div>
    </div>
    </div>
  )
}
