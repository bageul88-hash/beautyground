import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BackHeader from '../components/layout/BackHeader'
import ViewModeToggle from '../components/layout/ViewModeToggle'
import DesktopAuthLayout from '../components/auth/DesktopAuthLayout'
import { useViewMode } from '../lib/viewMode'
import { supabase } from '../lib/supabase'

const field =
  'w-full rounded-control bg-paper border border-rule px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring'

export default function AppLogin() {
  const navigate = useNavigate()
  const { mode, isDesktop, toggle } = useViewMode()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/app/mypage'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setSubmitting(false)
    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }
    navigate(from, { replace: true })
  }

  // 카카오 로그인 — 완료 후 원래 가려던 페이지로 복귀
  const handleKakao = async () => {
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}${from}`, scopes: 'profile_nickname' },
    })
    if (oauthError) setError('카카오 로그인 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }

  const formContent = (
    <>
      {/* 카카오 로그인 — 공식 버튼 규격(#FEE500 배경 + 검정 85% 텍스트, 카카오 고유색 예외) */}
      <button
        type="button"
        onClick={handleKakao}
        className="w-full flex items-center justify-center gap-2 rounded-control font-bold text-[15px] py-3.5 mb-3 focus:outline-none focus-visible:shadow-ring"
        style={{ backgroundColor: '#FEE500', color: 'rgba(0,0,0,0.85)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="rgba(0,0,0,0.85)"
            d="M12 3C6.48 3 2 6.54 2 10.9c0 2.8 1.86 5.26 4.66 6.66l-.95 3.52c-.08.31.27.56.54.38l4.19-2.79c.51.05 1.03.08 1.56.08 5.52 0 10-3.54 10-7.85C22 6.54 17.52 3 12 3z"
          />
        </svg>
        카카오로 3초 만에 시작하기
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-rule" />
        <span className="text-[12px] text-ink-faint">또는 이메일로</span>
        <div className="flex-1 h-px bg-rule" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[13px] font-bold text-ink mb-1.5">이메일</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@example.com" className={field} required />
        </div>
        <div>
          <label htmlFor="password" className="block text-[13px] font-bold text-ink mb-1.5">비밀번호</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className={field} required />
        </div>

        {error && <p className="text-[13px] text-signal-red" role="alert">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-control bg-ink text-paper font-bold text-[15px] py-3.5 disabled:opacity-60 focus:outline-none focus-visible:shadow-ring"
        >
          {submitting ? '로그인 중…' : '로그인'}
        </button>

        <p className="text-center text-[13px] text-ink-soft pt-1">
          아직 계정이 없으신가요?{' '}
          <Link to="/app/signup" state={{ from }} className="text-ink font-bold focus:outline-none focus-visible:shadow-ring">회원가입</Link>
        </p>
      </form>
    </>
  )

  if (isDesktop) {
    return (
      <>
        <ViewModeToggle mode={mode} onToggle={toggle} />
        <DesktopAuthLayout title="로그인">{formContent}</DesktopAuthLayout>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-quiet md:py-6">
    <ViewModeToggle mode={mode} onToggle={toggle} />
    <div className="max-w-[480px] mx-auto bg-paper min-h-screen md:min-h-0 md:border md:border-rule">
      <BackHeader title="로그인" />
      <div className="px-6 py-10">
        <h1 className="text-[24px] font-bold text-ink text-center mb-8">뷰티그라운드</h1>
        {formContent}
      </div>
    </div>
    </div>
  )
}
