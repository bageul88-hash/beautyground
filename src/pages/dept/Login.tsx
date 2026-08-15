import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import Button from '../../components/common/Button'
import { supabase } from '../../lib/supabase'

// 백화점 담당자 로그인 — 예전 4자리 공용 코드 게이트를 대체(2026-08-15). 지점별로 계정을 따로
// 발급해(예: "AK플라자_광명") 관리자가 미리 만들어준다(자체 회원가입 없음).
export default function DeptLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setSubmitting(false)
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    navigate('/dept/sales')
  }

  return (
    <>
      <GNB />
      <main className="py-20 md:py-28 relative overflow-hidden" style={{ backgroundColor: '#f7f4ef' }}>
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #111 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />
        <div className="max-w-[420px] mx-auto px-6 relative">
          <div className="text-center mb-8">
            <span className="text-gold text-[13px] font-medium tracking-widest uppercase mb-3 block">
              STORE LOGIN
            </span>
            <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-text">
              백화점 담당자 로그인
            </h1>
            <p className="text-[13px] text-text-sub mt-2">
              지점별로 발급된 아이디로 로그인해 판매실적을 확인하세요.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white rounded-lg p-6 md:p-8 border shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-text mb-1.5">
                  아이디
                </label>
                <input
                  id="email" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="ak-gwangmyeong@beautyground.co.kr"
                  className="w-full bg-white border border-cream-2 rounded-md px-4 py-3 text-[14px] text-text placeholder:text-text-hint focus:outline-none focus:shadow-focus transition"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-text mb-1.5">
                  비밀번호
                </label>
                <input
                  id="password" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full bg-white border border-cream-2 rounded-md px-4 py-3 text-[14px] text-text placeholder:text-text-hint focus:outline-none focus:shadow-focus transition"
                />
              </div>

              {error && (
                <p className="text-[13px] text-[#FF4757]" role="alert">{error}</p>
              )}

              <Button
                type="submit" variant="gold" size="md"
                label={submitting ? '로그인 중…' : '로그인'}
                disabled={submitting} className="w-full"
              />

              <p className="text-center text-[13px] text-text-sub pt-1">
                아이디 발급은 뷰티그라운드 담당자에게 문의해 주세요.
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
