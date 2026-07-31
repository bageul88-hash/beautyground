import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import { supabase } from '../../lib/supabase'

const field =
  'w-full rounded-control bg-paper border border-rule px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring transition'

export default function PartnerLogin() {
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setSubmitting(false)
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    navigate('/partner/dashboard')
  }

  return (
    <>
      <GNB />
      <main className="py-20 md:py-28 bg-paper">
        <div className="max-w-[420px] mx-auto px-6">
          <div className="text-center mb-8">
            <span className="text-ink-soft text-[12px] font-bold tracking-[0.08em] uppercase mb-3 block">
              PARTNER LOGIN
            </span>
            <h1 className="text-[28px] md:text-[32px] font-bold text-ink">
              파트너 로그인
            </h1>
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-paper border border-rule p-6 md:p-8"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[13px] font-bold text-ink mb-1.5">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="brand@company.com"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-[13px] font-bold text-ink mb-1.5">
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className={field}
                />
              </div>

              {error && (
                <p className="text-[13px] text-signal-red" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-control bg-ink text-paper font-bold text-[15px] py-3.5 disabled:opacity-60 focus:outline-none focus-visible:shadow-ring"
              >
                {submitting ? '로그인 중…' : '로그인'}
              </button>

              <p className="text-center text-[13px] text-ink-soft pt-1">
                아직 계정이 없으신가요?{' '}
                <Link to="/partner/register" className="text-ink font-bold focus:outline-none focus-visible:shadow-ring">
                  회원가입
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  )
}
