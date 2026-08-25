import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import GNB from '../../components/layout/GNB'
import Footer from '../../components/layout/Footer'
import Button from '../../components/common/Button'
import { supabase } from '../../lib/supabase'

interface FormState {
  name: string
  phone: string
  email: string
  password: string
  passwordConfirm: string
}

const INITIAL: FormState = { name: '', phone: '', email: '', password: '', passwordConfirm: '' }

type FieldErrors = Partial<Record<keyof FormState | 'agree', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const field =
  'w-full bg-white border border-rule rounded-md px-4 py-3 text-[14px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:shadow-ring transition'

export default function HostRegister() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // 카카오로 먼저 로그인하고 돌아온 경우 — 이미 인증된 세션이 있으면 이메일·비밀번호는
  // 다시 안 받고 이름·연락처만 받아서 hosts 레코드를 만든다.
  const [session, setSession] = useState<Session | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [alreadyHost, setAlreadyHost] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!active) return
      setSession(s)
      if (s) {
        const meta = s.user.user_metadata as { name?: string; full_name?: string } | undefined
        const kakaoName = meta?.name ?? meta?.full_name ?? ''
        if (kakaoName) setForm((prev) => ({ ...prev, name: prev.name || kakaoName }))
        const { data: existing } = await supabase.from('hosts').select('id').eq('user_id', s.user.id).maybeSingle()
        if (active && existing) setAlreadyHost(true)
      }
      if (active) setCheckingSession(false)
    })()
    return () => { active = false }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const handleKakao = async () => {
    setFormError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/host/register`,
        scopes: 'profile_nickname account_email',
      },
    })
    if (error) setFormError('카카오 로그인 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }

  const validate = (): FieldErrors => {
    const e: FieldErrors = {}
    if (!form.name.trim()) e.name = '이름을 입력하세요.'
    if (!form.phone.trim()) e.phone = '연락처를 입력하세요.'
    if (!session) {
      if (!form.email.trim()) e.email = '이메일을 입력하세요.'
      else if (!EMAIL_RE.test(form.email.trim())) e.email = '올바른 이메일 형식이 아닙니다.'
      if (!form.password) e.password = '비밀번호를 입력하세요.'
      else if (!PASSWORD_RE.test(form.password))
        e.password = '8자 이상, 영문·숫자·특수문자를 모두 포함해야 합니다.'
      if (!form.passwordConfirm) e.passwordConfirm = '비밀번호를 다시 입력하세요.'
      else if (form.password !== form.passwordConfirm)
        e.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    }
    if (!agree) e.agree = '개인정보 수집·이용에 동의해야 합니다.'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setFormError(null)

    const v = validate()
    if (Object.keys(v).length > 0) { setErrors(v); return }
    setErrors({})
    setSubmitting(true)

    let userId: string | null
    let email = form.email.trim()

    if (session) {
      userId = session.user.id
      email = session.user.email ?? ''
    } else {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
      })

      if (signUpError) {
        const msg = signUpError.message?.toLowerCase() ?? ''
        const already = msg.includes('already') || msg.includes('registered') || msg.includes('exists')
        setSubmitting(false)
        setFormError(
          already
            ? '이미 등록된 이메일입니다. 로그인을 이용해 주세요.'
            : `회원가입 중 오류가 발생했습니다. (${signUpError.message})`
        )
        return
      }

      if (signUpData.user && signUpData.user.identities?.length === 0) {
        setSubmitting(false)
        setFormError('이미 등록된 이메일입니다. 로그인을 이용해 주세요.')
        return
      }
      userId = signUpData.user?.id ?? null
    }

    // 파트너와 달리 신청 테이블 없이 hosts 에 바로 pending 으로 insert
    const { error: insertError } = await supabase.from('hosts').insert([
      {
        user_id: userId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email,
        status: 'pending',
      },
    ])

    if (insertError) {
      setSubmitting(false)
      setFormError(`가입 신청 저장 중 오류가 발생했습니다. (${insertError.message})`)
      return
    }

    setSubmitting(false)
    setDone(true)
  }

  return (
    <>
      <GNB />
      <main className="py-16 md:py-24" style={{ backgroundColor: '#f7f4ef' }}>
        <div className="max-w-[420px] mx-auto px-4 sm:px-6">
          {checkingSession ? (
            <div className="text-center text-[14px] text-ink-faint py-20">불러오는 중...</div>
          ) : done ? (
            <div
              className="bg-white rounded-md p-8 md:p-10 text-center border shadow-[0_4px_24px_rgba(0,0,0,0.05)]"
              style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
            >
              <div className="text-5xl mb-5" aria-hidden="true">✅</div>
              <h1 className="font-serif text-[22px] md:text-[26px] font-bold text-text mb-3">
                가입 신청이 접수되었습니다
              </h1>
              <p className="text-[14px] text-text-sub leading-relaxed">
                승인 후 로그인하실 수 있습니다.<br />
                결과는 입력하신 이메일로 안내드립니다.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
                <Link
                  to="/"
                  className="inline-block bg-ink text-paper rounded-pill text-[14px] px-6 py-3 font-medium hover:opacity-90 transition-colors"
                >
                  홈으로
                </Link>
                <Link
                  to="/host/login"
                  className="inline-block bg-paper border border-rule text-ink-soft rounded-pill text-[14px] px-6 py-3 font-medium hover:text-ink transition-colors"
                >
                  로그인
                </Link>
              </div>
            </div>
          ) : alreadyHost ? (
            <div
              className="bg-white rounded-md p-8 md:p-10 text-center border shadow-[0_4px_24px_rgba(0,0,0,0.05)]"
              style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
            >
              <h1 className="font-serif text-[22px] font-bold text-text mb-3">이미 가입된 계정입니다</h1>
              <p className="text-[14px] text-text-sub leading-relaxed mb-6">로그인해서 진행자 센터를 이용해 주세요.</p>
              <Link
                to="/host/login"
                className="inline-block bg-ink text-paper rounded-pill text-[14px] px-6 py-3 font-medium hover:opacity-90 transition-colors"
              >
                로그인하러 가기
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-serif text-[28px] md:text-[32px] font-bold text-ink">
                  뷰티그라운드
                </h1>
                <p className="text-text-sub text-[14px] mt-2">진행자 회원가입</p>
              </div>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="bg-white rounded-md p-6 md:p-8 border shadow-[0_4px_24px_rgba(0,0,0,0.05)]"
                style={{ borderColor: '#e5e0d8', borderWidth: '0.5px' }}
              >
                <div className="space-y-4">
                  {!session && (
                    <>
                      {/* 카카오 로그인 — 공식 버튼 규격(#FEE500 배경 + 검정 85% 텍스트, 카카오 고유색 예외) */}
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
                        카카오로 1초 시작하기
                      </button>

                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-rule" />
                        <span className="text-[12px] text-ink-faint">또는 이메일로 가입</span>
                        <div className="flex-1 h-px bg-rule" />
                      </div>
                    </>
                  )}

                  {session && (
                    <div className="bg-quiet rounded-md p-3 text-[12.5px] text-ink-soft">
                      카카오로 로그인됐습니다{session.user.email ? ` (${session.user.email})` : ''}. 이름·연락처만 마저 입력해 주세요.
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-[13px] font-medium text-text mb-1.5">
                      이름 <span className="text-[#FF4757]">*</span>
                    </label>
                    <input
                      id="name" name="name" type="text"
                      value={form.name} onChange={handleChange}
                      placeholder="홍길동" className={field}
                    />
                    {errors.name && <p className="mt-1 text-[12px] text-[#FF4757]">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-[13px] font-medium text-text mb-1.5">
                      연락처 <span className="text-[#FF4757]">*</span>
                    </label>
                    <input
                      id="phone" name="phone" type="tel"
                      value={form.phone} onChange={handleChange}
                      placeholder="010-0000-0000" className={field}
                    />
                    {errors.phone && <p className="mt-1 text-[12px] text-[#FF4757]">{errors.phone}</p>}
                  </div>

                  {!session && (
                    <>
                      <div>
                        <label htmlFor="email" className="block text-[13px] font-medium text-text mb-1.5">
                          이메일 <span className="text-[#FF4757]">*</span>
                        </label>
                        <input
                          id="email" name="email" type="email"
                          value={form.email} onChange={handleChange}
                          placeholder="example@email.com" className={field}
                        />
                        {errors.email && <p className="mt-1 text-[12px] text-[#FF4757]">{errors.email}</p>}
                      </div>

                      <div>
                        <label htmlFor="password" className="block text-[13px] font-medium text-text mb-1.5">
                          비밀번호 <span className="text-[#FF4757]">*</span>
                        </label>
                        <input
                          id="password" name="password" type="password"
                          value={form.password} onChange={handleChange}
                          placeholder="8자 이상, 영문+숫자+특수문자" className={field}
                        />
                        {errors.password && <p className="mt-1 text-[12px] text-[#FF4757]">{errors.password}</p>}
                      </div>

                      <div>
                        <label htmlFor="passwordConfirm" className="block text-[13px] font-medium text-text mb-1.5">
                          비밀번호 확인 <span className="text-[#FF4757]">*</span>
                        </label>
                        <input
                          id="passwordConfirm" name="passwordConfirm" type="password"
                          value={form.passwordConfirm} onChange={handleChange}
                          placeholder="비밀번호 재입력" className={field}
                        />
                        {errors.passwordConfirm && (
                          <p className="mt-1 text-[12px] text-[#FF4757]">{errors.passwordConfirm}</p>
                        )}
                      </div>
                    </>
                  )}

                  <label className="flex items-start gap-2.5 cursor-pointer bg-quiet rounded-md p-4" style={{ border: '0.5px solid #E3E5E9' }}>
                    <input
                      type="checkbox"
                      checked={agree}
                      onChange={(e) => { setAgree(e.target.checked); setErrors((p) => ({ ...p, agree: undefined })) }}
                      className="w-4 h-4 accent-ink mt-0.5"
                    />
                    <span className="text-[13px] text-text-sub">
                      <span className="text-[#FF4757]">[필수]</span> 개인정보 수집·이용에 동의합니다. (방송·정산 처리 목적)
                    </span>
                  </label>
                  {errors.agree && <p className="text-[12px] text-[#FF4757]">{errors.agree}</p>}

                  {formError && (
                    <p className="text-[13px] text-[#FF4757]" role="alert">{formError}</p>
                  )}

                  <Button
                    type="submit" variant="ink" size="md"
                    label={submitting ? '신청 중…' : '회원가입'}
                    disabled={submitting} className="w-full"
                  />

                  {!session && (
                    <p className="text-center text-[13px] text-text-sub pt-1">
                      이미 계정이 있으신가요?{' '}
                      <Link to="/host/login" className="text-ink hover:underline">로그인</Link>
                    </p>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
