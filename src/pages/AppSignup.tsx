import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import { supabase } from '../lib/supabase'

// 회원가입 진입 화면 — 카카오/네이버/휴대폰인증/쇼핑몰(이메일) 4개 방법 중 선택.
// 실제 이메일 가입 폼은 AppSignupEmail.tsx(/app/signup/email)로 분리되어 있음.
// 네이버는 api/auth-naver.ts + AppNaverCallback.tsx로 실제 연동됨(VITE_NAVER_CLIENT_ID
// 미설정 시에만 준비중 안내). 휴대폰인증은 SMS API 미도입으로 보류 — 클릭 시 준비중 안내만.
export default function AppSignup() {
  const location = useLocation()
  const navigate = useNavigate()
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

  // 네이버 — Supabase 미지원이라 커스텀 OAuth(api/auth-naver.ts + AppNaverCallback.tsx)로 처리.
  // 키(VITE_NAVER_CLIENT_ID) 발급 전까지는 준비중 안내.
  const handleNaver = () => {
    setNotice('')
    const clientId = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined
    if (!clientId) {
      setNotice('네이버 회원가입은 준비 중입니다. 다른 방법을 이용해 주세요.')
      return
    }
    const state = crypto.randomUUID()
    sessionStorage.setItem('naver_oauth_state', state)
    sessionStorage.setItem('naver_oauth_from', from)
    const authUrl = new URL('https://nid.naver.com/oauth2.0/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/app/auth/naver/callback`)
    authUrl.searchParams.set('state', state)
    window.location.href = authUrl.toString()
  }

  return (
    <div className="min-h-screen bg-paper">
      <BackHeader title="" />
      <div className="max-w-[420px] mx-auto px-6 py-10">
        <h1 className="text-[24px] font-bold text-ink text-center mb-8">회원가입</h1>

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

          {/* 네이버 — 공식 브랜드 그린 #03C75A */}
          <button
            type="button"
            onClick={handleNaver}
            className="w-full flex items-center justify-center gap-2 rounded-control font-bold text-[15px] py-3.5 text-white focus:outline-none focus-visible:shadow-ring"
            style={{ backgroundColor: '#03C75A' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#fff" d="M13.6 12.75 10.15 7.5H7.5v9h2.9v-5.25L13.85 16.5H16.5v-9h-2.9v5.25z" />
            </svg>
            네이버 1초 회원가입
          </button>

          <div className="pt-2 space-y-3">
            {/* 휴대폰 인증 — SMS API 연동 전까지 준비 중 안내 */}
            <button
              type="button"
              onClick={() => setNotice('휴대폰 인증은 준비 중입니다. 다른 방법을 이용해 주세요.')}
              className="w-full rounded-control bg-[#2563EB] text-white font-bold text-[15px] py-3.5 focus:outline-none focus-visible:shadow-ring"
            >
              휴대폰 인증
            </button>

            <button
              type="button"
              onClick={() => navigate('/app/signup/email', { state: { from } })}
              className="w-full rounded-control border border-ink text-ink font-bold text-[15px] py-3.5 focus:outline-none focus-visible:shadow-ring"
            >
              쇼핑몰 회원가입
            </button>
          </div>
        </div>

        {notice && (
          <p className="text-center text-[13px] text-ink-faint mt-4" role="status">{notice}</p>
        )}

        <p className="text-center text-[13px] text-ink-soft mt-6">
          이미 쇼핑몰 회원이세요?{' '}
          <Link to="/app/login" state={{ from }} className="text-ink font-bold underline focus:outline-none focus-visible:shadow-ring">로그인</Link>
        </p>
      </div>
    </div>
  )
}
